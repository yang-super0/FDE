import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { and, count, desc, eq, ilike, isNull } from 'drizzle-orm';
import { financeSettlements } from '@server/database/schema';
import type {
  FinanceSettlement,
  FinanceSettlementListParams,
  FinanceSettlementListResult,
} from '@shared/api.interface';

type SettlementRow = typeof financeSettlements.$inferSelect;

/** 结算单仅提供列表（供收款核销选择），写入由报表模块维护 */
@Injectable()
export class SettlementsService {
  private readonly logger: Logger = new Logger(SettlementsService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
  ) {}

  private mapSettlement(row: SettlementRow): FinanceSettlement {
    return {
      id: row.id,
      settlementNo: row.settlementNo,
      customerName: row.customerName ?? '',
      groupName: row.groupName ?? '',
      period: row.period,
      consumeAmount: Number(row.consumeAmount),
      receiptAmount: Number(row.receiptAmount),
      costAmount: Number(row.costAmount),
      profitAmount: Number(row.profitAmount),
      status: row.status,
      settlementDate: (row.settlementDate ?? row.createdAt).toISOString(),
      remark: row.remark ?? '',
      createdAt: row.createdAt.toISOString(),
    };
  }

  async findAll(
    params: FinanceSettlementListParams,
  ): Promise<FinanceSettlementListResult> {
    const page: number = Math.max(params.page ?? 1, 1);
    const pageSize: number = Math.min(Math.max(params.pageSize ?? 20, 1), 50);

    const conditions = [isNull(financeSettlements.deletedAt)];
    if (params.customerName) {
      conditions.push(
        ilike(financeSettlements.customerName, `%${params.customerName}%`),
      );
    }
    if (params.period) {
      conditions.push(eq(financeSettlements.period, params.period));
    }
    if (params.status) {
      conditions.push(eq(financeSettlements.status, params.status));
    }
    const where = and(...conditions);

    const rows: SettlementRow[] = await this.db
      .select()
      .from(financeSettlements)
      .where(where)
      .orderBy(desc(financeSettlements.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const totalResult: { count: number | string }[] = await this.db
      .select({ count: count() })
      .from(financeSettlements)
      .where(where);
    const total: number = Number(totalResult[0]?.count ?? 0);

    return {
      items: rows.map((row: SettlementRow): FinanceSettlement =>
        this.mapSettlement(row),
      ),
      total,
    };
  }
}
