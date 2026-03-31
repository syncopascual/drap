<script lang="ts">
  import RegistrantsChart from './registrants-chart.svelte';
  import DrafteesSheet from './draftees-sheet.svelte';

  interface Props {
    draftId: string;
    draftCreatedAt: Date;
    registrationClosedAt: Date;
    startedAt: Date | null;
    requestedAt: Date;
    timelineData: { date: Date; count: number }[];
    studentCount: number;
  }

  const { draftId, draftCreatedAt, registrationClosedAt, startedAt, requestedAt, timelineData, studentCount }: Props = $props();
</script>

<div class="space-y-6">
  <div class="prose dark:prose-invert">
    <p>
      <strong>{studentCount}</strong> students registered for this draft.
    </p>
  </div>

  <RegistrantsChart 
    {draftCreatedAt}
    {registrationClosedAt}
    {startedAt}
    {requestedAt}
    {timelineData}
  />

  <div class="flex justify-end">
    <DrafteesSheet {draftId} {registrationClosedAt} />
  </div>
</div>