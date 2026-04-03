import { index, max, rollup } from 'd3-array';

import type {
  DraftAssignmentCountByAttribute,
  DraftAssignmentSummary,
  Lab,
} from '$lib/features/drafts/types';

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
    values => values.reduce((acc, { count }) => acc + count, 0),
    ({ round }) => getPhaseIndex(round, maxRounds),
  );

  const countByLabAndPhase = rollup(
    assignmentCountsByAttribute,
    values => values.reduce((acc, { count }) => acc + count, 0),
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
