<script lang="ts">
  import Loader2Icon from '@lucide/svelte/icons/loader-2';
  import UsersIcon from '@lucide/svelte/icons/users';

  import * as Empty from '$lib/components/ui/empty';
  import * as Sheet from '$lib/components/ui/sheet';
  import Invited from '$lib/users/invited.svelte';
  import { Button } from '$lib/components/ui/button';
  import { createFetchInvitedUsersQuery } from '$lib/queries/fetch-invited-users';
  import type { schema } from '$lib/server/database/drizzle';

  import AdminForm from './admin-form.svelte';
  import FacultyForm from './faculty-form.svelte';

  type Lab = Pick<schema.Lab, 'id' | 'name'>;

  interface Props {
    labs?: Lab[];
  }

  const { labs }: Props = $props();

  const isLabHeadMode = $derived(typeof labs !== 'undefined');
  const inviteType = $derived(isLabHeadMode ? 'heads' : 'admins');
  const query = $derived(createFetchInvitedUsersQuery(inviteType));
</script>

<Sheet.Root>
  <Sheet.Trigger>
    {#snippet child({ props })}
      <Button variant="outline" size="sm" {...props}>
        <UsersIcon class="mr-2 size-4" />
        <span>Manage Invitations</span>
      </Button>
    {/snippet}
  </Sheet.Trigger>
  <Sheet.Content class="flex w-full flex-col overflow-hidden sm:max-w-md">
    <Sheet.Header>
      <Sheet.Title>
        {#if typeof labs === 'undefined'}
          Invite Draft Administrators
        {:else}
          Invite Lab Heads
        {/if}
      </Sheet.Title>
      <Sheet.Description>Invite new users or view pending invitations.</Sheet.Description>
    </Sheet.Header>
    <div class="flex min-h-0 grow flex-col overflow-y-auto px-4 pb-4">
      <div class="mb-6 shrink-0">
        {#if typeof labs === 'undefined'}
          <AdminForm />
        {:else}
          <FacultyForm {labs} />
        {/if}
      </div>
      <div class="flex min-h-0 grow flex-col gap-4">
        {#if query.isPending}
          <Empty.Root class="min-h-40 grow">
            <Empty.Media>
              <Loader2Icon class="size-5 animate-spin text-muted-foreground" />
            </Empty.Media>
            <Empty.Header>
              <Empty.Title>Loading Invitations</Empty.Title>
              <Empty.Description>Fetching pending invitations.</Empty.Description>
            </Empty.Header>
          </Empty.Root>
        {:else if query.isError}
          <Empty.Root class="min-h-40 grow">
            <Empty.Media variant="icon">
              <UsersIcon class="size-5" />
            </Empty.Media>
            <Empty.Header>
              <Empty.Title class="text-destructive">Failed to Load Invitations</Empty.Title>
              <Empty.Description>Please try again in a moment.</Empty.Description>
            </Empty.Header>
          </Empty.Root>
        {:else if query.data.length === 0}
          <Empty.Root class="min-h-40 grow">
            <Empty.Media variant="icon">
              <UsersIcon class="size-5" />
            </Empty.Media>
            <Empty.Header>
              <Empty.Title>No Pending Invitations</Empty.Title>
              <Empty.Description
                >New invitations will appear here after they are sent.</Empty.Description
              >
            </Empty.Header>
          </Empty.Root>
        {:else}
          {#each query.data as user (user.id)}
            <Invited {user} />
          {/each}
        {/if}
      </div>
    </div>
  </Sheet.Content>
</Sheet.Root>
