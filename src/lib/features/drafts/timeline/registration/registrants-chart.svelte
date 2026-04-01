<script lang="ts">
  import { isAfter, startOfDay } from 'date-fns';
  import { Area, AreaChart, LinearGradient } from 'layerchart';
  import { cubicOut } from 'svelte/easing';
  import { format } from 'd3-format';
  import { max } from 'd3-array';
  import type { MotionOptions } from 'layerchart/utils/motion.svelte';
  import { prefersReducedMotion } from 'svelte/motion';
  import { scalePoint } from 'd3-scale';
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

  const endDate = new Date(startedAt ?? requestedAt)

  const localCreatedAt = $derived(new Date(draftCreatedAt))
  const localClosedAt = $derived(new Date(registrationClosedAt))

  const regClosedLabel = localClosedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })


  const allDaysData = $derived.by(() => {
    const start = startOfDay(localCreatedAt);
    const lastDate = startOfDay(endDate);
    const result: { date: Date; label: string; count: number }[] = [];
    
    const currentDate = new Date(start);

    const sortedData = [...timelineData].sort((a, b) => a.date.getTime() - b.date.getTime());
    
    while (!isAfter(currentDate, lastDate)) {
      const currentStr = currentDate.toDateString();
      const dayData = sortedData.find(d => d.date.toDateString() === currentStr);
      
      result.push({
          date: new Date(currentDate),
          label: currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          count: dayData?.count ?? 0,
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return result;
  });

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

  const xTicks = $derived(allDaysData.map(d => d.label));

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
          <Card.Title>Registrants per day</Card.Title>
          <Badge variant="default">Draft Creation to Start</Badge>
        </div>
        <Card.Description>
          Shows how many students registered each day
        </Card.Description>
      </div>
      <div class="text-sm text-muted-foreground">
        {#if startedAt}
          Draft Started: {endDate.toLocaleDateString()}
        {:else}
          Current: {endDate.toLocaleDateString()}
        {/if}
      </div>
    </div>
  </Card.Header>
  <Card.Content class="pt-0">
    <Chart.Container id="registrants-chart" config={chartConfig} class="h-[500px] w-full">
      <AreaChart
        data={allDaysData}
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
          xAxis: { grid: false, motion: axisMotion, tickLabelProps: { dy: 8 }, ticks: xTicks },
          yAxis: { ticks: yTicks, format: value => integerFormat(value), motion: axisMotion, tickLabelProps: { dx: -8 } },
        }}
      >
        {#snippet aboveMarks({ context })}
          {@const {xScale} = context}
          {@const {yScale} = context}
          {#if xScale && regClosedLabel}
            <line 
              x1={xScale(regClosedLabel)} 
              x2={xScale(regClosedLabel)} 
              y1={yScale.range()[1]}
              y2={yScale.range()[0]}
              stroke="#ef4444"
              stroke-dasharray="4,4"
              stroke-width="1"
            />
            <text 
              x={xScale(regClosedLabel)} 
              y={yScale.range()[1] - 10} 
              text-anchor="middle" 
              fill="#ef4444"
              font-size="11"
            >
              Registration Closed
            </text>
          {/if}
        {/snippet}
        {#snippet marks()}
          <LinearGradient class="from-primary/50 to-primary/1" vertical>
            {#snippet children({ gradient })}
              <Area line={{ class: 'stroke-primary' }} fill={gradient} />
            {/snippet}
          </LinearGradient>
        {/snippet}
        {#snippet tooltip()}
          <Chart.Tooltip indicator="dot" labelKey="label" />
        {/snippet}
      </AreaChart>
    </Chart.Container>
  </Card.Content>
</Card.Root>