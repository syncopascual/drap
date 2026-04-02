import { createQuery } from '@tanstack/svelte-query';

import { fetchInvitedUsers } from './http';

export function createFetchInvitedUsersQuery(type: 'admins' | 'heads') {
  return createQuery(() => ({
    queryKey: ['users', 'invited', type] as const,
    async queryFn({ queryKey: [, , type] }) {
      return await fetchInvitedUsers(type);
    },
  }));
}
