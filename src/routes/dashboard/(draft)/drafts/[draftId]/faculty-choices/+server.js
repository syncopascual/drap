import * as devalue from 'devalue';
import { error } from '@sveltejs/kit';

import { db } from '$lib/server/database';
import { getFacultyChoiceRecords } from '$lib/server/database/drizzle';
import { Logger } from '$lib/server/telemetry/logger';
import { Tracer } from '$lib/server/telemetry/tracer';

const SERVICE_NAME = 'routes.dashboard.admin.drafts.faculty-choices';
const logger = Logger.byName(SERVICE_NAME);
const tracer = Tracer.byName(SERVICE_NAME);

export async function GET({ params, locals: { session } }) {
  if (typeof session?.user === 'undefined') {
    logger.fatal('attempt to fetch draft faculty choices without session');
    error(401);
  }

  const { user } = session;
  if (!user.isAdmin || user.googleUserId === null || user.labId !== null) {
    logger.fatal('insufficient permissions to fetch draft faculty choices', void 0, {
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

  return await tracer.asyncSpan('fetch-draft-faculty-choices', async span => {
    span.setAttributes({
      'session.id': sessionId,
      'session.user.id': userId,
    });

    const draftId = BigInt(params.draftId);
    const facultyChoices = await getFacultyChoiceRecords(db, draftId);

    logger.debug('draft faculty choices fetched', {
      'draft.id': draftId.toString(),
      'draft_faculty_choices.count': facultyChoices.length,
    });

    return new Response(devalue.stringify(facultyChoices), {
      headers: { 'Content-Type': 'application/json' },
    });
  });
}
