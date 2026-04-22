<script lang="ts" module>
  import type { schema } from '$lib/server/database/drizzle';

  export interface Props {
    userId: schema.User['id'];
    role: Exclude<SenderRole, 'none'>;
  }
</script>

<script lang="ts">
  import ArrowDownIcon from '@lucide/svelte/icons/arrow-down';
  import ArrowUpIcon from '@lucide/svelte/icons/arrow-up';
  import MoreVerticalIcon from '@lucide/svelte/icons/more-vertical';
  import XIcon from '@lucide/svelte/icons/x';
  import type { Component } from 'svelte';
  import { toast } from 'svelte-sonner';

  import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
  import { assert } from '$lib/assert';
  import { Button } from '$lib/components/ui/button';
  import { enhance } from '$app/forms';
  import { SenderRole } from '$lib/features/users/types';

  const { userId, role }: Props = $props();

  interface PrimaryControls {
    action: 'promote' | 'demote';
    text: string;
    icon: Component;
  }

  const primary: PrimaryControls = $derived(
    role === SenderRole.Designated
      ? {
          action: 'demote',
          text: 'Demote',
          icon: ArrowDownIcon,
        }
      : {
          action: 'promote',
          text: 'Promote',
          icon: ArrowUpIcon,
        },
  );
</script>

<div class="flex items-center gap-1">
  <form
    method="post"
    action="/dashboard/users/?/{primary.action}"
    class="contents"
    use:enhance={({ submitter }) => {
      assert(submitter !== null);
      assert(submitter instanceof HTMLButtonElement);
      submitter.disabled = true;
      return async ({ update }) => {
        submitter.disabled = false;
        await update();
      };
    }}
  >
    <input type="hidden" name="userId" value={userId} />
    <Button
      type="submit"
      size="sm"
      class={primary.action === 'promote'
        ? 'bg-success text-success-foreground hover:bg-success/80'
        : 'bg-warning text-warning-foreground hover:bg-warning/80'}
    >
      <primary.icon class="size-4" />
      <span>{primary.text}</span>
    </Button>
  </form>
  <form
    method="post"
    action="/dashboard/users/?/remove"
    class="contents"
    use:enhance={({ submitter }) => {
      assert(submitter !== null);
      assert(submitter instanceof HTMLButtonElement);
      submitter.disabled = true;
      return async ({ update, result }) => {
        submitter.disabled = false;
        await update();
        switch (result.type) {
          case 'success':
            toast.success('Sender removed.');
            break;
          case 'failure':
          case 'error':
            toast.error('Failed to update sender.');
            break;
          default:
            break;
        }
      };
    }}
  >
    <input type="hidden" name="userId" value={userId} />
    <Button type="submit" size="sm" variant="destructive" class="hidden sm:inline-flex">
      <XIcon class="size-4" />
      <span>Remove</span>
    </Button>
  </form>
  <DropdownMenu.Root>
    <DropdownMenu.Trigger>
      {#snippet child({ props })}
        <Button
          {...props}
          size="icon"
          variant="ghost"
          class="size-8 sm:hidden"
          aria-label="More Actions"
        >
          <MoreVerticalIcon class="size-4" />
        </Button>
      {/snippet}
    </DropdownMenu.Trigger>
    <DropdownMenu.Content align="end">
      <form
        method="post"
        action="/dashboard/users/?/remove"
        class="contents"
        use:enhance={({ submitter }) => {
          assert(submitter !== null);
          assert(submitter instanceof HTMLButtonElement);
          submitter.disabled = true;
          return async ({ update, result }) => {
            submitter.disabled = false;
            await update();
            switch (result.type) {
              case 'success':
                toast.success('Sender removed.');
                break;
              case 'failure':
              case 'error':
                toast.error('Failed to update sender.');
                break;
              default:
                break;
            }
          };
        }}
      >
        <input type="hidden" name="userId" value={userId} />
        <DropdownMenu.Item variant="destructive">
          {#snippet child({ props })}
            <button type="submit" {...props}>
              <XIcon class="size-4" />
              <span>Remove</span>
            </button>
          {/snippet}
        </DropdownMenu.Item>
      </form>
    </DropdownMenu.Content>
  </DropdownMenu.Root>
</div>
