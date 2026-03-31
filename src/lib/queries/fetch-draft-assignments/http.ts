import * as devalue from 'devalue';
import * as v from 'valibot';

import { DraftAssignmentRecords } from './schema';

export async function fetchDraftAssignments(draftId: string) {
  const response = await fetch(`/dashboard/drafts/${draftId}/assignments`);
  if (!response.ok) throw new Error('Failed to fetch draft assignments.');

  const serialized = await response.text();
  return v.parse(DraftAssignmentRecords, devalue.parse(serialized));
}
