<script lang="ts">
  import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
  import FlaskConicalIcon from '@lucide/svelte/icons/flask-conical';
  import GraduationCapIcon from '@lucide/svelte/icons/graduation-cap';
  import PaperclipIcon from '@lucide/svelte/icons/paperclip';

  import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
  import * as Tabs from '$lib/components/ui/tabs';
  import AvailableLoader from '$lib/features/drafts/draftees/available/loader.svelte';
  import DraftedLoader from '$lib/features/drafts/draftees/drafted/loader.svelte';
  import SystemLogsLoader from '$lib/features/drafts/system-logs/loader.svelte';
  import { Button } from '$lib/components/ui/button';
  import { cn } from '$lib/components/ui/utils';
  import type { Lab } from '$lib/features/drafts/types';

  import LabRoundSummary from './lab-round-summary.svelte';

  type TabType = 'students' | 'labs' | 'logs';

  interface Props {
    draftId: string;
    requestedAt: Date;
    round: number;
    labs: Lab[];
  }

  const { draftId, requestedAt, round, labs }: Props = $props();

  let group: TabType = $state('students');
  let selectedView = $state<'pending' | 'drafted'>('pending');
  let dropdownOpen = $state(false);
</script>

<Tabs.Root
  value={group}
  onValueChange={value => {
    if (value === 'students' || value === 'labs' || value === 'logs') group = value;
  }}
>
  <div class="flex justify-around sm:justify-normal">
    <Tabs.List class="grid h-full w-full grid-cols-3">
      <Tabs.Trigger value="students">
        <GraduationCapIcon class="size-5" />
        <span class="sr-only md:not-sr-only">Registered Students</span>
      </Tabs.Trigger>
      <Tabs.Trigger value="labs">
        <FlaskConicalIcon class="size-5" />
        <span class="sr-only md:not-sr-only">Laboratories</span>
      </Tabs.Trigger>
      <Tabs.Trigger value="logs">
        <PaperclipIcon class="size-5" />
        <span class="sr-only md:not-sr-only">System Logs</span>
      </Tabs.Trigger>
    </Tabs.List>
  </div>
  <Tabs.Content value="students">
    {#if group === 'students'}
      <div class="mb-2 flex justify-center xs:justify-start">
        <DropdownMenu.Root bind:open={dropdownOpen}>
          <DropdownMenu.Trigger>
            {#snippet child({ props })}
              <Button
                {...props}
                variant="outline"
                class="bg-background hover:bg-accent dark:bg-input dark:hover:bg-input/80"
              >
                <ChevronDownIcon
                  class={cn(
                    'size-4 text-muted-foreground transition-transform',
                    dropdownOpen && 'rotate-180',
                  )}
                />
                {selectedView === 'pending' ? 'Pending Selection' : 'Already Drafted'}
              </Button>
            {/snippet}
          </DropdownMenu.Trigger>
          <DropdownMenu.Content align="start">
            <DropdownMenu.Item onclick={() => (selectedView = 'pending')}>
              <span>Pending Selection</span>
            </DropdownMenu.Item>
            <DropdownMenu.Item onclick={() => (selectedView = 'drafted')}>
              <span>Already Drafted</span>
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </div>

      {#if selectedView === 'pending'}
        <span class="text-sm text-muted-foreground"
          >Review undrafted students available for selection.</span
        >
        <div class="flex min-h-0 grow flex-col overflow-y-auto px-4 pb-4">
          <AvailableLoader {draftId} />
        </div>
      {:else if selectedView === 'drafted'}
        <span class="text-sm text-muted-foreground"
          >Review students who have already been assigned.</span
        >
        <div class="flex min-h-0 grow flex-col overflow-y-auto px-4 pb-4">
          <DraftedLoader {draftId} />
        </div>
      {/if}
    {/if}
  </Tabs.Content>
  <Tabs.Content value="labs" class="min-w-0 overflow-auto">
    {#each labs as lab (lab.id)}
      <LabRoundSummary {draftId} {round} {lab} />
    {/each}
  </Tabs.Content>
  <Tabs.Content value="logs">
    {#if group === 'logs'}
      <SystemLogsLoader {draftId} {requestedAt} />
    {/if}
  </Tabs.Content>
</Tabs.Root>
