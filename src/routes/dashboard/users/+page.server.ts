import { fail as assertFail } from 'node:assert/strict';

import * as v from 'valibot';
import { and, eq, isNull } from 'drizzle-orm';
import { decode } from 'decode-formdata';
import { error, fail, redirect } from '@sveltejs/kit';

import * as schema from '$lib/server/database/schema';
import { db } from '$lib/server/database';
import {
  type DbConnection,
  getFacultyAndStaff,
  getLabRegistry,
} from '$lib/server/database/drizzle';
import { Logger } from '$lib/server/telemetry/logger';
import { Tracer } from '$lib/server/telemetry/tracer';

const AdminFormData = v.object({
  email: v.pipe(v.string(), v.email()),
});

const FacultyFormData = v.object({
  email: v.pipe(v.string(), v.email()),
  invite: v.pipe(v.string(), v.minLength(1)),
});

const DeleteInviteFormData = v.object({
  id: v.pipe(v.string(), v.minLength(1)),
});

const SERVICE_NAME = 'routes.dashboard.users';
const logger = Logger.byName(SERVICE_NAME);
const tracer = Tracer.byName(SERVICE_NAME);

export async function load({ locals: { session } }) {
  if (typeof session?.user === 'undefined') {
    logger.error('attempt to access users page without session');
    redirect(307, '/dashboard/oauth/login');
  }

  if (!session.user.isAdmin || session.user.googleUserId === null || session.user.labId !== null) {
    logger.fatal('insufficient permissions to access users page', void 0, {
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

  return await tracer.asyncSpan('load-users-page', async span => {
    span.setAttributes({
      'session.id': sessionId,
      'session.user.id': userId,
    });

    const [labs, faculty] = await Promise.all([getLabRegistry(db), getFacultyAndStaff(db)]);
    logger.debug('users page loaded', {
      'lab.count': labs.length,
      'user.faculty_count': faculty.length,
    });
    return { labs, faculty };
  });
}

export const actions = {
  async admin({ locals: { session }, request }) {
    if (typeof session?.user === 'undefined') {
      logger.fatal('attempt to invite user without session');
      error(401);
    }

    if (
      !session.user.isAdmin ||
      session.user.googleUserId === null ||
      session.user.labId !== null
    ) {
      logger.fatal('insufficient permissions to invite user', void 0, {
        'user.is_admin': session.user.isAdmin,
        'user.google_id': session.user.googleUserId,
        'user.lab_id': session.user.labId,
      });
      error(403);
    }

    return await tracer.asyncSpan('action.admin', async () => {
      const data = await request.formData();
      const { email } = v.parse(AdminFormData, decode(data));
      logger.debug('inviting new admin', { 'payload.email': email });

      if (await inviteNewFacultyOrStaff(db, email, null)) {
        logger.info('new admin invited');
        return;
      }

      logger.fatal('admin email was already invited before');
      return fail(409);
    });
  },
  async faculty({ locals: { session }, request }) {
    if (typeof session?.user === 'undefined') {
      logger.fatal('attempt to invite faculty without session');
      error(401);
    }

    if (
      !session.user.isAdmin ||
      session.user.googleUserId === null ||
      session.user.labId !== null
    ) {
      logger.fatal('insufficient permissions to invite faculty', void 0, {
        'user.is_admin': session.user.isAdmin,
        'user.google_id': session.user.googleUserId,
        'user.lab_id': session.user.labId,
      });
      error(403);
    }

    return await tracer.asyncSpan('action.faculty', async () => {
      const data = await request.formData();
      const { email, invite: lab } = v.parse(FacultyFormData, decode(data));
      logger.debug('inviting new faculty', { 'payload.email': email, 'payload.lab': lab });

      if (await inviteNewFacultyOrStaff(db, email, lab)) {
        logger.info('new faculty invited');
        return;
      }

      logger.fatal('faculty email was already invited before');
      return fail(409);
    });
  },
  async 'delete-invite'({ locals: { session }, request }) {
    if (typeof session?.user === 'undefined') {
      logger.fatal('attempt to delete invite without session');
      error(401);
    }

    if (
      !session.user.isAdmin ||
      session.user.googleUserId === null ||
      session.user.labId !== null
    ) {
      logger.fatal('insufficient permissions to delete invite', void 0, {
        'user.is_admin': session.user.isAdmin,
        'user.google_id': session.user.googleUserId,
        'user.lab_id': session.user.labId,
      });
      error(403);
    }

    return await tracer.asyncSpan('action.delete-invite', async () => {
      const data = await request.formData();
      const { id } = v.parse(DeleteInviteFormData, decode(data));
      logger.debug('deleting invite', { 'payload.id': id });

      if (await deleteInvitation(db, id)) {
        logger.info('invite deleted');
        return;
      }

      logger.fatal('invite could not be deleted');
      return fail(404);
    });
  },
};

async function inviteNewFacultyOrStaff(db: DbConnection, email: string, labId: string | null) {
  return await tracer.asyncSpan('invite-new-faculty-or-staff', async span => {
    span.setAttribute('database.user.email', email);
    if (labId !== null) span.setAttribute('database.lab.id', labId);
    const { rowCount } = await db
      .insert(schema.user)
      .values({ email, labId, isAdmin: true })
      .onConflictDoNothing({ target: schema.user.email });
    switch (rowCount) {
      case 0:
        return false;
      case 1:
        return true;
      default:
        assertFail(`inviteNewFacultyOrStaff => unexpected insertion count ${rowCount}`);
    }
  });
}

async function deleteInvitation(db: DbConnection, id: string) {
  return await tracer.asyncSpan('delete-invitation', async span => {
    span.setAttribute('database.user.id', id);
    const { rowCount } = await db
      .delete(schema.user)
      .where(
        and(
          eq(schema.user.id, id),
          eq(schema.user.isAdmin, true),
          isNull(schema.user.googleUserId),
        ),
      );
    switch (rowCount) {
      case 0:
        return false;
      case 1:
        return true;
      default:
        assertFail(`deleteInvitation => unexpected deletion count ${rowCount}`);
    }
  });
}
