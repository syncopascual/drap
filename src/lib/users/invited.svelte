<script lang="ts">
  import Trash2Icon from '@lucide/svelte/icons/trash-2';
  import UserCircleIcon from '@lucide/svelte/icons/circle-user';
  import { toast } from 'svelte-sonner';
  // eslint-disable-next-line no-restricted-imports
  import { useQueryClient } from '@tanstack/svelte-query';

  import * as Avatar from '$lib/components/ui/avatar';
  import * as Tooltip from '$lib/components/ui/tooltip';
  import { assert } from '$lib/assert';
  import { Badge } from '$lib/components/ui/badge';
  import { Button } from '$lib/components/ui/button';
  import { enhance } from '$app/forms';
  import type { schema } from '$lib/server/database/drizzle';

  interface User extends Pick<
    schema.User,
    'id' | 'givenName' | 'familyName' | 'email' | 'avatarUrl'
  > {
    labId: string | null;
  }

  interface Props {
    user: User;
  }

  const { user }: Props = $props();
  const { id, givenName, familyName, email, avatarUrl, labId } = $derived(user);

  const queryClient = useQueryClient();
</script>

<div
  class="flex items-center justify-between gap-4 rounded-md border border-dashed p-3 opacity-80 transition-opacity hover:opacity-100"
>
  <div class="flex items-center gap-3 overflow-hidden">
    <Avatar.Root class="size-10 shrink-0">
      <Avatar.Image src={avatarUrl} alt="{givenName} {familyName}" />
      <Avatar.Fallback>
        <UserCircleIcon class="size-10 text-muted-foreground" />
      </Avatar.Fallback>
    </Avatar.Root>

    <div class="flex min-w-0 items-center gap-2">
      <a href="mailto:{email}" class="truncate text-sm font-semibold hover:underline">
        {email}
      </a>
      {#if labId !== null}
        <Badge variant="secondary" class="shrink-0 text-xs uppercase">{labId}</Badge>
      {/if}
    </div>
  </div>

  <div class="flex shrink-0 items-center gap-2">
    <form
      method="POST"
      action="/dashboard/users/?/deleteInvite"
      use:enhance={({ submitter, cancel }) => {
        // eslint-disable-next-line no-alert
        if (!confirm('Are you sure you want to delete this invitation?')) {
          cancel();
          return;
        }

        assert(submitter !== null);
        assert(submitter instanceof HTMLButtonElement);
        submitter.disabled = true;

        return async ({ result, update }) => {
          submitter.disabled = false;
          await update();
          await queryClient.invalidateQueries({ queryKey: ['users', 'invited'] });
          switch (result.type) {
            case 'success':
              toast.success('Invitation deleted.');
              break;
            case 'failure':
              toast.error('Failed to delete invitation.');
              break;
            default:
              break;
          }
        };
      }}
    >
      <input type="hidden" name="id" value={id} />
      <Tooltip.Provider delayDuration={150}>
        <Tooltip.Root>
          <Tooltip.Trigger>
            {#snippet child({ props })}
              <Button {...props} type="submit" variant="destructive" size="icon-sm">
                <Trash2Icon class="size-4" />
                <span class="sr-only">Delete Invitation</span>
              </Button>
            {/snippet}
          </Tooltip.Trigger>
          <Tooltip.Content side="top">
            <p>Delete Invitation</p>
          </Tooltip.Content>
        </Tooltip.Root>
      </Tooltip.Provider>
    </form>
  </div>
</div>
