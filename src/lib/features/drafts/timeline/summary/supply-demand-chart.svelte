<script lang="ts">
  import { BarChart } from 'layerchart';

  import * as Card from '$lib/components/ui/card';
  import * as Chart from '$lib/components/ui/chart';
  import { assert } from '$lib/assert';
  import type { DraftSupplyDemandEntry } from '$lib/features/drafts/types';

  interface Props {
    data: DraftSupplyDemandEntry[];
  }

  const { data }: Props = $props();

  const chartConfig = {
    supply: { label: 'Supply', color: 'var(--chart-1)' },
    demand: { label: 'Demand', color: 'var(--chart-3)' },
    actual: { label: 'Actual', color: 'var(--chart-2)' },
  };

  const labNameById = $derived(new Map(data.map(e => [e.labId.toUpperCase(), e.labName])));

  const chartData = $derived(
    data.map(entry => ({
      lab: entry.labId.toUpperCase(),
      supply: Math.round(entry.supplyShare * 100),
      demand: Math.round(entry.demandShare * 100),
      actual: Math.round(entry.actualShare * 100),
    })),
  );
</script>

<Card.Root
  class="overflow-hidden border-border/60 bg-linear-to-br from-muted/40 via-background to-muted/10 shadow-xs"
>
  <Card.Header>
    <Card.Title>Proportional Supply versus Demand versus Actual</Card.Title>
    <Card.Description>
      Normalized share of capacity, Borda-weighted demand, and actual assignments per lab
    </Card.Description>
  </Card.Header>
  <Card.Content>
    <Chart.Container id="supply-demand-chart" config={chartConfig} class="max-h-[500px] w-full">
      <BarChart
        data={chartData}
        y="lab"
        orientation="horizontal"
        seriesLayout="group"
        groupPadding={0.1}
        bandPadding={0.3}
        padding={{ left: 50, top: 8, right: 10, bottom: 40 }}
        series={[
          { key: 'supply', label: 'Supply', color: 'var(--color-supply)' },
          { key: 'demand', label: 'Demand', color: 'var(--color-demand)' },
          { key: 'actual', label: 'Actual', color: 'var(--color-actual)' },
        ]}
        legend
        grid
        props={{
          xAxis: {
            format: (value: number) => `${value}%`,
            tickLabelProps: { dx: -4 },
          },
          yAxis: {
            grid: false,
          },
          tooltip: { context: { mode: 'band' } },
        }}
      >
        {#snippet tooltip()}
          <Chart.Tooltip
            indicator="dot"
            labelFormatter={value => {
              assert(typeof value === 'string');
              return labNameById.get(value) ?? value;
            }}
            valueFormatter={value => `${value}%`}
          />
        {/snippet}
      </BarChart>
    </Chart.Container>
  </Card.Content>
</Card.Root>
