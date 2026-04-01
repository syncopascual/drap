import * as v from 'valibot';

import { FetchInvitedUsersResponse } from './schema';

export async function fetchInvitedUsers(type: 'admins' | 'heads') {
  const response = await fetch(`/dashboard/api/users/invited/${type}`);
  if (!response.ok) throw new Error('Failed to fetch invited users.');

  const json = await response.json();
  return v.parse(FetchInvitedUsersResponse, json);
}
