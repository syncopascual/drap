import { describe, expect, it } from 'vitest';

import { buildDraftAssignmentSummary } from './assignment-summary.server';

describe('buildDraftAssignmentSummary', () => {
  it('builds zero-filled phase series and aggregate metrics from grouped assignment rows', () => {
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

  it('returns zero-filled series when no assignments exist yet', () => {
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
