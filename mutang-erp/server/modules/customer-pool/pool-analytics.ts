import type {
  PoolAnalytics,
  PoolAnalyticsSummary,
  PoolCycleDistributionItem,
  PoolMonthlyTrendItem,
  PoolPersonComparisonItem,
} from '@shared/api.interface';

export interface PoolAnalyticsRow {
  status: string;
  assignedTo: string | null;
  assignedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const INVALID_STATUS: string = '无效';
const CLAIMED_STATUS: string = '已领取';
const ASSIGNED_STATUS: string = '已分配';
const CONVERTED_STATUS: string = '已转化';
const CLAIMED_GROUP_STATUSES: string[] = [
  CLAIMED_STATUS,
  ASSIGNED_STATUS,
  CONVERTED_STATUS,
];
const MS_PER_DAY: number = 24 * 60 * 60 * 1000;
const TREND_MONTHS: number = 6;

const round1 = (value: number): number => Math.round(value * 10) / 10;

const pct = (part: number, whole: number): number =>
  whole <= 0 ? 0 : round1((part / whole) * 100);

export function buildPoolAnalytics(rows: PoolAnalyticsRow[]): PoolAnalytics {
  const valid: PoolAnalyticsRow[] = rows.filter(
    (row: PoolAnalyticsRow) => row.status !== INVALID_STATUS,
  );
  const claimedRows: PoolAnalyticsRow[] = valid.filter(
    (row: PoolAnalyticsRow) => CLAIMED_GROUP_STATUSES.includes(row.status),
  );
  const convertedRows: PoolAnalyticsRow[] = valid.filter(
    (row: PoolAnalyticsRow) => row.status === CONVERTED_STATUS,
  );
  const cycleRows: PoolAnalyticsRow[] = convertedRows.filter(
    (row: PoolAnalyticsRow) => row.assignedAt !== null,
  );

  const cycleDays: number[] = cycleRows.map(
    (row: PoolAnalyticsRow): number => {
      const start: Date = row.assignedAt ?? row.updatedAt;
      return (row.updatedAt.getTime() - start.getTime()) / MS_PER_DAY;
    },
  );
  const avgCycleDays: number =
    cycleDays.length === 0
      ? 0
      : round1(
          cycleDays.reduce((sum: number, d: number) => sum + d, 0) /
            cycleDays.length,
        );

  const summary: PoolAnalyticsSummary = {
    total: valid.length,
    claimed: claimedRows.length,
    converted: convertedRows.length,
    claimRate: pct(claimedRows.length, valid.length),
    convertRate: pct(convertedRows.length, claimedRows.length),
    avgCycleDays,
  };

  const now: Date = new Date();
  const monthlyTrend: PoolMonthlyTrendItem[] = [];
  for (let i: number = TREND_MONTHS - 1; i >= 0; i -= 1) {
    const start: Date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end: Date = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const key: string = `${start.getFullYear()}-${String(
      start.getMonth() + 1,
    ).padStart(2, '0')}`;
    const monthRows: PoolAnalyticsRow[] = valid.filter(
      (row: PoolAnalyticsRow) =>
        row.createdAt >= start && row.createdAt < end,
    );
    const monthClaimed: PoolAnalyticsRow[] = monthRows.filter(
      (row: PoolAnalyticsRow) => CLAIMED_GROUP_STATUSES.includes(row.status),
    );
    const monthConverted: PoolAnalyticsRow[] = monthRows.filter(
      (row: PoolAnalyticsRow) => row.status === CONVERTED_STATUS,
    );
    monthlyTrend.push({
      month: key,
      claimRate: pct(monthClaimed.length, monthRows.length),
      convertRate: pct(monthConverted.length, monthClaimed.length),
    });
  }

  const cycleDistribution: PoolCycleDistributionItem[] = [
    { range: '1天内', count: 0 },
    { range: '1-3天', count: 0 },
    { range: '3-7天', count: 0 },
    { range: '7天以上', count: 0 },
  ];
  cycleDays.forEach((days: number): void => {
    if (days <= 1) {
      cycleDistribution[0].count += 1;
    } else if (days <= 3) {
      cycleDistribution[1].count += 1;
    } else if (days <= 7) {
      cycleDistribution[2].count += 1;
    } else {
      cycleDistribution[3].count += 1;
    }
  });

  const groupMap: Map<string, { claimed: number; converted: number }> =
    new Map();
  valid.forEach((row: PoolAnalyticsRow): void => {
    if (!row.assignedTo) {
      return;
    }
    const group: { claimed: number; converted: number } = groupMap.get(
      row.assignedTo,
    ) ?? { claimed: 0, converted: 0 };
    group.claimed += 1;
    if (row.status === CONVERTED_STATUS) {
      group.converted += 1;
    }
    groupMap.set(row.assignedTo, group);
  });
  const personComparison: PoolPersonComparisonItem[] = Array.from(
    groupMap.entries(),
  )
    .map(
      ([assignee, stat]: [
        string,
        { claimed: number; converted: number },
      ]): PoolPersonComparisonItem => ({
        assignee,
        claimed: stat.claimed,
        converted: stat.converted,
        convertRate: pct(stat.converted, stat.claimed),
      }),
    )
    .sort(
      (a: PoolPersonComparisonItem, b: PoolPersonComparisonItem) =>
        b.converted - a.converted,
    );

  return { summary, monthlyTrend, cycleDistribution, personComparison };
}
