import type { Draft } from './types';

export type DraftPhase =
  | 'registration'
  | 'registration-closed'
  | 'regular'
  | 'intervention'
  | 'review'
  | 'finalized';

export function getDraftPhase(
  draft: Pick<Draft, 'activePeriodEnd' | 'currRound' | 'maxRounds' | 'isRegistrationClosed'>,
): DraftPhase {
  if (draft.activePeriodEnd !== null) return 'finalized';
  if (draft.currRound === null) return 'review';
  if (draft.currRound === 0)
    return draft.isRegistrationClosed ? 'registration-closed' : 'registration';
  if (draft.currRound > draft.maxRounds) return 'intervention';
  return 'regular';
}

export function isInterventionsRendered(phase: DraftPhase): boolean {
  return phase === 'intervention' || phase === 'review' || phase === 'finalized';
}

export function isLotteryRendered(phase: DraftPhase): boolean {
  return phase === 'review' || phase === 'finalized';
}
