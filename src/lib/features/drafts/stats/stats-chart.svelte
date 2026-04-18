<script lang="ts">
  import { AreaChart } from 'layerchart';
  import { cubicOut } from 'svelte/easing';
  import { format } from 'd3-format';
  import type { MotionOptions } from 'layerchart/utils/motion.svelte';
  import { prefersReducedMotion } from 'svelte/motion';
  import { scalePoint } from 'd3-scale';
  import { tickStep } from 'd3-array';

  import * as Card from '$lib/components/ui/card';
  import * as Chart from '$lib/components/ui/chart';
  import * as NativeSelect from '$lib/components/ui/native-select';
  import type { DraftStatsChartData, DraftStatsSeries } from '$lib/features/drafts/types';
  import { Skeleton } from '$lib/components/ui/skeleton';

  interface Props {
    stats: DraftStatsChartData | null;
  }

  const { stats }: Props = $props();

  let quotaSelectedLabId = $state('');
  let draftedSelectedLabId = $state('');

  const { chartMotion, axisMotion } = $derived<{
    chartMotion: MotionOptions;
    axisMotion: MotionOptions;
  }>(
    prefersReducedMotion.current
      ? { chartMotion: 'none', axisMotion: 'none' }
      : {
          chartMotion: { type: 'tween', duration: 280, easing: cubicOut },
          axisMotion: { type: 'tween', duration: 220, easing: cubicOut },
        },
  );

  function quotaConfig(chartData: DraftStatsChartData | null) {
    const config: Record<string, { label: string; color: string }> = {};
    if (chartData === null) return config;
    const series =
      quotaSelectedLabId === ''
        ? chartData.quotaSeries
        : chartData.quotaSeries.filter(s => s.labId === quotaSelectedLabId);
    for (const s of series) config[s.labId] = { label: s.labName, color: s.color };

    return config;
  }

  function draftedConfig(chartData: DraftStatsChartData | null) {
    const config: Record<string, { label: string; color: string }> = {};
    if (chartData === null) return config;
    const series =
      draftedSelectedLabId === ''
        ? chartData.draftedSeries
        : chartData.draftedSeries.filter(s => s.labId === draftedSelectedLabId);
    for (const s of series) config[s.labId] = { label: s.labName, color: s.color };

    return config;
  }

  function quotaSeries(chartData: DraftStatsChartData | null) {
    if (chartData === null) return [];
    if (quotaSelectedLabId === '') return chartData.quotaSeries;
    return chartData.quotaSeries.filter(s => s.labId === quotaSelectedLabId);
  }

  function draftedSeries(chartData: DraftStatsChartData | null) {
    if (chartData === null) return [];
    if (draftedSelectedLabId === '') return chartData.draftedSeries;
    return chartData.draftedSeries.filter(s => s.labId === draftedSelectedLabId);
  }

  function buildWideData(series: DraftStatsSeries[], years: number[]) {
    return years.map((year, i) => {
      const point: Record<string, number | string | null> = { year };
      for (const s of series) {
        const p = s.points[i];
        point[s.labId] = p?.value ?? null;
      }
      return point;
    });
  }

  function quotaChartData(chartData: DraftStatsChartData | null) {
    const series = quotaSeries(chartData);
    if (series.length === 0 || chartData === null) return [];
    return buildWideData(series, chartData.years);
  }

  function draftedChartData(chartData: DraftStatsChartData | null) {
    const series = draftedSeries(chartData);
    if (series.length === 0 || chartData === null) return [];
    return buildWideData(series, chartData.years);
  }

  function chartMax(series: DraftStatsSeries[], data: ReturnType<typeof quotaChartData>) {
    let max = 0;
    for (const point of data)
      for (const s of series) {
        const val = point[s.labId];
        if (typeof val === 'number' && val > max) max = val;
      }

    return Math.max(max, 1);
  }

  function yTicksFn(max: number) {
    const step = Math.max(1, tickStep(0, max, 4));
    const ticks = Array.from({ length: Math.floor(max / step) + 1 }, (_, i) => i * step);
    if (ticks.at(-1) !== max) ticks.push(max);
    return ticks;
  }

  function getSeriesProps(series: DraftStatsSeries[]) {
    return series.map(s => ({
      key: s.labId,
      label: s.labName,
      color: s.color,
    }));
  }

  const integerFormat = format('d');
  const yearFormat = format('d');
</script>

<Card.Root
  class="overflow-hidden border-border/60 bg-linear-to-br from-muted/40 via-background to-muted/10 shadow-xs"
>
  <Card.Content class="pt-0">
    {#await stats}
      <div class="flex h-80 w-full items-center justify-center">
        <Skeleton class="h-full w-full" />
      </div>
    {:then chartData}
      {@const series = quotaSeries(chartData)}
      {@const data = quotaChartData(chartData)}
      {@const max = chartMax(series, data)}
      {@const chartLabs = chartData
        ? [
            ...new Map(
              chartData.quotaSeries.map(s => [
                s.labId,
                { id: s.labId, name: s.labName, isArchived: s.isArchived },
              ]),
            ).values(),
          ]
        : []}
      <Card.Header>
        <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div class="space-y-1.5 lg:grow">
            <Card.Title>Lab Quota Through the Years</Card.Title>
            <Card.Description>
              Historical quota snapshots by lab. Lines stop when labs are archived.
            </Card.Description>
          </div>
          <NativeSelect.Root
            bind:value={quotaSelectedLabId}
            class="w-full bg-background/80 sm:w-auto lg:shrink-0"
          >
            <NativeSelect.Option value="">All Labs</NativeSelect.Option>
            {#each chartLabs as lab (lab.id)}
              <NativeSelect.Option value={lab.id}>{lab.name}</NativeSelect.Option>
            {/each}
          </NativeSelect.Root>
        </div>
      </Card.Header>
      {#if data.length === 0}
        <div class="flex h-80 w-full items-center justify-center text-muted-foreground">
          No data available
        </div>
      {:else}
        <Chart.Container config={quotaConfig(chartData)} class="h-80 w-full">
          <AreaChart
            {data}
            x="year"
            xScale={scalePoint().padding(0)}
            padding={{ top: 8, right: 10, bottom: 50, left: 40 }}
            series={getSeriesProps(series)}
            legend={true}
            points
            grid
            yDomain={[0, max]}
            props={{
              area: { fillOpacity: 0.15, motion: chartMotion },
              points: { r: 4 },
              tooltip: { context: { mode: 'band' } },
              xAxis: {
                grid: false,
                format: yearFormat,
                motion: axisMotion,
                tickLabelProps: { dy: 8 },
              },
              yAxis: {
                ticks: yTicksFn(max),
                format: integerFormat,
                motion: axisMotion,
                tickLabelProps: { dx: -8 },
              },
            }}
          >
            {#snippet tooltip()}
              <Chart.Tooltip indicator="dot" />
            {/snippet}
          </AreaChart>
        </Chart.Container>
      {/if}
    {:catch}
      <div class="flex h-80 w-full items-center justify-center text-destructive">
        Failed to load data
      </div>
    {/await}
  </Card.Content>
</Card.Root>

<Card.Root
  class="overflow-hidden border-border/60 bg-linear-to-br from-muted/40 via-background to-muted/10 shadow-xs"
>
  <Card.Content class="pt-0">
    {#await stats}
      <div class="flex h-80 w-full items-center justify-center">
        <Skeleton class="h-full w-full" />
      </div>
    {:then chartData}
      {@const series = draftedSeries(chartData)}
      {@const data = draftedChartData(chartData)}
      {@const max = chartMax(series, data)}
      {@const chartLabs = chartData
        ? [
            ...new Map(
              chartData.draftedSeries.map(s => [
                s.labId,
                { id: s.labId, name: s.labName, isArchived: s.isArchived },
              ]),
            ).values(),
          ]
        : []}
      <Card.Header>
        <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div class="space-y-1.5 lg:grow">
            <Card.Title>Drafted Students Through the Years</Card.Title>
            <Card.Description>Number of students drafted per lab over time.</Card.Description>
          </div>
          <NativeSelect.Root
            bind:value={draftedSelectedLabId}
            class="w-full bg-background/80 sm:w-auto lg:shrink-0"
          >
            <NativeSelect.Option value="">All Labs</NativeSelect.Option>
            {#each chartLabs as lab (lab.id)}
              <NativeSelect.Option value={lab.id}>{lab.name}</NativeSelect.Option>
            {/each}
          </NativeSelect.Root>
        </div>
      </Card.Header>
      {#if data.length === 0}
        <div class="flex h-80 w-full items-center justify-center text-muted-foreground">
          No data available
        </div>
      {:else}
        <Chart.Container config={draftedConfig(chartData)} class="h-80 w-full">
          <AreaChart
            {data}
            x="year"
            xScale={scalePoint().padding(0)}
            padding={{ top: 8, right: 10, bottom: 50, left: 40 }}
            series={getSeriesProps(series)}
            legend={true}
            points
            grid
            yDomain={[0, max]}
            props={{
              area: { fillOpacity: 0.15, motion: chartMotion },
              points: { r: 4 },
              tooltip: { context: { mode: 'band' } },
              xAxis: {
                grid: false,
                format: yearFormat,
                motion: axisMotion,
                tickLabelProps: { dy: 8 },
              },
              yAxis: {
                ticks: yTicksFn(max),
                format: integerFormat,
                motion: axisMotion,
                tickLabelProps: { dx: -8 },
              },
            }}
          >
            {#snippet tooltip()}
              <Chart.Tooltip indicator="dot" />
            {/snippet}
          </AreaChart>
        </Chart.Container>
      {/if}
    {:catch}
      <div class="flex h-80 w-full items-center justify-center text-destructive">
        Failed to load data
      </div>
    {/await}
  </Card.Content>
</Card.Root>
