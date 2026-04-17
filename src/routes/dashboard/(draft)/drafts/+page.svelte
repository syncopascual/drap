<script lang="ts">
  import { DraftTable, InitDialog, StatsChart } from '$lib/features/drafts';

  import { buildDraftStatsChartData } from './stats';

  const { data } = $props();
  const { drafts, draftStatsByYear } = $derived(data);
  const [latestDraft] = $derived(drafts);

  const chartData = $derived.by(() => {
    if (!draftStatsByYear) return Promise.resolve(null);
    return draftStatsByYear.then(stats => {
      if (!stats) return null;
      return buildDraftStatsChartData(stats);
    });
  });
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h2 class="text-2xl font-bold">Drafts</h2>
      <p class="text-muted-foreground">Manage all draft sessions</p>
    </div>
    {#if typeof latestDraft === 'undefined' || latestDraft.activePeriodEnd !== null}
      <!-- There should only ever be one active draft at a time. -->
      <InitDialog />
    {/if}
  </div>
  <DraftTable {drafts} />
  <StatsChart stats={chartData} />
</div>
