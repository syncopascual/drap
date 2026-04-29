import { describe, expect, test } from 'vitest';

import { buildLotteryAggregate, ordinalChoice } from './assignment-summary';

describe('ordinalChoice', () => {
  test('produces "1st Choice" for rank 1', () => {
    expect(ordinalChoice(1)).toBe('1st Choice');
  });

  test('produces "2nd Choice" for rank 2', () => {
    expect(ordinalChoice(2)).toBe('2nd Choice');
  });

  test('produces "3rd Choice" for rank 3', () => {
    expect(ordinalChoice(3)).toBe('3rd Choice');
  });

  test('produces "11th Choice" for rank 11 (teen exception)', () => {
    expect(ordinalChoice(11)).toBe('11th Choice');
  });

  test('produces "12th Choice" for rank 12 (teen exception)', () => {
    expect(ordinalChoice(12)).toBe('12th Choice');
  });

  test('produces "21st Choice" for rank 21', () => {
    expect(ordinalChoice(21)).toBe('21st Choice');
  });
});

describe('buildLotteryAggregate', () => {
  const LABS = [
    { id: 'csl', name: 'CSL' },
    { id: 'ndsl', name: 'NDSL' },
  ];

  test('returns zero-shaped aggregate for empty input', () => {
    const result = buildLotteryAggregate([], LABS);

    expect(result.statCards).toEqual({
      poolSize: 0,
      topChoice: 0,
      rankedLab: 0,
      unranked: 0,
      medianRankHonored: null,
    });
    expect(result.outcomeStacks).toEqual([]);
  });

  test('single lab, single ranked placement at rank 1', () => {
    const result = buildLotteryAggregate([{ labId: 'csl', preferenceRank: 1n, count: 3 }], LABS);

    expect(result.statCards.poolSize).toBe(3);
    expect(result.statCards.topChoice).toBe(3);
    expect(result.statCards.rankedLab).toBe(3);
    expect(result.statCards.unranked).toBe(0);
    expect(result.statCards.medianRankHonored).toBe(1);

    expect(result.outcomeStacks).toHaveLength(1);
    const [stack] = result.outcomeStacks;
    expect(stack).toMatchObject({ labId: 'csl', labName: 'CSL', total: 3 });
    expect(stack!.buckets).toEqual([{ rank: 1, label: '1st Choice', count: 3 }]);
  });

  test('mixed ranked and unranked placements — ranked buckets sorted ascending, null last', () => {
    const result = buildLotteryAggregate(
      [
        { labId: 'csl', preferenceRank: 3n, count: 2 },
        { labId: 'csl', preferenceRank: null, count: 1 },
        { labId: 'csl', preferenceRank: 1n, count: 4 },
      ],
      LABS,
    );

    expect(result.statCards.poolSize).toBe(7);
    expect(result.statCards.topChoice).toBe(4);
    expect(result.statCards.rankedLab).toBe(6);
    expect(result.statCards.unranked).toBe(1);

    const [stack] = result.outcomeStacks;
    expect(stack!.buckets).toEqual([
      { rank: 1, label: '1st Choice', count: 4 },
      { rank: 3, label: '3rd Choice', count: 2 },
      { rank: null, label: 'Not Preferred', count: 1 },
    ]);
  });

  test('cross-lab rank ordering: each stack sorted by rank regardless of label string', () => {
    // Lab A has only rank 3; Lab B has only rank 1.
    // allRankedRanks must be [1, 3] so each stack's bucket list follows numeric order.
    const result = buildLotteryAggregate(
      [
        { labId: 'csl', preferenceRank: 3n, count: 2 },
        { labId: 'ndsl', preferenceRank: 1n, count: 5 },
      ],
      LABS,
    );

    const cslStack = result.outcomeStacks.find(s => s.labId === 'csl');
    const ndslStack = result.outcomeStacks.find(s => s.labId === 'ndsl');

    // CSL only has rank-3 placements; rank-1 bucket absent (count 0, not emitted).
    expect(cslStack!.buckets).toEqual([{ rank: 3, label: '3rd Choice', count: 2 }]);
    // NDSL only has rank-1 placements.
    expect(ndslStack!.buckets).toEqual([{ rank: 1, label: '1st Choice', count: 5 }]);
  });

  test('outcomeStacks are sorted alphabetically by lab name', () => {
    const result = buildLotteryAggregate(
      [
        { labId: 'ndsl', preferenceRank: 1n, count: 1 },
        { labId: 'csl', preferenceRank: 1n, count: 1 },
      ],
      LABS,
    );

    expect(result.outcomeStacks.map(s => s.labId)).toEqual(['csl', 'ndsl']);
  });

  test('medianRankHonored is null when all placements are unranked', () => {
    const result = buildLotteryAggregate([{ labId: 'csl', preferenceRank: null, count: 5 }], LABS);

    expect(result.statCards.medianRankHonored).toBeNull();
    expect(result.statCards.unranked).toBe(5);
    expect(result.statCards.rankedLab).toBe(0);
  });

  test('medianRankHonored is the median rank across all ranked placements', () => {
    // Ranks: [1,1,1, 2,2, 3] → n=6, target=3, cumulative reaches 3 at rank 1.
    const result = buildLotteryAggregate(
      [
        { labId: 'csl', preferenceRank: 1n, count: 3 },
        { labId: 'csl', preferenceRank: 2n, count: 2 },
        { labId: 'csl', preferenceRank: 3n, count: 1 },
      ],
      LABS,
    );

    expect(result.statCards.medianRankHonored).toBe(1);
  });

  test('counts from unknown lab ids use labId as fallback name', () => {
    const result = buildLotteryAggregate(
      [{ labId: 'unknown', preferenceRank: 1n, count: 1 }],
      LABS,
    );

    const [stack] = result.outcomeStacks;
    expect(stack!.labName).toBe('unknown');
  });
});
