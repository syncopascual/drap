<script lang="ts">
  import Loader2Icon from '@lucide/svelte/icons/loader-2';

  import DataDisplay from './data-display.svelte';
  import Empty from '$lib/components/ui/empty/empty.svelte';
  import { createFetchDraftFacultyChoicesQuery } from '$lib/queries/fetch-draft-faculty-choices';

  export interface Props {
    draftId: string;
  }

  const { draftId }: Props = $props();

  const query = $derived(createFetchDraftFacultyChoicesQuery(draftId));
</script>

{#if query.isPending}
  <div class="flex h-full items-center justify-center">
    <Loader2Icon class="size-20 animate-spin" />
  </div>
{:else if query.isError}
  <Empty>Uh oh! An error has occurred.</Empty>
{:else}
  <DataDisplay data={query.data} />
{/if}
