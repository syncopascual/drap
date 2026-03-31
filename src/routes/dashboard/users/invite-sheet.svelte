<script lang="ts">
  import UsersIcon from '@lucide/svelte/icons/users';
  import type { QueryClient } from '@tanstack/svelte-query';
  import type { Snippet } from 'svelte';

  import * as Sheet from '$lib/components/ui/sheet';
  import Invited from '$lib/users/invited.svelte';
  import { Button } from '$lib/components/ui/button';
  import { createFetchInvitedUsersQuery } from '$lib/queries/fetch-invited-users';

  interface Props {
    type: 'admins' | 'heads';
    inviteForm: Snippet;
    queryClient: QueryClient;
  }

  const { type, inviteForm, queryClient }: Props = $props();

  let sheetOpen = $state(false);

  const query = createFetchInvitedUsersQuery(() => (sheetOpen ? type : null));
</script>

<Sheet.Root bind:open={sheetOpen}>
  <Sheet.Trigger>
    {#snippet child({ props })}
      <Button variant="outline" size="sm" {...props}>
        <UsersIcon class="mr-2 size-4" />
        Manage Invitations
      </Button>
    {/snippet}
  </Sheet.Trigger>
  <Sheet.Content class="flex w-full flex-col overflow-hidden sm:max-w-md">
    <Sheet.Header>
      <Sheet.Title>
        {type === 'heads' ? 'Invite Lab Heads' : 'Invite Draft Administrators'}
      </Sheet.Title>
      <Sheet.Description>Invite new users or view pending invitations.</Sheet.Description>
    </Sheet.Header>

    <div class="flex-1 overflow-y-auto px-4 pb-4">
      <div class="mb-6">
        {@render inviteForm()}
      </div>

      <h5 class="mb-4 text-sm font-medium text-muted-foreground">Pending Invitations</h5>
      <div class="flex flex-col gap-4">
        {#if query.isPending}
          <p class="text-sm text-muted-foreground">Loading pending invitations...</p>
        {:else if query.isError}
          <p class="text-sm text-destructive">Failed to load pending invitations.</p>
        {:else if query.data}
          {#if query.data.length === 0}
            <p class="text-sm text-muted-foreground">No pending invitations.</p>
          {:else}
            {#each query.data as user (user.id)}
              <Invited {user} {queryClient} />
            {/each}
          {/if}
        {/if}
      </div>
    </div>
  </Sheet.Content>
</Sheet.Root>
