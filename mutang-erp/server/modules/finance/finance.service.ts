import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { and, count, desc, eq, gte, lt, sql } from 'drizzle-orm';
import { financeRecord } from '@server/database/schema';
import { OperationLogService } from '../operation-log/operation-log.service';
import type {
  FinanceMonthlyTrendItem,
  FinanceRecord,
  FinanceRecordType,
  FinanceRelatedType,
  FinanceSummary,
  PageResult,
} from '@shared/api.interface';

const MODULE_NAME = '财务管理';
const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/u;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
const RECORD_TYPES: FinanceRecordType[] = ['income', 'expense'];
const RELATED_TYPES: FinanceRelatedType[] = ['contract', 'campaign', 'other'];

export interface FinanceRecordInput {
  recordType: FinanceRecordType;
  relatedType: FinanceRelatedType;
  relatedId?: string;
  relatedName: string;
  amount: number;
  recordDate: string;
  remark?: string;
}

export interface FinanceListQuery {
  month?: string;
  type?: FinanceRecordType;
  page: number;
  pageSize: number;
}

interface MonthRange {
  label: string;
  start: Date;
  end: Date;
}

type FinanceRecordRow = typeof financeRecord.$inferSelect;

@Injectable()
export class FinanceService {
  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
    private readonly operationLog: OperationLogService,
  ) {}

  async summary(month?: string): Promise<FinanceSummary> {
    const range: MonthRange = this.resolveMonthRange(month);
    const prevStart: Date = new Date(
      range.start.getFullYear(),
      range.start.getMonth() - 1,
      1,
    );
    const prevEnd: Date = new Date(
      range.start.getFullYear(),
      range.start.getMonth(),
      1,
    );
    const [current, previous] = await Promise.all([
      this.sumByRange(range.start, range.end),
      this.sumByRange(prevStart, prevEnd),
    ]);
    return {
      income: current.income,
      expense: current.expense,
      profit: this.round2(current.income - current.expense),
      incomeRatio: this.ratio(current.income, previous.income),
      expenseRatio: this.ratio(current.expense, previous.expense),
    };
  }

  async findAll(query: FinanceListQuery): Promise<PageResult<FinanceRecord>> {
    const page: number = Math.max(1, Math.floor(query.page || 1));
    const pageSize: number = Math.min(100, Math.max(1, Math.floor(query.pageSize || 20)));

    const conditions = [];
    if (query.month) {
      const range: MonthRange = this.resolveMonthRange(query.month);
      conditions.push(gte(financeRecord.recordDate, range.start));
      conditions.push(lt(financeRecord.recordDate, range.end));
    }
    if (query.type) {
      conditions.push(eq(financeRecord.recordType, query.type));
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const rows: FinanceRecordRow[] = where
      ? await this.db
          .select()
          .from(financeRecord)
          .where(where)
          .orderBy(desc(financeRecord.recordDate), desc(financeRecord.createdAt))
          .limit(pageSize)
          .offset((page - 1) * pageSize)
      : await this.db
          .select()
          .from(financeRecord)
          .orderBy(desc(financeRecord.recordDate), desc(financeRecord.createdAt))
          .limit(pageSize)
          .offset((page - 1) * pageSize);

    const totalResult = where
      ? await this.db.select({ count: count() }).from(financeRecord).where(where)
      : await this.db.select({ count: count() }).from(financeRecord);
    const total: number = Number(totalResult[0]?.count ?? 0);

    return { items: rows.map((row) => this.toRecord(row)), total };
  }

  async create(
    input: FinanceRecordInput,
    operatorId: string,
  ): Promise<{ id: string }> {
    this.validateInput(input);
    const inserted = await this.db
      .insert(financeRecord)
      .values({
        recordType: input.recordType,
        relatedType: input.relatedType,
        relatedId: input.relatedId ?? null,
        relatedName: input.relatedName,
        amount: String(input.amount),
        recordDate: new Date(input.recordDate),
        remark: input.remark ?? '',
      })
      .returning({ id: financeRecord.id });
    await this.operationLog.record({
      module: MODULE_NAME,
      actionType: 'create',
      target: `收支记录「${input.relatedName}」`,
      operatorId,
    });
    return { id: inserted[0].id };
  }

  async update(
    id: string,
    input: FinanceRecordInput,
    operatorId: string,
  ): Promise<void> {
    this.assertUuid(id);
    this.validateInput(input);
    const updated = await this.db
      .update(financeRecord)
      .set({
        recordType: input.recordType,
        relatedType: input.relatedType,
        relatedId: input.relatedId ?? null,
        relatedName: input.relatedName,
        amount: String(input.amount),
        recordDate: new Date(input.recordDate),
        remark: input.remark ?? '',
      })
      .where(eq(financeRecord.id, id))
      .returning({
        id: financeRecord.id,
        relatedName: financeRecord.relatedName,
      });
    if (updated.length === 0) {
      throw new NotFoundException('收支记录不存在');
    }
    await this.operationLog.record({
      module: MODULE_NAME,
      actionType: 'update',
      target: `收支记录「${updated[0].relatedName}」`,
      operatorId,
    });
  }

  async remove(id: string, operatorId: string): Promise<void> {
    this.assertUuid(id);
    const removed = await this.db
      .delete(financeRecord)
      .where(eq(financeRecord.id, id))
      .returning({
        id: financeRecord.id,
        relatedName: financeRecord.relatedName,
      });
    if (removed.length === 0) {
      throw new NotFoundException('收支记录不存在');
    }
    await this.operationLog.record({
      module: MODULE_NAME,
      actionType: 'delete',
      target: `收支记录「${removed[0].relatedName}」`,
      operatorId,
    });
  }

  async monthlyTrend(): Promise<{ items: FinanceMonthlyTrendItem[] }> {
    const now: Date = new Date();
    const start: Date = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const end: Date = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const rows = await this.db
      .select({
        recordType: financeRecord.recordType,
        amount: financeRecord.amount,
        recordDate: financeRecord.recordDate,
      })
      .from(financeRecord)
      .where(
        and(gte(financeRecord.recordDate, start), lt(financeRecord.recordDate, end)),
      );

    const totals = new Map<string, { income: number; expense: number }>();
    for (const row of rows) {
      const label: string = this.monthLabel(row.recordDate);
      const bucket = totals.get(label) ?? { income: 0, expense: 0 };
      const amount: number = Number(row.amount);
      if (row.recordType === 'income') {
        bucket.income += amount;
      } else if (row.recordType === 'expense') {
        bucket.expense += amount;
      }
      totals.set(label, bucket);
    }

    const items: FinanceMonthlyTrendItem[] = [];
    for (let offset = 5; offset >= 0; offset -= 1) {
      const cursor: Date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const label: string = this.monthLabel(cursor);
      const bucket = totals.get(label) ?? { income: 0, expense: 0 };
      items.push({
        month: label,
        income: this.round2(bucket.income),
        expense: this.round2(bucket.expense),
      });
    }
    return { items };
  }

  private async sumByRange(
    start: Date,
    end: Date,
  ): Promise<{ income: number; expense: number }> {
    const rows = await this.db
      .select({
        recordType: financeRecord.recordType,
        total: sql<string>`coalesce(sum(${financeRecord.amount}), 0)`,
      })
      .from(financeRecord)
      .where(
        and(gte(financeRecord.recordDate, start), lt(financeRecord.recordDate, end)),
      )
      .groupBy(financeRecord.recordType);

    let income = 0;
    let expense = 0;
    for (const row of rows) {
      const total: number = Number(row.total);
      if (row.recordType === 'income') {
        income += total;
      } else if (row.recordType === 'expense') {
        expense += total;
      }
    }
    return { income: this.round2(income), expense: this.round2(expense) };
  }

  private resolveMonthRange(month?: string): MonthRange {
    let label: string;
    if (month) {
      if (!MONTH_PATTERN.test(month)) {
        throw new BadRequestException('month 格式应为 YYYY-MM');
      }
      label = month;
    } else {
      label = this.monthLabel(new Date());
    }
    const [yearText, monthText] = label.split('-');
    const year: number = Number(yearText);
    const monthIndex: number = Number(monthText) - 1;
    return {
      label,
      start: new Date(year, monthIndex, 1),
      end: new Date(year, monthIndex + 1, 1),
    };
  }

  private validateInput(input: FinanceRecordInput): void {
    if (!RECORD_TYPES.includes(input.recordType)) {
      throw new BadRequestException('recordType 必须为 income 或 expense');
    }
    if (!RELATED_TYPES.includes(input.relatedType)) {
      throw new BadRequestException('relatedType 必须为 contract、campaign 或 other');
    }
    if (!input.relatedName || typeof input.relatedName !== 'string') {
      throw new BadRequestException('relatedName 不能为空');
    }
    if (
      typeof input.amount !== 'number' ||
      !Number.isFinite(input.amount) ||
      input.amount <= 0
    ) {
      throw new BadRequestException('amount 必须为大于 0 的数字');
    }
    if (
      !input.recordDate ||
      Number.isNaN(new Date(input.recordDate).getTime())
    ) {
      throw new BadRequestException('recordDate 无效');
    }
    if (input.relatedId && !UUID_PATTERN.test(input.relatedId)) {
      throw new BadRequestException('relatedId 格式无效');
    }
  }

  private assertUuid(id: string): void {
    if (!UUID_PATTERN.test(id)) {
      throw new NotFoundException('收支记录不存在');
    }
  }

  private toRecord(row: FinanceRecordRow): FinanceRecord {
    const recordType: FinanceRecordType =
      row.recordType === 'income' ? 'income' : 'expense';
    const relatedType: FinanceRelatedType =
      row.relatedType === 'contract'
        ? 'contract'
        : row.relatedType === 'campaign'
          ? 'campaign'
          : 'other';
    return {
      id: row.id,
      recordType,
      relatedType,
      relatedId: row.relatedId ?? '',
      relatedName: row.relatedName,
      amount: this.round2(Number(row.amount)),
      recordDate: row.recordDate.toISOString(),
      remark: row.remark,
    };
  }

  private monthLabel(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  private ratio(current: number, previous: number): number {
    if (previous === 0) {
      return 0;
    }
    return Number(((current - previous) / previous).toFixed(4));
  }

  private round2(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
