import { Inject, Injectable } from '@nestjs/common';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import {
  and,
  count,
  gte,
  inArray,
  isNull,
  lt,
  ne,
  sql,
} from 'drizzle-orm';
import {
  hrEmployees,
  hrRecruitmentPlans,
  hrResumes,
} from '@server/database/schema';
import type { HrDashboardData } from '@shared/api.interface';

const SHANGHAI_TZ: string = 'Asia/Shanghai';
const TREND_MONTH_COUNT: number = 6;

const HR_EMP_STATUS_PROBATION: string = '试用期';
const HR_EMP_STATUS_REGULAR: string = '正式';
const HR_EMP_STATUS_TRANSFERRING: string = '调岗中';
const HR_EMP_STATUS_LEAVING: string = '离职中';
const HR_EMP_STATUS_LEFT: string = '已离职';

const ACTIVE_STATUSES: string[] = [
  HR_EMP_STATUS_PROBATION,
  HR_EMP_STATUS_REGULAR,
  HR_EMP_STATUS_TRANSFERRING,
  HR_EMP_STATUS_LEAVING,
];

const PENDING_INTERVIEW_STATUSES: string[] = ['已邀约', '已面试'];

interface ShMonth {
  year: number;
  month: number;
}

/** 当前业务时区（Asia/Shanghai）的年月 */
function currentShMonth(now: Date): ShMonth {
  const formatted: string = new Intl.DateTimeFormat('en-CA', {
    timeZone: SHANGHAI_TZ,
    year: 'numeric',
    month: '2-digit',
  }).format(now);
  const [year, month] = formatted.split('-');
  return { year: Number(year), month: Number(month) };
}

/** 年月位移（正负均可），按自然月计算 */
function shiftShMonth(base: ShMonth, delta: number): ShMonth {
  const shifted: Date = new Date(
    Date.UTC(base.year, base.month - 1 + delta, 1),
  );
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
  };
}

function monthLabel(m: ShMonth): string {
  return `${m.year}-${String(m.month).padStart(2, '0')}`;
}

/** 上海时区某月 1 日 0 点对应的时刻 */
function shMonthStart(m: ShMonth): Date {
  return new Date(`${monthLabel(m)}-01T00:00:00+08:00`);
}

@Injectable()
export class HrDashboardService {
  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
  ) {}

  async getDashboard(): Promise<HrDashboardData> {
    const now: Date = new Date();
    const current: ShMonth = currentShMonth(now);
    const months: ShMonth[] = [];
    for (let offset = TREND_MONTH_COUNT - 1; offset >= 0; offset -= 1) {
      months.push(shiftShMonth(current, -offset));
    }
    const labels: string[] = months.map((m: ShMonth) => monthLabel(m));
    const trendRangeStart: string = `${labels[0]}-01`;
    const planMonthStart: Date = shMonthStart(current);
    const planNextMonthStart: Date = shMonthStart(shiftShMonth(current, 1));

    const [
      statusRows,
      deptRows,
      entryRows,
      leaveRows,
      planRows,
      pendingRows,
    ] = await Promise.all([
      this.db
        .select({ status: hrEmployees.status, count: count() })
        .from(hrEmployees)
        .where(isNull(hrEmployees.deletedAt))
        .groupBy(hrEmployees.status),
      this.db
        .select({ department: hrEmployees.department, count: count() })
        .from(hrEmployees)
        .where(
          and(
            isNull(hrEmployees.deletedAt),
            ne(hrEmployees.status, HR_EMP_STATUS_LEFT),
          ),
        )
        .groupBy(hrEmployees.department),
      this.db
        .select({
          month: sql<string>`to_char(${hrEmployees.entryDate}, 'YYYY-MM')`,
          count: count(),
        })
        .from(hrEmployees)
        .where(
          and(
            isNull(hrEmployees.deletedAt),
            gte(hrEmployees.entryDate, trendRangeStart),
          ),
        )
        .groupBy(sql<string>`to_char(${hrEmployees.entryDate}, 'YYYY-MM')`),
      this.db
        .select({
          month: sql<string>`to_char(${hrEmployees.leaveDate}, 'YYYY-MM')`,
          count: count(),
        })
        .from(hrEmployees)
        .where(
          and(
            isNull(hrEmployees.deletedAt),
            gte(hrEmployees.leaveDate, trendRangeStart),
          ),
        )
        .groupBy(sql<string>`to_char(${hrEmployees.leaveDate}, 'YYYY-MM')`),
      this.db
        .select({
          headcount: hrRecruitmentPlans.headcount,
          hiredCount: hrRecruitmentPlans.hiredCount,
        })
        .from(hrRecruitmentPlans)
        .where(
          and(
            isNull(hrRecruitmentPlans.deletedAt),
            gte(hrRecruitmentPlans.createdAt, planMonthStart),
            lt(hrRecruitmentPlans.createdAt, planNextMonthStart),
          ),
        ),
      this.db
        .select({ count: count() })
        .from(hrResumes)
        .where(
          and(
            isNull(hrResumes.deletedAt),
            inArray(hrResumes.status, PENDING_INTERVIEW_STATUSES),
          ),
        ),
    ]);

    const statusCounts: Map<string, number> = new Map<string, number>();
    for (const row of statusRows) {
      statusCounts.set(row.status, Number(row.count));
    }
    const totalEmployees: number = [...statusCounts.values()].reduce(
      (sum: number, value: number) => sum + value,
      0,
    );
    const activeCount: number = ACTIVE_STATUSES.reduce(
      (sum: number, status: string) => sum + (statusCounts.get(status) ?? 0),
      0,
    );

    const entryCounts: Map<string, number> = new Map<string, number>();
    for (const row of entryRows) {
      entryCounts.set(row.month, Number(row.count));
    }
    const leaveCounts: Map<string, number> = new Map<string, number>();
    for (const row of leaveRows) {
      leaveCounts.set(row.month, Number(row.count));
    }

    let totalHeadcount: number = 0;
    let totalHired: number = 0;
    for (const row of planRows) {
      totalHeadcount += row.headcount;
      totalHired += row.hiredCount;
    }

    return {
      totalEmployees,
      activeCount,
      leftCount: statusCounts.get(HR_EMP_STATUS_LEFT) ?? 0,
      probationCount: statusCounts.get(HR_EMP_STATUS_PROBATION) ?? 0,
      regularCount: statusCounts.get(HR_EMP_STATUS_REGULAR) ?? 0,
      leavingCount: statusCounts.get(HR_EMP_STATUS_LEAVING) ?? 0,
      departmentDistribution: deptRows.map(
        (row: { department: string; count: number | string }) => ({
          department: row.department,
          count: Number(row.count),
        }),
      ),
      statusDistribution: statusRows.map(
        (row: { status: string; count: number | string }) => ({
          status: row.status,
          count: Number(row.count),
        }),
      ),
      entryLeaveTrend: labels.map(
        (month: string) => ({
          month,
          entryCount: entryCounts.get(month) ?? 0,
          leaveCount: leaveCounts.get(month) ?? 0,
        }),
      ),
      recruitmentProgress: {
        monthPlanCount: planRows.length,
        totalHeadcount,
        totalHired,
        pendingInterviewCount: Number(pendingRows[0]?.count ?? 0),
      },
    };
  }
}
