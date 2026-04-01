import { error, json } from '@sveltejs/kit';

import { db } from '$lib/server/database';
import { getInvitedHeads } from '$lib/server/database/drizzle';
import { Logger } from '$lib/server/telemetry/logger';
import { Tracer } from '$lib/server/telemetry/tracer';

import type { RequestEvent } from './$types';

const SERVICE_NAME = 'routes.dashboard.api.users.invited.heads';
const logger = Logger.byName(SERVICE_NAME);
const tracer = Tracer.byName(SERVICE_NAME);

export async function GET({ locals: { session } }: RequestEvent) {
  if (typeof session?.user === 'undefined') {
    logger.fatal('attempt to access invited heads without session');
    error(401);
  }

  if (!session.user.isAdmin || session.user.googleUserId === null || session.user.labId !== null) {
    logger.fatal('insufficient permissions to access invited heads', void 0, {
      'user.is_admin': session.user.isAdmin,
      'user.google_id': session.user.googleUserId,
      'user.lab_id': session.user.labId,
    });
    error(403);
  }

  const {
    id: sessionId,
    user: { id: userId },
  } = session;

  return await tracer.asyncSpan('fetch-invited-heads', async span => {
    span.setAttributes({
      'session.id': sessionId,
      'session.user.id': userId,
    });

    const heads = await getInvitedHeads(db);
    return json(heads);
  });
}
