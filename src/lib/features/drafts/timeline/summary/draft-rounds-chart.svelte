<script lang="ts">
  import { AreaChart } from 'layerchart';
  import { cubicOut } from 'svelte/easing';
  import { cumsum, tickStep } from 'd3-array';
  import { format } from 'd3-format';
  import type { MotionOptions } from 'layerchart/utils/motion.svelte';
  import { prefersReducedMotion } from 'svelte/motion';
  import { scalePoint } from 'd3-scale';

  import * as Card from '$lib/components/ui/card';
  import * as Chart from '$lib/components/ui/chart';
  import * as NativeSelect from '$lib/components/ui/native-select';
  import { Badge } from '$lib/components/ui/badge';
  import type { DraftAssignmentSummary } from '$lib/features/drafts/types';

  interface Props {
    chart: DraftAssignmentSummary['chart'];
  }

  const { chart }: Props = $props();

  let chartMode = $state<'assigned' | 'remaining'>('assigned');
  let selectedLabId = $state('');

  const labById = $derived(new Map(chart.labs.map(lab => [lab.id, lab])));
  const selectedLab = $derived.by(() => {
    if (selectedLabId === '') return;
    return labById.get(selectedLabId);
  });

  const selectedSeries = $derived(selectedLab ?? chart.allLabs);
  const cumulativeAssigned = $derived(Array.from(cumsum(selectedSeries.assignedByPhase)));
  const chartPoints = $derived.by(() =>
    chart.phases.map((phase, index) => {
      const assigned = selectedSeries.assignedByPhase[index] ?? 0;
      const remaining = Math.max(selectedSeries.capacity - (cumulativeAssigned[index] ?? 0), 0);
      return {
        ...phase,
        assigned,
        remaining,
        value: chartMode === 'assigned' ? assigned : remaining,
      };
    }),
  );

  const chartMax = $derived(
    chartMode === 'assigned'
      ? Math.max(selectedSeries.assignedMax, 1)
      : Math.max(selectedSeries.capacity, 1),
  );

  const axisLabelByTooltipLabel = $derived(
    new Map(chart.phases.map(({ tooltipLabel, axisLabel }) => [tooltipLabel, axisLabel])),
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

  const chartTitle = $derived.by(() => {
    if (chartMode === 'assigned') return 'Students assigned';
    if (selectedLabId === '') return 'Students not yet assigned';
    return 'Labs remaining quota';
  });

  const activeMetricLabel = $derived.by(() => {
    if (chartMode === 'assigned') return 'Assigned';
    if (selectedLabId === '') return 'Not yet assigned';
    return 'Remaining quota';
  });

  const { chartMotion, axisMotion } = $derived<{
    chartMotion: MotionOptions;
    axisMotion: MotionOptions;
  }>(
    prefersReducedMotion.current
      ? { chartMotion: 'none', axisMotion: 'none' }
      : {
          chartMotion: {
            type: 'tween',
            duration: 280,
            easing: cubicOut,
          },
          axisMotion: {
            type: 'tween',
            duration: 220,
            easing: cubicOut,
          },
        },
  );

  const integerFormat = format('d');
</script>

<Card.Root
  class="overflow-hidden border-border/60 bg-linear-to-br from-muted/40 via-background to-muted/10 shadow-xs"
>
  <Card.Header class="gap-5">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div class="space-y-1.5 lg:grow">
        <div class="flex flex-wrap items-center gap-2">
          <Card.Title id="draft-rounds-chart-title">{chartTitle} per phase</Card.Title>
          {#if typeof selectedLab === 'undefined'}
            <Badge id="draft-rounds-chart-lab-badge" variant="default">All Labs</Badge>
          {:else}
            <Badge id="draft-rounds-chart-lab-badge" variant="secondary">{selectedLab.name}</Badge>
          {/if}
        </div>
        <Card.Description>
          Visualizes student assignments or remaining lab quota across draft phases.
        </Card.Description>
      </div>
      <div class="flex flex-col gap-2 sm:flex-row lg:shrink-0 lg:justify-end">
        <NativeSelect.Root
          id="draft-rounds-chart-mode"
          bind:value={chartMode}
          class="w-full bg-background/80 sm:w-auto"
        >
          <NativeSelect.Option value="assigned">Assigned</NativeSelect.Option>
          <NativeSelect.Option value="remaining">Remaining</NativeSelect.Option>
        </NativeSelect.Root>
        <NativeSelect.Root
          id="draft-rounds-chart-lab"
          bind:value={selectedLabId}
          class="w-full bg-background/80 sm:w-auto"
        >
          <NativeSelect.Option value="">All Labs</NativeSelect.Option>
          {#each chart.labs as { id, name } (id)}
            <NativeSelect.Option value={id}>{name}</NativeSelect.Option>
          {/each}
        </NativeSelect.Root>
      </div>
    </div>
  </Card.Header>
  <Card.Content class="pt-0">
    <Chart.Container
      id="draft-rounds-chart"
      config={{
        value: {
          label: activeMetricLabel,
          color: 'var(--primary)',
        },
      }}
      class="min-h-70 w-full"
    >
      <AreaChart
        data={chartPoints}
        x="tooltipLabel"
        y="value"
        xScale={scalePoint().padding(0)}
        padding={{ top: 8, right: 10, bottom: 20, left: 20 }}
        series={[
          {
            key: 'value',
            label: activeMetricLabel,
            color: 'var(--color-value)',
          },
        ]}
        legend={false}
        points
        grid
        yDomain={[0, chartMax]}
        props={{
          area: {
            fillOpacity: 0.22,
            motion: chartMotion,
            line: {
              strokeWidth: 3,
              motion: chartMotion,
            },
          },
          points: {
            r: 5.5,
            class: 'draft-rounds-chart-point',
            motion: chartMotion,
          },
          tooltip: { context: { mode: 'band' } },
          xAxis: {
            grid: false,
            format: value => axisLabelByTooltipLabel.get(value) ?? `${value}`,
            motion: axisMotion,
            tickLabelProps: { dy: 8 },
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
          <Chart.Tooltip class="draft-rounds-chart-tooltip" indicator="dot" />
        {/snippet}
      </AreaChart>
    </Chart.Container>
  </Card.Content>
</Card.Root>
