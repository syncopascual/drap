<script lang="ts">
  import { Heading, Section, Text } from 'better-svelte-email';

  import EmailLayout from './email-layout.svelte';

  interface Props {
    labName: string;
    round: number;
    draftId: number;
    isUpdate: boolean;
  }

  const { labName, round, draftId, isUpdate }: Props = $props();
</script>

<EmailLayout
  preview={isUpdate
    ? `${labName} updated preferences for Round #${round}`
    : `${labName} submitted preferences for Round #${round}`}
>
  <Section>
    <Heading class="text-2xl font-bold text-foreground" as="h1">
      {isUpdate ? 'Preferences Updated' : 'Preferences Submitted'}
    </Heading>
    <Text class="text-base text-foreground">
      The <strong>{labName}</strong>
      {isUpdate ? 'has updated' : 'has submitted'}
      their student preferences for
      <strong>Round #{round}</strong> of Draft
      <strong>#{draftId}</strong>.
    </Text>
    {#if !isUpdate}
      <Text class="text-base">
        The draft will proceed to the next round once all participating labs have submitted their
        preferences.
      </Text>
    {/if}
  </Section>
</EmailLayout>
