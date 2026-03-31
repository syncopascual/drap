<script lang="ts">
  import { max } from 'd3-array';

  interface Props {
    draftCreatedAt: Date;
    registrationClosedAt: Date;
    startedAt: Date | null;
    requestedAt: Date;
    timelineData: { date: Date; count: number }[];
  }

  const { draftCreatedAt, registrationClosedAt, startedAt, requestedAt, timelineData }: Props = $props();

  const endBound = $derived(startedAt ?? requestedAt);
  const yMax = $derived(max(timelineData, d => d.count) ?? 0);

  const width = 100;
  const height = 100;
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };

  function getX(date: Date): number {
    const start = draftCreatedAt.getTime();
    const end = endBound.getTime();
    const range = end - start;
    if (range === 0) return padding.left;
    return padding.left + ((date.getTime() - start) / range) * (width - padding.left - padding.right);
  }

  function getY(count: number): number {
    if (yMax === 0) return height - padding.bottom;
    return height - padding.bottom - (count / yMax) * (height - padding.top - padding.bottom);
  }

  const regClosedX = getX(registrationClosedAt);
</script>

<div class="h-80 w-full p-4 border rounded-lg">
  <div class="text-sm text-muted-foreground mb-4">
    <span>Created: {draftCreatedAt.toLocaleDateString()}</span>
    <span class="mx-2">|</span>
    <span>Closed: {registrationClosedAt.toLocaleDateString()}</span>
    {#if startedAt}
      <span class="mx-2">|</span>
      <span>Started: {startedAt.toLocaleDateString()}</span>
    {:else}
      <span class="mx-2">|</span>
      <span>Current: {requestedAt.toLocaleDateString()}</span>
    {/if}
  </div>

  <svg viewBox="0 0 {width} {height}" class="w-full h-full" preserveAspectRatio="none">
    <!-- Y axis labels -->
    {#each Array(Math.ceil(yMax / 5) + 1) as _, i}
      {@const yVal = i * 5}
      {@const yPos = getY(yVal)}
      {#if yPos >= padding.top}
        <line x1={padding.left} y1={yPos} x2={width - padding.right} y2={yPos} stroke="#e5e7eb" stroke-width="0.5" />
        <text x={padding.left - 5} y={yPos + 3} text-anchor="end" font-size="3" fill="#6b7280">{yVal}</text>
      {/if}
    {/each}

    <!-- Registration closed reference line -->
    {#if regClosedX >= padding.left && regClosedX <= width - padding.right}
      <line x1={regClosedX} y1={padding.top} x2={regClosedX} y2={height - padding.bottom} stroke="#ef4444" stroke-width="1" stroke-dasharray="3" />
      <text x={regClosedX} y={padding.top - 2} text-anchor="middle" font-size="3" fill="#ef4444">Registration Closed</text>
    {/if}

    <!-- Area fill -->
    {#if timelineData.length > 0}
      <path
        d={`M ${padding.left} ${height - padding.bottom} ${timelineData.map(d => `${getX(d.date)} ${getY(d.count)}`).join(' L ')} ${getX(endBound)} ${height - padding.bottom} Z`}
        fill="#3b82f6"
        fill-opacity="0.1"
      />
      <!-- Line -->
      <path
        d={`M ${timelineData.map(d => `${getX(d.date)} ${getY(d.count)}`).join(' L ')}`}
        fill="none"
        stroke="#3b82f6"
        stroke-width="1.5"
      />
    {/if}
  </svg>
</div>