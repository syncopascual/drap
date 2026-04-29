import { index, max, rollup, sum as d3sum } from 'd3-array';

import type {
  DraftAssignmentCountByAttribute,
  DraftAssignmentSummary,
  DraftLabBordaScore,
  DraftLabDistributionEntry,
  DraftLabQuotaSnapshot,
  DraftPreferenceAlignmentRow,
  DraftSummaryChartData,
  DraftSupplyDemandEntry,
  DumbbellRow,
  InterventionsAggregate,
  Lab,
  LotteryAggregate,
  LotteryOutcomeBucket,
  LotteryOutcomeRow,
} from '$lib/features/drafts/types';

interface QuotaSnapshot {
  labId: string;
  initialQuota: number;
}

function getPhaseIndex(round: number | null, maxRounds: number) {
  if (round === null) return maxRounds + 1;
  if (round > 0 && round <= maxRounds) return round - 1;
  if (round === maxRounds + 1) return maxRounds;
  throw new Error(`unexpected draft assignment round: ${round}`);
}

function buildAssignedByPhase(
  phaseCount: ReadonlyMap<number, number> | undefined,
  phaseCountTotal: number,
) {
  return Array.from({ length: phaseCountTotal }, (_, index) => phaseCount?.get(index) ?? 0);
}

function getAssignedMax(assignedByPhase: number[]) {
  return max(assignedByPhase) ?? 0;
}

export function buildDraftAssignmentSummary(
  assignmentCountsByAttribute: DraftAssignmentCountByAttribute[],
  labs: Lab[],
  maxRounds: number,
  totalStudents: number,
): DraftAssignmentSummary {
  const phaseCountTotal = maxRounds + 2;
  const phases = [
    ...Array.from({ length: maxRounds }, (_, index) => {
      const round = index + 1;
      return {
        key: `round-${round}`,
        axisLabel: `R${round}`,
        tooltipLabel: `Round ${round}`,
      };
    }),
    {
      key: 'interventions',
      axisLabel: 'Interventions',
      tooltipLabel: 'Interventions',
    },
    {
      key: 'lottery',
      axisLabel: 'Lottery',
      tooltipLabel: 'Lottery',
    },
  ];

  const labById = index(labs, ({ id }) => id);

  const totalByPhase = rollup(
    assignmentCountsByAttribute,
    values => d3sum(values, d => d.count),
    ({ round }) => getPhaseIndex(round, maxRounds),
  );

  const countByLabAndPhase = rollup(
    assignmentCountsByAttribute,
    values => d3sum(values, d => d.count),
    ({ labId }) => labId,
    ({ round }) => getPhaseIndex(round, maxRounds),
  );

  const allLabsAssignedByPhase = buildAssignedByPhase(totalByPhase, phaseCountTotal);

  const labsChart = labs.map(lab => {
    const existingLab = labById.get(lab.id);
    if (typeof existingLab === 'undefined')
      throw new Error(`draft lab is missing from the snapshot index: ${lab.id}`);
    const assignedByPhase = buildAssignedByPhase(
      countByLabAndPhase.get(existingLab.id),
      phaseCountTotal,
    );
    return {
      id: existingLab.id,
      name: existingLab.name,
      capacity: existingLab.quota,
      assignedByPhase,
      assignedMax: getAssignedMax(assignedByPhase),
    };
  });

  return {
    metrics: {
      participatingLabCount: labs.length,
      interventionDraftedCount: allLabsAssignedByPhase[maxRounds] ?? 0,
      lotteryDraftedCount: allLabsAssignedByPhase[maxRounds + 1] ?? 0,
    },
    chart: {
      phases,
      allLabs: {
        capacity: totalStudents,
        assignedByPhase: allLabsAssignedByPhase,
        assignedMax: getAssignedMax(allLabsAssignedByPhase),
      },
      labs: labsChart,
    },
  };
}

function buildLabDistribution(
  counts: DraftAssignmentCountByAttribute[],
  labs: Lab[],
  totalStudents: number,
): DraftLabDistributionEntry[] {
  const countByLab = rollup(
    counts,
    values => d3sum(values, d => d.count),
    ({ labId }) => labId,
  );
  const labById = index(labs, ({ id }) => id);
  const entries: DraftLabDistributionEntry[] = [];
  let totalAssigned = 0;
  for (const lab of labs) {
    const count = countByLab.get(lab.id) ?? 0;
    totalAssigned += count;
    if (count > 0)
      entries.push({ labId: lab.id, labName: labById.get(lab.id)?.name ?? lab.id, count });
  }
  const unassigned = totalStudents - totalAssigned;
  if (unassigned > 0) entries.push({ labId: null, labName: 'Unassigned', count: unassigned });
  return entries;
}

const ORDINAL_SUFFIXES = ['th', 'st', 'nd', 'rd'] as const;

export function ordinalChoice(rank: number): string {
  const mod100 = rank % 100;
  // 11th, 12th, 13th are exceptions to the normal pattern
  const suffix = mod100 >= 11 && mod100 <= 13 ? 'th' : (ORDINAL_SUFFIXES[rank % 10] ?? 'th');
  return `${rank}${suffix} Choice`;
}

export function buildPreferenceAlignment(
  rows: DraftPreferenceAlignmentRow[],
): DraftSummaryChartData['preferenceAlignment'] {
  const buckets = new Map<number | null, number>();
  let bordaNumerator = 0;
  let totalAssigned = 0;

  for (const { preferenceRank, totalRanked, count } of rows) {
    totalAssigned += count;

    if (preferenceRank === null || totalRanked === null) {
      buckets.set(null, (buckets.get(null) ?? 0) + count);
      continue;
    }

    const rank = Number(preferenceRank);
    const n = totalRanked;
    buckets.set(rank, (buckets.get(rank) ?? 0) + count);

    // Borda alignment: (n - rank) / (n - 1) per student, times count (1-based index)
    if (n > 1) bordaNumerator += (count * (n - rank)) / (n - 1);
    else bordaNumerator += count; // single-lab ranking → perfect score
  }

  // Ranked slices sorted ascending, "Not Preferred" appended last
  const ranked = Array.from(buckets.entries())
    .filter((entry): entry is [number, number] => entry[0] !== null && entry[1] > 0)
    .sort(([a], [b]) => a - b);

  const slices = ranked.map(([rank, count]) => ({ label: ordinalChoice(rank), count }));

  const notPreferred = buckets.get(null) ?? 0;
  if (notPreferred > 0) slices.push({ label: 'Not Preferred', count: notPreferred });

  return {
    slices,
    bordaScore: totalAssigned > 0 ? bordaNumerator / totalAssigned : 0,
  };
}

function buildSupplyVsDemand(
  counts: DraftAssignmentCountByAttribute[],
  labs: Lab[],
  quotaSnapshots: QuotaSnapshot[],
  bordaScores: DraftLabBordaScore[],
): DraftSupplyDemandEntry[] {
  const actualByLab = rollup(
    counts,
    values => d3sum(values, d => d.count),
    ({ labId }) => labId,
  );
  const bordaByLab = index(bordaScores, d => d.labId);
  const quotaByLab = index(quotaSnapshots, d => d.labId);

  const totalSupply = d3sum(labs, lab => {
    const q = quotaByLab.get(lab.id);
    return typeof q === 'undefined' ? 0 : q.initialQuota;
  });
  const totalDemand = d3sum(labs, lab => bordaByLab.get(lab.id)?.bordaScore ?? 0);
  const totalActual = d3sum(labs, lab => actualByLab.get(lab.id) ?? 0);

  return labs.map(lab => {
    const supply = quotaByLab.get(lab.id);
    const supplyVal = typeof supply === 'undefined' ? 0 : supply.initialQuota;
    const demandVal = bordaByLab.get(lab.id)?.bordaScore ?? 0;
    const actualVal = actualByLab.get(lab.id) ?? 0;
    return {
      labId: lab.id,
      labName: lab.name,
      supplyShare: totalSupply > 0 ? supplyVal / totalSupply : 0,
      demandShare: totalDemand > 0 ? demandVal / totalDemand : 0,
      actualShare: totalActual > 0 ? actualVal / totalActual : 0,
    };
  });
}

export function buildInterventionsAggregate(
  totalStudents: number,
  assignmentCounts: DraftAssignmentCountByAttribute[],
  quotaSnapshots: DraftLabQuotaSnapshot[],
): InterventionsAggregate {
  const nonLotteryRows = assignmentCounts.filter(({ round }) => round !== null);
  const filledByLab = rollup(
    nonLotteryRows,
    values => d3sum(values, d => d.count),
    ({ labId }) => labId,
  );

  const totalFilledNonLottery = d3sum(nonLotteryRows, d => d.count);
  const poolSize = Math.max(0, totalStudents - totalFilledNonLottery);
  const totalLotteryQuota = d3sum(quotaSnapshots, s => s.lotteryQuota);
  const delta = poolSize - totalLotteryQuota;

  const dumbbellRows: DumbbellRow[] = quotaSnapshots.map(
    ({ labId, labName, initialQuota, lotteryQuota }) => {
      const filled = filledByLab.get(labId) ?? 0;
      const naturalLeftover = Math.max(0, initialQuota - filled);
      const gap = lotteryQuota - naturalLeftover;
      return { labId, labName, naturalLeftover, lotteryQuota, gap };
    },
  );
  dumbbellRows.sort(
    (a, b) => Math.abs(b.gap) - Math.abs(a.gap) || a.labName.localeCompare(b.labName),
  );

  return { statCards: { poolSize, totalLotteryQuota, delta }, dumbbellRows };
}

export function buildLotteryAggregate(
  rows: LotteryOutcomeRow[],
  labs: Pick<Lab, 'id' | 'name'>[],
): LotteryAggregate {
  const labNameById = new Map(labs.map(l => [l.id, l.name]));

  let poolSize = 0;
  let topChoice = 0;
  let rankedLab = 0;
  let unranked = 0;

  // Keyed by numeric rank (or null for "Not Preferred") so sorting never touches label strings.
  const labBuckets = new Map<string, Map<number | null, { label: string; count: number }>>();
  const rankCounts = new Map<number, number>();
  let rankedN = 0;

  for (const { labId, preferenceRank, count } of rows) {
    poolSize += count;
    if (!labBuckets.has(labId)) labBuckets.set(labId, new Map());
    const lb = labBuckets.get(labId)!;

    if (preferenceRank === null) {
      unranked += count;
      const existing = lb.get(null);
      lb.set(null, { label: 'Not Preferred', count: (existing?.count ?? 0) + count });
    } else {
      const rank = Number(preferenceRank);
      rankedLab += count;
      if (rank === 1) topChoice += count;
      const label = ordinalChoice(rank);
      const existing = lb.get(rank);
      lb.set(rank, { label, count: (existing?.count ?? 0) + count });
      rankCounts.set(rank, (rankCounts.get(rank) ?? 0) + count);
      rankedN += count;
    }
  }

  let medianRankHonored: number | null = null;
  if (rankedN > 0) {
    const sortedRanks = Array.from(rankCounts.entries()).sort(([a], [b]) => a - b);
    const target = Math.ceil(rankedN / 2);
    let cumulative = 0;
    for (const [rank, cnt] of sortedRanks) {
      cumulative += cnt;
      if (cumulative >= target) {
        medianRankHonored = rank;
        break;
      }
    }
  }

  const allRankedRanks = Array.from(
    new Set(
      Array.from(labBuckets.values()).flatMap(m =>
        Array.from(m.keys()).filter((k): k is number => k !== null),
      ),
    ),
  ).sort((a, b) => a - b);

  const outcomeStacks = Array.from(labBuckets.entries())
    .map(([labId, buckets]) => {
      const total = Array.from(buckets.values()).reduce((s, { count }) => s + count, 0);
      const ordered: LotteryOutcomeBucket[] = [];
      for (const rank of allRankedRanks) {
        const entry = buckets.get(rank);
        if (entry && entry.count > 0)
          ordered.push({ rank, label: entry.label, count: entry.count });
      }
      const notPreferred = buckets.get(null);
      if (notPreferred && notPreferred.count > 0)
        ordered.push({ rank: null, label: 'Not Preferred', count: notPreferred.count });
      return { labId, labName: labNameById.get(labId) ?? labId, buckets: ordered, total };
    })
    .sort((a, b) => a.labName.localeCompare(b.labName));

  return {
    statCards: { poolSize, topChoice, rankedLab, unranked, medianRankHonored },
    outcomeStacks,
  };
}

export const EMPTY_INTERVENTIONS_AGGREGATE: InterventionsAggregate = {
  statCards: { poolSize: 0, totalLotteryQuota: 0, delta: 0 },
  dumbbellRows: [],
};

export const EMPTY_LOTTERY_AGGREGATE: LotteryAggregate = {
  statCards: {
    poolSize: 0,
    topChoice: 0,
    rankedLab: 0,
    unranked: 0,
    medianRankHonored: null,
  },
  outcomeStacks: [],
};

export function buildDraftSummaryChartData(
  assignmentCounts: DraftAssignmentCountByAttribute[],
  labs: Lab[],
  quotaSnapshots: QuotaSnapshot[],
  bordaScores: DraftLabBordaScore[],
  alignmentRows: DraftPreferenceAlignmentRow[],
  totalStudents: number,
): DraftSummaryChartData {
  return {
    labDistribution: buildLabDistribution(assignmentCounts, labs, totalStudents),
    preferenceAlignment: buildPreferenceAlignment(alignmentRows),
    supplyVsDemand: buildSupplyVsDemand(assignmentCounts, labs, quotaSnapshots, bordaScores),
  };
}
