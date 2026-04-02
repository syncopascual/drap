<script lang="ts">
  import { AreaChart } from 'layerchart';
  import { cubicOut } from 'svelte/easing';
  import { cumsum, max, rollup, tickStep } from 'd3-array';
  import { format } from 'd3-format';
  import type { MotionOptions } from 'layerchart/utils/motion.svelte';
  import { prefersReducedMotion } from 'svelte/motion';
  import { scalePoint } from 'd3-scale';

  import * as Card from '$lib/components/ui/card';
  import * as Chart from '$lib/components/ui/chart';
  import * as NativeSelect from '$lib/components/ui/native-select';
  import { Badge } from '$lib/components/ui/badge';
  import type { DraftAssignmentRecord, Lab } from '$lib/features/drafts/types';

  interface Props {
    records: DraftAssignmentRecord[];
    maxRounds: number;
    interventionRecords?: DraftAssignmentRecord[];
    lotteryRecords?: DraftAssignmentRecord[];
    labs: Lab[];
    totalStudents: number;
  }

  const {
    records,
    maxRounds,
    interventionRecords = [],
    lotteryRecords = [],
    labs,
    totalStudents,
  }: Props = $props();

  let chartMode = $state<'assigned' | 'remaining'>('assigned');
  let selectedLabId = $state('');

  const filtered = $derived(
    selectedLabId === ''
      ? {
          records,
          interventionRecords,
          lotteryRecords,
          selectedLabQuota: void 0,
        }
      : {
          records: records.filter(record => record.labId === selectedLabId),
          interventionRecords: interventionRecords.filter(record => record.labId === selectedLabId),
          lotteryRecords: lotteryRecords.filter(record => record.labId === selectedLabId),
          selectedLabQuota: labs.find(lab => lab.id === selectedLabId)?.quota,
        },
  );

  const capacity = $derived(
    selectedLabId === '' || typeof filtered.selectedLabQuota === 'undefined'
      ? totalStudents
      : filtered.selectedLabQuota,
  );

  const roundCountByNumber = $derived.by(() =>
    rollup(
      filtered.records.flatMap(record =>
        typeof record.round === 'number' && record.round > 0 && record.round <= maxRounds
          ? [record.round]
          : [],
      ),
      values => values.length,
      value => value,
    ),
  );

  const phaseCounts = $derived.by(() => [
    ...Array.from({ length: maxRounds }, (_, index) => {
      const round = index + 1;
      return {
        phaseKey: `round-${round}`,
        axisLabel: `R${round}`,
        tooltipLabel: `Round ${round}`,
        assigned: roundCountByNumber.get(round) ?? 0,
      };
    }),
    {
      phaseKey: 'interventions',
      axisLabel: 'Interventions',
      tooltipLabel: 'Interventions',
      assigned: filtered.interventionRecords.length,
    },
    {
      phaseKey: 'lottery',
      axisLabel: 'Lottery',
      tooltipLabel: 'Lottery',
      assigned: filtered.lotteryRecords.length,
    },
  ]);

  const cumulativeAssigned = $derived(Array.from(cumsum(phaseCounts, ({ assigned }) => assigned)));

  const chartPoints = $derived.by(() =>
    phaseCounts.map((point, index) => {
      const remaining = Math.max(capacity - (cumulativeAssigned[index] ?? 0), 0);
      return {
        ...point,
        remaining,
        value: chartMode === 'assigned' ? point.assigned : remaining,
      };
    }),
  );

  const assignedMax = $derived(max(phaseCounts, point => point.assigned) ?? 1);

  const chartMax = $derived(chartMode === 'assigned' ? assignedMax : Math.max(capacity, 1));

  const axisLabelByTooltipLabel = $derived(
    new Map(phaseCounts.map(({ tooltipLabel, axisLabel }) => [tooltipLabel, axisLabel])),
  );

  const integerFormat = format('d');

  const yTicks = $derived.by(() => {
    const step = Math.max(1, tickStep(0, chartMax, 4));
    const ticks = Array.from(
      { length: Math.floor(chartMax / step) + 1 },
      (_, index) => index * step,
    );
    if (ticks.at(-1) === chartMax) return ticks;
    return [...ticks, chartMax];
  });

  const selectedLabName = $derived.by(() => {
    // eslint-disable-next-line @typescript-eslint/init-declarations
    let name: string | undefined;
    if (selectedLabId !== '') name = labs.find(lab => lab.id === selectedLabId)?.name;
    return name;
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

  const chartConfig = $derived({
    value: {
      label: activeMetricLabel,
      color: 'var(--primary)',
    },
  } satisfies Chart.ChartConfig);

  const chartSeries = $derived([
    {
      key: 'value',
      label: activeMetricLabel,
      color: 'var(--color-value)',
    },
  ]);

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
</script>

<Card.Root
  class="overflow-hidden border-border/60 bg-linear-to-br from-muted/40 via-background to-muted/10 shadow-xs"
>
  <Card.Header class="gap-5">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div class="space-y-1.5 lg:grow">
        <div class="flex flex-wrap items-center gap-2">
          <Card.Title id="draft-rounds-chart-title">{chartTitle} per phase</Card.Title>
          {#if typeof selectedLabName === 'string'}
            <Badge id="draft-rounds-chart-lab-badge" variant="secondary">{selectedLabName}</Badge>
          {:else}
            <Badge id="draft-rounds-chart-lab-badge" variant="default">All Labs</Badge>
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
          {#each labs as lab (lab.id)}
            <NativeSelect.Option value={lab.id}>{lab.name}</NativeSelect.Option>
          {/each}
        </NativeSelect.Root>
      </div>
    </div>
  </Card.Header>
  <Card.Content class="pt-0">
    <Chart.Container id="draft-rounds-chart" config={chartConfig} class="min-h-[280px] w-full">
      <AreaChart
        data={chartPoints}
        x="tooltipLabel"
        y="value"
        xScale={scalePoint().padding(0)}
        padding={{ top: 8, right: 10, bottom: 20, left: 20 }}
        series={chartSeries}
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
