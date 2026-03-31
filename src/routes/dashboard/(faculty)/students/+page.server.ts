import assert from 'node:assert/strict';

import * as v from 'valibot';
import { decode } from 'decode-formdata';
import { error, fail, redirect } from '@sveltejs/kit';

import {
  autoAcknowledgeLabsWithoutPreferences,
  getDraftByIdForUpdate,
  getFacultyAndStaff,
  getFacultyChoiceForLabInDraftRound,
  getLabAndRemainingStudentsInDraftWithLabPreference,
  getLabAutoAcknowledgeStatusInDraftRound,
  getLabById,
  getLabQuotaAndSelectedStudentCountInDraft,
  getLabSelectedStudentCountInDraftRound,
  getPendingLabCountInDraft,
  getValidStaffEmails,
  incrementDraftRound,
  upsertFacultyChoice,
  validateStudentsChoseLabInRound,
} from '$lib/server/database/drizzle';
import { db } from '$lib/server/database';
import { inngest } from '$lib/server/inngest/client';
import { Logger } from '$lib/server/telemetry/logger';
import {
  RoundStartedBatchEmailEvent,
  RoundSubmittedBatchEmailEvent,
} from '$lib/server/inngest/schema';
import { Tracer } from '$lib/server/telemetry/tracer';

const RankingsFormData = v.object({
  draft: v.pipe(v.string(), v.minLength(1)),
  round: v.pipe(v.number(), v.integer(), v.minValue(1)),
  students: v.array(v.pipe(v.string(), v.minLength(1))),
});

const SERVICE_NAME = 'routes.dashboard.draft.students';
const logger = Logger.byName(SERVICE_NAME);
const tracer = Tracer.byName(SERVICE_NAME);

function toRoundStartedPayload(round: number | null, maxRounds: number) {
  return round === null || round > maxRounds ? null : round;
}

export async function load({ locals: { session }, parent }) {
  if (typeof session?.user === 'undefined') {
    logger.warn('attempt to access students page without session');
    redirect(307, '/dashboard/oauth/login');
  }

  const { id: sessionId, user } = session;
  if (!user.isAdmin || user.googleUserId === null || user.labId === null) {
    logger.fatal('insufficient permissions to access students page', void 0, {
      'user.is_admin': user.isAdmin,
      'user.google_id': user.googleUserId,
      'user.lab_id': user.labId,
    });
    error(403);
  }

  const { id: userId, labId } = user;
  return await tracer.asyncSpan('load-students-page', async span => {
    span.setAttributes({
      'session.id': sessionId,
      'session.user.id': userId,
    });
    if (labId !== null) span.setAttribute('session.user.lab_id', labId);

    const { draft } = await parent();
    if (typeof draft === 'undefined') {
      logger.fatal('no active draft found');
      error(404);
    }

    logger.debug('active draft found', {
      'draft.id': draft.id.toString(),
      'draft.round.current': draft.currRound,
      'draft.round.max': draft.maxRounds,
    });

    const draftLabResult = await getLabAndRemainingStudentsInDraftWithLabPreference(
      db,
      draft.id,
      labId,
    );
    if (typeof draftLabResult === 'undefined') {
      logger.warn('lab not in draft snapshot', { 'lab.id': labId });
      return { draft };
    }

    const { lab, students, researchers, submissionSource, remainingQuota, autoAcknowledgeReason } =
      draftLabResult;
    logger.debug('lab and students fetched', {
      'lab.name': lab.name,
      'student.count': students.length,
      'lab.researcher_count': researchers.length,
      'draft.round.submission_source': submissionSource,
      'draft.round.remaining_quota': remainingQuota,
      'draft.round.auto_acknowledge_reason': autoAcknowledgeReason,
    });

    return {
      draft,
      info: {
        lab,
        students,
        researchers,
        submissionSource,
        remainingQuota,
        autoAcknowledgeReason,
      },
    };
  });
}

export const actions = {
  async rankings({ locals: { session }, request }) {
    if (typeof session?.user === 'undefined') {
      logger.fatal('attempt to submit rankings without session');
      error(401);
    }

    const { user } = session;
    if (!user.isAdmin || user.googleUserId === null || user.labId === null) {
      logger.fatal('insufficient permissions to submit rankings', void 0, {
        'user.is_admin': user.isAdmin,
        'user.google_id': user.googleUserId,
        'user.lab_id': user.labId,
      });
      error(403);
    }

    const lab = user.labId;
    const facultyUserId = user.id;
    return await tracer.asyncSpan('action.rankings', async () => {
      logger.debug('submitting rankings on behalf of lab head', {
        'lab.id': lab,
        'user.id': facultyUserId,
      });

      const data = await request.formData();
      const {
        draft,
        round: expectedRound,
        students,
      } = v.parse(RankingsFormData, decode(data, { arrays: ['students'], numbers: ['round'] }));
      logger.debug('rankings form received', {
        'draft.id': draft,
        'draft.round.expected': expectedRound,
        'student.ids': students,
      });

      const draftId = BigInt(draft);
      try {
        const { submittedRound, roundsToNotify, isUpdate } = await db.transaction(
          async db => {
            const activeDraft = await getDraftByIdForUpdate(db, draftId);
            if (typeof activeDraft === 'undefined' || activeDraft.activePeriodEnd !== null) {
              logger.fatal('attempt to submit rankings for non-active draft', void 0, {
                'draft.id': draftId.toString(),
              });
              error(403);
            }

            if (
              activeDraft.currRound === null ||
              activeDraft.currRound <= 0 ||
              activeDraft.currRound > activeDraft.maxRounds
            ) {
              logger.fatal('attempt to submit rankings outside regular rounds', void 0, {
                'draft.id': draftId.toString(),
                'draft.round.current': activeDraft.currRound,
                'draft.round.max': activeDraft.maxRounds,
              });
              error(403);
            }

            if (activeDraft.currRound !== expectedRound)
              throw new RoundMismatchError(activeDraft.currRound, expectedRound);

            const autoAcknowledgeStatus = await getLabAutoAcknowledgeStatusInDraftRound(
              db,
              draftId,
              lab,
              activeDraft.currRound,
            );
            if (typeof autoAcknowledgeStatus === 'undefined') {
              logger.fatal(
                'attempt to submit rankings for lab outside active draft snapshot',
                void 0,
                {
                  'draft.id': draftId.toString(),
                  'lab.id': lab,
                },
              );
              error(403);
            }

            const { autoAcknowledgeReason, submissionSource } = autoAcknowledgeStatus;
            if (typeof autoAcknowledgeReason !== 'undefined') {
              logger.fatal('attempt to submit rankings for auto-acknowledged lab', void 0, {
                'draft.id': draftId.toString(),
                'lab.id': lab,
                'draft.round.current': activeDraft.currRound,
                'draft.round.auto_acknowledge_reason': autoAcknowledgeReason,
                'draft.round.submission_source': submissionSource,
              });
              error(409);
            }

            const existingChoice = await getFacultyChoiceForLabInDraftRound(
              db,
              draftId,
              activeDraft.currRound,
              lab,
            );
            const isUpdate = typeof existingChoice !== 'undefined';
            const { quota, selected } = await getLabQuotaAndSelectedStudentCountInDraft(
              db,
              draftId,
              lab,
            );
            assert(typeof quota !== 'undefined');

            let baseSelected = selected;
            if (typeof existingChoice !== 'undefined') {
              if (existingChoice.userId !== facultyUserId)
                logger.info("lab head editing another lab head's submission", {
                  'draft.id': draftId.toString(),
                  'draft.round.current': activeDraft.currRound,
                  'original.user_id': existingChoice.userId,
                  'editing.user_id': facultyUserId,
                });

              const selectedInCurrentRound = await getLabSelectedStudentCountInDraftRound(
                db,
                draftId,
                lab,
                activeDraft.currRound,
              );
              baseSelected = selected - selectedInCurrentRound;
            }

            const total = baseSelected + students.length;
            if (total > quota) {
              logger.fatal('total students exceeds quota', void 0, {
                'student.total': total,
                'lab.quota': quota,
              });
              error(403);
            }

            logger.debug('total students still within quota', {
              'student.total': total,
              'lab.quota': quota,
            });

            if (students.length > 0) {
              const validStudentIds = await validateStudentsChoseLabInRound(
                db,
                draftId,
                lab,
                activeDraft.currRound,
                students,
              );
              const invalidStudents = students.filter(id => !validStudentIds.has(id));
              if (invalidStudents.length > 0) {
                logger.fatal('students did not choose this lab for current round', void 0, {
                  'invalid.student_id': invalidStudents,
                });
                error(409);
              }
            }

            await upsertFacultyChoice(
              db,
              draftId,
              activeDraft.currRound,
              lab,
              facultyUserId,
              students,
            );

            const submittedRound = activeDraft.currRound;
            assert(
              submittedRound > 0 && submittedRound <= activeDraft.maxRounds,
              'cannot submit preferences outside regular rounds',
            );

            // Track data needed for notifications after transaction
            const roundsToNotify: (number | null)[] = [];
            while (true) {
              // Auto-acknowledge labs without preferences BEFORE checking pending count
              await autoAcknowledgeLabsWithoutPreferences(db, draftId);
              logger.debug('labs without preferences auto-acknowledged');

              const count = await getPendingLabCountInDraft(db, draftId);
              if (count > 0) {
                logger.debug('more pending labs found', { 'lab.pending_count': count });
                break;
              }

              const draftRound = await incrementDraftRound(db, draftId);
              assert(
                typeof draftRound !== 'undefined',
                'The draft to be incremented does not exist.',
              );
              logger.debug('draft round incremented', draftRound);

              roundsToNotify.push(
                toRoundStartedPayload(draftRound.currRound, draftRound.maxRounds),
              );

              if (draftRound.currRound === null || draftRound.currRound > draftRound.maxRounds) {
                logger.info('intervention round reached');
                break;
              }
            }

            return { submittedRound, roundsToNotify, isUpdate };
          },
          { isolationLevel: 'read committed' },
        );

        // Dispatch notifications after successful transaction
        const [staffEmails, { name: labName }, facultyAndStaff] = await Promise.all([
          getValidStaffEmails(db),
          getLabById(db, lab),
          getFacultyAndStaff(db),
        ]);

        // INSERT: notify staff + all faculty; UPDATE: notify staff only
        const initialRecipients = new Set(staffEmails);

        if (!isUpdate) for (const person of facultyAndStaff) initialRecipients.add(person.email);

        const roundSubmittedRecipients = Array.from(initialRecipients);

        const roundSubmittedEvents = roundSubmittedRecipients.map(email =>
          RoundSubmittedBatchEmailEvent.create({
            draftId: Number(draftId),
            round: submittedRound,
            labId: lab,
            labName,
            recipientEmail: email,
            isUpdate,
          }),
        );

        const roundStartedEvents = roundsToNotify.flatMap(round =>
          facultyAndStaff.map(({ email, givenName, familyName }) =>
            RoundStartedBatchEmailEvent.create({
              draftId: Number(draftId),
              round,
              recipientEmail: email,
              recipientName: `${givenName} ${familyName}`,
            }),
          ),
        );

        await inngest.send([...roundSubmittedEvents, ...roundStartedEvents]);
        logger.info('student rankings submitted');
      } catch (err) {
        if (err instanceof RoundMismatchError) {
          logger.fatal('round mismatch - round may have advanced since page load', err, {
            'draft.id': draftId.toString(),
            'draft.round.current': err.currentRound,
            'draft.round.expected': err.expectedRound,
          });
          return fail(409);
        }
        throw err;
      }
    });
  },
};

class RoundMismatchError extends Error {
  constructor(
    public readonly currentRound: number,
    public readonly expectedRound: number,
  ) {
    super(`expected round ${expectedRound} but got round ${currentRound}`);
    this.name = 'RoundMismatchError';
  }
}
