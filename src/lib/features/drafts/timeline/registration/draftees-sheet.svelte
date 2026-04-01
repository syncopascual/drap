<script lang="ts">
  import { SvelteMap } from 'svelte/reactivity';

  import * as Sheet from '$lib/components/ui/sheet';
  import DataTable from '$lib/features/drafts/draftees/data-table.svelte';
  import { Button } from '$lib/components/ui/button';
  import { createFetchDrafteesQuery } from '$lib/queries/fetch-draftees';
  import { createFetchDraftLateRegistrantsQuery } from '$lib/queries/fetch-draft-late-registrants';
  import { Input } from '$lib/components/ui/input';
  import type { Student } from '$lib/features/drafts/types';

  interface ExtendedStudent extends Student {
    isLate: boolean;
  }

  interface Props {
    draftId: string;
  }

  const { draftId }: Props = $props();

  const drafteesQuery = $derived(createFetchDrafteesQuery(draftId, d => d));
  const lateQuery = $derived(createFetchDraftLateRegistrantsQuery(draftId, d => d));

  const lateIds = $derived(new Set((lateQuery.data ?? []).map(s => s.id)));
  
  const allStudents = $derived.by(() => {
    const draftees = drafteesQuery.data ?? [];
    const late = lateQuery.data ?? [];
    const map = new SvelteMap<string, Student>();
    for (const s of draftees) map.set(s.id, s);
    for (const s of late) if (!map.has(s.id)) map.set(s.id, s);
    return Array.from(map.values()).map(s => ({ ...s, isLate: lateIds.has(s.id) })) as ExtendedStudent[];
  });

  let searchTerm = $state('');
  let showLateOnly = $state(false);

  const filteredStudents = $derived.by(() => {
    let result = allStudents;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter(s => 
        s.givenName.toLowerCase().includes(q) || 
        s.familyName.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q)
      );
    }
    if (showLateOnly) 
      result = result.filter(s => s.isLate);
    
    return result;
  });
</script>

<Sheet.Root>
  <Sheet.Trigger>
    <Button variant="outline" class="gap-2">
      View All Draftees
    </Button>
  </Sheet.Trigger>
  <Sheet.Content side="right" class="w-[600px] sm:max-w-[600px]">
    <Sheet.Header>
      <Sheet.Title>All Draftees</Sheet.Title>
    </Sheet.Header>

    <div class="flex gap-2 mb-4">
      <Input 
        placeholder="Search students..." 
        bind:value={searchTerm}
        class="flex-1"
      />
      <Button 
        variant={showLateOnly ? 'secondary' : 'outline'}
        onclick={() => { showLateOnly = !showLateOnly }}
      >
        Late Only
      </Button>
    </div>

    {#if drafteesQuery.isPending || lateQuery.isPending}
      <div class="flex h-32 items-center justify-center">
        <p class="text-muted-foreground">Loading...</p>
      </div>
    {:else if drafteesQuery.isError || lateQuery.isError}
      <div class="flex h-32 items-center justify-center">
        <p class="text-destructive">Error loading data</p>
      </div>
    {:else}
      <DataTable data={filteredStudents}>
        No students found
      </DataTable>
    {/if}
  </Sheet.Content>
</Sheet.Root>