import { cumsum, index, max, rollup, sum as d3sum, union } from 'd3-array';

import { assert } from '$lib/assert';
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
import { getOrdinalSuffix } from '$lib/ordinal';

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

export function buildPreferenceAlignment(
  rows: DraftPreferenceAlignmentRow[],
): DraftSummaryChartData['preferenceAlignment'] {
  const countByRank = rollup(
    rows,
    values => d3sum(values, d => d.count),
    ({ preferenceRank }) => (preferenceRank === null ? null : Number(preferenceRank)),
  );
  const totalAssigned = d3sum(rows, d => d.count);
  const bordaNumerator = d3sum(rows, ({ preferenceRank, totalRanked, count }) => {
    if (preferenceRank === null || totalRanked === null) return 0;

    const rank = Number(preferenceRank);
    const n = totalRanked;
    if (n === 1) return count;
    return (count * (n - rank)) / (n - 1);
  });

  // Ranked slices sorted ascending, "Not Preferred" appended last
  const ranked = Array.from(countByRank.entries())
    .filter((entry): entry is [number, number] => entry[0] !== null && entry[1] > 0)
    .sort(([a], [b]) => a - b);

  const slices = ranked.map(([rank, count]) => ({
    label: `${rank}${getOrdinalSuffix(rank)} Choice`,
    count,
  }));

  const notPreferred = countByRank.get(null) ?? 0;
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
  maxRounds: number,
): InterventionsAggregate {
  // Regular rounds only (1..maxRounds) — the stable pre-intervention baseline for naturalLeftover.
  const regularRoundRows = assignmentCounts.filter(
    ({ round }) => round !== null && round <= maxRounds,
  );
  // Regular + intervention rounds (excludes lottery, round IS NULL) — tracks pool progress.
  const nonLotteryRows = assignmentCounts.filter(({ round }) => round !== null);

  const filledByRegularLab = rollup(
    regularRoundRows,
    values => d3sum(values, d => d.count),
    ({ labId }) => labId,
  );

  const totalFilledNonLottery = d3sum(nonLotteryRows, d => d.count);
  const poolSize = Math.max(0, totalStudents - totalFilledNonLottery);
  const totalLotteryQuota = d3sum(quotaSnapshots, s => s.lotteryQuota);
  const delta = poolSize - totalLotteryQuota;

  const dumbbellRows: DumbbellRow[] = quotaSnapshots.map(
    ({ labId, labName, initialQuota, lotteryQuota }) => {
      const filled = filledByRegularLab.get(labId) ?? 0;
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
  const rankedRows = rows.filter(({ preferenceRank }) => preferenceRank !== null);
  const poolSize = d3sum(rows, d => d.count);
  const topChoice = d3sum(rows, d => (d.preferenceRank === 1n ? d.count : 0));
  const rankedLab = d3sum(rankedRows, d => d.count);
  const unranked = d3sum(rows, d => (d.preferenceRank === null ? d.count : 0));
  const rankCounts = rollup(
    rankedRows,
    values => d3sum(values, d => d.count),
    ({ preferenceRank }) => {
      assert(preferenceRank !== null, 'expected ranked lottery placement');
      return Number(preferenceRank);
    },
  );
  const labBuckets = rollup(
    rows,
    values =>
      rollup(
        values,
        bucketValues => d3sum(bucketValues, d => d.count),
        ({ preferenceRank }) => (preferenceRank === null ? null : Number(preferenceRank)),
      ),
    ({ labId }) => labId,
  );

  let medianRankHonored: number | null = null;
  if (rankedLab > 0) {
    const sortedRanks = Array.from(rankCounts).sort(([a], [b]) => a - b);
    const target = Math.ceil(rankedLab / 2);
    const targetIndex = cumsum(sortedRanks, ([, count]) => count).findIndex(
      count => count >= target,
    );
    medianRankHonored = sortedRanks[targetIndex]?.[0] ?? null;
  }

  const allRankedRanks = Array.from(
    union(
      ...Array.from(labBuckets.values(), buckets =>
        Array.from(buckets.keys()).filter((rank): rank is number => rank !== null),
      ),
    ),
  ).sort((a, b) => a - b);

  const outcomeStacks = Array.from(labBuckets.entries())
    .map(([labId, buckets]) => {
      const total = d3sum(buckets.values());
      const ordered: LotteryOutcomeBucket[] = [];
      for (const rank of allRankedRanks) {
        const count = buckets.get(rank) ?? 0;
        if (count > 0)
          ordered.push({ rank, label: `${rank}${getOrdinalSuffix(rank)} Choice`, count });
      }
      const notPreferred = buckets.get(null) ?? 0;
      if (notPreferred > 0)
        ordered.push({ rank: null, label: 'Not Preferred', count: notPreferred });
      return { labId, labName: labNameById.get(labId) ?? labId, buckets: ordered, total };
    })
    .sort((a, b) => a.labName.localeCompare(b.labName));

  return {
    statCards: { poolSize, topChoice, rankedLab, unranked, medianRankHonored },
    outcomeStacks,
  };
}

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
