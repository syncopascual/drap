<script lang="ts">
  import { AreaChart } from 'layerchart';
  import { cubicOut } from 'svelte/easing';
  import { max } from 'd3-array';
  import { format } from 'd3-format';
  import type { MotionOptions } from 'layerchart/utils/motion.svelte';
  import { prefersReducedMotion } from 'svelte/motion';
  import { scalePoint, scaleTime } from 'd3-scale';
  import { tickStep } from 'd3-array';

  import * as Card from '$lib/components/ui/card';
  import * as Chart from '$lib/components/ui/chart';
  import { Badge } from '$lib/components/ui/badge';

  interface Props {
    draftCreatedAt: Date;
    registrationClosedAt: Date;
    startedAt: Date | null;
    requestedAt: Date;
    timelineData: { date: Date; count: number }[];
  }

  const { draftCreatedAt, registrationClosedAt, startedAt, requestedAt, timelineData }: Props = $props();

  const endDate = $derived(startedAt ?? requestedAt);
  
  // Transform timeline data for chart
  const chartPoints = $derived(
    timelineData.map(d => ({
      date: d.date,
      label: d.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      count: d.count,
    }))
  );

  const yMax = $derived(max(timelineData, d => d.count) ?? 1);
  const yTicks = $derived.by(() => {
    const step = Math.max(1, tickStep(0, yMax, 4));
    const ticks = Array.from(
        { length: Math.floor(yMax / step) + 1 },
        (_, index) => index * step,
    );
    if (ticks.at(-1) === yMax) return ticks;
    return [...ticks, yMax];
    });
  const integerFormat = format('d');

  const chartConfig = $derived({
    count: {
      label: 'Registrants',
      color: 'var(--primary)',
    },
  } satisfies Chart.ChartConfig);

  const chartSeries = $derived([
    {
      key: 'count',
      label: 'Registrants',
      color: 'var(--color-count)',
    },
  ]);

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
</script>

<Card.Root class="overflow-hidden border-border/60 bg-linear-to-br from-muted/40 via-background to-muted/10 shadow-xs">
  <Card.Header class="gap-5">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div class="space-y-1.5 lg:flex-1">
        <div class="flex flex-wrap items-center gap-2">
          <Card.Title>Registrants over time</Card.Title>
          <Badge variant="default">Cumulative</Badge>
        </div>
        <Card.Description>
          Shows cumulative registrant count from draft creation to registration close.
        </Card.Description>
      </div>
      <div class="text-sm text-muted-foreground">
        {#if startedAt}
          Started: {startedAt.toLocaleDateString()}
        {:else}
          Current: {requestedAt.toLocaleDateString()}
        {/if}
      </div>
    </div>
  </Card.Header>
  <Card.Content class="pt-0">
    <Chart.Container id="registrants-chart" config={chartConfig} class="min-h-[280px] w-full">
      <AreaChart
        data={chartPoints}
        x="label"
        y="count"
        xScale={scalePoint().padding(0)}
        padding={{ top: 8, right: 10, bottom: 20, left: 20 }}
        series={chartSeries}
        legend={false}
        points
        grid
        yDomain={[0, yMax]}
        props={{
          area: { fillOpacity: 0.22, motion: chartMotion, line: { strokeWidth: 3, motion: chartMotion } },
          points: { r: 5.5, motion: chartMotion },
          tooltip: { context: { mode: 'band' } },
          xAxis: { grid: false, motion: axisMotion, tickLabelProps: { dy: 8 } },
          yAxis: { ticks: yTicks, format: value => integerFormat(value), motion: axisMotion, tickLabelProps: { dx: -8 } },
        }}
      >
        {#snippet tooltip()}
          <Chart.Tooltip indicator="dot" labelKey="label" />
        {/snippet}
      </AreaChart>
    </Chart.Container>
  </Card.Content>
</Card.Root>