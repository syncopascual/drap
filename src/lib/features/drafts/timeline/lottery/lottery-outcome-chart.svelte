<script lang="ts">
  import { BarChart } from 'layerchart';
  import { format } from 'd3-format';

  import * as Card from '$lib/components/ui/card';
  import * as Chart from '$lib/components/ui/chart';
  import { assert } from '$lib/assert';
  import { CHART_COLORS } from '$lib/constants';
  import type { LotteryOutcomeStack } from '$lib/features/drafts/types';

  interface Props {
    stacks: LotteryOutcomeStack[];
  }

  const { stacks }: Props = $props();

  const NOT_PREFERRED = 'Not Preferred';

  // Dedupe by rank across all stacks, sort numerically (null → "Not Preferred" goes last).
  const allBucketsMeta = $derived(
    Array.from(
      new Map(stacks.flatMap(s => s.buckets.map(b => [b.rank, b.label] as const))).entries(),
    ).sort(([a], [b]) => {
      if (a === null) return 1;
      if (b === null) return -1;
      return a - b;
    }),
  );

  const allLabels = $derived(allBucketsMeta.map(([, label]) => label));

  function labelColor(label: string, i: number): string {
    if (label === NOT_PREFERRED) return 'var(--muted-foreground)';
    const color = CHART_COLORS[i % CHART_COLORS.length];
    assert(typeof color === 'string', 'chart color index out of bounds');
    return color;
  }

  const chartConfig = $derived(
    Object.fromEntries(
      allLabels.map((label, i) => [label, { label, color: labelColor(label, i) }]),
    ),
  );

  const chartSeries = $derived(
    allLabels.map((label, i) => ({
      key: label,
      label,
      color: labelColor(label, i),
    })),
  );

  const chartData = $derived(
    stacks.map(stack => {
      const row: Record<string, number | string> = { lab: stack.labId.toUpperCase() };
      for (const { label, count } of stack.buckets) if (count > 0) row[label] = count;

      return row;
    }),
  );

  const labNameById = $derived(new Map(stacks.map(s => [s.labId.toUpperCase(), s.labName])));

  const integerFormat = format('d');
</script>

<Card.Root
  class="overflow-hidden border-border/60 bg-linear-to-br from-muted/40 via-background to-muted/10 shadow-xs"
>
  <Card.Header>
    <Card.Title>Per-Lab Lottery Outcome</Card.Title>
    <Card.Description>
      Lottery-placed students by lab, broken down by preference rank quality
    </Card.Description>
  </Card.Header>
  <Card.Content>
    {#if stacks.length === 0}
      <p class="text-sm text-muted-foreground">No lottery placements available.</p>
    {:else}
      <Chart.Container id="lottery-outcome-chart" config={chartConfig} class="max-h-[400px] w-full">
        <BarChart
          data={chartData}
          x="lab"
          series={chartSeries}
          seriesLayout="stack"
          legend
          grid
          groupPadding={0.15}
          bandPadding={0.25}
          props={{
            xAxis: {
              grid: false,
              tickLabelProps: { dy: 8 },
            },
            yAxis: {
              ticks: 4,
              format: (value: number) => integerFormat(value),
              tickLabelProps: { dx: -8 },
            },
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
                return labNameById.get(value) ?? value;
              }}
              valueFormatter={value => integerFormat(Number(value))}
            />
          {/snippet}
        </BarChart>
      </Chart.Container>
    {/if}
  </Card.Content>
</Card.Root>
