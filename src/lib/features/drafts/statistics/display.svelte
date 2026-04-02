<script lang="ts" module>
  import type {
    DraftAssignmentRecord,
    DraftLabQuotaSnapshot,
    Lab,
  } from '$lib/features/drafts/types';

  export interface ExternalProps {
    maxRounds: number;
    totalStudents: number;
    labs: Lab[];
    snapshots: DraftLabQuotaSnapshot[];
  }
</script>

<script lang="ts">
  import UsersIcon from '@lucide/svelte/icons/users';

  import * as Card from '$lib/components/ui/card';

  import DraftRoundsChart from './draft-rounds-chart.svelte';

  interface Props extends ExternalProps {
    regularDrafted: DraftAssignmentRecord[];
    interventionDrafted: DraftAssignmentRecord[];
    lotteryDrafted: DraftAssignmentRecord[];
  }

  const {
    regularDrafted,
    interventionDrafted,
    lotteryDrafted,
    maxRounds,
    totalStudents,
    labs,
    snapshots,
  }: Props = $props();
  const participatingLabs = $derived(snapshots.length > 0 ? snapshots.length : labs.length);
</script>

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
        {participatingLabs}
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
        {maxRounds}
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
        {interventionDrafted.length}
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
        {lotteryDrafted.length}
      </Card.Title>
    </Card.Header>
    <Card.Footer class="flex-col items-start gap-1.5 text-sm">
      <div class="text-muted-foreground">Students Chosen During Lottery</div>
    </Card.Footer>
  </Card.Root>
</div>
<DraftRoundsChart
  records={regularDrafted}
  {maxRounds}
  interventionRecords={interventionDrafted}
  lotteryRecords={lotteryDrafted}
  {labs}
  {totalStudents}
/>
