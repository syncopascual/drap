<script lang="ts">
  import CheckCircle2Icon from '@lucide/svelte/icons/check-circle-2';
  import SparklesIcon from '@lucide/svelte/icons/sparkles';

  import * as Alert from '$lib/components/ui/alert';
  import DraftAssignments from '$lib/features/drafts/assignments/index.svelte';
  import type {
    Draft,
    DraftAssignmentCountByAttribute,
    DraftLabQuotaSnapshot,
    Lab,
  } from '$lib/features/drafts/types';

  interface Props {
    draftId: string;
    draft: Pick<Draft, 'activePeriodStart' | 'activePeriodEnd' | 'maxRounds'>;
    totalStudents: number;
    labs: Lab[];
    snapshots: DraftLabQuotaSnapshot[];
    isReview: boolean;
    assignmentCountsByAttribute: DraftAssignmentCountByAttribute[];
  }

  const {
    draftId,
    draft,
    totalStudents,
    labs,
    snapshots,
    isReview,
    assignmentCountsByAttribute,
  }: Props = $props();
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
</div>
