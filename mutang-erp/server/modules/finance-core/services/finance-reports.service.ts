import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { and, gte, inArray, isNull, lt, sql, sum } from 'drizzle-orm';
import {
  financeAccounts,
  financeCosts,
  financePayments,
  financeReceipts,
  financeSettlements,
} from '@server/database/schema';
import type {
  FinanceCostAnalysisReport,
  FinanceCostTrendItem,
  FinanceIncomeExpenseReport,
  FinanceNamedAmountItem,
  FinanceProfitReport,
  FinanceProfitTrendItem,
  FinanceReceivablePayableItem,
  FinanceReceivablePayableReport,
  FinanceReportRangeParams,
  FinanceReportTotals,
} from '@shared/api.interface';

const INCOME_STATUSES: string[] = ['已确认', '已核销'];
const PAYABLE_STATUSES: string[] = ['待审批', '审批通过'];
const PAID_STATUS: string = '已付款';
const NO_ACCOUNT_LABEL: string = '未关联账户';
const UNKNOWN_LABEL: string = '未分类';
const UNKNOWN_CUSTOMER_LABEL: string = '未知客户';
const MAX_CUSTOMER_ROWS: number = 200;

interface DateRange {
  start: Date;
  end: Date;
}

interface AccountAmountRow {
  accountId: number | null;
  amount: number;
}

const round2 = (value: number): number => Math.round(value * 100) / 100;

@Injectable()
export class FinanceReportsService {
  private readonly logger: Logger = new Logger(FinanceReportsService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
  ) {}

  /* ==================== 公开接口 ==================== */

  async getTotals(params: FinanceReportRangeParams): Promise<FinanceReportTotals> {
    const range: DateRange = this.resolveRange(params);
    return this.computeTotals(range);
  }

  async getProfitReport(params: FinanceReportRangeParams): Promise<FinanceProfitReport> {
    const range: DateRange = this.resolveRange(params);
    const [totals, incomeByMonth, costByMonth] = await Promise.all([
      this.computeTotals(range),
      this.incomeByMonth(range),
      this.costByMonth(range),
    ]);
    return { totals, trend: this.buildProfitTrend(incomeByMonth, costByMonth) };
  }

  async getIncomeExpenseReport(
    params: FinanceReportRangeParams,
  ): Promise<FinanceIncomeExpenseReport> {
    const range: DateRange = this.resolveRange(params);
    const [totals, receiptRows, paymentRows, incomeByType, expenseByType, incomeTrend, costTrend] =
      await Promise.all([
        this.computeTotals(range),
        this.receiptSumByAccount(range),
        this.paymentSumByAccount(range),
        this.receiptSumByType(range),
        this.paymentSumByType(range),
        this.incomeByMonth(range),
        this.costByMonth(range),
      ]);

    const byAccount: FinanceNamedAmountItem[] = await this.buildAccountNetAmount(
      receiptRows,
      paymentRows,
    );

    return {
      totals,
      byAccount,
      incomeByType,
      expenseByType,
      trend: this.buildProfitTrend(incomeTrend, costTrend),
    };
  }

  async getCostAnalysisReport(
    params: FinanceReportRangeParams,
  ): Promise<FinanceCostAnalysisReport> {
    const range: DateRange = this.resolveRange(params);
    const [totals, byType, byCategory, costTrend] = await Promise.all([
      this.computeTotals(range),
      this.costSumByType(range),
      this.costSumByCategory(range),
      this.costByMonth(range),
    ]);

    const trend: FinanceCostTrendItem[] = [...costTrend.entries()]
      .sort((a: [string, number], b: [string, number]) => a[0].localeCompare(b[0]))
      .map(([period, amount]: [string, number]) => ({ period, amount: round2(amount) }));

    return { totals, byType, byCategory, trend };
  }

  async getReceivablePayableReport(
    params: FinanceReportRangeParams,
  ): Promise<FinanceReceivablePayableReport> {
    const range: DateRange = this.resolveRange(params);
    const [totals, receivableRows, payableRows] = await Promise.all([
      this.computeTotals(range),
      this.receivableByCustomer(),
      this.payableByPayee(),
    ]);

    const merged: Map<string, FinanceReceivablePayableItem> = new Map();
    for (const row of receivableRows) {
      const receivable: number = round2(Number(row.receivable ?? '0'));
      if (receivable <= 0) continue;
      const name: string = row.customerName ?? UNKNOWN_CUSTOMER_LABEL;
      merged.set(name, { customerName: name, receivable, payable: 0 });
    }
    for (const row of payableRows) {
      const amount: number = round2(Number(row.amount ?? '0'));
      const existing: FinanceReceivablePayableItem | undefined = merged.get(row.payeeName);
      if (existing) {
        existing.payable = round2(existing.payable + amount);
      } else {
        merged.set(row.payeeName, { customerName: row.payeeName, receivable: 0, payable: amount });
      }
    }

    const items: FinanceReceivablePayableItem[] = [...merged.values()]
      .sort(
        (a: FinanceReceivablePayableItem, b: FinanceReceivablePayableItem) =>
          b.receivable + b.payable - (a.receivable + a.payable),
      )
      .slice(0, MAX_CUSTOMER_ROWS);

    return { totals, items };
  }

  /* ==================== 时间范围解析 ==================== */

  private parseDay(day: string): Date | null {
    const matched: RegExpExecArray | null = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(day);
    if (!matched) return null;
    return new Date(Number(matched[1]), Number(matched[2]) - 1, Number(matched[3]));
  }

  private addDays(date: Date, days: number): Date {
    const result: Date = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  /** 解析为 [start, end) 半开区间；默认本年 */
  private resolveRange(params: FinanceReportRangeParams): DateRange {
    const customStart: Date | null = params.startDate ? this.parseDay(params.startDate) : null;
    const customEnd: Date | null = params.endDate ? this.parseDay(params.endDate) : null;
    if (customStart && customEnd && customStart.getTime() <= customEnd.getTime()) {
      return { start: customStart, end: this.addDays(customEnd, 1) };
    }
    if (params.startDate || params.endDate) {
      this.logger.log(
        `无效的时间范围参数（startDate=${params.startDate ?? ''}, endDate=${params.endDate ?? ''}），回退到预设/默认范围`,
      );
    }

    const now: Date = new Date();
    const year: number = now.getFullYear();
    const month: number = now.getMonth();

    if (params.preset === 'month') {
      return { start: new Date(year, month, 1), end: new Date(year, month + 1, 1) };
    }
    if (params.preset === 'lastMonth') {
      return { start: new Date(year, month - 1, 1), end: new Date(year, month, 1) };
    }
    if (params.preset === 'quarter') {
      const quarterStart: number = Math.floor(month / 3) * 3;
      return {
        start: new Date(year, quarterStart, 1),
        end: new Date(year, quarterStart + 3, 1),
      };
    }
    // preset === 'year' 或未提供参数：默认本年
    return { start: new Date(year, 0, 1), end: new Date(year + 1, 0, 1) };
  }

  /* ==================== 查询条件 ==================== */

  private receiptIncomeConditions(range: DateRange) {
    return and(
      inArray(financeReceipts.status, INCOME_STATUSES),
      gte(financeReceipts.receiptDate, range.start),
      lt(financeReceipts.receiptDate, range.end),
      isNull(financeReceipts.deletedAt),
    );
  }

  private paymentConditions(range: DateRange | null, statuses: string[]) {
    const conditions = [
      inArray(financePayments.status, statuses),
      isNull(financePayments.deletedAt),
    ];
    if (range) {
      conditions.push(gte(financePayments.paymentDate, range.start));
      conditions.push(lt(financePayments.paymentDate, range.end));
    }
    return and(...conditions);
  }

  private costConditions(range: DateRange) {
    return and(
      gte(financeCosts.costDate, range.start),
      lt(financeCosts.costDate, range.end),
      isNull(financeCosts.deletedAt),
    );
  }

  /* ==================== 汇总指标 ==================== */

  private async totalReceiptIncome(range: DateRange): Promise<number> {
    const rows: Array<{ total: string | null }> = await this.db
      .select({ total: sum(financeReceipts.amount) })
      .from(financeReceipts)
      .where(this.receiptIncomeConditions(range));
    return round2(Number(rows[0]?.total ?? '0'));
  }

  private async totalCost(range: DateRange): Promise<number> {
    const rows: Array<{ total: string | null }> = await this.db
      .select({ total: sum(financeCosts.amount) })
      .from(financeCosts)
      .where(this.costConditions(range));
    return round2(Number(rows[0]?.total ?? '0'));
  }

  /** 应收 = 结算单 (消耗 - 收款) 为正数部分合计（不限时间范围） */
  private async totalReceivable(): Promise<number> {
    const rows: Array<{ total: string }> = await this.db
      .select({
        total: sql<string>`COALESCE(SUM(GREATEST(${financeSettlements.consumeAmount} - ${financeSettlements.receiptAmount}, 0)), 0)`,
      })
      .from(financeSettlements)
      .where(isNull(financeSettlements.deletedAt));
    return round2(Number(rows[0]?.total ?? '0'));
  }

  /** 应付 = 付款（待审批 + 审批通过）金额合计（不限时间范围） */
  private async totalPayable(): Promise<number> {
    const rows: Array<{ total: string | null }> = await this.db
      .select({ total: sum(financePayments.amount) })
      .from(financePayments)
      .where(this.paymentConditions(null, PAYABLE_STATUSES));
    return round2(Number(rows[0]?.total ?? '0'));
  }

  private async computeTotals(range: DateRange): Promise<FinanceReportTotals> {
    const [totalIncome, totalCost, receivable, payable] = await Promise.all([
      this.totalReceiptIncome(range),
      this.totalCost(range),
      this.totalReceivable(),
      this.totalPayable(),
    ]);
    const totalProfit: number = round2(totalIncome - totalCost);
    const profitRate: number = totalIncome > 0 ? round2((totalProfit / totalIncome) * 100) : 0;
    return { totalIncome, totalCost, totalProfit, profitRate, receivable, payable };
  }

  /* ==================== 月度趋势 ==================== */

  private async incomeByMonth(range: DateRange): Promise<Map<string, number>> {
    const rows: Array<{ period: string; amount: string | null }> = await this.db
      .select({
        period: sql<string>`to_char(${financeReceipts.receiptDate}, 'YYYY-MM')`,
        amount: sum(financeReceipts.amount),
      })
      .from(financeReceipts)
      .where(this.receiptIncomeConditions(range))
      .groupBy(sql`to_char(${financeReceipts.receiptDate}, 'YYYY-MM')`);
    const result: Map<string, number> = new Map();
    for (const row of rows) {
      result.set(row.period, Number(row.amount ?? '0'));
    }
    return result;
  }

  private async costByMonth(range: DateRange): Promise<Map<string, number>> {
    const rows: Array<{ period: string; amount: string | null }> = await this.db
      .select({
        period: sql<string>`to_char(${financeCosts.costDate}, 'YYYY-MM')`,
        amount: sum(financeCosts.amount),
      })
      .from(financeCosts)
      .where(this.costConditions(range))
      .groupBy(sql`to_char(${financeCosts.costDate}, 'YYYY-MM')`);
    const result: Map<string, number> = new Map();
    for (const row of rows) {
      result.set(row.period, Number(row.amount ?? '0'));
    }
    return result;
  }

  private buildProfitTrend(
    incomeByMonth: Map<string, number>,
    costByMonth: Map<string, number>,
  ): FinanceProfitTrendItem[] {
    const periods: string[] = [...new Set([...incomeByMonth.keys(), ...costByMonth.keys()])].sort(
      (a: string, b: string) => a.localeCompare(b),
    );
    return periods.map((period: string) => {
      const income: number = round2(incomeByMonth.get(period) ?? 0);
      const cost: number = round2(costByMonth.get(period) ?? 0);
      return { period, income, cost, profit: round2(income - cost) };
    });
  }

  /* ==================== 账户 / 类型分组 ==================== */

  private async receiptSumByAccount(range: DateRange): Promise<AccountAmountRow[]> {
    const rows: Array<{ accountId: number | null; amount: string | null }> = await this.db
      .select({ accountId: financeReceipts.accountId, amount: sum(financeReceipts.amount) })
      .from(financeReceipts)
      .where(this.receiptIncomeConditions(range))
      .groupBy(financeReceipts.accountId);
    return rows.map(
      (row: { accountId: number | null; amount: string | null }): AccountAmountRow => ({
        accountId: row.accountId,
        amount: Number(row.amount ?? '0'),
      }),
    );
  }

  private async paymentSumByAccount(range: DateRange): Promise<AccountAmountRow[]> {
    const rows: Array<{ accountId: number | null; amount: string | null }> = await this.db
      .select({ accountId: financePayments.accountId, amount: sum(financePayments.amount) })
      .from(financePayments)
      .where(this.paymentConditions(range, [PAID_STATUS]))
      .groupBy(financePayments.accountId);
    return rows.map(
      (row: { accountId: number | null; amount: string | null }): AccountAmountRow => ({
        accountId: row.accountId,
        amount: Number(row.amount ?? '0'),
      }),
    );
  }

  /** 收款 - 付款（已付款）按账户合并为净收支；账户名批量查询回填，禁止 N+1 */
  private async buildAccountNetAmount(
    receiptRows: AccountAmountRow[],
    paymentRows: AccountAmountRow[],
  ): Promise<FinanceNamedAmountItem[]> {
    const allRows: AccountAmountRow[] = [...receiptRows, ...paymentRows];
    const accountIds: number[] = [
      ...new Set(
        allRows
          .map((row: AccountAmountRow) => row.accountId)
          .filter((id: number | null): id is number => id !== null),
      ),
    ];

    const nameMap: Map<number, string> = new Map();
    if (accountIds.length > 0) {
      const accounts: Array<{ id: number; accountName: string }> = await this.db
        .select({ id: financeAccounts.id, accountName: financeAccounts.accountName })
        .from(financeAccounts)
        .where(inArray(financeAccounts.id, accountIds));
      for (const account of accounts) {
        nameMap.set(account.id, account.accountName);
      }
    }

    const resolveName = (accountId: number | null): string =>
      accountId !== null ? nameMap.get(accountId) ?? NO_ACCOUNT_LABEL : NO_ACCOUNT_LABEL;

    const net: Map<string, number> = new Map();
    for (const row of receiptRows) {
      const name: string = resolveName(row.accountId);
      net.set(name, (net.get(name) ?? 0) + row.amount);
    }
    for (const row of paymentRows) {
      const name: string = resolveName(row.accountId);
      net.set(name, (net.get(name) ?? 0) - row.amount);
    }

    return [...net.entries()].map(([name, amount]: [string, number]) => ({
      name,
      amount: round2(amount),
    }));
  }

  private async receiptSumByType(range: DateRange): Promise<FinanceNamedAmountItem[]> {
    const rows: Array<{ name: string | null; amount: string | null }> = await this.db
      .select({ name: financeReceipts.receiptType, amount: sum(financeReceipts.amount) })
      .from(financeReceipts)
      .where(this.receiptIncomeConditions(range))
      .groupBy(financeReceipts.receiptType);
    return rows.map(
      (row: { name: string | null; amount: string | null }): FinanceNamedAmountItem => ({
        name: row.name ?? UNKNOWN_LABEL,
        amount: round2(Number(row.amount ?? '0')),
      }),
    );
  }

  private async paymentSumByType(range: DateRange): Promise<FinanceNamedAmountItem[]> {
    const rows: Array<{ name: string | null; amount: string | null }> = await this.db
      .select({ name: financePayments.paymentType, amount: sum(financePayments.amount) })
      .from(financePayments)
      .where(this.paymentConditions(range, [PAID_STATUS]))
      .groupBy(financePayments.paymentType);
    return rows.map(
      (row: { name: string | null; amount: string | null }): FinanceNamedAmountItem => ({
        name: row.name ?? UNKNOWN_LABEL,
        amount: round2(Number(row.amount ?? '0')),
      }),
    );
  }

  /* ==================== 成本分组 ==================== */

  private async costSumByType(range: DateRange): Promise<FinanceNamedAmountItem[]> {
    const rows: Array<{ name: string; amount: string | null }> = await this.db
      .select({ name: financeCosts.costType, amount: sum(financeCosts.amount) })
      .from(financeCosts)
      .where(this.costConditions(range))
      .groupBy(financeCosts.costType);
    return rows.map(
      (row: { name: string; amount: string | null }): FinanceNamedAmountItem => ({
        name: row.name,
        amount: round2(Number(row.amount ?? '0')),
      }),
    );
  }

  private async costSumByCategory(range: DateRange): Promise<FinanceNamedAmountItem[]> {
    const rows: Array<{ name: string | null; amount: string | null }> = await this.db
      .select({ name: financeCosts.costCategory, amount: sum(financeCosts.amount) })
      .from(financeCosts)
      .where(this.costConditions(range))
      .groupBy(financeCosts.costCategory);
    return rows.map(
      (row: { name: string | null; amount: string | null }): FinanceNamedAmountItem => ({
        name: row.name ?? UNKNOWN_LABEL,
        amount: round2(Number(row.amount ?? '0')),
      }),
    );
  }

  /* ==================== 应收应付明细 ==================== */

  /** 结算单按客户分组，仅统计 (消耗 - 收款) 为正的部分 */
  private async receivableByCustomer(): Promise<
    Array<{ customerName: string | null; receivable: string | null }>
  > {
    return this.db
      .select({
        customerName: financeSettlements.customerName,
        receivable: sql<string | null>`SUM(GREATEST(${financeSettlements.consumeAmount} - ${financeSettlements.receiptAmount}, 0))`,
      })
      .from(financeSettlements)
      .where(isNull(financeSettlements.deletedAt))
      .groupBy(financeSettlements.customerName);
  }

  /** 付款（待审批 + 审批通过）按收款方分组 */
  private async payableByPayee(): Promise<Array<{ payeeName: string; amount: string | null }>> {
    return this.db
      .select({ payeeName: financePayments.payeeName, amount: sum(financePayments.amount) })
      .from(financePayments)
      .where(this.paymentConditions(null, PAYABLE_STATUSES))
      .groupBy(financePayments.payeeName);
  }
}
