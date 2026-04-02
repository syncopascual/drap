<script lang="ts">
  import * as Drawer from '$lib/components/ui/drawer';
  import { Button } from '$lib/components/ui/button';

  import Loader, { type Props } from './loader.svelte';

  const loaderProps: Props = $props();
</script>

<Drawer.Root>
  <Drawer.Trigger>
    {#snippet child({ props })}
      <Button variant="outline" class="border-primary text-primary" {...props}>
        See Draft Statistics
      </Button>
    {/snippet}
  </Drawer.Trigger>
  <Drawer.Content class="min-h-screen">
    <div class="overflow-y-auto p-4">
      <Loader {...loaderProps} />
    </div>
  </Drawer.Content>
</Drawer.Root>
