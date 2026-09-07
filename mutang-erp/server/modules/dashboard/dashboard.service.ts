import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
  AuthNPaasService,
} from '@lark-apaas/fullstack-nestjs-core';
import { and, asc, count, desc, eq, gte, inArray, lt, lte, ne, sum } from 'drizzle-orm';
import {
  adCampaign,
  contract,
  customer,
  financeRecord,
  operationLog,
  task,
} from '@server/database/schema';
import type {
  ActivityItem,
  BusinessShareItem,
  DashboardSummary,
  RevenueTrendItem,
  TaskPriority,
  TodoItem,
} from '@shared/api.interface';

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
    private readonly authn: AuthNPaasService,
  ) {}

  private startOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  private ratio(current: number, previous: number): number {
    if (previous === 0) return 0;
    return Number(((current - previous) / previous).toFixed(4));
  }

  private async resolveUserNames(
    ids: Array<string | null>,
  ): Promise<Map<string, string>> {
    const uniqueIds: string[] = Array.from(
      new Set(ids.filter((id): id is string => Boolean(id))),
    );
    const nameMap = new Map<string, string>();
    if (uniqueIds.length === 0) return nameMap;
    const users = await this.authn.listUsersByIds(uniqueIds.slice(0, 100));
    users.forEach((user, index: number) => {
      if (user) {
        nameMap.set(
          uniqueIds[index],
          user.name?.zh_cn ?? user.name?.en_us ?? '',
        );
      }
    });
    return nameMap;
  }

  async getSummary(): Promise<DashboardSummary> {
    const now: Date = new Date();
    const monthStart: Date = this.startOfMonth(now);
    const nextMonthStart: Date = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      1,
    );
    const prevMonthStart: Date = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1,
    );
    const todayStart: Date = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const expiringEnd: Date = new Date(todayStart.getTime() + 30 * DAY_MS);

    const incomeRows = await this.db
      .select({
        amount: financeRecord.amount,
        recordDate: financeRecord.recordDate,
      })
      .from(financeRecord)
      .where(
        and(
          eq(financeRecord.recordType, 'income'),
          gte(financeRecord.recordDate, prevMonthStart),
          lt(financeRecord.recordDate, nextMonthStart),
        ),
      );

    let monthRevenue = 0;
    let prevMonthRevenue = 0;
    for (const row of incomeRows) {
      const amount: number = Number(row.amount);
      if (row.recordDate >= monthStart) {
        monthRevenue += amount;
      } else {
        prevMonthRevenue += amount;
      }
    }

    const customerTotalResult = await this.db
      .select({ count: count() })
      .from(customer);
    const customerTotal: number = Number(customerTotalResult[0]?.count ?? 0);

    const newCustomerRows = await this.db
      .select({ createdAt: customer.createdAt })
      .from(customer)
      .where(
        and(
          gte(customer.createdAt, prevMonthStart),
          lt(customer.createdAt, nextMonthStart),
        ),
      );
    let newThisMonth = 0;
    let newPrevMonth = 0;
    for (const row of newCustomerRows) {
      if (row.createdAt >= monthStart) {
        newThisMonth += 1;
      } else {
        newPrevMonth += 1;
      }
    }

    const runningResult = await this.db
      .select({ count: count() })
      .from(adCampaign)
      .where(eq(adCampaign.status, 'running'));
    const runningCampaigns: number = Number(runningResult[0]?.count ?? 0);

    const pendingResult = await this.db
      .select({ count: count() })
      .from(task)
      .where(inArray(task.status, ['todo', 'doing']));
    const pendingTasks: number = Number(pendingResult[0]?.count ?? 0);

    const expiringResult = await this.db
      .select({ count: count() })
      .from(contract)
      .where(
        and(
          eq(contract.status, 'active'),
          gte(contract.expireDate, todayStart),
          lte(contract.expireDate, expiringEnd),
        ),
      );
    const expiringContracts: number = Number(expiringResult[0]?.count ?? 0);

    this.logger.log(
      `工作台看板汇总: monthRevenue=${monthRevenue}, customerTotal=${customerTotal}`,
    );

    return {
      monthRevenue,
      monthRevenueRatio: this.ratio(monthRevenue, prevMonthRevenue),
      customerTotal,
      customerRatio: this.ratio(newThisMonth, newPrevMonth),
      runningCampaigns,
      pendingTasks,
      expiringContracts,
    };
  }

  async getRevenueTrend(): Promise<{ items: RevenueTrendItem[] }> {
    const now: Date = new Date();
    const months: Array<{ key: string; start: Date }> = [];
    for (let i = 5; i >= 0; i -= 1) {
      const monthDate: Date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${monthDate.getFullYear()}-${String(
        monthDate.getMonth() + 1,
      ).padStart(2, '0')}`;
      months.push({ key, start: monthDate });
    }
    const rangeStart: Date = months[0].start;
    const rangeEnd: Date = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const rows = await this.db
      .select({
        amount: financeRecord.amount,
        recordDate: financeRecord.recordDate,
      })
      .from(financeRecord)
      .where(
        and(
          eq(financeRecord.recordType, 'income'),
          gte(financeRecord.recordDate, rangeStart),
          lt(financeRecord.recordDate, rangeEnd),
        ),
      );

    const totals = new Map<string, number>();
    months.forEach((month) => totals.set(month.key, 0));
    for (const row of rows) {
      const key = `${row.recordDate.getFullYear()}-${String(
        row.recordDate.getMonth() + 1,
      ).padStart(2, '0')}`;
      if (totals.has(key)) {
        totals.set(key, (totals.get(key) ?? 0) + Number(row.amount));
      }
    }

    const items: RevenueTrendItem[] = months.map((month) => ({
      month: month.key,
      revenue: totals.get(month.key) ?? 0,
    }));
    return { items };
  }

  async getBusinessShare(): Promise<{ items: BusinessShareItem[] }> {
    const rows = await this.db
      .select({
        contractType: contract.contractType,
        total: sum(contract.amount),
      })
      .from(contract)
      .groupBy(contract.contractType);

    const items: BusinessShareItem[] = rows.map((row) => ({
      name: row.contractType,
      value: Number(row.total ?? 0),
    }));
    return { items };
  }

  async getTodos(): Promise<{ items: TodoItem[] }> {
    const rows = await this.db
      .select()
      .from(task)
      .where(ne(task.status, 'done'))
      .orderBy(asc(task.deadline))
      .limit(8);

    const nameMap = await this.resolveUserNames(
      rows.map((row) => row.assignee),
    );

    const items: TodoItem[] = rows.map((row) => ({
      id: row.id,
      title: row.title,
      priority: row.priority as TaskPriority,
      deadline: row.deadline ? row.deadline.toISOString() : '',
      assigneeName: row.assignee ? nameMap.get(row.assignee) ?? '' : '',
    }));
    return { items };
  }

  async getActivities(): Promise<{ items: ActivityItem[] }> {
    const rows = await this.db
      .select()
      .from(operationLog)
      .orderBy(desc(operationLog.createdAt))
      .limit(10);

    const nameMap = await this.resolveUserNames(
      rows.map((row) => row.createdBy),
    );

    const items: ActivityItem[] = rows.map((row) => ({
      id: row.id,
      module: row.module,
      actionType: row.actionType,
      target: row.target,
      operatorName: row.createdBy ? nameMap.get(row.createdBy) ?? '' : '',
      time: row.createdAt.toISOString(),
    }));
    return { items };
  }
}
