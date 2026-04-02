<script lang="ts">
  import UserCircleIcon from '@lucide/svelte/icons/circle-user';

  import * as Avatar from '$lib/components/ui/avatar';
  import * as Card from '$lib/components/ui/card';
  import type { schema } from '$lib/server/database/drizzle';

  interface User extends Pick<schema.User, 'email' | 'givenName' | 'familyName' | 'avatarUrl'> {
    labName: string | null;
  }

  interface Props {
    user: User;
  }

  const { user }: Props = $props();
  const { email, givenName, familyName, avatarUrl, labName } = $derived(user);
</script>

<a href="mailto:{email}" class="block h-full transition-transform duration-150 hover:scale-[1.02]">
  <Card.Root class="flex h-full flex-col items-center gap-4 p-4 text-center">
    <Avatar.Root class="size-16">
      <Avatar.Image src={avatarUrl} alt="{givenName} {familyName}" />
      <Avatar.Fallback>
        <UserCircleIcon class="size-16 text-muted-foreground" />
      </Avatar.Fallback>
    </Avatar.Root>
    <div class="flex flex-col gap-1">
      {#if givenName.length > 0 && familyName.length > 0}
        <Card.Title class="text-base font-semibold"
          ><span class="uppercase">{familyName}</span>, {givenName}</Card.Title
        >
      {/if}
      <div class="flex flex-col gap-0.5">
        {#if labName !== null}
          <span class="text-sm font-medium text-foreground">{labName}</span>
        {/if}
        <span class="text-xs text-muted-foreground">{email}</span>
      </div>
    </div>
  </Card.Root>
</a>
