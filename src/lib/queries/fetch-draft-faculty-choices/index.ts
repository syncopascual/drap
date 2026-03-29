import { createQuery } from '@tanstack/svelte-query';

import type { DraftFacultyChoiceRecords } from './schema';
import { fetchDraftFacultyChoices } from './http';

export function createFetchDraftFacultyChoicesQuery(
  draftId: string,
  select?: (data: DraftFacultyChoiceRecords) => DraftFacultyChoiceRecords,
) {
  return createQuery(() => ({
    queryKey: ['drafts', draftId, 'faculty-choices'] as const,
    async queryFn({ queryKey: [, id] }) {
      return await fetchDraftFacultyChoices(id);
    },
    select,
  }));
}
