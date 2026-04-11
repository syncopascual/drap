<script lang="ts">
  import { BarChart } from 'layerchart';
  import { cubicOut } from 'svelte/easing';
  import { format } from 'd3-format';
  import { prefersReducedMotion } from 'svelte/motion';
  import { tickStep } from 'd3-array';

  import * as Chart from '$lib/components/ui/chart';
  import { assert } from '$lib/assert';
  import type { DraftAssignmentSummary } from '$lib/features/drafts/types';

  interface Props {
    chart: DraftAssignmentSummary['chart'];
    displayedRounds: number;
  }

  const { chart, displayedRounds }: Props = $props();

  const COLORS = [
    'var(--chart-1)',
    'var(--chart-2)',
    'var(--chart-3)',
    'var(--chart-4)',
    'var(--chart-5)',
  ] as const;

  const chartMax = $derived(
    Math.max(...chart.allLabs.assignedByPhase.slice(0, displayedRounds), 1),
  );

  const yTicks = $derived.by(() => {
    const step = Math.max(1, tickStep(0, chartMax, 4));
    const ticks = Array.from(
      { length: Math.floor(chartMax / step) + 1 },
      (_, index) => index * step,
    );
    if (ticks.at(-1) === chartMax) return ticks;
    return [...ticks, chartMax];
  });

  function chartColor(i: number) {
    const color = COLORS[i % COLORS.length];
    assert(typeof color !== 'undefined', 'chart color index out of bounds');
    return color;
  }

  const chartConfig = $derived(
    chart.labs.reduce<Record<string, { label: string; color: string }>>((config, lab, index) => {
      config[lab.id] = {
        label: lab.id.toUpperCase(),
        color: chartColor(index),
      };
      return config;
    }, {}),
  );

  const chartSeries = $derived(
    chart.labs.map((lab, index) => ({
      key: lab.id,
      label: lab.id.toUpperCase(),
      color: chartColor(index),
    })),
  );

  const chartData = $derived(
    Array.from({ length: displayedRounds }, (_, roundIndex) => ({
      round: `Round ${roundIndex + 1}`,
      ...chart.labs.reduce<Record<string, number>>((roundData, lab) => {
        const assigned = lab.assignedByPhase[roundIndex] ?? 0;
        // Keep each round payload sparse so the shared band tooltip only renders visible stacks.
        if (assigned > 0) roundData[lab.id] = assigned;
        return roundData;
      }, {}),
    })),
  );

  const integerFormat = format('d');

  const axisMotion = $derived(
    prefersReducedMotion.current
      ? 'none'
      : ({
          type: 'tween',
          duration: 220,
          easing: cubicOut,
        } as const),
  );
</script>

{#if chartData.length === 0}
  <p class="text-sm text-muted-foreground">No regular-round data is available yet.</p>
{:else}
  <Chart.Container id="regular-round-summary-chart" config={chartConfig} class="max-h-96 w-full">
    <BarChart
      data={chartData}
      x="round"
      series={chartSeries}
      seriesLayout="stack"
      legend
      grid
      groupPadding={0.15}
      bandPadding={0.25}
      yDomain={[0, chartMax]}
      props={{
        tooltip: { context: { mode: 'band' } },
        xAxis: {
          grid: false,
          tickLabelProps: { dy: 8 },
          motion: axisMotion,
        },
        yAxis: {
          ticks: yTicks,
          format: value => integerFormat(value),
          motion: axisMotion,
          tickLabelProps: { dx: -8 },
        },
      }}
    >
      {#snippet tooltip()}
        <Chart.Tooltip
          indicator="dot"
          labelAccessor={d => {
            assert(typeof d === 'object' && d !== null && 'round' in d);
            return d.round;
          }}
          valueFormatter={value => integerFormat(Number(value))}
        />
      {/snippet}
    </BarChart>
  </Chart.Container>
{/if}
