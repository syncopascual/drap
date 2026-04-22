<script lang="ts" module>
  import Step, { type Status } from '$lib/features/drafts/timeline/step.svelte';
  import type { schema } from '$lib/server/database/drizzle';

  export interface Props {
    candidateCount: number;
    designated?: Pick<schema.User, 'givenName' | 'familyName' | 'email'>;
  }
</script>

<script lang="ts">
  import AtSignIcon from '@lucide/svelte/icons/at-sign';
  import KeyRoundIcon from '@lucide/svelte/icons/key-round';
  import TimerIcon from '@lucide/svelte/icons/timer';
  import UsersIcon from '@lucide/svelte/icons/users';

  const { candidateCount, designated }: Props = $props();

  const step1Status: Status = $derived(candidateCount > 0 ? 'completed' : 'active');
  const step2Status: Status = $derived.by(() => {
    if (typeof designated !== 'undefined') return 'completed';
    if (candidateCount > 0) return 'active';
    return 'pending';
  });
</script>

<div class="pl-1">
  <p class="mb-4 text-sm text-muted-foreground">
    Assign an administrator Gmail account to send draft notifications.
  </p>
  <Step title="Volunteer Candidate Senders" status={step1Status} collapsible={false}>
    {#snippet metadata()}
      <span class="text-sm text-muted-foreground">
        {candidateCount}
        {candidateCount === 1 ? 'candidate' : 'candidates'}
      </span>
    {/snippet}
    <p class="text-sm text-muted-foreground">
      A draft administrator can volunteer via the <strong>Volunteer as Candidate Sender</strong> button.
    </p>
    <ul class="mt-3 space-y-2 text-sm">
      <li class="flex items-start gap-2">
        <KeyRoundIcon class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <span>Grants Gmail send access via Google's consent screen.</span>
      </li>
      <li class="flex items-start gap-2">
        <AtSignIcon class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <span
          >If promoted, your personal Gmail will be used as the sender for all draft notifications.</span
        >
      </li>
      <li class="flex items-start gap-2">
        <UsersIcon class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <span
          >Consent is personal: only you can volunteer yourself, any admin can <strong
            >Promote</strong
          >, <strong>Demote</strong>, or <strong>Remove</strong> candidates.</span
        >
      </li>
    </ul>
  </Step>
  <Step title="Designate a Sender" status={step2Status} collapsible={false} last>
    {#snippet metadata()}
      {#if typeof designated === 'undefined'}
        <span class="text-sm text-muted-foreground">Not yet assigned</span>
      {:else}
        <span class="text-sm text-muted-foreground">
          {designated.givenName}
          {designated.familyName}
        </span>
      {/if}
    {/snippet}
    {#if typeof designated === 'undefined'}
      <p class="text-sm text-muted-foreground">
        {#if candidateCount === 0}
          Once a candidate exists, any admin can <strong>Promote</strong> them to be the
          <strong>Designated Sender</strong>.
        {:else}
          Press <strong>Promote</strong> on any candidate's row to designate them.
        {/if}
      </p>
    {:else}
      <p class="text-sm text-muted-foreground">
        <strong>{designated.givenName} {designated.familyName}</strong>
        (<a href="mailto:{designated.email}" class="underline">{designated.email}</a>) will send all
        draft notifications.
      </p>
    {/if}
    <ul class="mt-3 space-y-2 text-sm">
      <li class="flex items-start gap-2">
        <TimerIcon class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <span
          >Gmail rate-limits automated emails over a rolling 24-hour window. Delivery may be delayed
          during high-volume draft events.</span
        >
      </li>
    </ul>
  </Step>
</div>
