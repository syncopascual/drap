<script lang="ts">
  import { tv } from 'tailwind-variants';

  import * as Drawer from '$lib/components/ui/drawer';
  import { Button } from '$lib/components/ui/button';

  import Loader, { type Props as LoaderProps } from './loader.svelte';

  const triggerVariants = tv({
    variants: {
      variant: {
        primary: 'border-primary text-primary',
        accent: 'border-accent text-accent',
      },
    },
  });

  interface Props extends LoaderProps {
    variant: 'primary' | 'accent';
  }

  const { variant, ...props }: Props = $props();
</script>

<Drawer.Root>
  <Drawer.Trigger>
    {#snippet child({ props })}
      <Button variant="outline" class={triggerVariants({ variant })} {...props}>
        See Late Registrants
      </Button>
    {/snippet}
  </Drawer.Trigger>
  <Drawer.Content class="h-dvh max-h-dvh overflow-hidden">
    <div class="min-h-0 flex-1 overflow-y-auto px-8 pb-40">
      <Loader {...props} />
    </div>
  </Drawer.Content>
</Drawer.Root>
