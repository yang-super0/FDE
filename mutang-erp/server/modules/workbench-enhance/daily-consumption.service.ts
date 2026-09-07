import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { and, eq, gte, isNull, lt, sql } from 'drizzle-orm';
import {
  adAccounts,
  customer,
  dailyConsumptionSummary,
  department as departmentTable,
  employee,
} from '@server/database/schema';
import type {
  ConsumptionSummarySyncResult,
  GroupRankItem,
  IndustryRankItem,
  NewAccountRankItem,
  PortRankItem,
  RankPortFilter,
  RankTimeRange,
  SalespersonRankItem,
} from '@shared/api.interface';
import { buildTimeRange, previousRange, todayString } from './wb-date.util';
import { triggerFullSync } from '@server/modules/feishu-sync/sync-event.publisher';

type SummaryRow = typeof dailyConsumptionSummary.$inferSelect;
type AccountRow = typeof adAccounts.$inferSelect;

const TIME_RANGES: string[] = ['今日', '本周', '本月', '本年'];
const PORT_FILTERS: string[] = ['全部', '内部', '外部', '集团'];
const NEW_ACCOUNT_DIMENSIONS: string[] = ['商务', '客户', '端口'];

@Injectable()
export class DailyConsumptionService {
  private readonly logger: Logger = new Logger(DailyConsumptionService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
  ) {}

  private validateParams(timeRange: string, port: string): void {
    if (!TIME_RANGES.includes(timeRange)) {
      throw new BadRequestException('时间维度非法');
    }
    if (!PORT_FILTERS.includes(port)) {
      throw new BadRequestException('端口筛选非法');
    }
  }

  private rangeCondition(
    start: string,
    end: string,
    port: string,
  ): ReturnType<typeof and> {
    const conditions = [
      gte(dailyConsumptionSummary.summaryDate, start),
      lt(dailyConsumptionSummary.summaryDate, end),
    ];
    if (port !== '全部') {
      conditions.push(eq(dailyConsumptionSummary.port, port));
    }
    return and(...conditions);
  }

  async getLastSyncedAt(): Promise<string | null> {
    const rows: { last: string | null }[] = await this.db
      .select({
        last: sql<string | null>`max(${dailyConsumptionSummary.updatedAt})`,
      })
      .from(dailyConsumptionSummary);
    return rows[0]?.last ? new Date(rows[0].last).toISOString() : null;
  }

  async getSalespersonRank(
    timeRange: string,
    port: string,
  ): Promise<SalespersonRankItem[]> {
    this.validateParams(timeRange, port);
    const range = buildTimeRange(timeRange as RankTimeRange);
    const rows: {
      salesperson: string;
      total: string | number;
      internal: string | number;
      external: string | number;
    }[] = await this.db
      .select({
        salesperson: dailyConsumptionSummary.salesperson,
        total: sql<string>`sum(${dailyConsumptionSummary.consumption})`,
        internal: sql<string>`sum(case when ${dailyConsumptionSummary.port} = '内部' then ${dailyConsumptionSummary.consumption} else 0 end)`,
        external: sql<string>`sum(case when ${dailyConsumptionSummary.port} = '外部' then ${dailyConsumptionSummary.consumption} else 0 end)`,
      })
      .from(dailyConsumptionSummary)
      .where(this.rangeCondition(range.start, range.end, port))
      .groupBy(dailyConsumptionSummary.salesperson)
      .orderBy(sql`sum(${dailyConsumptionSummary.consumption}) desc`);
    return rows.map((row: {
      salesperson: string;
      total: string | number;
      internal: string | number;
      external: string | number;
    }, index: number): SalespersonRankItem => ({
      rank: index + 1,
      salesperson: row.salesperson,
      totalConsumption: Number(row.total ?? 0),
      internalConsumption: Number(row.internal ?? 0),
      externalConsumption: Number(row.external ?? 0),
    }));
  }

  async getGroupRank(
    timeRange: string,
    port: string,
  ): Promise<GroupRankItem[]> {
    this.validateParams(timeRange, port);
    const range = buildTimeRange(timeRange as RankTimeRange);
    const prev = previousRange(range);
    const buildQuery = (
      start: string,
      end: string,
    ): Promise<{ groupName: string; total: string }[]> =>
      this.db
        .select({
          groupName: dailyConsumptionSummary.groupName,
          total: sql<string>`sum(${dailyConsumptionSummary.consumption})`,
        })
        .from(dailyConsumptionSummary)
        .where(this.rangeCondition(start, end, port))
        .groupBy(dailyConsumptionSummary.groupName)
        .then((rows: { groupName: string; total: string }[]) => rows);
    const [currentRows, previousRows] = await Promise.all([
      buildQuery(range.start, range.end),
      buildQuery(prev.start, prev.end),
    ]);
    const previousMap: Map<string, number> = new Map();
    for (const row of previousRows) {
      previousMap.set(row.groupName, Number(row.total ?? 0));
    }
    return currentRows
      .map((row: { groupName: string; total: string }, index: number): GroupRankItem => {
        const current: number = Number(row.total ?? 0);
        const before: number = previousMap.get(row.groupName) ?? 0;
        const delta: number = current - before;
        const growthRate: number =
          before > 0
            ? Math.round((delta / before) * 10000) / 100
            : current > 0
              ? 100
              : 0;
        return {
          rank: index + 1,
          groupName: row.groupName,
          totalConsumption: current,
          deltaConsumption: delta,
          growthRate,
        };
      })
      .sort((a: GroupRankItem, b: GroupRankItem): number => b.totalConsumption - a.totalConsumption)
      .map((item: GroupRankItem, index: number): GroupRankItem => ({
        ...item,
        rank: index + 1,
      }));
  }

  async getPortRank(
    timeRange: string,
    port: string,
  ): Promise<PortRankItem[]> {
    this.validateParams(timeRange, port);
    const range = buildTimeRange(timeRange as RankTimeRange);
    const rows: { port: string; total: string }[] = await this.db
      .select({
        port: dailyConsumptionSummary.port,
        total: sql<string>`sum(${dailyConsumptionSummary.consumption})`,
      })
      .from(dailyConsumptionSummary)
      .where(this.rangeCondition(range.start, range.end, port))
      .groupBy(dailyConsumptionSummary.port)
      .orderBy(sql`sum(${dailyConsumptionSummary.consumption}) desc`);
    return rows.map((row: { port: string; total: string }, index: number): PortRankItem => ({
      rank: index + 1,
      port: row.port,
      totalConsumption: Number(row.total ?? 0),
    }));
  }

  async getIndustryRank(
    timeRange: string,
    port: string,
  ): Promise<IndustryRankItem[]> {
    this.validateParams(timeRange, port);
    const range = buildTimeRange(timeRange as RankTimeRange);
    const rows: { industry: string; total: string }[] = await this.db
      .select({
        industry: dailyConsumptionSummary.industry,
        total: sql<string>`sum(${dailyConsumptionSummary.consumption})`,
      })
      .from(dailyConsumptionSummary)
      .where(this.rangeCondition(range.start, range.end, port))
      .groupBy(dailyConsumptionSummary.industry)
      .orderBy(sql`sum(${dailyConsumptionSummary.consumption}) desc`);
    return rows.map((row: { industry: string; total: string }, index: number): IndustryRankItem => ({
      rank: index + 1,
      industry: row.industry,
      totalConsumption: Number(row.total ?? 0),
    }));
  }

  async getNewAccountRank(
    timeRange: string,
    port: string,
    dimension: string,
  ): Promise<NewAccountRankItem[]> {
    this.validateParams(timeRange, port);
    if (!NEW_ACCOUNT_DIMENSIONS.includes(dimension)) {
      throw new BadRequestException('新开排行维度非法');
    }
    const range = buildTimeRange(timeRange as RankTimeRange);
    const dimensionColumn =
      dimension === '商务'
        ? dailyConsumptionSummary.salesperson
        : dimension === '客户'
          ? dailyConsumptionSummary.customerName
          : dailyConsumptionSummary.port;
    const rows: { dimension: string; accounts: string; total: string }[] =
      await this.db
        .select({
          dimension: dimensionColumn,
          accounts: sql<string>`sum(${dailyConsumptionSummary.newAccountCount})`,
          total: sql<string>`sum(${dailyConsumptionSummary.consumption})`,
        })
        .from(dailyConsumptionSummary)
        .where(this.rangeCondition(range.start, range.end, port))
        .groupBy(dimensionColumn)
        .orderBy(sql`sum(${dailyConsumptionSummary.newAccountCount}) desc`);
    return rows.map(
      (row: { dimension: string; accounts: string; total: string }, index: number): NewAccountRankItem => ({
        rank: index + 1,
        dimension: row.dimension,
        newAccountCount: Number(row.accounts ?? 0),
        consumption: Number(row.total ?? 0),
      }),
    );
  }

  async syncConsumption(): Promise<ConsumptionSummarySyncResult> {
    const today: string = todayString();
    return this.db.transaction(async (tx): Promise<ConsumptionSummarySyncResult> => {
      const prevRows: { customerId: string; total: string | null }[] = await tx
        .select({
          customerId: dailyConsumptionSummary.customerId,
          total: sql<string>`sum(${dailyConsumptionSummary.consumption})`,
        })
        .from(dailyConsumptionSummary)
        .groupBy(dailyConsumptionSummary.customerId);
      const prevMap: Map<string, number> = new Map();
      for (const row of prevRows) {
        prevMap.set(row.customerId, Number(row.total ?? 0));
      }
      const accounts: AccountRow[] = await tx
        .select()
        .from(adAccounts)
        .where(isNull(adAccounts.deletedAt));
      const employeeRows: { name: string; departmentId: string | null }[] = await tx
        .select({ name: employee.name, departmentId: employee.departmentId })
        .from(employee);
      const deptRows: { id: string; name: string }[] = await tx
        .select({ id: departmentTable.id, name: departmentTable.name })
        .from(departmentTable);
      const customerRows: { id: string; name: string; industry: string }[] = await tx
        .select({
          id: customer.id,
          name: customer.name,
          industry: customer.industry,
        })
        .from(customer);

      const deptNameById: Map<string, string> = new Map(
        deptRows.map((row: { id: string; name: string }): [string, string] => [row.id, row.name]),
      );
      const deptByEmployee: Map<string, string> = new Map();
      for (const row of employeeRows) {
        if (row.departmentId) {
          const deptName: string | undefined = deptNameById.get(row.departmentId);
          if (deptName) {
            deptByEmployee.set(row.name, deptName);
          }
        }
      }
      const customerByName: Map<string, { id: string; industry: string }> = new Map(
        customerRows.map(
          (row: { id: string; name: string; industry: string }): [string, { id: string; industry: string }] => [
            row.name,
            { id: row.id, industry: row.industry },
          ],
        ),
      );

      const values: (typeof dailyConsumptionSummary.$inferInsert)[] = accounts.map(
        (account: AccountRow): typeof dailyConsumptionSummary.$inferInsert => {
          const matched = customerByName.get(account.groupName);
          const openedToday: boolean =
            account.createdAt instanceof Date &&
            new Date(account.createdAt.getTime() + 8 * 60 * 60 * 1000)
              .toISOString()
              .slice(0, 10) === today;
          const prevTotal: number = prevMap.get(account.id) ?? 0;
          const currentTotal: number = Number(account.totalConsume ?? 0);
          return {
            summaryDate: today,
            businessType: '广告投放',
            salesperson: account.salesperson,
            department: deptByEmployee.get(account.salesperson) ?? '',
            groupName: account.groupName,
            port: account.portType,
            industry: matched?.industry ?? '',
            customerId: matched?.id ?? account.id,
            customerName: account.groupName,
            consumption: Math.max(currentTotal - prevTotal, 0).toFixed(2),
            newAccountCount: openedToday ? 1 : 0,
          };
        },
      );
      await tx
        .delete(dailyConsumptionSummary)
        .where(eq(dailyConsumptionSummary.summaryDate, today));
      if (values.length > 0) {
        await tx.insert(dailyConsumptionSummary).values(values);
      }
      triggerFullSync('daily_consumption_summary');
      return { syncedDate: today, inserted: values.length };
    });
  }
}
