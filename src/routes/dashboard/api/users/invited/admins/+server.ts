import { error, json } from '@sveltejs/kit';

import { db } from '$lib/server/database';
import { getInvitedAdmins } from '$lib/server/database/drizzle';
import { Logger } from '$lib/server/telemetry/logger';
import { Tracer } from '$lib/server/telemetry/tracer';

const SERVICE_NAME = 'routes.dashboard.api.users.invited.admins';
const logger = Logger.byName(SERVICE_NAME);
const tracer = Tracer.byName(SERVICE_NAME);

export async function GET({ locals: { session } }) {
  if (typeof session?.user === 'undefined') {
    logger.fatal('attempt to access invited admins without session');
    error(401);
  }

  if (!session.user.isAdmin || session.user.googleUserId === null || session.user.labId !== null) {
    logger.fatal('insufficient permissions to access invited admins', void 0, {
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

  return await tracer.asyncSpan('fetch-invited-admins', async span => {
    span.setAttributes({
      'session.id': sessionId,
      'session.user.id': userId,
    });
    const admins = await getInvitedAdmins(db);
    return json(admins);
  });
}
