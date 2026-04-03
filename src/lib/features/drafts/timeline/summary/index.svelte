<script lang="ts">
  import CheckCircle2Icon from '@lucide/svelte/icons/check-circle-2';
  import SparklesIcon from '@lucide/svelte/icons/sparkles';
  import UsersIcon from '@lucide/svelte/icons/users';

  import * as Alert from '$lib/components/ui/alert';
  import * as Card from '$lib/components/ui/card';
  import DraftAssignments from '$lib/features/drafts/assignments/index.svelte';
  import type { Draft, DraftAssignmentSummary } from '$lib/features/drafts/types';

  import DraftRoundsChart from './draft-rounds-chart.svelte';

  interface Props {
    draftId: string;
    draft: Pick<Draft, 'activePeriodStart' | 'activePeriodEnd' | 'maxRounds'>;
    totalStudents: number;
    assignmentSummary: DraftAssignmentSummary;
    isReview: boolean;
  }

  const { draftId, draft, totalStudents, assignmentSummary, isReview }: Props = $props();
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
  <div class="mb-15 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
    <Card.Root>
      <Card.Header>
        <Card.Title class="text-md font-semibold tabular-nums">Total Students</Card.Title>
        <Card.Title id="stat-total-students" class="text-4xl font-semibold tabular-nums">
          {totalStudents}
        </Card.Title>
      </Card.Header>
      <Card.Footer class="flex-col items-start gap-1.5 text-sm">
        <div class="flex items-center gap-2 font-medium text-muted-foreground">
          <UsersIcon class="size-4 text-muted-foreground" />
          All Registered Participants
        </div>
      </Card.Footer>
    </Card.Root>
    <Card.Root class="bg-linear-to-br from-muted/30 to-muted/10">
      <Card.Header>
        <Card.Title class="text-md font-semibold tabular-nums">Participating Labs</Card.Title>
        <Card.Title id="stat-participating-labs" class="text-4xl font-semibold tabular-nums">
          {assignmentSummary.metrics.participatingLabCount}
        </Card.Title>
      </Card.Header>
      <Card.Footer class="flex-col items-start gap-1.5 text-sm">
        <div class="text-muted-foreground">Active Labs in Draft</div>
      </Card.Footer>
    </Card.Root>
    <Card.Root class="bg-linear-to-br from-muted/30 to-muted/10">
      <Card.Header>
        <Card.Title class="text-md font-semibold tabular-nums">Max Rounds</Card.Title>
        <Card.Title id="stat-max-rounds" class="text-4xl font-semibold tabular-nums">
          {draft.maxRounds}
        </Card.Title>
      </Card.Header>
      <Card.Footer class="flex-col items-start gap-1.5 text-sm">
        <div class="text-muted-foreground">Regular draft rounds</div>
      </Card.Footer>
    </Card.Root>
    <Card.Root class="bg-linear-to-br from-muted/30 to-muted/10">
      <Card.Header>
        <Card.Title class="text-md font-semibold tabular-nums">Interventions</Card.Title>
        <Card.Title id="quota-interventions" class="text-4xl font-semibold tabular-nums">
          {assignmentSummary.metrics.interventionDraftedCount}
        </Card.Title>
      </Card.Header>
      <Card.Footer class="flex-col items-start gap-1.5 text-sm">
        <div class="text-muted-foreground">Interventions Made</div>
      </Card.Footer>
    </Card.Root>
    <Card.Root class="bg-linear-to-br from-muted/30 to-muted/10">
      <Card.Header>
        <Card.Title class="text-md font-semibold tabular-nums">Lottery Assignments</Card.Title>
        <Card.Title id="stat-lottery-assignments" class="text-4xl font-semibold tabular-nums">
          {assignmentSummary.metrics.lotteryDraftedCount}
        </Card.Title>
      </Card.Header>
      <Card.Footer class="flex-col items-start gap-1.5 text-sm">
        <div class="text-muted-foreground">Students Chosen During Lottery</div>
      </Card.Footer>
    </Card.Root>
  </div>
  <DraftRoundsChart chart={assignmentSummary.chart} />
  <DraftAssignments {draftId} maxRounds={draft.maxRounds} />
</div>
