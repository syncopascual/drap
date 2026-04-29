import { describe, expect, test } from 'vitest';

import {
  buildDraftAssignmentSummary,
  buildDraftSummaryChartData,
  buildInterventionsAggregate,
  buildLotteryAggregate,
  buildPreferenceAlignment,
} from './assignment-summary';

describe('buildDraftAssignmentSummary', () => {
  test('builds zero-filled phase series and aggregate metrics from grouped assignment rows', () => {
    const summary = buildDraftAssignmentSummary(
      [
        { labId: 'lab-1', round: 1, count: 2 },
        { labId: 'lab-2', round: 2, count: 1 },
        { labId: 'lab-1', round: 4, count: 1 },
        { labId: 'lab-2', round: null, count: 1 },
      ],
      [
        { id: 'lab-1', name: 'Lab One', quota: 3 },
        { id: 'lab-2', name: 'Lab Two', quota: 2 },
      ],
      3,
      5,
    );

    expect(summary.metrics).toEqual({
      participatingLabCount: 2,
      interventionDraftedCount: 1,
      lotteryDraftedCount: 1,
    });
    expect(summary.chart.phases).toEqual([
      { key: 'round-1', axisLabel: 'R1', tooltipLabel: 'Round 1' },
      { key: 'round-2', axisLabel: 'R2', tooltipLabel: 'Round 2' },
      { key: 'round-3', axisLabel: 'R3', tooltipLabel: 'Round 3' },
      { key: 'interventions', axisLabel: 'Interventions', tooltipLabel: 'Interventions' },
      { key: 'lottery', axisLabel: 'Lottery', tooltipLabel: 'Lottery' },
    ]);
    expect(summary.chart.allLabs).toEqual({
      capacity: 5,
      assignedByPhase: [2, 1, 0, 1, 1],
      assignedMax: 2,
    });
    expect(summary.chart.labs).toEqual([
      {
        id: 'lab-1',
        name: 'Lab One',
        capacity: 3,
        assignedByPhase: [2, 0, 0, 1, 0],
        assignedMax: 2,
      },
      {
        id: 'lab-2',
        name: 'Lab Two',
        capacity: 2,
        assignedByPhase: [0, 1, 0, 0, 1],
        assignedMax: 1,
      },
    ]);
  });

  test('returns zero-filled series when no assignments exist yet', () => {
    const summary = buildDraftAssignmentSummary(
      [],
      [{ id: 'lab-1', name: 'Lab One', quota: 4 }],
      2,
      4,
    );

    expect(summary.metrics).toEqual({
      participatingLabCount: 1,
      interventionDraftedCount: 0,
      lotteryDraftedCount: 0,
    });
    expect(summary.chart.allLabs).toEqual({
      capacity: 4,
      assignedByPhase: [0, 0, 0, 0],
      assignedMax: 0,
    });
    expect(summary.chart.labs).toEqual([
      {
        id: 'lab-1',
        name: 'Lab One',
        capacity: 4,
        assignedByPhase: [0, 0, 0, 0],
        assignedMax: 0,
      },
    ]);
  });
});

describe('buildPreferenceAlignment', () => {
  test('creates individual slices for each rank sorted ascending', () => {
    const result = buildPreferenceAlignment([
      { preferenceRank: 3n, totalRanked: 5, count: 2 },
      { preferenceRank: 1n, totalRanked: 5, count: 10 },
      { preferenceRank: 5n, totalRanked: 5, count: 1 },
      { preferenceRank: 2n, totalRanked: 5, count: 4 },
    ]);

    expect(result.slices).toEqual([
      { label: '1st Choice', count: 10 },
      { label: '2nd Choice', count: 4 },
      { label: '3rd Choice', count: 2 },
      { label: '5th Choice', count: 1 },
    ]);
  });

  test('appends "Not Preferred" last for unranked assignments', () => {
    const result = buildPreferenceAlignment([
      { preferenceRank: 1n, totalRanked: 3, count: 5 },
      { preferenceRank: null, totalRanked: null, count: 3 },
      { preferenceRank: 2n, totalRanked: 3, count: 2 },
    ]);

    expect(result.slices).toEqual([
      { label: '1st Choice', count: 5 },
      { label: '2nd Choice', count: 2 },
      { label: 'Not Preferred', count: 3 },
    ]);
  });

  test('omits "Not Preferred" when all students ranked their assigned lab', () => {
    const result = buildPreferenceAlignment([
      { preferenceRank: 1n, totalRanked: 2, count: 4 },
      { preferenceRank: 2n, totalRanked: 2, count: 1 },
    ]);

    expect(result.slices.map(s => s.label)).not.toContain('Not Preferred');
  });

  test('computes Borda score correctly for mixed ranks', () => {
    // 2 students ranked 3 labs each, both got 1st choice → (3-1)/(3-1) = 1.0 each
    const result = buildPreferenceAlignment([{ preferenceRank: 1n, totalRanked: 3, count: 2 }]);

    expect(result.bordaScore).toBeCloseTo(1.0);
  });

  test('scores unranked students as zero Borda', () => {
    // 1 ranked 1st of 3 → (3-1)/(3-1) = 1.0; 1 unranked → 0
    // average = (1.0 + 0) / 2 = 0.5
    const result = buildPreferenceAlignment([
      { preferenceRank: 1n, totalRanked: 3, count: 1 },
      { preferenceRank: null, totalRanked: null, count: 1 },
    ]);

    expect(result.bordaScore).toBeCloseTo(0.5);
  });

  test('returns zero Borda score when no rows exist', () => {
    const result = buildPreferenceAlignment([]);
    expect(result.bordaScore).toBe(0);
    expect(result.slices).toEqual([]);
  });

  test('gives perfect score when only one lab was ranked', () => {
    // single-lab ranking → perfect score
    const result = buildPreferenceAlignment([{ preferenceRank: 1n, totalRanked: 1, count: 3 }]);

    expect(result.bordaScore).toBeCloseTo(1.0);
  });
});

describe('buildDraftSummaryChartData', () => {
  test('computes supply share from initial quota only', () => {
    const summary = buildDraftSummaryChartData(
      [{ labId: 'lab-1', round: 1, count: 2 }],
      [
        { id: 'lab-1', name: 'Lab One', quota: 4 },
        { id: 'lab-2', name: 'Lab Two', quota: 4 },
      ],
      [
        { labId: 'lab-1', initialQuota: 2 },
        { labId: 'lab-2', initialQuota: 2 },
      ],
      [
        { labId: 'lab-1', bordaScore: 3 },
        { labId: 'lab-2', bordaScore: 1 },
      ],
      [],
      2,
    );

    expect(summary.supplyVsDemand).toEqual([
      {
        labId: 'lab-1',
        labName: 'Lab One',
        supplyShare: 0.5,
        demandShare: 0.75,
        actualShare: 1,
      },
      {
        labId: 'lab-2',
        labName: 'Lab Two',
        supplyShare: 0.5,
        demandShare: 0.25,
        actualShare: 0,
      },
    ]);
  });

  test('returns zero supply shares when total initial quota is zero', () => {
    const summary = buildDraftSummaryChartData(
      [],
      [
        { id: 'lab-1', name: 'Lab One', quota: 0 },
        { id: 'lab-2', name: 'Lab Two', quota: 0 },
      ],
      [
        { labId: 'lab-1', initialQuota: 0 },
        { labId: 'lab-2', initialQuota: 0 },
      ],
      [],
      [],
      0,
    );

    expect(summary.supplyVsDemand).toEqual([
      {
        labId: 'lab-1',
        labName: 'Lab One',
        supplyShare: 0,
        demandShare: 0,
        actualShare: 0,
      },
      {
        labId: 'lab-2',
        labName: 'Lab Two',
        supplyShare: 0,
        demandShare: 0,
        actualShare: 0,
      },
    ]);
  });
});

const SNAPSHOTS = [
  { labId: 'lab-a', labName: 'Alpha Lab', initialQuota: 5, lotteryQuota: 3 },
  { labId: 'lab-b', labName: 'Beta Lab', initialQuota: 4, lotteryQuota: 6 },
  { labId: 'lab-c', labName: 'Gamma Lab', initialQuota: 3, lotteryQuota: 3 },
];

const LABS = [
  { id: 'lab-a', name: 'Alpha Lab' },
  { id: 'lab-b', name: 'Beta Lab' },
  { id: 'lab-c', name: 'Gamma Lab' },
];

const MAX_ROUNDS = 3;

describe('buildInterventionsAggregate', () => {
  test('computes pool size, total lottery quota, and delta from assignment counts', () => {
    const counts = [
      { labId: 'lab-a', round: 1, count: 2 },
      { labId: 'lab-b', round: 2, count: 1 },
    ];
    const result = buildInterventionsAggregate(10, counts, SNAPSHOTS, MAX_ROUNDS);

    expect(result.statCards.poolSize).toBe(7); // 10 - 3
    expect(result.statCards.totalLotteryQuota).toBe(12); // 3 + 6 + 3
    expect(result.statCards.delta).toBe(-5); // 7 - 12
  });

  test('excludes lottery rows (round IS NULL) from studentsFilledSoFar', () => {
    const counts = [
      { labId: 'lab-a', round: 1, count: 2 },
      { labId: 'lab-a', round: null, count: 1 }, // lottery row — excluded
    ];
    const result = buildInterventionsAggregate(10, counts, SNAPSHOTS, MAX_ROUNDS);

    expect(result.statCards.poolSize).toBe(8); // 10 - 2 (not 10 - 3)
  });

  test('computes natural leftover and gap per lab', () => {
    // Alpha: initialQuota=5, filled=2 (round 1) → naturalLeftover=3, lotteryQuota=3 → gap=0
    // Beta: initialQuota=4, filled=1 (round 2) → naturalLeftover=3, lotteryQuota=6 → gap=+3
    // Gamma: initialQuota=3, filled=0 → naturalLeftover=3, lotteryQuota=3 → gap=0
    const counts = [
      { labId: 'lab-a', round: 1, count: 2 },
      { labId: 'lab-b', round: 2, count: 1 },
    ];
    const result = buildInterventionsAggregate(10, counts, SNAPSHOTS, MAX_ROUNDS);

    const beta = /** @type {NonNullable<typeof result.dumbbellRows[0]>} */ (
      result.dumbbellRows.find(r => r.labId === 'lab-b')
    );
    expect(beta).toBeDefined();
    expect(beta.naturalLeftover).toBe(3);
    expect(beta.lotteryQuota).toBe(6);
    expect(beta.gap).toBe(3);

    const alpha = /** @type {NonNullable<typeof result.dumbbellRows[0]>} */ (
      result.dumbbellRows.find(r => r.labId === 'lab-a')
    );
    expect(alpha.naturalLeftover).toBe(3);
    expect(alpha.gap).toBe(0);
  });

  test('sorts dumbbell rows by abs(gap) descending, then labName ascending for ties', () => {
    // Beta gap = +3 (largest), Alpha gap = 0, Gamma gap = 0 → Alpha before Gamma alphabetically
    const counts = [
      { labId: 'lab-a', round: 1, count: 2 },
      { labId: 'lab-b', round: 2, count: 1 },
    ];
    const result = buildInterventionsAggregate(10, counts, SNAPSHOTS, MAX_ROUNDS);

    expect(result.dumbbellRows[0]?.labId).toBe('lab-b'); // largest gap
    expect(result.dumbbellRows[1]?.labId).toBe('lab-a'); // tied gap=0, Alpha < Gamma alphabetically
    expect(result.dumbbellRows[2]?.labId).toBe('lab-c');
  });

  test('clamps naturalLeftover to 0 when more students filled than initial quota', () => {
    const counts = [{ labId: 'lab-a', round: 1, count: 99 }]; // overflow
    const result = buildInterventionsAggregate(100, counts, SNAPSHOTS, MAX_ROUNDS);

    const alpha = /** @type {NonNullable<typeof result.dumbbellRows[0]>} */ (
      result.dumbbellRows.find(r => r.labId === 'lab-a')
    );
    expect(alpha.naturalLeftover).toBe(0);
    expect(alpha.gap).toBe(3); // lotteryQuota(3) - naturalLeftover(0)
  });

  test('returns zero pool when all students are filled in non-lottery rounds', () => {
    const counts = [
      { labId: 'lab-a', round: 1, count: 5 },
      { labId: 'lab-b', round: 2, count: 3 },
      { labId: 'lab-c', round: 3, count: 2 },
    ];
    const result = buildInterventionsAggregate(10, counts, SNAPSHOTS, MAX_ROUNDS);

    expect(result.statCards.poolSize).toBe(0);
  });

  test('handles empty assignment counts with naturalLeftover equal to initialQuota', () => {
    const result = buildInterventionsAggregate(10, [], SNAPSHOTS, MAX_ROUNDS);

    expect(result.statCards.poolSize).toBe(10);
    expect(result.dumbbellRows.find(r => r.labId === 'lab-a')?.naturalLeftover).toBe(5);
  });

  test('naturalLeftover uses only regular-round rows (round <= maxRounds)', () => {
    const counts = [
      { labId: 'lab-a', round: 1, count: 2 },
      { labId: 'lab-a', round: MAX_ROUNDS, count: 1 }, // last regular round
    ];
    const result = buildInterventionsAggregate(10, counts, SNAPSHOTS, MAX_ROUNDS);

    // filled by regular rounds = 3; naturalLeftover = 5 - 3 = 2
    expect(result.dumbbellRows.find(r => r.labId === 'lab-a')?.naturalLeftover).toBe(2);
    expect(result.statCards.poolSize).toBe(7);
  });

  test('intervention-round rows decrease poolSize but not naturalLeftover', () => {
    const counts = [
      { labId: 'lab-a', round: 1, count: 2 },
      { labId: 'lab-a', round: MAX_ROUNDS + 1, count: 1 }, // intervention round
    ];
    const result = buildInterventionsAggregate(10, counts, SNAPSHOTS, MAX_ROUNDS);

    // naturalLeftover only sees the regular round: 5 - 2 = 3
    expect(result.dumbbellRows.find(r => r.labId === 'lab-a')?.naturalLeftover).toBe(3);
    // poolSize sees both regular + intervention: 10 - 3 = 7
    expect(result.statCards.poolSize).toBe(7);
  });

  test('round === maxRounds counts as regular, round === maxRounds + 1 counts as intervention', () => {
    const counts = [
      { labId: 'lab-b', round: MAX_ROUNDS, count: 2 }, // last regular round
      { labId: 'lab-b', round: MAX_ROUNDS + 1, count: 1 }, // intervention round
    ];
    const result = buildInterventionsAggregate(10, counts, SNAPSHOTS, MAX_ROUNDS);

    // only MAX_ROUNDS feeds naturalLeftover: 4 - 2 = 2
    expect(result.dumbbellRows.find(r => r.labId === 'lab-b')?.naturalLeftover).toBe(2);
    // both rows feed poolSize: 10 - 3 = 7
    expect(result.statCards.poolSize).toBe(7);
  });
});

describe('buildLotteryAggregate', () => {
  test('computes all five stat tiles from a mixed cohort', () => {
    const rows = [
      { labId: 'lab-a', preferenceRank: 1n, count: 2 }, // top-choice, ranked
      { labId: 'lab-b', preferenceRank: 2n, count: 1 }, // ranked (not top)
      { labId: 'lab-c', preferenceRank: null, count: 1 }, // unranked
    ];
    const result = buildLotteryAggregate(rows, LABS);

    expect(result.statCards.poolSize).toBe(4);
    expect(result.statCards.topChoice).toBe(2);
    expect(result.statCards.rankedLab).toBe(3);
    expect(result.statCards.unranked).toBe(1);
  });

  test('computes median rank from ranked placements only', () => {
    // 3 ranked: ranks [1, 1, 3] → sorted distribution: rank 1 × 2, rank 3 × 1
    // rankedN = 3, target = ceil(3/2) = 2, cumulative after rank 1 = 2 ≥ 2 → median = 1
    const rows = [
      { labId: 'lab-a', preferenceRank: 1n, count: 2 },
      { labId: 'lab-b', preferenceRank: 3n, count: 1 },
    ];
    const result = buildLotteryAggregate(rows, LABS);

    expect(result.statCards.medianRankHonored).toBe(1);
  });

  test('returns null median when all placements are unranked', () => {
    const rows = [{ labId: 'lab-a', preferenceRank: null, count: 3 }];
    const result = buildLotteryAggregate(rows, LABS);

    expect(result.statCards.medianRankHonored).toBeNull();
  });

  test('returns empty outcomeStacks and zero stats for empty rows', () => {
    const result = buildLotteryAggregate([], LABS);

    expect(result.statCards.poolSize).toBe(0);
    expect(result.statCards.topChoice).toBe(0);
    expect(result.statCards.unranked).toBe(0);
    expect(result.statCards.medianRankHonored).toBeNull();
    expect(result.outcomeStacks).toHaveLength(0);
  });

  test('builds outcome stacks grouped by lab with correct label ordering', () => {
    const rows = [
      { labId: 'lab-a', preferenceRank: 2n, count: 1 },
      { labId: 'lab-a', preferenceRank: null, count: 1 },
      { labId: 'lab-a', preferenceRank: 1n, count: 2 },
    ];
    const result = buildLotteryAggregate(rows, LABS);

    const alphaStack = /** @type {NonNullable<typeof result.outcomeStacks[0]>} */ (
      result.outcomeStacks.find(s => s.labId === 'lab-a')
    );
    expect(alphaStack).toBeDefined();
    expect(alphaStack.total).toBe(4);

    const labels = alphaStack.buckets.map(b => b.label);
    expect(labels.indexOf('1st Choice')).toBeLessThan(labels.indexOf('2nd Choice'));
    expect(labels[labels.length - 1]).toBe('Not Preferred');
  });

  test('excludes labs with zero lottery placements from outcomeStacks', () => {
    const rows = [{ labId: 'lab-a', preferenceRank: 1n, count: 2 }];
    const result = buildLotteryAggregate(rows, LABS);

    expect(result.outcomeStacks).toHaveLength(1);
    expect(result.outcomeStacks[0]?.labId).toBe('lab-a');
  });

  test('sorts outcome stacks alphabetically by lab name', () => {
    const rows = [
      { labId: 'lab-c', preferenceRank: 1n, count: 1 },
      { labId: 'lab-a', preferenceRank: 1n, count: 1 },
    ];
    const result = buildLotteryAggregate(rows, LABS);

    expect(result.outcomeStacks[0]?.labName).toBe('Alpha Lab');
    expect(result.outcomeStacks[1]?.labName).toBe('Gamma Lab');
  });

  test('populates the rank field on each bucket (1-based for ranked, null for unranked)', () => {
    const rows = [
      { labId: 'lab-a', preferenceRank: 1n, count: 2 },
      { labId: 'lab-a', preferenceRank: null, count: 1 },
    ];
    const result = buildLotteryAggregate(rows, LABS);

    expect(result.outcomeStacks.find(s => s.labId === 'lab-a')?.buckets).toEqual([
      { rank: 1, label: '1st Choice', count: 2 },
      { rank: null, label: 'Not Preferred', count: 1 },
    ]);
  });

  test('sorts buckets numerically by rank across all stacks, with null last', () => {
    // lab-a has only rank 3; lab-b has only rank 1 — allRankedRanks must be [1,3] globally
    const rows = [
      { labId: 'lab-a', preferenceRank: 3n, count: 2 },
      { labId: 'lab-b', preferenceRank: 1n, count: 5 },
    ];
    const result = buildLotteryAggregate(rows, LABS);

    expect(result.outcomeStacks.find(s => s.labId === 'lab-a')?.buckets).toEqual([
      { rank: 3, label: '3rd Choice', count: 2 },
    ]);
    expect(result.outcomeStacks.find(s => s.labId === 'lab-b')?.buckets).toEqual([
      { rank: 1, label: '1st Choice', count: 5 },
    ]);
  });

  test('falls back to labId as lab name when lab is absent from the labs list', () => {
    const result = buildLotteryAggregate(
      [{ labId: 'unknown', preferenceRank: 1n, count: 1 }],
      LABS,
    );

    expect(result.outcomeStacks[0]?.labName).toBe('unknown');
  });
});
