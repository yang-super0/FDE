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
  sql,
} from 'drizzle-orm';
import { financeAccounts, financePayments } from '@server/database/schema';
import type {
  ApproveFinancePaymentRequest,
  CreateFinancePaymentRequest,
  FinancePayment,
  FinancePaymentListParams,
  FinancePaymentListResult,
  UpdateFinancePaymentRequest,
} from '@shared/api.interface';
import { PAYMENT_NO_PREFIX, insertWithSeqNo } from '../fin-seq.util';
import { addDays, parseAmountParam, parseDateParam } from '../query.util';
import { publishSyncEvent } from '@server/modules/feishu-sync/sync-event.publisher';

type PaymentRow = typeof financePayments.$inferSelect;
type PaymentInsert = typeof financePayments.$inferInsert;
type AccountRow = typeof financeAccounts.$inferSelect;

const PENDING_STATUS: string = '待审批';
const APPROVED_STATUS: string = '审批通过';
const REJECTED_STATUS: string = '审批驳回';
const PAID_STATUS: string = '已付款';
const ACCOUNT_ENABLED_STATUS: string = '启用';
const EDITABLE_STATUSES: string[] = [PENDING_STATUS, REJECTED_STATUS];
const DEFAULT_BATCH_REJECT_REASON: string = '[批量驳回]';

@Injectable()
export class PaymentsService {
  private readonly logger: Logger = new Logger(PaymentsService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
  ) {}

  private mapPayment(row: PaymentRow, accountName: string): FinancePayment {
    return {
      id: row.id,
      paymentNo: row.paymentNo,
      payeeName: row.payeeName,
      amount: Number(row.amount),
      paymentType: row.paymentType ?? '',
      paymentMethod: row.paymentMethod ?? '',
      accountId: row.accountId,
      accountName,
      status: row.status,
      paymentDate: (row.paymentDate ?? row.createdAt).toISOString(),
      applicant: row.applicant ?? '',
      approver: row.approver ?? '',
      approvedAt: row.approvedAt ? row.approvedAt.toISOString() : null,
      rejectReason: row.rejectReason ?? '',
      remark: row.remark ?? '',
      createdAt: row.createdAt.toISOString(),
    };
  }

  private async loadAccountNames(
    ids: number[],
  ): Promise<Map<number, string>> {
    const map: Map<number, string> = new Map();
    if (ids.length === 0) {
      return map;
    }
    const rows: { id: number; accountName: string }[] = await this.db
      .select({
        id: financeAccounts.id,
        accountName: financeAccounts.accountName,
      })
      .from(financeAccounts)
      .where(inArray(financeAccounts.id, ids));
    for (const row of rows) {
      map.set(row.id, row.accountName);
    }
    return map;
  }

  private async mapRows(rows: PaymentRow[]): Promise<FinancePayment[]> {
    const accountIds: number[] = [
      ...new Set(
        rows
          .map((row: PaymentRow): number | null => row.accountId)
          .filter((value: number | null): value is number => value !== null),
      ),
    ];
    const accountNames: Map<number, string> =
      await this.loadAccountNames(accountIds);
    return rows.map((row: PaymentRow): FinancePayment =>
      this.mapPayment(
        row,
        row.accountId !== null ? accountNames.get(row.accountId) ?? '' : '',
      ),
    );
  }

  /** 创建/编辑共用：账户必须存在且为启用状态 */
  private async verifyActiveAccount(accountId: number): Promise<AccountRow> {
    const rows: AccountRow[] = await this.db
      .select()
      .from(financeAccounts)
      .where(
        and(
          eq(financeAccounts.id, accountId),
          isNull(financeAccounts.deletedAt),
        ),
      );
    if (rows.length === 0) {
      throw new BadRequestException('资金账户不存在');
    }
    if (rows[0].status !== ACCOUNT_ENABLED_STATUS) {
      throw new BadRequestException('资金账户未启用，不能关联付款');
    }
    return rows[0];
  }

  async findAll(
    params: FinancePaymentListParams,
  ): Promise<FinancePaymentListResult> {
    const page: number = Math.max(params.page ?? 1, 1);
    const pageSize: number = Math.min(Math.max(params.pageSize ?? 20, 1), 50);

    const conditions = [isNull(financePayments.deletedAt)];
    if (params.paymentNo) {
      conditions.push(ilike(financePayments.paymentNo, `%${params.paymentNo}%`));
    }
    if (params.payeeName) {
      conditions.push(ilike(financePayments.payeeName, `%${params.payeeName}%`));
    }
    if (params.paymentType) {
      conditions.push(eq(financePayments.paymentType, params.paymentType));
    }
    if (params.status) {
      conditions.push(eq(financePayments.status, params.status));
    }
    if (params.startDate) {
      conditions.push(
        gte(financePayments.paymentDate, parseDateParam(params.startDate)),
      );
    }
    if (params.endDate) {
      conditions.push(
        lt(
          financePayments.paymentDate,
          addDays(parseDateParam(params.endDate), 1),
        ),
      );
    }
    const where = and(...conditions);

    const rows: PaymentRow[] = await this.db
      .select()
      .from(financePayments)
      .where(where)
      .orderBy(desc(financePayments.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const totalResult: { count: number | string }[] = await this.db
      .select({ count: count() })
      .from(financePayments)
      .where(where);
    const total: number = Number(totalResult[0]?.count ?? 0);

    return { items: await this.mapRows(rows), total };
  }

  async detail(id: number): Promise<FinancePayment> {
    const rows: PaymentRow[] = await this.db
      .select()
      .from(financePayments)
      .where(
        and(eq(financePayments.id, id), isNull(financePayments.deletedAt)),
      );
    if (rows.length === 0) {
      throw new NotFoundException('付款不存在');
    }
    const mapped: FinancePayment[] = await this.mapRows(rows);
    return mapped[0];
  }

  async create(
    dto: CreateFinancePaymentRequest,
    applicant: string,
  ): Promise<FinancePayment> {
    if (!dto.payeeName || dto.payeeName.trim().length === 0) {
      throw new BadRequestException('请填写收款方名称');
    }
    const amount: number = parseAmountParam(dto.amount);
    let accountName: string = '';
    if (dto.accountId !== undefined && dto.accountId !== null) {
      const account: AccountRow = await this.verifyActiveAccount(
        dto.accountId,
      );
      accountName = account.accountName;
    }

    const result = await insertWithSeqNo<PaymentRow>({
      db: this.db,
      table: financePayments,
      noColumn: financePayments.paymentNo,
      prefix: PAYMENT_NO_PREFIX,
      insert: (paymentNo: string): Promise<PaymentRow[]> =>
        this.db
          .insert(financePayments)
          .values({
            paymentNo,
            payeeName: dto.payeeName.trim(),
            amount: String(amount),
            paymentType: dto.paymentType ?? '服务费',
            paymentMethod: dto.paymentMethod ?? '银行转账',
            accountId: dto.accountId ?? null,
            status: PENDING_STATUS,
            paymentDate: dto.paymentDate
              ? parseDateParam(dto.paymentDate)
              : new Date(),
            applicant,
            remark: dto.remark ?? '',
          })
          .returning(),
    });
    this.logger.log(`付款创建成功: ${result.no}`);
    publishSyncEvent('finance_payments', result.id, 'create');
    return this.mapPayment(result.row, accountName);
  }

  /** 仅 待审批/审批驳回 可编辑 */
  async update(
    id: number,
    dto: UpdateFinancePaymentRequest,
  ): Promise<{ success: boolean }> {
    const rows: PaymentRow[] = await this.db
      .select()
      .from(financePayments)
      .where(
        and(eq(financePayments.id, id), isNull(financePayments.deletedAt)),
      );
    if (rows.length === 0) {
      throw new NotFoundException('付款不存在');
    }
    if (!EDITABLE_STATUSES.includes(rows[0].status)) {
      throw new BadRequestException('仅待审批或审批驳回的付款可以编辑');
    }

    const patch: Partial<PaymentInsert> = {};
    if (dto.payeeName !== undefined) {
      if (dto.payeeName.trim().length === 0) {
        throw new BadRequestException('收款方名称不能为空');
      }
      patch.payeeName = dto.payeeName.trim();
    }
    if (dto.amount !== undefined) {
      patch.amount = String(parseAmountParam(dto.amount));
    }
    if (dto.paymentType !== undefined) {
      patch.paymentType = dto.paymentType;
    }
    if (dto.paymentMethod !== undefined) {
      patch.paymentMethod = dto.paymentMethod;
    }
    if (dto.accountId !== undefined) {
      if (dto.accountId !== null) {
        await this.verifyActiveAccount(dto.accountId);
      }
      patch.accountId = dto.accountId;
    }
    if (dto.paymentDate !== undefined) {
      patch.paymentDate = parseDateParam(dto.paymentDate);
    }
    if (dto.remark !== undefined) {
      patch.remark = dto.remark;
    }
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }
    patch.updatedAt = new Date();

    const updated: { id: number }[] = await this.db
      .update(financePayments)
      .set(patch)
      .where(
        and(eq(financePayments.id, id), isNull(financePayments.deletedAt)),
      )
      .returning({ id: financePayments.id });
    if (updated.length === 0) {
      throw new NotFoundException('付款不存在');
    }
    publishSyncEvent('finance_payments', updated[0].id, 'update');
    return { success: true };
  }

  /** 软删除：仅 待审批/审批驳回 可删 */
  async remove(id: number): Promise<{ success: boolean }> {
    const rows: PaymentRow[] = await this.db
      .select()
      .from(financePayments)
      .where(
        and(eq(financePayments.id, id), isNull(financePayments.deletedAt)),
      );
    if (rows.length === 0) {
      throw new NotFoundException('付款不存在');
    }
    if (!EDITABLE_STATUSES.includes(rows[0].status)) {
      throw new BadRequestException('仅待审批或审批驳回的付款可以删除');
    }

    const now: Date = new Date();
    const updated: { id: number }[] = await this.db
      .update(financePayments)
      .set({ deletedAt: now, updatedAt: now })
      .where(
        and(eq(financePayments.id, id), isNull(financePayments.deletedAt)),
      )
      .returning({ id: financePayments.id });
    if (updated.length === 0) {
      throw new NotFoundException('付款不存在');
    }
    publishSyncEvent('finance_payments', updated[0].id, 'delete');
    return { success: true };
  }

  /** 审批：仅 待审批 可审批；驳回必须带原因；重复审批 409 */
  async approve(
    id: number,
    dto: ApproveFinancePaymentRequest,
    userId: string,
  ): Promise<{ success: boolean }> {
    const rows: PaymentRow[] = await this.db
      .select()
      .from(financePayments)
      .where(
        and(eq(financePayments.id, id), isNull(financePayments.deletedAt)),
      );
    if (rows.length === 0) {
      throw new NotFoundException('付款不存在');
    }
    if (rows[0].status !== PENDING_STATUS) {
      throw new ConflictException('仅待审批的付款可以审批，请勿重复操作');
    }
    if (!dto.approved && !(dto.rejectReason ?? '').trim()) {
      throw new BadRequestException('驳回时必须填写驳回原因');
    }

    const now: Date = new Date();
    const updated: { id: number }[] = await this.db
      .update(financePayments)
      .set({
        status: dto.approved ? APPROVED_STATUS : REJECTED_STATUS,
        approver: userId,
        approvedAt: now,
        rejectReason: dto.approved ? '' : (dto.rejectReason ?? '').trim(),
        updatedAt: now,
      })
      .where(
        and(
          eq(financePayments.id, id),
          eq(financePayments.status, PENDING_STATUS),
        ),
      )
      .returning({ id: financePayments.id });
    if (updated.length === 0) {
      throw new ConflictException('付款状态已变更，请刷新后重试');
    }
    publishSyncEvent('finance_payments', updated[0].id, 'update');
    return { success: true };
  }

  /** 批量审批：事务内仅处理 待审批；驳回原因缺省 '[批量驳回]' */
  async batchApprove(
    ids: number[],
    approved: boolean,
    rejectReason: string | undefined,
    userId: string,
  ): Promise<{ approved: number }> {
    let approvedCount: number = 0;
    const reason: string = dto_reason(rejectReason);
    const syncedIds: number[] = [];
    await this.db.transaction(async (tx) => {
      const rows: PaymentRow[] = await tx
        .select()
        .from(financePayments)
        .where(
          and(
            inArray(financePayments.id, ids),
            isNull(financePayments.deletedAt),
          ),
        );
      const now: Date = new Date();
      for (const row of rows) {
        if (row.status !== PENDING_STATUS) {
          continue;
        }
        const updated: { id: number }[] = await tx
          .update(financePayments)
          .set({
            status: approved ? APPROVED_STATUS : REJECTED_STATUS,
            approver: userId,
            approvedAt: now,
            rejectReason: approved ? '' : reason,
            updatedAt: now,
          })
          .where(
            and(
              eq(financePayments.id, row.id),
              eq(financePayments.status, PENDING_STATUS),
            ),
          )
          .returning({ id: financePayments.id });
        if (updated.length > 0) {
          syncedIds.push(row.id);
          approvedCount += 1;
        }
      }
    });
    syncedIds.forEach((paymentId: number) => {
      publishSyncEvent('finance_payments', paymentId, 'update');
    });
    this.logger.log(`付款批量审批完成: ${String(approvedCount)} 条`);
    return { approved: approvedCount };
  }

  /**
   * 执行付款：事务内原子扣减账户余额防超付，
   * 余额不足抛 ConflictException 令事务回滚
   */
  async pay(id: number): Promise<{ success: boolean }> {
    await this.db.transaction(async (tx) => {
      const rows: PaymentRow[] = await tx
        .select()
        .from(financePayments)
        .where(
          and(eq(financePayments.id, id), isNull(financePayments.deletedAt)),
        );
      if (rows.length === 0) {
        throw new NotFoundException('付款不存在');
      }
      const row: PaymentRow = rows[0];
      if (row.status !== APPROVED_STATUS) {
        throw new ConflictException('仅审批通过的付款可以执行付款');
      }
      if (row.accountId === null) {
        throw new BadRequestException('该付款未关联资金账户，无法执行付款');
      }

      const amount: number = Number(row.amount);
      const now: Date = new Date();
      const deducted: { id: number }[] = await tx
        .update(financeAccounts)
        .set({
          balance: sql`${financeAccounts.balance} - ${amount}`,
          updatedAt: now,
        })
        .where(
          and(
            eq(financeAccounts.id, row.accountId),
            gte(financeAccounts.balance, String(amount)),
          ),
        )
        .returning({ id: financeAccounts.id });
      if (deducted.length === 0) {
        throw new ConflictException('账户余额不足');
      }

      const updated: { id: number }[] = await tx
        .update(financePayments)
        .set({ status: PAID_STATUS, updatedAt: now })
        .where(
          and(
            eq(financePayments.id, id),
            eq(financePayments.status, APPROVED_STATUS),
          ),
        )
        .returning({ id: financePayments.id });
      if (updated.length === 0) {
        throw new ConflictException('付款状态已变更，请刷新后重试');
      }
    });
    this.logger.log(`付款 ${String(id)} 执行完成`);
    publishSyncEvent('finance_payments', id, 'update');
    return { success: true };
  }
}

/** 批量驳回原因缺省值处理 */
function dto_reason(rejectReason: string | undefined): string {
  const trimmed: string = (rejectReason ?? '').trim();
  return trimmed.length > 0 ? trimmed : DEFAULT_BATCH_REJECT_REASON;
}
