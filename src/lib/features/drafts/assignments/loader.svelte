<script lang="ts" module>
  export interface Props {
    draftId: string;
    maxRounds: number;
  }
</script>

<script lang="ts">
  import Loader2Icon from '@lucide/svelte/icons/loader-2';

  import Empty from '$lib/components/ui/empty/empty.svelte';
  import { createFetchDraftAssignmentsQuery } from '$lib/queries/fetch-draft-assignments';

  import Display from './display.svelte';

  const { draftId, maxRounds }: Props = $props();

  const query = $derived(createFetchDraftAssignmentsQuery(draftId));
</script>

{#if query.isPending}
  <div class="flex h-full items-center justify-center">
    <Loader2Icon class="size-20 animate-spin" />
  </div>
{:else if query.isError}
  <Empty>Uh oh! An error has occurred.</Empty>
{:else}
  {@const regularDrafted = query.data.filter(
    ({ round }) => round !== null && round > 0 && round <= maxRounds,
  )}
  {@const interventionDrafted = query.data.filter(
    ({ round }) => round !== null && round === maxRounds + 1,
  )}
  {@const lotteryDrafted = query.data.filter(({ round }) => round === null)}
  <Display {regularDrafted} {interventionDrafted} {lotteryDrafted} />
{/if}
