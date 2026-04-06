<script lang="ts">
  import type { Snippet } from 'svelte';
  import { tv, type VariantProps } from 'tailwind-variants';

  import * as Empty from '$lib/components/ui/empty';

  const emptyWrapperMediaVariants = tv({
    base: 'flex size-10 shrink-0 items-center justify-center rounded-lg [&_svg:not([class*=size-])]:size-6',
    variants: {
      variant: {
        default: 'border border-border bg-muted text-foreground',
        info: 'preset-tonal-accent',
        success: 'preset-tonal-success',
        warning: 'preset-tonal-warning',
        destructive: 'preset-tonal-destructive',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  });

  const emptyWrapperTitleVariants = tv({
    variants: {
      variant: {
        default: 'text-foreground brightness-80',
        info: 'text-accent brightness-80',
        warning: 'text-warning brightness-80',
        destructive: 'text-destructive brightness-80',
        success: 'text-success brightness-80',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  });

  const emptyWrapperDescVariants = tv({
    variants: {
      variant: {
        default: 'text-muted-foreground',
        info: 'text-accent-neutral',
        warning: 'text-warning-neutral',
        destructive: 'text-destructive-neutral',
        success: 'text-success-neutral',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  });

  type EmptyVariant = VariantProps<typeof emptyWrapperMediaVariants>['variant'];

  interface Props {
    variant?: EmptyVariant;
    title?: Snippet;
    description?: Snippet;
    class?: string;
    mediaClass?: string;
    icon?: Snippet;
    children?: Snippet;
  }

  let {
    variant = 'default',
    title,
    description,
    class: className,
    mediaClass,
    icon,
    children,
  }: Props = $props();
</script>

<Empty.Root class={className}>
  {#if typeof icon !== 'undefined'}
    <Empty.Media
      variant="default"
      class={emptyWrapperMediaVariants({ variant, class: mediaClass })}
      children={icon}
    />
  {/if}
  <Empty.Header class="empty:hidden">
    {#if typeof title !== 'undefined'}
      <Empty.Title class={emptyWrapperTitleVariants({ variant })} children={title} />
    {/if}
    {#if typeof description !== 'undefined'}
      <Empty.Description class={emptyWrapperDescVariants({ variant })} children={description} />
    {/if}
  </Empty.Header>
  {#if typeof children !== 'undefined'}
    <Empty.Content {children} />
  {/if}
</Empty.Root>
