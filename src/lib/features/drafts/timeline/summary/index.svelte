<script lang="ts">
  import ArrowUpFromLineIcon from '@lucide/svelte/icons/arrow-up-from-line';
  import CheckCircle2Icon from '@lucide/svelte/icons/check-circle-2';
  import SparklesIcon from '@lucide/svelte/icons/sparkles';
  import { lightFormat } from 'date-fns';

  import * as Alert from '$lib/components/ui/alert';
  import DraftAssignments from '$lib/features/drafts/assignments/index.svelte';
  import DraftStatistics from '$lib/features/drafts/statistics/index.svelte';
  import { Button } from '$lib/components/ui/button';
  import type { Draft, DraftLabQuotaSnapshot, Lab } from '$lib/features/drafts/types';
  import { resolve } from '$app/paths';

  interface Props {
    draftId: string;
    requestedAt: Date;
    draft: Pick<Draft, 'activePeriodStart' | 'activePeriodEnd' | 'maxRounds'>;
    totalStudents: number;
    labs: Lab[];
    snapshots: DraftLabQuotaSnapshot[];
    isReview: boolean;
  }

  const { draftId, requestedAt, draft, totalStudents, labs, snapshots, isReview }: Props = $props();
</script>

<div class="@container space-y-4">
  {#if isReview}
    <Alert.Root variant="warning">
      <SparklesIcon class="text-accent" />
      <Alert.Title>Draft Review</Alert.Title>
      <Alert.Description>
        Lottery assignments are complete. Review results below before finalizing.
      </Alert.Description>
    </Alert.Root>
  {:else}
    <Alert.Root variant="success">
      <CheckCircle2Icon class="text-success" />
      <Alert.Title>Draft Finalized</Alert.Title>
      <Alert.Description>
        This draft has been completed. All students have been assigned to their respective labs.
      </Alert.Description>
    </Alert.Root>
  {/if}
  <DraftStatistics {draftId} maxRounds={draft.maxRounds} {totalStudents} {labs} {snapshots} />
  <DraftAssignments {draftId} maxRounds={draft.maxRounds} />
  <div class="flex flex-row gap-2 @max-[52rem]:grid @max-[52rem]:grid-cols-1">
    <Button
      href={resolve(`/dashboard/drafts/${draftId}/students.csv`)}
      download="{lightFormat(requestedAt, 'yyyy-MM-dd')}_{draftId}_students.csv"
      variant="outline"
      class="@max-[52rem]:h-auto @max-[52rem]:min-h-9 @max-[52rem]:justify-start @max-[52rem]:py-1.5 @max-[52rem]:whitespace-normal"
    >
      <ArrowUpFromLineIcon class="size-5" />
      <span>Export Student Ranks</span>
    </Button>
    <Button
      href={resolve(`/dashboard/drafts/${draftId}/results.csv`)}
      download="{lightFormat(requestedAt, 'yyyy-MM-dd')}_{draftId}_results.csv"
      variant="outline"
      class="@max-[52rem]:h-auto @max-[52rem]:min-h-9 @max-[52rem]:justify-start @max-[52rem]:py-1.5 @max-[52rem]:whitespace-normal"
    >
      <ArrowUpFromLineIcon class="size-5" />
      <span>Export Final Results</span>
    </Button>
    <Button
      href={resolve(`/dashboard/drafts/${draftId}/system-logs.csv`)}
      download="{lightFormat(requestedAt, 'yyyy-MM-dd')}_{draftId}_system-logs.csv"
      variant="outline"
      class="@max-[52rem]:h-auto @max-[52rem]:min-h-9 @max-[52rem]:justify-start @max-[52rem]:py-1.5 @max-[52rem]:whitespace-normal"
    >
      <ArrowUpFromLineIcon class="size-5" />
      <span>Export System Logs</span>
    </Button>
  </div>
</div>
