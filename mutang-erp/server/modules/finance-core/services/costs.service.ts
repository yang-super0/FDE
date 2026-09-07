import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import {
  and,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNull,
  lt,
} from 'drizzle-orm';
import { financeCosts } from '@server/database/schema';
import type {
  CreateFinanceCostRequest,
  FinanceCost,
  FinanceCostListParams,
  FinanceCostListResult,
  FinanceCostStats,
  FinanceCostSummaryItem,
  FinanceCostTrendItem,
  FinanceReportRangeParams,
  UpdateFinanceCostRequest,
} from '@shared/api.interface';
import { COST_NO_PREFIX, insertWithSeqNo } from '../fin-seq.util';
import {
  addDays,
  parseAmountParam,
  parseDateParam,
  resolveTimeRange,
  round2,
  type TimeRange,
} from '../query.util';

type CostRow = typeof financeCosts.$inferSelect;
type CostInsert = typeof financeCosts.$inferInsert;

const PENDING_STATUS: string = '待核算';
const CALCULATED_STATUS: string = '已核算';
const TRANSFERRED_STATUS: string = '已结转';

@Injectable()
export class CostsService {
  private readonly logger: Logger = new Logger(CostsService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
  ) {}

  private mapCost(row: CostRow): FinanceCost {
    return {
      id: row.id,
      costNo: row.costNo,
      costType: row.costType,
      costCategory: row.costCategory ?? '',
      amount: Number(row.amount),
      relatedAccount: row.relatedAccount ?? '',
      relatedCustomer: row.relatedCustomer ?? '',
      costDate: (row.costDate ?? row.createdAt).toISOString(),
      period: row.period ?? '',
      status: row.status,
      calculatedBy: row.calculatedBy ?? '',
      calculatedAt: row.calculatedAt ? row.calculatedAt.toISOString() : null,
      remark: row.remark ?? '',
      createdAt: row.createdAt.toISOString(),
    };
  }

  async findAll(params: FinanceCostListParams): Promise<FinanceCostListResult> {
    const page: number = Math.max(params.page ?? 1, 1);
    const pageSize: number = Math.min(Math.max(params.pageSize ?? 20, 1), 50);

    const conditions = [isNull(financeCosts.deletedAt)];
    if (params.costNo) {
      conditions.push(ilike(financeCosts.costNo, `%${params.costNo}%`));
    }
    if (params.costType) {
      conditions.push(eq(financeCosts.costType, params.costType));
    }
    if (params.costCategory) {
      conditions.push(eq(financeCosts.costCategory, params.costCategory));
    }
    if (params.relatedAccount) {
      conditions.push(
        ilike(financeCosts.relatedAccount, `%${params.relatedAccount}%`),
      );
    }
    if (params.relatedCustomer) {
      conditions.push(
        ilike(financeCosts.relatedCustomer, `%${params.relatedCustomer}%`),
      );
    }
    if (params.status) {
      conditions.push(eq(financeCosts.status, params.status));
    }
    if (params.startDate) {
      conditions.push(
        gte(financeCosts.costDate, parseDateParam(params.startDate)),
      );
    }
    if (params.endDate) {
      conditions.push(
        lt(financeCosts.costDate, addDays(parseDateParam(params.endDate), 1)),
      );
    }
    const where = and(...conditions);

    const rows: CostRow[] = await this.db
      .select()
      .from(financeCosts)
      .where(where)
      .orderBy(desc(financeCosts.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const totalResult: { count: number | string }[] = await this.db
      .select({ count: count() })
      .from(financeCosts)
      .where(where);
    const total: number = Number(totalResult[0]?.count ?? 0);

    return {
      items: rows.map((row: CostRow): FinanceCost => this.mapCost(row)),
      total,
    };
  }

  async detail(id: number): Promise<FinanceCost> {
    const rows: CostRow[] = await this.db
      .select()
      .from(financeCosts)
      .where(
        and(eq(financeCosts.id, id), isNull(financeCosts.deletedAt)),
      );
    if (rows.length === 0) {
      throw new NotFoundException('成本不存在');
    }
    return this.mapCost(rows[0]);
  }

  async create(dto: CreateFinanceCostRequest): Promise<FinanceCost> {
    if (!dto.costType || dto.costType.trim().length === 0) {
      throw new BadRequestException('请填写成本类型');
    }
    const amount: number = parseAmountParam(dto.amount);

    const result = await insertWithSeqNo<CostRow>({
      db: this.db,
      table: financeCosts,
      noColumn: financeCosts.costNo,
      prefix: COST_NO_PREFIX,
      insert: (costNo: string): Promise<CostRow[]> =>
        this.db
          .insert(financeCosts)
          .values({
            costNo,
            costType: dto.costType.trim(),
            costCategory: dto.costCategory ?? '',
            amount: String(amount),
            relatedAccount: dto.relatedAccount ?? '',
            relatedCustomer: dto.relatedCustomer ?? '',
            costDate: dto.costDate
              ? parseDateParam(dto.costDate)
              : new Date(),
            period: dto.period ?? '',
            status: PENDING_STATUS,
            remark: dto.remark ?? '',
          })
          .returning(),
    });
    this.logger.log(`成本创建成功: ${result.no}`);
    return this.mapCost(result.row);
  }

  /** 仅 待核算 可编辑 */
  async update(
    id: number,
    dto: UpdateFinanceCostRequest,
  ): Promise<{ success: boolean }> {
    const rows: CostRow[] = await this.db
      .select()
      .from(financeCosts)
      .where(
        and(eq(financeCosts.id, id), isNull(financeCosts.deletedAt)),
      );
    if (rows.length === 0) {
      throw new NotFoundException('成本不存在');
    }
    if (rows[0].status !== PENDING_STATUS) {
      throw new BadRequestException('仅待核算的成本可以编辑');
    }

    const patch: Partial<CostInsert> = {};
    if (dto.costType !== undefined) {
      if (dto.costType.trim().length === 0) {
        throw new BadRequestException('成本类型不能为空');
      }
      patch.costType = dto.costType.trim();
    }
    if (dto.amount !== undefined) {
      patch.amount = String(parseAmountParam(dto.amount));
    }
    if (dto.costCategory !== undefined) {
      patch.costCategory = dto.costCategory;
    }
    if (dto.relatedAccount !== undefined) {
      patch.relatedAccount = dto.relatedAccount;
    }
    if (dto.relatedCustomer !== undefined) {
      patch.relatedCustomer = dto.relatedCustomer;
    }
    if (dto.costDate !== undefined) {
      patch.costDate = parseDateParam(dto.costDate);
    }
    if (dto.period !== undefined) {
      patch.period = dto.period;
    }
    if (dto.remark !== undefined) {
      patch.remark = dto.remark;
    }
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }
    patch.updatedAt = new Date();

    const updated: { id: number }[] = await this.db
      .update(financeCosts)
      .set(patch)
      .where(
        and(eq(financeCosts.id, id), isNull(financeCosts.deletedAt)),
      )
      .returning({ id: financeCosts.id });
    if (updated.length === 0) {
      throw new NotFoundException('成本不存在');
    }
    return { success: true };
  }

  /** 软删除：仅 待核算 可删 */
  async remove(id: number): Promise<{ success: boolean }> {
    const rows: CostRow[] = await this.db
      .select()
      .from(financeCosts)
      .where(
        and(eq(financeCosts.id, id), isNull(financeCosts.deletedAt)),
      );
    if (rows.length === 0) {
      throw new NotFoundException('成本不存在');
    }
    if (rows[0].status !== PENDING_STATUS) {
      throw new BadRequestException('仅待核算的成本可以删除');
    }

    const now: Date = new Date();
    const updated: { id: number }[] = await this.db
      .update(financeCosts)
      .set({ deletedAt: now, updatedAt: now })
      .where(
        and(eq(financeCosts.id, id), isNull(financeCosts.deletedAt)),
      )
      .returning({ id: financeCosts.id });
    if (updated.length === 0) {
      throw new NotFoundException('成本不存在');
    }
    return { success: true };
  }

  /** 核算：事务内仅 待核算 → 已核算，写 calculatedBy/calculatedAt */
  async calculate(
    ids: number[],
    userId: string,
  ): Promise<{ calculated: number }> {
    let calculated: number = 0;
    await this.db.transaction(async (tx) => {
      const rows: CostRow[] = await tx
        .select()
        .from(financeCosts)
        .where(
          and(
            inArray(financeCosts.id, ids),
            eq(financeCosts.status, PENDING_STATUS),
            isNull(financeCosts.deletedAt),
          ),
        );
      const now: Date = new Date();
      for (const row of rows) {
        const updated: { id: number }[] = await tx
          .update(financeCosts)
          .set({
            status: CALCULATED_STATUS,
            calculatedBy: userId,
            calculatedAt: now,
            updatedAt: now,
          })
          .where(
            and(
              eq(financeCosts.id, row.id),
              eq(financeCosts.status, PENDING_STATUS),
            ),
          )
          .returning({ id: financeCosts.id });
        if (updated.length > 0) {
          calculated += 1;
        }
      }
    });
    this.logger.log(`成本核算完成: ${String(calculated)} 条`);
    return { calculated };
  }

  /** 结转：事务内仅 已核算 → 已结转 */
  async transfer(ids: number[]): Promise<{ transferred: number }> {
    let transferred: number = 0;
    await this.db.transaction(async (tx) => {
      const rows: CostRow[] = await tx
        .select()
        .from(financeCosts)
        .where(
          and(
            inArray(financeCosts.id, ids),
            eq(financeCosts.status, CALCULATED_STATUS),
            isNull(financeCosts.deletedAt),
          ),
        );
      const now: Date = new Date();
      for (const row of rows) {
        const updated: { id: number }[] = await tx
          .update(financeCosts)
          .set({ status: TRANSFERRED_STATUS, updatedAt: now })
          .where(
            and(
              eq(financeCosts.id, row.id),
              eq(financeCosts.status, CALCULATED_STATUS),
            ),
          )
          .returning({ id: financeCosts.id });
        if (updated.length > 0) {
          transferred += 1;
        }
      }
    });
    this.logger.log(`成本结转完成: ${String(transferred)} 条`);
    return { transferred };
  }

  /** 成本统计：按类型聚合 + 按月趋势（costDate 分组，半开区间） */
  async stats(params: FinanceReportRangeParams): Promise<FinanceCostStats> {
    const range: TimeRange = resolveTimeRange(params);
    const rows: CostRow[] = await this.db
      .select()
      .from(financeCosts)
      .where(
        and(
          isNull(financeCosts.deletedAt),
          gte(financeCosts.costDate, range.start),
          lt(financeCosts.costDate, range.end),
        ),
      );

    const byTypeMap: Map<string, { amount: number; count: number }> =
      new Map();
    const trendMap: Map<string, number> = new Map();
    for (const row of rows) {
      const amount: number = Number(row.amount);
      const typeEntry: { amount: number; count: number } =
        byTypeMap.get(row.costType) ?? { amount: 0, count: 0 };
      typeEntry.amount += amount;
      typeEntry.count += 1;
      byTypeMap.set(row.costType, typeEntry);

      const date: Date = row.costDate ?? row.createdAt;
      const period: string = `${String(date.getFullYear())}-${String(
        date.getMonth() + 1,
      ).padStart(2, '0')}`;
      trendMap.set(period, (trendMap.get(period) ?? 0) + amount);
    }

    const byType: FinanceCostSummaryItem[] = [...byTypeMap.entries()]
      .map(
        ([key, value]: [string, { amount: number; count: number }]): FinanceCostSummaryItem => ({
          key,
          amount: round2(value.amount),
          count: value.count,
        }),
      )
      .sort(
        (a: FinanceCostSummaryItem, b: FinanceCostSummaryItem): number =>
          b.amount - a.amount,
      );
    const trend: FinanceCostTrendItem[] = [...trendMap.entries()]
      .map(
        ([period, amount]: [string, number]): FinanceCostTrendItem => ({
          period,
          amount: round2(amount),
        }),
      )
      .sort(
        (a: FinanceCostTrendItem, b: FinanceCostTrendItem): number =>
          a.period.localeCompare(b.period),
      );

    return { byType, trend };
  }
}
