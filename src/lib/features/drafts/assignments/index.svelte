<script lang="ts">
  import * as Sheet from '$lib/components/ui/sheet';
  import { Button } from '$lib/components/ui/button';

  import Loader, { type Props } from './loader.svelte';

  const loaderProps: Props = $props();
</script>

<Sheet.Root>
  <Sheet.Trigger>
    {#snippet child({ props })}
      <Button variant="outline" class='border-primary text-primary' {...props}>
        See Drafted Students by Method
      </Button>
    {/snippet}
  </Sheet.Trigger>
  <Sheet.Content side="right" class="min-w-[50%]">
    <Sheet.Header>
      <Sheet.Title>Draft Assignments</Sheet.Title>
    </Sheet.Header>
    <div class="overflow-auto px-8 pb-40">
      <Loader {...loaderProps} />
    </div>
  </Sheet.Content>
</Sheet.Root>
