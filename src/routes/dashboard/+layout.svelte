<script lang="ts">
  import BottomNav from '$lib/components/bottom-nav.svelte';
  import { dev } from '$app/environment';
  import { DevTools } from '$lib/features/dev-tools';
  import { SidebarProvider } from '$lib/components/ui/sidebar';
  import { Toaster } from '$lib/components/ui/sonner';

  import SideBar from './side-bar.svelte';

  const { data, children } = $props();
  const { user } = $derived(data);
</script>

<Toaster richColors closeButton />
<SidebarProvider>
  <div class="flex h-dvh w-full overflow-hidden">
    <SideBar {user} />
    <div class="flex min-w-0 flex-1 flex-col">
      <main class="grow space-y-4 overflow-y-auto px-4 pt-4">
        {@render children?.()}
      </main>
      <BottomNav />
    </div>
  </div>
</SidebarProvider>
{#if dev && typeof user !== 'undefined'}
  <DevTools {user} />
{/if}
