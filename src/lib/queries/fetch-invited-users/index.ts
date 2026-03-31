import { createQuery, skipToken } from '@tanstack/svelte-query';

import { fetchInvitedUsers } from './http';

export function createFetchInvitedUsersQuery(getType: () => 'admins' | 'heads' | null) {
  return createQuery(() => {
    const type = getType();
    return {
      queryKey: ['users', 'invited', type] as const,
      queryFn:
        type === null
          ? skipToken
          : async ({ queryKey: [, , t] }) =>
              await fetchInvitedUsers({ type: t as 'admins' | 'heads' }),
    };
  });
}
