import * as v from 'valibot';
import { decode } from 'decode-formdata';
import { error, redirect } from '@sveltejs/kit';
import { count, isNull, sql } from 'drizzle-orm';

import * as schema from '$lib/server/database/schema';
import { assertSingle } from '$lib/server/assert';
import { coerceDate } from '$lib/coerce';
import { db } from '$lib/server/database';
import {
  type DbConnection,
  type DrizzleTransaction,
  getDrafts,
  getLabRegistry,
} from '$lib/server/database/drizzle';
import { Logger } from '$lib/server/telemetry/logger';
import { Tracer } from '$lib/server/telemetry/tracer';

const SERVICE_NAME = 'routes.dashboard.admin.drafts';
const logger = Logger.byName(SERVICE_NAME);
const tracer = Tracer.byName(SERVICE_NAME);

export async function load({ locals: { session } }) {
  if (typeof session?.user === 'undefined') {
    logger.error('attempt to access drafts page without session');
    redirect(307, '/dashboard/oauth/login');
  }

  const { user } = session;
  if (!user.isAdmin || user.googleUserId === null || user.labId !== null) {
    logger.fatal('insufficient permissions to access drafts page', void 0, {
      'user.is_admin': user.isAdmin,
      'user.google_id': user.googleUserId,
      'user.lab_id': user.labId,
    });
    error(403);
  }

  const {
    id: sessionId,
    user: { id: userId },
  } = session;

  return await tracer.asyncSpan('load-drafts-page', async span => {
    span.setAttributes({
      'session.id': sessionId,
      'session.user.id': userId,
    });

    const [drafts, labs] = await Promise.all([getDrafts(db), getLabRegistry(db)]);

    logger.debug('drafts page loaded', {
      'draft.count': drafts.length,
      'lab.count': labs.length,
    });

    return {
      drafts,
      labs,
      draftStatsByYear: getDraftStatsAggregates(db).catch(() => null),
    };
  });
}

const InitFormData = v.object({
  rounds: v.number(),
  closesAt: v.date(),
});

export const actions = {
  async init({ locals: { session }, request }) {
    if (typeof session?.user === 'undefined') {
      logger.fatal('attempt to init draft without session');
      error(401);
    }

    const { user } = session;
    if (!user.isAdmin || user.googleUserId === null || user.labId !== null) {
      logger.fatal('insufficient permissions to init draft', void 0, {
        'user.is_admin': user.isAdmin,
        'user.google_id': user.googleUserId,
        'user.lab_id': user.labId,
      });
      error(403);
    }

    return await tracer.asyncSpan('action.init', async () => {
      const data = await request.formData();
      const { rounds, closesAt } = v.parse(
        InitFormData,
        decode(data, { numbers: ['rounds'], dates: ['closesAt'] }),
      );
      logger.debug('initializing draft', {
        'draft.round.max': rounds,
        'draft.registration.closes_at': closesAt.toISOString(),
      });

      const draft = await db.transaction(
        async db => {
          if (await hasActiveDraft(db)) {
            logger.fatal('attempt to init draft while active draft exists');
            error(409, 'An active draft already exists');
          }
          return await initDraft(db, rounds, closesAt);
        },
        { isolationLevel: 'read committed' },
      );
      logger.info('draft initialized', {
        'draft.id': draft.id.toString(),
        'draft.active_period_start': draft.activePeriodStart.toISOString(),
      });
    });
  },
};

async function hasActiveDraft(db: DbConnection) {
  return await tracer.asyncSpan('has-active-draft', async () => {
    const result = await db
      .select({ one: sql.raw('1') })
      .from(schema.draft)
      .where(isNull(sql`upper(${schema.draft.activePeriod})`))
      .limit(1)
      .then(rows => rows[0]);
    return typeof result !== 'undefined';
  });
}

async function initDraft(db: DrizzleTransaction, maxRounds: number, registrationClosedAt: Date) {
  return await tracer.asyncSpan('init-draft', async span => {
    span.setAttribute('database.draft.max_rounds', maxRounds);

    // Blocks further modifications to the lab catalog until the end of the transaction.
    await db.execute(sql`lock table ${schema.lab} in share mode`);

    const draft = await db
      .insert(schema.draft)
      .values({ maxRounds, registrationClosedAt })
      .returning({
        id: schema.draft.id,
        activePeriodStart: sql`lower(${schema.draft.activePeriod})`.mapWith(coerceDate),
      })
      .then(assertSingle);

    const labs = await db.select({ labId: schema.activeLabView.id }).from(schema.activeLabView);
    if (labs.length > 0)
      await db.insert(schema.draftLabQuota).values(
        labs.map(
          ({ labId }): Pick<schema.NewDraftLabQuota, 'draftId' | 'labId'> => ({
            draftId: draft.id,
            labId,
          }),
        ),
      );

    return draft;
  });
}

async function getDraftStatsAggregates(db: DbConnection) {
  return await tracer.asyncSpan('get-draft-stats-aggregates', async span => {
    const statsByDraft = await db
      .select({
        draftId: schema.draft.id,
        year: sql<number>`extract(year from lower(${schema.draft.activePeriod}))`.as('year'),
      })
      .from(schema.draft)
      .where(sql`upper(${schema.draft.activePeriod}) is not null`);

    if (statsByDraft.length === 0) return [];

    const quotaSnapshots = await db
      .select({
        draftId: schema.draftLabQuota.draftId,
        labId: schema.draftLabQuota.labId,
        labName: schema.lab.name,
        initialQuota: schema.draftLabQuota.initialQuota,
        lotteryQuota: schema.draftLabQuota.lotteryQuota,
        deletedAt: schema.lab.deletedAt,
      })
      .from(schema.draftLabQuota)
      .innerJoin(schema.lab, sql`${schema.draftLabQuota.labId} = ${schema.lab.id}`);

    const draftedCounts = await db
      .select({
        draftId: schema.facultyChoiceUser.draftId,
        labId: schema.facultyChoiceUser.labId,
        count: count(schema.facultyChoiceUser.studentUserId),
      })
      .from(schema.facultyChoiceUser)
      .groupBy(schema.facultyChoiceUser.draftId, schema.facultyChoiceUser.labId);

    const quotaByDraftLab = index(
      quotaSnapshots.map(q => ({
        draftId: q.draftId.toString(),
        labId: q.labId,
        labName: q.labName,
        quota: q.initialQuota + q.lotteryQuota,
        isArchived: q.deletedAt !== null,
        archivedAt: q.deletedAt,
      })),
      q => `${q.draftId}-${q.labId}`,
    );

    const draftedByDraftLab = index(
      draftedCounts.map(d => ({
        draftId: d.draftId.toString(),
        labId: d.labId,
        count: d.count,
      })),
      d => `${d.draftId}-${d.labId}`,
    );

    const draftYear = index(statsByDraft, d => d.draftId.toString());

    const groupedByYear = rollup(
      statsByDraft,
      drafts => drafts,
      d => d.year,
    );

    return Array.from(groupedByYear.entries())
      .sort(([a], [b]) => a - b)
      .map(([year, drafts]) => {
        const labs = new Map<string, {
          labId: string;
          labName: string;
          isArchived: boolean;
          archivedAt: Date | null;
          quota: number;
          draftedStudents: number;
        }>();

        for (const draft of drafts) {
          const draftId = draft.draftId.toString();
          for (const [key, quotaData] of quotaByDraftLab) {
            if (!key.startsWith(`${draftId}-`)) continue;
            const labId = quotaData.labId;
            const draftedData = draftedByDraftLab.get(`${draftId}-${labId}`);

            if (!labs.has(labId)) {
              labs.set(labId, {
                labId,
                labName: quotaData.labName,
                isArchived: quotaData.isArchived,
                archivedAt: quotaData.archivedAt,
                quota: 0,
                draftedStudents: 0,
              });
            }

            const lab = labs.get(labId)!;
            lab.quota += quotaData.quota;
            lab.draftedStudents += draftedData?.count ?? 0;
          }
        }

        return {
          year,
          labs: Array.from(labs.values()),
          totalDrafted: Array.from(labs.values()).reduce((sum, l) => sum + l.draftedStudents, 0),
        };
      });
  });
}