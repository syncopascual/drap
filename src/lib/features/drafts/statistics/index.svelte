<script lang="ts">
  import * as Drawer from '$lib/components/ui/drawer';
  import { Button } from '$lib/components/ui/button';

  import Loader, { type Props } from './loader.svelte';

  const loaderProps: Props = $props();
  let open = $state(false);
</script>

<Drawer.Root bind:open>
  <Drawer.Trigger>
    {#snippet child({ props })}
      <Button variant="outline" class="border-primary text-primary" {...props}>
        See Draft Statistics
      </Button>
    {/snippet}
  </Drawer.Trigger>
  <Drawer.Content class="min-h-screen">
    {#if open}
      <div class="overflow-auto px-8 pb-40">
        <Loader {...loaderProps} />
      </div>
    {/if}
  </Drawer.Content>
</Drawer.Root>
