<script lang="ts">
  import { PieChart } from 'layerchart';

  import * as Card from '$lib/components/ui/card';
  import * as Chart from '$lib/components/ui/chart';
  import { assert } from '$lib/assert';
  import type { DraftLabDistributionEntry } from '$lib/features/drafts/types';

  interface Props {
    data: DraftLabDistributionEntry[];
  }

  const { data }: Props = $props();

  const COLORS = [
    'var(--chart-1)',
    'var(--chart-2)',
    'var(--chart-3)',
    'var(--chart-4)',
    'var(--chart-5)',
  ] as const;

  function chartColor(i: number) {
    const color = COLORS[i % COLORS.length];
    assert(typeof color === 'string', 'chart color index out of bounds');
    return color;
  }

  function shortLabel(entry: DraftLabDistributionEntry) {
    return entry.labId === null ? 'Unassigned' : entry.labId.toUpperCase();
  }

  const chartConfig = $derived(
    Object.fromEntries(
      data.map((entry, i) => [
        shortLabel(entry),
        { label: shortLabel(entry), color: chartColor(i) },
      ]),
    ),
  );

  const labNameByShortLabel = $derived(new Map(data.map(e => [shortLabel(e), e.labName])));

  const chartData = $derived(
    data.map((entry, i) => ({
      key: shortLabel(entry),
      label: shortLabel(entry),
      value: entry.count,
      color: chartColor(i),
    })),
  );
</script>

<Card.Root>
  <Card.Header>
    <Card.Title>Students per Lab</Card.Title>
    <Card.Description>Distribution of assignments across labs</Card.Description>
  </Card.Header>
  <Card.Content>
    <Chart.Container id="lab-distribution-chart" config={chartConfig} class="max-h-70 w-full">
      <PieChart
        data={chartData}
        key="key"
        value="value"
        label="label"
        c="color"
        legend={{ orientation: 'vertical', placement: 'right' }}
      >
        {#snippet tooltip()}
          <Chart.Tooltip
            indicator="dot"
            labelFormatter={value => {
              assert(typeof value === 'string');
              return labNameByShortLabel.get(value) ?? value;
            }}
          />
        {/snippet}
      </PieChart>
    </Chart.Container>
  </Card.Content>
</Card.Root>
