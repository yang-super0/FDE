import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
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
  ilike,
  isNull,
  sql,
  type SQL,
} from 'drizzle-orm';
import {
  financeAdvances,
  financeIncentives,
} from '@server/database/schema';
import type {
  AdvanceReturnRequest,
  CreateFinanceAdvanceRequest,
  CreateFinanceIncentiveRequest,
  FinanceAdvance,
  FinanceAdvanceListParams,
  FinanceAdvanceListResult,
  FinanceIncentive,
  FinanceIncentiveListParams,
  FinanceIncentiveListResult,
} from '@shared/api.interface';
import { insertWithSeqNo } from '../finance-core/fin-seq.util';
import {
  assertAmountRange,
  assertPositiveAmount,
  decreaseAccountBalance,
  increaseAccountBalance,
} from './finance-enhance-shared.util';

type AdvanceRow = typeof financeAdvances.$inferSelect;
type IncentiveRow = typeof financeIncentives.$inferSelect;

const ADVANCE_NO_PREFIX: string = 'DK';
const INCENTIVE_NO_PREFIX: string = 'JL';
const ADVANCE_STATUS_NOT_RETURNED: string = '未收回';
const ADVANCE_STATUS_PARTIAL_RETURNED: string = '部分收回';
const ADVANCE_STATUS_RETURNED: string = '已收回';
const ADVANCE_STATUS_BAD_DEBT: string = '已坏账';
const ADVANCE_BAD_DEBT_ALLOWED_STATUSES: string[] = [
  ADVANCE_STATUS_NOT_RETURNED,
  ADVANCE_STATUS_PARTIAL_RETURNED,
];
const INCENTIVE_STATUS_PENDING: string = '待审批';
const INCENTIVE_STATUS_APPROVED: string = '已通过';
const INCENTIVE_STATUS_REJECTED: string = '已驳回';
const INCENTIVE_STATUS_ISSUED: string = '已发放';
const INCENTIVE_TYPE_DEFAULT: string = '其他';

@Injectable()
export class FinanceAdvancesService {
  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
  ) {}

  private mapAdvance(row: AdvanceRow): FinanceAdvance {
    return {
      id: row.id,
      advanceNo: row.advanceNo,
      customerId: row.customerId,
      customerName: row.customerName,
      amount: Number(row.amount),
      reason: row.reason,
      expectedReturnDate: row.expectedReturnDate,
      status: row.status,
      returnedAmount: Number(row.returnedAmount),
      returnDeadline: row.returnDeadline,
      operator: row.operator,
      remark: row.remark,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private mapIncentive(row: IncentiveRow): FinanceIncentive {
    return {
      id: row.id,
      incentiveNo: row.incentiveNo,
      employeeName: row.employeeName,
      department: row.department,
      incentiveType: row.incentiveType,
      amount: Number(row.amount),
      reason: row.reason,
      status: row.status,
      approver: row.approver,
      approveTime: row.approveTime ? row.approveTime.toISOString() : null,
      issueTime: row.issueTime ? row.issueTime.toISOString() : null,
      operator: row.operator,
      remark: row.remark,
      createdAt: row.createdAt.toISOString(),
    };
  }

  async listAdvances(
    params: FinanceAdvanceListParams,
  ): Promise<FinanceAdvanceListResult> {
    const conditions: SQL[] = [isNull(financeAdvances.deletedAt)];
    if (params.customerName) {
      conditions.push(
        ilike(financeAdvances.customerName, `%${params.customerName}%`),
      );
    }
    if (params.status) {
      conditions.push(eq(financeAdvances.status, params.status));
    }
    const where: SQL | undefined = and(...conditions);
    const page: number = Math.max(params.page ?? 1, 1);
    const pageSize: number = Math.min(Math.max(params.pageSize ?? 20, 1), 50);
    const rows: AdvanceRow[] = await this.db
      .select()
      .from(financeAdvances)
      .where(where)
      .orderBy(desc(financeAdvances.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    const totalResult: { count: number | string }[] = await this.db
      .select({ count: count() })
      .from(financeAdvances)
      .where(where);
    return {
      items: rows.map((row: AdvanceRow): FinanceAdvance =>
        this.mapAdvance(row),
      ),
      total: Number(totalResult[0]?.count ?? 0),
    };
  }

  async createAdvance(
    dto: CreateFinanceAdvanceRequest,
    operator: string,
  ): Promise<FinanceAdvance> {
    assertPositiveAmount(dto?.amount, '垫款金额');
    assertAmountRange(Number(dto.amount), '垫款金额');
    if (!dto?.customerId) {
      throw new BadRequestException('客户 ID 不能为空');
    }
    if (!dto?.customerName) {
      throw new BadRequestException('客户名称不能为空');
    }
    if (!dto?.reason || !dto.reason.trim()) {
      throw new BadRequestException('垫款事由不能为空');
    }
    const { row } = await insertWithSeqNo<AdvanceRow>({
      db: this.db,
      table: financeAdvances,
      noColumn: financeAdvances.advanceNo,
      prefix: ADVANCE_NO_PREFIX,
      insert: async (no: string): Promise<AdvanceRow[]> =>
        this.db
          .insert(financeAdvances)
          .values({
            advanceNo: no,
            customerId: dto.customerId,
            customerName: dto.customerName,
            amount: Number(dto.amount).toFixed(2),
            reason: dto.reason,
            expectedReturnDate: dto.expectedReturnDate ?? null,
            status: ADVANCE_STATUS_NOT_RETURNED,
            returnedAmount: '0.00',
            operator,
            remark: dto.remark ?? '',
          })
          .returning(),
    });
    return this.mapAdvance(row);
  }

  async returnAdvance(
    id: number,
    dto: AdvanceReturnRequest,
  ): Promise<{ success: boolean }> {
    const returnAmount: number = Number(dto?.returnAmount);
    assertPositiveAmount(returnAmount, '收回金额');
    const accountId: number = Number(dto?.accountId);
    if (!Number.isInteger(accountId) || accountId <= 0) {
      throw new BadRequestException('请提供有效的资金账户 ID');
    }
    await this.db.transaction(async (tx) => {
      const updated: { returnedAmount: string; amount: string }[] = await tx
        .update(financeAdvances)
        .set({
          returnedAmount: sql`${financeAdvances.returnedAmount} + ${returnAmount.toFixed(2)}`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(financeAdvances.id, id),
            isNull(financeAdvances.deletedAt),
            sql`${financeAdvances.returnedAmount} + ${returnAmount.toFixed(2)} <= ${financeAdvances.amount}`,
          ),
        )
        .returning({
          returnedAmount: financeAdvances.returnedAmount,
          amount: financeAdvances.amount,
        });
      if (updated.length === 0) {
        const existing: {
          returnedAmount: string;
          amount: string;
        }[] = await tx
          .select({
            returnedAmount: financeAdvances.returnedAmount,
            amount: financeAdvances.amount,
          })
          .from(financeAdvances)
          .where(
            and(
              eq(financeAdvances.id, id),
              isNull(financeAdvances.deletedAt),
            ),
          );
        if (existing.length === 0) {
          throw new NotFoundException('垫款记录不存在');
        }
        if (
          Number(existing[0].returnedAmount) + returnAmount >
          Number(existing[0].amount)
        ) {
          throw new ConflictException('收回金额超出垫款金额');
        }
        throw new ConflictException('垫款当前状态不允许收回');
      }
      const newReturned: number = Number(updated[0].returnedAmount);
      const totalAmount: number = Number(updated[0].amount);
      const nextStatus: string =
        newReturned >= totalAmount
          ? ADVANCE_STATUS_RETURNED
          : ADVANCE_STATUS_PARTIAL_RETURNED;
      const statusUpdated: { id: number }[] = await tx
        .update(financeAdvances)
        .set({
          status: nextStatus,
          returnDeadline: dto.returnDate ?? null,
          updatedAt: new Date(),
        })
        .where(eq(financeAdvances.id, id))
        .returning({ id: financeAdvances.id });
      if (statusUpdated.length === 0) {
        throw new NotFoundException('垫款记录不存在');
      }
      await increaseAccountBalance(tx, accountId, returnAmount);
    });
    return { success: true };
  }

  async markBadDebt(id: number): Promise<{ success: boolean }> {
    const rows: AdvanceRow[] = await this.db
      .select()
      .from(financeAdvances)
      .where(and(eq(financeAdvances.id, id), isNull(financeAdvances.deletedAt)));
    if (rows.length === 0) {
      throw new NotFoundException('垫款记录不存在');
    }
    if (!ADVANCE_BAD_DEBT_ALLOWED_STATUSES.includes(rows[0].status)) {
      throw new ConflictException(
        `仅未收回或部分收回的垫款可标记坏账，当前状态: ${rows[0].status}`,
      );
    }
    const updated: { id: number }[] = await this.db
      .update(financeAdvances)
      .set({ status: ADVANCE_STATUS_BAD_DEBT, updatedAt: new Date() })
      .where(eq(financeAdvances.id, id))
      .returning({ id: financeAdvances.id });
    if (updated.length === 0) {
      throw new NotFoundException('垫款记录不存在');
    }
    return { success: true };
  }

  async removeAdvance(id: number): Promise<{ success: boolean }> {
    const rows: AdvanceRow[] = await this.db
      .select()
      .from(financeAdvances)
      .where(and(eq(financeAdvances.id, id), isNull(financeAdvances.deletedAt)));
    if (rows.length === 0) {
      throw new NotFoundException('垫款记录不存在');
    }
    if (Number(rows[0].returnedAmount) > 0) {
      throw new ConflictException('已有收回记录的垫款不能删除');
    }
    const updated: { id: number }[] = await this.db
      .update(financeAdvances)
      .set({ deletedAt: new Date() })
      .where(eq(financeAdvances.id, id))
      .returning({ id: financeAdvances.id });
    if (updated.length === 0) {
      throw new NotFoundException('垫款记录不存在');
    }
    return { success: true };
  }

  async listIncentives(
    params: FinanceIncentiveListParams,
  ): Promise<FinanceIncentiveListResult> {
    const conditions: SQL[] = [isNull(financeIncentives.deletedAt)];
    if (params.employeeName) {
      conditions.push(
        ilike(financeIncentives.employeeName, `%${params.employeeName}%`),
      );
    }
    if (params.status) {
      conditions.push(eq(financeIncentives.status, params.status));
    }
    const where: SQL | undefined = and(...conditions);
    const page: number = Math.max(params.page ?? 1, 1);
    const pageSize: number = Math.min(Math.max(params.pageSize ?? 20, 1), 50);
    const rows: IncentiveRow[] = await this.db
      .select()
      .from(financeIncentives)
      .where(where)
      .orderBy(desc(financeIncentives.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    const totalResult: { count: number | string }[] = await this.db
      .select({ count: count() })
      .from(financeIncentives)
      .where(where);
    return {
      items: rows.map((row: IncentiveRow): FinanceIncentive =>
        this.mapIncentive(row),
      ),
      total: Number(totalResult[0]?.count ?? 0),
    };
  }

  async createIncentive(
    dto: CreateFinanceIncentiveRequest,
    operator: string,
  ): Promise<FinanceIncentive> {
    if (!dto?.employeeName || !dto.employeeName.trim()) {
      throw new BadRequestException('员工姓名不能为空');
    }
    if (!dto?.reason || !dto.reason.trim()) {
      throw new BadRequestException('激励事由不能为空');
    }
    assertPositiveAmount(dto?.amount, '激励金额');
    assertAmountRange(Number(dto.amount), '激励金额');
    const { row } = await insertWithSeqNo<IncentiveRow>({
      db: this.db,
      table: financeIncentives,
      noColumn: financeIncentives.incentiveNo,
      prefix: INCENTIVE_NO_PREFIX,
      insert: async (no: string): Promise<IncentiveRow[]> =>
        this.db
          .insert(financeIncentives)
          .values({
            incentiveNo: no,
            employeeName: dto.employeeName,
            department: dto.department ?? '',
            incentiveType: dto.incentiveType ?? INCENTIVE_TYPE_DEFAULT,
            amount: Number(dto.amount).toFixed(2),
            reason: dto.reason,
            status: INCENTIVE_STATUS_PENDING,
            approver: '',
            operator,
            remark: '',
          })
          .returning(),
    });
    return this.mapIncentive(row);
  }

  async approveIncentive(
    id: number,
    approved: boolean,
    rejectReason: string | undefined,
    userName: string,
  ): Promise<{ success: boolean }> {
    const rows: IncentiveRow[] = await this.db
      .select()
      .from(financeIncentives)
      .where(
        and(eq(financeIncentives.id, id), isNull(financeIncentives.deletedAt)),
      );
    if (rows.length === 0) {
      throw new NotFoundException('激励记录不存在');
    }
    if (rows[0].status !== INCENTIVE_STATUS_PENDING) {
      throw new ConflictException(
        `仅待审批的激励可审批，当前状态: ${rows[0].status}`,
      );
    }
    if (!approved && (!rejectReason || !rejectReason.trim())) {
      throw new BadRequestException('驳回时必须填写驳回原因');
    }
    const updated: { id: number }[] = await this.db
      .update(financeIncentives)
      .set({
        status: approved ? INCENTIVE_STATUS_APPROVED : INCENTIVE_STATUS_REJECTED,
        approver: userName,
        approveTime: new Date(),
        updatedAt: new Date(),
        reason: approved
          ? rows[0].reason
          : `${rows[0].reason}；驳回原因：${rejectReason}`,
      })
      .where(eq(financeIncentives.id, id))
      .returning({ id: financeIncentives.id });
    if (updated.length === 0) {
      throw new NotFoundException('激励记录不存在');
    }
    return { success: true };
  }

  async issueIncentive(
    id: number,
    accountId: number,
  ): Promise<{ success: boolean }> {
    const rows: IncentiveRow[] = await this.db
      .select()
      .from(financeIncentives)
      .where(
        and(eq(financeIncentives.id, id), isNull(financeIncentives.deletedAt)),
      );
    if (rows.length === 0) {
      throw new NotFoundException('激励记录不存在');
    }
    if (rows[0].status !== INCENTIVE_STATUS_APPROVED) {
      throw new ConflictException(
        `仅已通过的激励可发放，当前状态: ${rows[0].status}`,
      );
    }
    const amount: number = Number(rows[0].amount);
    await this.db.transaction(async (tx) => {
      await decreaseAccountBalance(tx, accountId, amount);
      const updated: { id: number }[] = await tx
        .update(financeIncentives)
        .set({
          status: INCENTIVE_STATUS_ISSUED,
          issueTime: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(financeIncentives.id, id))
        .returning({ id: financeIncentives.id });
      if (updated.length === 0) {
        throw new NotFoundException('激励记录不存在');
      }
    });
    return { success: true };
  }

  async removeIncentive(id: number): Promise<{ success: boolean }> {
    const rows: IncentiveRow[] = await this.db
      .select()
      .from(financeIncentives)
      .where(
        and(eq(financeIncentives.id, id), isNull(financeIncentives.deletedAt)),
      );
    if (rows.length === 0) {
      throw new NotFoundException('激励记录不存在');
    }
    if (rows[0].status === INCENTIVE_STATUS_ISSUED) {
      throw new ConflictException('已发放的激励不能删除');
    }
    const updated: { id: number }[] = await this.db
      .update(financeIncentives)
      .set({ deletedAt: new Date() })
      .where(eq(financeIncentives.id, id))
      .returning({ id: financeIncentives.id });
    if (updated.length === 0) {
      throw new NotFoundException('激励记录不存在');
    }
    return { success: true };
  }
}
