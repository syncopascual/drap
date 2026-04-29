<script lang="ts">
  import { BarChart } from 'layerchart';
  import { format } from 'd3-format';

  import * as Card from '$lib/components/ui/card';
  import * as Chart from '$lib/components/ui/chart';
  import DraftedDraftees from '$lib/features/drafts/draftees/drafted/index.svelte';
  import { assert } from '$lib/assert';
  import type { DumbbellRow } from '$lib/features/drafts/types';

  interface Props {
    draftId: string;
    rows: DumbbellRow[];
  }

  const { draftId, rows }: Props = $props();

  const integerFormat = format('d');
  const signedFormat = format('+d');

  const chartConfig = {
    naturalLeftover: { label: 'Natural Leftover', color: 'var(--muted-foreground)' },
    lotteryQuotaAdded: { label: 'Lottery Quota (seats added)', color: 'var(--warning)' },
    lotteryQuotaRemoved: { label: 'Lottery Quota (seats removed)', color: 'var(--muted)' },
    lotteryQuotaEqual: { label: 'Lottery Quota (no change)', color: 'var(--foreground)' },
  };

  const labMetaById = $derived(
    new Map(rows.map(r => [r.labId.toUpperCase(), { labName: r.labName, gap: r.gap }])),
  );

  const chartHeightPx = $derived(Math.max(140, rows.length * 40 + 80));

  /**
   * Each row becomes two grouped bars on a horizontal seat-count axis:
   *   - `naturalLeftover` — the "do nothing" baseline (always muted-foreground).
   *   - one of `lotteryQuotaAdded` / `lotteryQuotaRemoved` / `lotteryQuotaEqual` — the
   *     allocated lottery quota, colored by direction so the legend tells the
   *     "amber = added, slate = removed" story.
   *
   * Sparse object pattern (keyed series only set when applicable) lets the shared band
   * tooltip render only the non-zero bar per row, mirroring `round-summary-chart.svelte`.
   */
  const chartData = $derived(
    rows.map(row => {
      const data: Record<string, number | string> = {
        lab: row.labId.toUpperCase(),
        naturalLeftover: row.naturalLeftover,
      };
      if (row.gap > 0) data.lotteryQuotaAdded = row.lotteryQuota;
      else if (row.gap < 0) data.lotteryQuotaRemoved = row.lotteryQuota;
      else data.lotteryQuotaEqual = row.lotteryQuota;
      return data;
    }),
  );
</script>

<Card.Root
  class="overflow-hidden border-border/60 bg-linear-to-br from-muted/40 via-background to-muted/10 shadow-xs"
>
  <Card.Header class="gap-3">
    <div class="flex flex-wrap items-start justify-between gap-2">
      <div class="space-y-1">
        <Card.Title>Natural Leftover vs. Lottery Quota</Card.Title>
        <Card.Description>
          Per-lab gap between the "do nothing" baseline and the allocated lottery quota.
        </Card.Description>
      </div>
      <DraftedDraftees {draftId} triggerSize="sm" />
    </div>
  </Card.Header>
  <Card.Content>
    {#if rows.length === 0}
      <p class="text-sm text-muted-foreground">No quota data available.</p>
    {:else}
      <Chart.Container
        id="quota-dumbbell-chart"
        config={chartConfig}
        class="w-full"
        style="height: {chartHeightPx}px;"
      >
        <BarChart
          data={chartData}
          y="lab"
          orientation="horizontal"
          seriesLayout="group"
          groupPadding={0.15}
          bandPadding={0.3}
          padding={{ left: 50, top: 8, right: 16, bottom: 40 }}
          series={[
            {
              key: 'naturalLeftover',
              label: 'Natural Leftover',
              color: 'var(--color-naturalLeftover)',
            },
            {
              key: 'lotteryQuotaAdded',
              label: 'Lottery Quota (seats added)',
              color: 'var(--color-lotteryQuotaAdded)',
            },
            {
              key: 'lotteryQuotaRemoved',
              label: 'Lottery Quota (seats removed)',
              color: 'var(--color-lotteryQuotaRemoved)',
            },
            {
              key: 'lotteryQuotaEqual',
              label: 'Lottery Quota (no change)',
              color: 'var(--color-lotteryQuotaEqual)',
            },
          ]}
          legend
          grid
          props={{
            xAxis: {
              format: (value: number) => integerFormat(value),
              tickLabelProps: { dx: -4 },
            },
            yAxis: { grid: false },
          }}
        >
          {#snippet tooltip()}
            <Chart.Tooltip
              indicator="dot"
              labelAccessor={d => {
                assert(typeof d === 'object' && d !== null && 'lab' in d);
                return d.lab;
              }}
              labelFormatter={value => {
                assert(typeof value === 'string');
                const meta = labMetaById.get(value);
                if (typeof meta === 'undefined') return value;
                const gapText = meta.gap === 0 ? 'no change' : signedFormat(meta.gap);
                return `${meta.labName} (${gapText})`;
              }}
              valueFormatter={value => integerFormat(Number(value))}
            />
          {/snippet}
        </BarChart>
      </Chart.Container>
    {/if}
  </Card.Content>
</Card.Root>
