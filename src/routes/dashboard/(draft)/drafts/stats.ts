import { index } from 'd3-array';

import { CHART_COLORS } from '$lib/constants';
import type {
  DraftStatsChartData,
  DraftStatsSeries,
  DraftStatsYear,
} from '$lib/features/drafts/types';

export function buildDraftStatsChartData(
  stats: DraftStatsYear[],
  labs: { id: string; name: string }[],
): DraftStatsChartData {
  const years = [...new Set(stats.map(s => s.year))].sort();
  const statsByYear = index(stats, s => s.year);

  function buildSeries(metric: 'quota' | 'draftedStudents'): DraftStatsSeries[] {
    return labs.map((lab, i) => {
      const points = years.map(year => {
        const yearStat = statsByYear.get(year);
        if (!yearStat) return { year, value: null };

        const labEntry = yearStat.labs.find(l => l.labId === lab.id);
        if (!labEntry) return { year, value: null };

        if (labEntry.isArchived && labEntry.archivedAt) {
          const archiveYear = labEntry.archivedAt.getFullYear();
          if (year >= archiveYear) return { year, value: null };
        }

        return { year, value: labEntry[metric] as number };
      });

      const labStats = stats.filter(s => s.labs.some(l => l.labId === lab.id));

      return {
        labId: lab.id,
        labName: lab.name,
        isArchived: labStats.some(s => s.labs.find(l => l.labId === lab.id)?.isArchived),
        color: CHART_COLORS[i % CHART_COLORS.length] ?? 'var(--chart-1)',
        points,
      };
    });
  }

  return {
    years,
    series: buildSeries('quota'),
    quotaSeries: buildSeries('quota'),
    draftedSeries: buildSeries('draftedStudents'),
  };
}
