<script lang="ts">
  import * as Sheet from '$lib/components/ui/sheet';
  import { Button } from '$lib/components/ui/button';

  import Loader, { type Props } from './loader.svelte';

  const loaderProps: Props = $props();
  let open = $state(false);
</script>

<Sheet.Root bind:open>
  <Sheet.Trigger>
    {#snippet child({ props })}
      <Button variant="outline" class="border-primary text-primary" {...props}>
        See Drafted Students by Method
      </Button>
    {/snippet}
  </Sheet.Trigger>
  <Sheet.Content side="right" class="min-w-[50%]">
    <Sheet.Header>
      <Sheet.Title>Draft Assignments</Sheet.Title>
    </Sheet.Header>
    {#if open}
      <div class="overflow-y-auto p-4">
        <Loader {...loaderProps} />
      </div>
    {/if}
  </Sheet.Content>
</Sheet.Root>
