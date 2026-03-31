import { sql, eq, and, gte, lte } from 'drizzle-orm';
import { db } from '$lib/server/database';
import { studentRank } from '$lib/server/database/schema/app';
import { Tracer } from '$lib/server/telemetry/tracer';

const tracer = Tracer.byName('database');

export async function fetchDraftRegistrationTimeline(draftId: bigint) {
  return await tracer.asyncSpan('fetch-draft-registration-timeline', async () => {
    const result = await db
      .select({
        date: sql`date_trunc('day', ${studentRank.createdAt})`,
        count: sql`count(*)::int`,
      })
      .from(studentRank)
      .where(eq(studentRank.draftId, draftId))
      .groupBy(sql`date_trunc('day', ${studentRank.createdAt})`)
      .orderBy(sql`date_trunc('day', ${studentRank.createdAt})`);

    return result.map(r => ({
      date: r.date as Date,
      count: r.count,
    }));
  });
}