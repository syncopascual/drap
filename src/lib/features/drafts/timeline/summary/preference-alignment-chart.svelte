<script lang="ts">
  import { format } from 'd3-format';
  import { PieChart } from 'layerchart';

  import * as Card from '$lib/components/ui/card';
  import * as Chart from '$lib/components/ui/chart';
  import { assert } from '$lib/assert';
  import type { DraftPreferenceAlignment } from '$lib/features/drafts/types';

  interface Props {
    data: DraftPreferenceAlignment;
  }

  const { data }: Props = $props();

  const NOT_PREFERRED = 'Not Preferred';

  const COLORS = [
    'var(--chart-1)',
    'var(--chart-2)',
    'var(--chart-3)',
    'var(--chart-4)',
    'var(--chart-5)',
  ] as const;

  function sliceColor(label: string, i: number) {
    if (label === NOT_PREFERRED) return 'var(--muted-foreground)';
    const color = COLORS[i % COLORS.length];
    assert(typeof color === 'string', 'chart color index out of bounds');
    return color;
  }

  const chartConfig = $derived(
    Object.fromEntries(
      data.slices.map(({ label }, i) => [label, { label, color: sliceColor(label, i) }]),
    ),
  );

  const chartData = $derived(
    data.slices.map(({ label, count }, i) => ({
      key: label,
      label,
      value: count,
      color: sliceColor(label, i),
    })),
  );

  const percentFormat = format('.0%');
</script>

<Card.Root>
  <Card.Header>
    <Card.Title>Preference Alignment</Card.Title>
    <Card.Description>How well assignments match student preferences</Card.Description>
  </Card.Header>
  <Card.Content>
    <Chart.Container config={chartConfig} class="relative max-h-70 w-full">
      <PieChart
        data={chartData}
        key="key"
        value="value"
        label="label"
        c="color"
        innerRadius={0.6}
        legend
      >
        {#snippet tooltip()}
          <Chart.Tooltip indicator="dot" hideLabel />
        {/snippet}
      </PieChart>
      <div
        class="pointer-events-none absolute inset-0 mb-12 flex flex-col items-center justify-center"
      >
        <span class="text-3xl font-bold tabular-nums">{percentFormat(data.bordaScore)}</span>
        <span class="text-xs text-muted-foreground">Borda Score</span>
      </div>
    </Chart.Container>
  </Card.Content>
</Card.Root>
