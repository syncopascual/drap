<script lang="ts">
  import DrafteesSheet from './draftees-sheet.svelte';
  import RegistrantsChart from './registrants-chart.svelte';

  interface Props {
    draftId: string;
    draftCreatedAt: Date;
    registrationClosedAt: Date;
    startedAt: Date | null;
    requestedAt: Date;
    timelineData: { date: Date; count: number }[];
    studentCount: number;
    lateRegistrantsCount: number;
  }

  const { draftId, draftCreatedAt, registrationClosedAt, startedAt, requestedAt, timelineData, studentCount, lateRegistrantsCount }: Props = $props();
</script>

<div class="space-y-6">
  <div class="prose dark:prose-invert">
    <p>
      <strong>{studentCount}</strong> students registered for this draft.
    </p>
    {#if lateRegistrantsCount > 0}
      <p>
        <strong>{lateRegistrantsCount}</strong> students registered after registration closed.
      </p>
    {/if}
  </div>

  <RegistrantsChart 
    {draftCreatedAt}
    {registrationClosedAt}
    {startedAt}
    {requestedAt}
    {timelineData}
  />

  <div class="flex justify-end">
    <DrafteesSheet {draftId} />
  </div>
</div>