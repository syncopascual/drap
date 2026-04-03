<script lang="ts">
  import { Badge } from '$lib/components/ui/badge';

  interface Props {
    labs: string[];
  }

  const { labs }: Props = $props();
</script>

<div class="overflow-x-auto">
  {#each labs as lab (lab)}
    <Badge
      variant="outline"
      class="mr-1 h-fit border-accent bg-accent/10 px-2 py-1 text-xs uppercase"
    >
      {lab}
    </Badge>
  {/each}
</div>
