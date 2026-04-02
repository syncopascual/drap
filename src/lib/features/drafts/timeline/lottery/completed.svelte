<script lang="ts">
  import DraftedDraftees from '$lib/features/drafts/draftees/drafted/index.svelte';

  import FinalizeForm from './finalize-form.svelte';

  interface Props {
    draftId: string;
    isReview: boolean;
  }

  const { draftId, isReview }: Props = $props();
</script>

<div class="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
  <div class="prose max-w-none dark:prose-invert">
    <h3>{isReview ? 'Review Phase' : 'Lottery Phase'}</h3>
    {#if isReview}
      <p>
        Lottery assignment has completed. Review the results below. When ready, finalize to dispatch
        emails and synchronize official student lab assignments.
      </p>
      <div class="mb-6 flex justify-center">
        <DraftedDraftees {draftId} />
      </div>
      <FinalizeForm {draftId} />
    {:else}
      <p>The lottery phase has completed. Review the results below.</p>
      <div class="flex justify-center">
        <DraftedDraftees {draftId} />
      </div>
    {/if}
  </div>
</div>
