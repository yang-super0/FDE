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
  ilike,
  isNull,
  sql,
  type SQL,
} from 'drizzle-orm';
import {
  customerFinanceDetails,
  financeBankAccounts,
  financeCoinReturns,
  financeConsumptions,
  financePorts,
  financeRebates,
  financeRecharges,
  financeRefunds,
} from '@server/database/schema';
import type {
  CreateFinanceBankAccountRequest,
  CreateFinanceCoinReturnRequest,
  CreateFinancePortRequest,
  CreateFinanceRechargeRequest,
  CreateFinanceRefundRequest,
  CustomerFinanceDetail,
  CustomerFinanceDetailListResult,
  FinanceBankAccountListResult,
  FinanceCoinReturnListResult,
  FinancePortListResult,
  FinanceRechargeListResult,
  FinanceRefundListResult,
  RefundApproveRequest,
  UpdateFinanceBankAccountRequest,
  UpdateFinancePortRequest,
} from '@shared/api.interface';
import { insertWithSeqNo } from '../finance-core/fin-seq.util';
import { MessageNotificationService } from '../message-notification/message-notification.service';
import { parseDateParam } from '../finance-core/query.util';
import {
  assertPositiveAmount,
  decreaseAccountBalance,
  increaseAccountBalance,
  insertCustomerFinanceDetail,
} from './finance-enhance-shared.util';
import {
  mapCustomerFinanceDetail,
  mapFinanceBankAccount,
  mapFinanceCoinReturn,
  mapFinancePort,
  mapFinanceRecharge,
  mapFinanceRefund,
} from './finance-funds-mappers';

type DetailRow = typeof customerFinanceDetails.$inferSelect;
type RechargeRow = typeof financeRecharges.$inferSelect;
type RefundRow = typeof financeRefunds.$inferSelect;
type CoinReturnRow = typeof financeCoinReturns.$inferSelect;
type PortRow = typeof financePorts.$inferSelect;
type BankAccountRow = typeof financeBankAccounts.$inferSelect;
type PortInsert = typeof financePorts.$inferInsert;
type BankAccountInsert = typeof financeBankAccounts.$inferInsert;

const RECHARGE_NO_PREFIX: string = 'CZ';
const REFUND_NO_PREFIX: string = 'TK';
const COIN_RETURN_NO_PREFIX: string = 'TB';
const PORT_NO_PREFIX: string = 'DK';
const BANK_NO_PREFIX: string = 'YH';

const RECHARGE_PENDING: string = '待确认';
const RECHARGE_CONFIRMED: string = '已确认';
const RECHARGE_CANCELLED: string = '已取消';
const REFUND_PENDING_APPROVE: string = '待审批';
const REFUND_APPROVED: string = '已通过';
const REFUND_REJECTED: string = '已驳回';
const REFUND_REFUNDED: string = '已退款';
const COIN_PENDING: string = '待处理';
const COIN_PROCESSING: string = '处理中';
const COIN_DONE: string = '已完成';
const COIN_FAILED: string = '失败';
export const STATUS_ENABLED: string = '启用';
export const STATUS_DISABLED: string = '停用';
const TYPE_ADJUST: string = '调账';
const TYPE_RECHARGE: string = '充值';
const TYPE_REFUND: string = '退款';

const REFUND_DELETABLE_STATUSES: string[] = [
  REFUND_PENDING_APPROVE,
  REFUND_REJECTED,
];
const COIN_DELETABLE_STATUSES: string[] = [COIN_PENDING, COIN_FAILED];

const assertRequiredString = (value: unknown, label: string): string => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new BadRequestException(`${label}不能为空`);
  }
  return value.trim();
};

const assertPositiveId = (value: unknown, label: string): number => {
  const parsed: number = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new BadRequestException(`请提供有效的${label}`);
  }
  return parsed;
};

const assertNonNegativeAmount = (
  value: unknown,
  label: string,
): number => {
  const parsed: number = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new BadRequestException(`${label}不能为负数`);
  }
  return parsed;
};

export interface CreateCustomerFinanceDetailRequest {
  customerId: string;
  customerName: string;
  accountId: number;
  transactionType: string;
  amount: number;
  remark?: string;
}

@Injectable()
export class FinanceFundsService {
  private readonly logger = new Logger(FinanceFundsService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
    private readonly messageNotificationService: MessageNotificationService,
  ) {}

  async listCustomerDetails(params: {
    customerId?: string;
    transactionType?: string;
    startDate?: string;
    endDate?: string;
    page: number;
    pageSize: number;
  }): Promise<CustomerFinanceDetailListResult> {
    const conditions: SQL[] = [
      isNull(customerFinanceDetails.deletedAt),
    ];
    if (params.customerId) {
      conditions.push(
        eq(customerFinanceDetails.customerId, params.customerId),
      );
    }
    if (params.transactionType) {
      conditions.push(
        eq(customerFinanceDetails.transactionType, params.transactionType),
      );
    }
    if (params.startDate) {
      parseDateParam(params.startDate);
      conditions.push(
        sql`CAST(${customerFinanceDetails.transactionTime} AS DATE) >= ${params.startDate}`,
      );
    }
    if (params.endDate) {
      parseDateParam(params.endDate);
      conditions.push(
        sql`CAST(${customerFinanceDetails.transactionTime} AS DATE) <= ${params.endDate}`,
      );
    }
    const where = and(...conditions);
    const totalRows: { count: number | string }[] = await this.db
      .select({ count: count() })
      .from(customerFinanceDetails)
      .where(where);
    const rows: DetailRow[] = await this.db
      .select()
      .from(customerFinanceDetails)
      .where(where)
      .orderBy(desc(customerFinanceDetails.id))
      .limit(params.pageSize)
      .offset((params.page - 1) * params.pageSize);
    return {
      items: rows.map((row: DetailRow) => mapCustomerFinanceDetail(row)),
      total: Number(totalRows[0]?.count ?? 0),
    };
  }

  async createCustomerDetail(
    dto: CreateCustomerFinanceDetailRequest,
  ): Promise<CustomerFinanceDetail> {
    const customerId: string = assertRequiredString(
      dto?.customerId,
      '客户 ID',
    );
    const customerName: string = assertRequiredString(
      dto?.customerName,
      '客户名称',
    );
    const accountId: number = assertPositiveId(dto?.accountId, '资金账户 ID');
    if (dto?.transactionType !== TYPE_ADJUST) {
      throw new BadRequestException('交易类型必须为「调账」');
    }
    assertPositiveAmount(dto?.amount, '调账金额');
    const amount: number = Number(dto.amount);
    const remark: string =
      typeof dto?.remark === 'string' ? dto.remark : '';
    const detailId: number = await this.db.transaction(async (tx) => {
      const newBalance: number = await increaseAccountBalance(
        tx,
        accountId,
        amount,
      );
      return insertCustomerFinanceDetail(tx, {
        customerId,
        customerName,
        accountId,
        transactionType: TYPE_ADJUST,
        amount,
        balanceAfter: newBalance,
        relatedOrderNo: '',
        remark,
      });
    });
    const rows: DetailRow[] = await this.db
      .select()
      .from(customerFinanceDetails)
      .where(eq(customerFinanceDetails.id, detailId));
    if (rows.length === 0) {
      throw new NotFoundException('客户资金明细不存在');
    }
    return mapCustomerFinanceDetail(rows[0]);
  }

  async listRecharges(params: {
    customerName?: string;
    status?: string;
    page: number;
    pageSize: number;
  }): Promise<FinanceRechargeListResult> {
    const conditions: SQL[] = [isNull(financeRecharges.deletedAt)];
    if (params.customerName) {
      conditions.push(
        ilike(financeRecharges.customerName, `%${params.customerName}%`),
      );
    }
    if (params.status) {
      conditions.push(eq(financeRecharges.status, params.status));
    }
    const where = and(...conditions);
    const totalRows: { count: number | string }[] = await this.db
      .select({ count: count() })
      .from(financeRecharges)
      .where(where);
    const rows: RechargeRow[] = await this.db
      .select()
      .from(financeRecharges)
      .where(where)
      .orderBy(desc(financeRecharges.id))
      .limit(params.pageSize)
      .offset((params.page - 1) * params.pageSize);
    return {
      items: rows.map((row: RechargeRow) => mapFinanceRecharge(row)),
      total: Number(totalRows[0]?.count ?? 0),
    };
  }

  async createRecharge(
    dto: CreateFinanceRechargeRequest,
    operator: string,
  ): Promise<{ id: number }> {
    const customerId: string = assertRequiredString(
      dto?.customerId,
      '客户 ID',
    );
    const customerName: string = assertRequiredString(
      dto?.customerName,
      '客户名称',
    );
    const accountId: number = assertPositiveId(dto?.accountId, '资金账户 ID');
    const paymentMethod: string = assertRequiredString(
      dto?.paymentMethod,
      '付款方式',
    );
    assertPositiveAmount(dto?.amount, '充值金额');
    const amount: number = Number(dto.amount);
    const result = await insertWithSeqNo<{ id: number }>({
      db: this.db,
      table: financeRecharges,
      noColumn: financeRecharges.rechargeNo,
      prefix: RECHARGE_NO_PREFIX,
      insert: (rechargeNo: string) =>
        this.db
          .insert(financeRecharges)
          .values({
            rechargeNo,
            customerId,
            customerName,
            adAccountId: dto.adAccountId ?? '',
            accountId,
            amount: amount.toFixed(2),
            paymentMethod,
            status: RECHARGE_PENDING,
            operator,
            remark: dto.remark ?? '',
          })
          .returning({ id: financeRecharges.id }),
    });
    return { id: result.id };
  }

  async confirmRecharge(id: number): Promise<{ success: boolean }> {
    const row: RechargeRow = await this.findRecharge(id);
    if (row.status !== RECHARGE_PENDING) {
      throw new ConflictException(
        `当前状态「${row.status}」不允许确认，仅待确认可确认`,
      );
    }
    const amount: number = Number(row.amount);
    const now: Date = new Date();
    await this.db.transaction(async (tx) => {
      const newBalance: number = await increaseAccountBalance(
        tx,
        row.accountId,
        amount,
      );
      await insertCustomerFinanceDetail(tx, {
        customerId: row.customerId,
        customerName: row.customerName,
        accountId: row.accountId,
        transactionType: TYPE_RECHARGE,
        amount,
        balanceAfter: newBalance,
        relatedOrderNo: row.rechargeNo,
        remark: row.remark,
      });
      const updated: { id: number }[] = await tx
        .update(financeRecharges)
        .set({
          status: RECHARGE_CONFIRMED,
          confirmTime: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(financeRecharges.id, id),
            eq(financeRecharges.status, RECHARGE_PENDING),
          ),
        )
        .returning({ id: financeRecharges.id });
      if (updated.length === 0) {
        throw new ConflictException('充值单状态已变更，请刷新后重试');
      }
    });
    return { success: true };
  }

  async cancelRecharge(id: number): Promise<{ success: boolean }> {
    const row: RechargeRow = await this.findRecharge(id);
    if (row.status !== RECHARGE_PENDING) {
      throw new ConflictException(
        `当前状态「${row.status}」不允许取消，仅待确认可取消`,
      );
    }
    const now: Date = new Date();
    const updated: { id: number }[] = await this.db
      .update(financeRecharges)
      .set({ status: RECHARGE_CANCELLED, updatedAt: now })
      .where(
        and(
          eq(financeRecharges.id, id),
          eq(financeRecharges.status, RECHARGE_PENDING),
        ),
      )
      .returning({ id: financeRecharges.id });
    if (updated.length === 0) {
      throw new ConflictException('充值单状态已变更，请刷新后重试');
    }
    return { success: true };
  }

  async deleteRecharge(id: number): Promise<{ success: boolean }> {
    const row: RechargeRow = await this.findRecharge(id);
    if (row.status === RECHARGE_CONFIRMED) {
      throw new ConflictException('已确认的充值单不允许删除');
    }
    const now: Date = new Date();
    const updated: { id: number }[] = await this.db
      .update(financeRecharges)
      .set({ deletedAt: now, updatedAt: now })
      .where(
        and(eq(financeRecharges.id, id), isNull(financeRecharges.deletedAt)),
      )
      .returning({ id: financeRecharges.id });
    if (updated.length === 0) {
      throw new NotFoundException('充值单不存在');
    }
    return { success: true };
  }

  async listRefunds(params: {
    customerName?: string;
    status?: string;
    page: number;
    pageSize: number;
  }): Promise<FinanceRefundListResult> {
    const conditions: SQL[] = [isNull(financeRefunds.deletedAt)];
    if (params.customerName) {
      conditions.push(
        ilike(financeRefunds.customerName, `%${params.customerName}%`),
      );
    }
    if (params.status) {
      conditions.push(eq(financeRefunds.status, params.status));
    }
    const where = and(...conditions);
    const totalRows: { count: number | string }[] = await this.db
      .select({ count: count() })
      .from(financeRefunds)
      .where(where);
    const rows: RefundRow[] = await this.db
      .select()
      .from(financeRefunds)
      .where(where)
      .orderBy(desc(financeRefunds.id))
      .limit(params.pageSize)
      .offset((params.page - 1) * params.pageSize);
    return {
      items: rows.map((row: RefundRow) => mapFinanceRefund(row)),
      total: Number(totalRows[0]?.count ?? 0),
    };
  }

  async createRefund(
    dto: CreateFinanceRefundRequest,
    operator: string,
  ): Promise<{ id: number }> {
    const customerId: string = assertRequiredString(
      dto?.customerId,
      '客户 ID',
    );
    const customerName: string = assertRequiredString(
      dto?.customerName,
      '客户名称',
    );
    const accountId: number = assertPositiveId(dto?.accountId, '资金账户 ID');
    assertRequiredString(dto?.reason, '退款原因');
    assertPositiveAmount(dto?.amount, '退款金额');
    const amount: number = Number(dto.amount);
    const result = await insertWithSeqNo<{ id: number }>({
      db: this.db,
      table: financeRefunds,
      noColumn: financeRefunds.refundNo,
      prefix: REFUND_NO_PREFIX,
      insert: (refundNo: string) =>
        this.db
          .insert(financeRefunds)
          .values({
            refundNo,
            customerId,
            customerName,
            accountId,
            amount: amount.toFixed(2),
            reason: dto.reason,
            status: REFUND_PENDING_APPROVE,
            approver: '',
            approveRemark: '',
            operator,
          })
          .returning({ id: financeRefunds.id }),
    });
    return { id: result.id };
  }

  async approveRefund(
    id: number,
    body: RefundApproveRequest,
    approver: string,
  ): Promise<{ success: boolean }> {
    const row: RefundRow = await this.findRefund(id);
    if (row.status !== REFUND_PENDING_APPROVE) {
      throw new ConflictException(
        `当前状态「${row.status}」不允许审批，仅待审批可审批`,
      );
    }
    const approved: boolean = body?.approved === true;
    const approveRemark: string =
      typeof body?.approveRemark === 'string' ? body.approveRemark.trim() : '';
    if (!approved && approveRemark.length === 0) {
      throw new BadRequestException('驳回时必须填写审批备注');
    }
    const now: Date = new Date();
    const updated: { id: number }[] = await this.db
      .update(financeRefunds)
      .set({
        status: approved ? REFUND_APPROVED : REFUND_REJECTED,
        approver,
        approveTime: now,
        approveRemark,
        updatedAt: now,
      })
      .where(
        and(
          eq(financeRefunds.id, id),
          eq(financeRefunds.status, REFUND_PENDING_APPROVE),
        ),
      )
      .returning({ id: financeRefunds.id });
    if (updated.length === 0) {
      throw new ConflictException('退款单状态已变更，请刷新后重试');
    }
    if (row.createdBy) {
      try {
        await this.messageNotificationService.pushApprovalResult({
          title: approved ? '退款审批通过' : '退款被驳回',
          content: approved
            ? `您的退款单「${row.refundNo}」（客户：${row.customerName}，金额 ${row.amount} 元）已审批通过。`
            : `您的退款单「${row.refundNo}」被驳回：${approveRemark}`,
          toUserId: row.createdBy,
          relatedModule: '财务',
          relatedBusinessId: String(id),
          relatedBusinessNo: row.refundNo,
        });
      } catch (error: unknown) {
        this.logger.warn(
          `退款审批结果推送失败: ${JSON.stringify({ id, error: String(error) })}`,
        );
      }
    }
    return { success: true };
  }

  async executeRefund(id: number): Promise<{ success: boolean }> {
    const row: RefundRow = await this.findRefund(id);
    if (row.status !== REFUND_APPROVED) {
      throw new ConflictException(
        `当前状态「${row.status}」不允许执行退款，仅已通过可执行`,
      );
    }
    const amount: number = Number(row.amount);
    const now: Date = new Date();
    await this.db.transaction(async (tx) => {
      const newBalance: number = await decreaseAccountBalance(
        tx,
        row.accountId,
        amount,
      );
      await insertCustomerFinanceDetail(tx, {
        customerId: row.customerId,
        customerName: row.customerName,
        accountId: row.accountId,
        transactionType: TYPE_REFUND,
        amount,
        balanceAfter: newBalance,
        relatedOrderNo: row.refundNo,
        remark: row.reason,
      });
      const updated: { id: number }[] = await tx
        .update(financeRefunds)
        .set({ status: REFUND_REFUNDED, refundTime: now, updatedAt: now })
        .where(
          and(
            eq(financeRefunds.id, id),
            eq(financeRefunds.status, REFUND_APPROVED),
          ),
        )
        .returning({ id: financeRefunds.id });
      if (updated.length === 0) {
        throw new ConflictException('退款单状态已变更，请刷新后重试');
      }
    });
    return { success: true };
  }

  async deleteRefund(id: number): Promise<{ success: boolean }> {
    const row: RefundRow = await this.findRefund(id);
    if (!REFUND_DELETABLE_STATUSES.includes(row.status)) {
      throw new ConflictException(
        `当前状态「${row.status}」不允许删除，仅待审批/已驳回可删除`,
      );
    }
    const now: Date = new Date();
    const updated: { id: number }[] = await this.db
      .update(financeRefunds)
      .set({ deletedAt: now, updatedAt: now })
      .where(
        and(eq(financeRefunds.id, id), isNull(financeRefunds.deletedAt)),
      )
      .returning({ id: financeRefunds.id });
    if (updated.length === 0) {
      throw new NotFoundException('退款单不存在');
    }
    return { success: true };
  }

  async listCoinReturns(params: {
    status?: string;
    platform?: string;
    page: number;
    pageSize: number;
  }): Promise<FinanceCoinReturnListResult> {
    const conditions: SQL[] = [isNull(financeCoinReturns.deletedAt)];
    if (params.status) {
      conditions.push(eq(financeCoinReturns.status, params.status));
    }
    if (params.platform) {
      conditions.push(eq(financeCoinReturns.platform, params.platform));
    }
    const where = and(...conditions);
    const totalRows: { count: number | string }[] = await this.db
      .select({ count: count() })
      .from(financeCoinReturns)
      .where(where);
    const rows: CoinReturnRow[] = await this.db
      .select()
      .from(financeCoinReturns)
      .where(where)
      .orderBy(desc(financeCoinReturns.id))
      .limit(params.pageSize)
      .offset((params.page - 1) * params.pageSize);
    return {
      items: rows.map((row: CoinReturnRow) => mapFinanceCoinReturn(row)),
      total: Number(totalRows[0]?.count ?? 0),
    };
  }

  async createCoinReturn(
    dto: CreateFinanceCoinReturnRequest,
    operator: string,
  ): Promise<{ id: number }> {
    assertRequiredString(dto?.customerId, '客户 ID');
    assertRequiredString(dto?.platform, '平台');
    assertPositiveAmount(dto?.coinAmount, '退币金额');
    assertPositiveAmount(dto?.rmbEquivalent, '人民币等值金额');
    const coinAmount: number = Number(dto.coinAmount);
    const rmbEquivalent: number = Number(dto.rmbEquivalent);
    const result = await insertWithSeqNo<{ id: number }>({
      db: this.db,
      table: financeCoinReturns,
      noColumn: financeCoinReturns.returnNo,
      prefix: COIN_RETURN_NO_PREFIX,
      insert: (returnNo: string) =>
        this.db
          .insert(financeCoinReturns)
          .values({
            returnNo,
            customerId: dto.customerId,
            adAccountId: dto.adAccountId ?? '',
            platform: dto.platform,
            coinAmount: coinAmount.toFixed(2),
            rmbEquivalent: rmbEquivalent.toFixed(2),
            status: COIN_PENDING,
            operator,
            remark: dto.remark ?? '',
          })
          .returning({ id: financeCoinReturns.id }),
    });
    return { id: result.id };
  }

  async transitionCoinReturn(
    id: number,
    action: 'process' | 'finish' | 'fail',
  ): Promise<{ success: boolean }> {
    const row: CoinReturnRow = await this.findCoinReturn(id);
    const now: Date = new Date();
    if (action === 'process') {
      if (row.status !== COIN_PENDING) {
        throw new ConflictException(
          `当前状态「${row.status}」不允许开始处理，仅待处理可开始处理`,
        );
      }
      const updated: { id: number }[] = await this.db
        .update(financeCoinReturns)
        .set({ status: COIN_PROCESSING, updatedAt: now })
        .where(
          and(
            eq(financeCoinReturns.id, id),
            eq(financeCoinReturns.status, COIN_PENDING),
          ),
        )
        .returning({ id: financeCoinReturns.id });
      if (updated.length === 0) {
        throw new ConflictException('退币记录状态已变更，请刷新后重试');
      }
      return { success: true };
    }
    if (row.status !== COIN_PROCESSING) {
      throw new ConflictException(
        `当前状态「${row.status}」不允许该操作，仅处理中可完成或标记失败`,
      );
    }
    const targetStatus: string =
      action === 'finish' ? COIN_DONE : COIN_FAILED;
    const updated: { id: number }[] = await this.db
      .update(financeCoinReturns)
      .set({
        status: targetStatus,
        finishTime: action === 'finish' ? now : row.finishTime,
        updatedAt: now,
      })
      .where(
        and(
          eq(financeCoinReturns.id, id),
          eq(financeCoinReturns.status, COIN_PROCESSING),
        ),
      )
      .returning({ id: financeCoinReturns.id });
    if (updated.length === 0) {
      throw new ConflictException('退币记录状态已变更，请刷新后重试');
    }
    return { success: true };
  }

  async deleteCoinReturn(id: number): Promise<{ success: boolean }> {
    const row: CoinReturnRow = await this.findCoinReturn(id);
    if (!COIN_DELETABLE_STATUSES.includes(row.status)) {
      throw new ConflictException(
        `当前状态「${row.status}」不允许删除，仅待处理/失败可删除`,
      );
    }
    const now: Date = new Date();
    const updated: { id: number }[] = await this.db
      .update(financeCoinReturns)
      .set({ deletedAt: now, updatedAt: now })
      .where(
        and(
          eq(financeCoinReturns.id, id),
          isNull(financeCoinReturns.deletedAt),
        ),
      )
      .returning({ id: financeCoinReturns.id });
    if (updated.length === 0) {
      throw new NotFoundException('退币记录不存在');
    }
    return { success: true };
  }

  async listPorts(params: {
    portName?: string;
    portType?: string;
    status?: string;
    page: number;
    pageSize: number;
  }): Promise<FinancePortListResult> {
    const conditions: SQL[] = [isNull(financePorts.deletedAt)];
    if (params.portName) {
      conditions.push(ilike(financePorts.portName, `%${params.portName}%`));
    }
    if (params.portType) {
      conditions.push(eq(financePorts.portType, params.portType));
    }
    if (params.status) {
      conditions.push(eq(financePorts.status, params.status));
    }
    const where = and(...conditions);
    const totalRows: { count: number | string }[] = await this.db
      .select({ count: count() })
      .from(financePorts)
      .where(where);
    const rows: PortRow[] = await this.db
      .select()
      .from(financePorts)
      .where(where)
      .orderBy(desc(financePorts.id))
      .limit(params.pageSize)
      .offset((params.page - 1) * params.pageSize);
    return {
      items: rows.map((row: PortRow) => mapFinancePort(row)),
      total: Number(totalRows[0]?.count ?? 0),
    };
  }

  async createPort(
    dto: CreateFinancePortRequest,
  ): Promise<{ id: number }> {
    const portName: string = assertRequiredString(dto?.portName, '端口名称');
    const portType: string = assertRequiredString(dto?.portType, '端口类型');
    const balance: number =
      dto?.balance !== undefined
        ? assertNonNegativeAmount(dto.balance, '期初余额')
        : 0;
    const result = await insertWithSeqNo<{ id: number }>({
      db: this.db,
      table: financePorts,
      noColumn: financePorts.portNo,
      prefix: PORT_NO_PREFIX,
      insert: (portNo: string) =>
        this.db
          .insert(financePorts)
          .values({
            portNo,
            portName,
            portType,
            platform: dto.platform ?? '',
            balance: balance.toFixed(2),
            frozenBalance: '0',
            contactPerson: dto.contactPerson ?? '',
            contactPhone: dto.contactPhone ?? '',
            status: STATUS_ENABLED,
            remark: dto.remark ?? '',
          })
          .returning({ id: financePorts.id }),
    });
    return { id: result.id };
  }

  async updatePort(
    id: number,
    dto: UpdateFinancePortRequest,
  ): Promise<{ success: boolean }> {
    const patch: Partial<PortInsert> = {};
    if (dto?.portName !== undefined) {
      patch.portName = assertRequiredString(dto.portName, '端口名称');
    }
    if (dto?.portType !== undefined) {
      patch.portType = assertRequiredString(dto.portType, '端口类型');
    }
    if (dto?.platform !== undefined) {
      patch.platform = dto.platform;
    }
    if (dto?.contactPerson !== undefined) {
      patch.contactPerson = dto.contactPerson;
    }
    if (dto?.contactPhone !== undefined) {
      patch.contactPhone = dto.contactPhone;
    }
    if (dto?.remark !== undefined) {
      patch.remark = dto.remark;
    }
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }
    patch.updatedAt = new Date();
    const updated: { id: number }[] = await this.db
      .update(financePorts)
      .set(patch)
      .where(and(eq(financePorts.id, id), isNull(financePorts.deletedAt)))
      .returning({ id: financePorts.id });
    if (updated.length === 0) {
      throw new NotFoundException('端口不存在');
    }
    return { success: true };
  }

  async setPortStatus(
    id: number,
    status: string,
  ): Promise<{ success: boolean }> {
    const updated: { id: number }[] = await this.db
      .update(financePorts)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(financePorts.id, id), isNull(financePorts.deletedAt)))
      .returning({ id: financePorts.id });
    if (updated.length === 0) {
      throw new NotFoundException('端口不存在');
    }
    return { success: true };
  }

  async setPortBalance(
    id: number,
    balance: number,
  ): Promise<{ success: boolean }> {
    const parsed: number = assertNonNegativeAmount(balance, '余额');
    const updated: { id: number }[] = await this.db
      .update(financePorts)
      .set({ balance: Math.abs(parsed).toFixed(2), updatedAt: new Date() })
      .where(and(eq(financePorts.id, id), isNull(financePorts.deletedAt)))
      .returning({ id: financePorts.id });
    if (updated.length === 0) {
      throw new NotFoundException('端口不存在');
    }
    return { success: true };
  }

  async deletePort(id: number): Promise<{ success: boolean }> {
    await this.findPort(id);
    const rebateRefs: { id: number }[] = await this.db
      .select({ id: financeRebates.id })
      .from(financeRebates)
      .where(
        and(
          eq(financeRebates.portId, id),
          isNull(financeRebates.deletedAt),
        ),
      )
      .limit(1);
    if (rebateRefs.length > 0) {
      throw new ConflictException('端口已被后返记录引用，无法删除');
    }
    const consumptionRefs: { id: number }[] = await this.db
      .select({ id: financeConsumptions.id })
      .from(financeConsumptions)
      .where(
        and(
          eq(financeConsumptions.portId, id),
          isNull(financeConsumptions.deletedAt),
        ),
      )
      .limit(1);
    if (consumptionRefs.length > 0) {
      throw new ConflictException('端口已被消耗记录引用，无法删除');
    }
    const now: Date = new Date();
    const updated: { id: number }[] = await this.db
      .update(financePorts)
      .set({ deletedAt: now, updatedAt: now })
      .where(and(eq(financePorts.id, id), isNull(financePorts.deletedAt)))
      .returning({ id: financePorts.id });
    if (updated.length === 0) {
      throw new NotFoundException('端口不存在');
    }
    return { success: true };
  }

  async listBankAccounts(params: {
    bankName?: string;
    accountType?: string;
    status?: string;
    page: number;
    pageSize: number;
  }): Promise<FinanceBankAccountListResult> {
    const conditions: SQL[] = [isNull(financeBankAccounts.deletedAt)];
    if (params.bankName) {
      conditions.push(
        ilike(financeBankAccounts.bankName, `%${params.bankName}%`),
      );
    }
    if (params.accountType) {
      conditions.push(
        eq(financeBankAccounts.accountType, params.accountType),
      );
    }
    if (params.status) {
      conditions.push(eq(financeBankAccounts.status, params.status));
    }
    const where = and(...conditions);
    const totalRows: { count: number | string }[] = await this.db
      .select({ count: count() })
      .from(financeBankAccounts)
      .where(where);
    const rows: BankAccountRow[] = await this.db
      .select()
      .from(financeBankAccounts)
      .where(where)
      .orderBy(desc(financeBankAccounts.id))
      .limit(params.pageSize)
      .offset((params.page - 1) * params.pageSize);
    return {
      items: rows.map((row: BankAccountRow) => mapFinanceBankAccount(row)),
      total: Number(totalRows[0]?.count ?? 0),
    };
  }

  async createBankAccount(
    dto: CreateFinanceBankAccountRequest,
  ): Promise<{ id: number }> {
    const bankName: string = assertRequiredString(dto?.bankName, '银行名称');
    const accountName: string = assertRequiredString(
      dto?.accountName,
      '账户名称',
    );
    const accountNo: string = assertRequiredString(dto?.accountNo, '银行账号');
    const accountType: string = assertRequiredString(
      dto?.accountType,
      '账户类型',
    );
    const balance: number =
      dto?.balance !== undefined
        ? assertNonNegativeAmount(dto.balance, '期初余额')
        : 0;
    const result = await insertWithSeqNo<{ id: number }>({
      db: this.db,
      table: financeBankAccounts,
      noColumn: financeBankAccounts.bankNo,
      prefix: BANK_NO_PREFIX,
      insert: (bankNo: string) =>
        this.db
          .insert(financeBankAccounts)
          .values({
            bankNo,
            bankName,
            accountName,
            accountNo,
            branch: dto.branch ?? '',
            accountType,
            balance: balance.toFixed(2),
            status: STATUS_ENABLED,
            remark: dto.remark ?? '',
          })
          .returning({ id: financeBankAccounts.id }),
    });
    return { id: result.id };
  }

  async updateBankAccount(
    id: number,
    dto: UpdateFinanceBankAccountRequest,
  ): Promise<{ success: boolean }> {
    const patch: Partial<BankAccountInsert> = {};
    if (dto?.bankName !== undefined) {
      patch.bankName = assertRequiredString(dto.bankName, '银行名称');
    }
    if (dto?.accountName !== undefined) {
      patch.accountName = assertRequiredString(dto.accountName, '账户名称');
    }
    if (dto?.accountNo !== undefined) {
      patch.accountNo = assertRequiredString(dto.accountNo, '银行账号');
    }
    if (dto?.branch !== undefined) {
      patch.branch = dto.branch;
    }
    if (dto?.accountType !== undefined) {
      patch.accountType = assertRequiredString(dto.accountType, '账户类型');
    }
    if (dto?.remark !== undefined) {
      patch.remark = dto.remark;
    }
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }
    patch.updatedAt = new Date();
    const updated: { id: number }[] = await this.db
      .update(financeBankAccounts)
      .set(patch)
      .where(
        and(
          eq(financeBankAccounts.id, id),
          isNull(financeBankAccounts.deletedAt),
        ),
      )
      .returning({ id: financeBankAccounts.id });
    if (updated.length === 0) {
      throw new NotFoundException('银行账户不存在');
    }
    return { success: true };
  }

  async setBankAccountStatus(
    id: number,
    status: string,
  ): Promise<{ success: boolean }> {
    const updated: { id: number }[] = await this.db
      .update(financeBankAccounts)
      .set({ status, updatedAt: new Date() })
      .where(
        and(
          eq(financeBankAccounts.id, id),
          isNull(financeBankAccounts.deletedAt),
        ),
      )
      .returning({ id: financeBankAccounts.id });
    if (updated.length === 0) {
      throw new NotFoundException('银行账户不存在');
    }
    return { success: true };
  }

  async setBankAccountBalance(
    id: number,
    balance: number,
  ): Promise<{ success: boolean }> {
    const parsed: number = assertNonNegativeAmount(balance, '余额');
    const updated: { id: number }[] = await this.db
      .update(financeBankAccounts)
      .set({ balance: Math.abs(parsed).toFixed(2), updatedAt: new Date() })
      .where(
        and(
          eq(financeBankAccounts.id, id),
          isNull(financeBankAccounts.deletedAt),
        ),
      )
      .returning({ id: financeBankAccounts.id });
    if (updated.length === 0) {
      throw new NotFoundException('银行账户不存在');
    }
    return { success: true };
  }

  async deleteBankAccount(id: number): Promise<{ success: boolean }> {
    await this.findBankAccount(id);
    const now: Date = new Date();
    const updated: { id: number }[] = await this.db
      .update(financeBankAccounts)
      .set({ deletedAt: now, updatedAt: now })
      .where(
        and(
          eq(financeBankAccounts.id, id),
          isNull(financeBankAccounts.deletedAt),
        ),
      )
      .returning({ id: financeBankAccounts.id });
    if (updated.length === 0) {
      throw new NotFoundException('银行账户不存在');
    }
    return { success: true };
  }

  private async findRecharge(id: number): Promise<RechargeRow> {
    const rows: RechargeRow[] = await this.db
      .select()
      .from(financeRecharges)
      .where(and(eq(financeRecharges.id, id), isNull(financeRecharges.deletedAt)));
    if (rows.length === 0) {
      throw new NotFoundException('充值单不存在');
    }
    return rows[0];
  }

  private async findRefund(id: number): Promise<RefundRow> {
    const rows: RefundRow[] = await this.db
      .select()
      .from(financeRefunds)
      .where(and(eq(financeRefunds.id, id), isNull(financeRefunds.deletedAt)));
    if (rows.length === 0) {
      throw new NotFoundException('退款单不存在');
    }
    return rows[0];
  }

  private async findCoinReturn(id: number): Promise<CoinReturnRow> {
    const rows: CoinReturnRow[] = await this.db
      .select()
      .from(financeCoinReturns)
      .where(
        and(
          eq(financeCoinReturns.id, id),
          isNull(financeCoinReturns.deletedAt),
        ),
      );
    if (rows.length === 0) {
      throw new NotFoundException('退币记录不存在');
    }
    return rows[0];
  }

  private async findPort(id: number): Promise<PortRow> {
    const rows: PortRow[] = await this.db
      .select()
      .from(financePorts)
      .where(and(eq(financePorts.id, id), isNull(financePorts.deletedAt)));
    if (rows.length === 0) {
      throw new NotFoundException('端口不存在');
    }
    return rows[0];
  }

  private async findBankAccount(id: number): Promise<BankAccountRow> {
    const rows: BankAccountRow[] = await this.db
      .select()
      .from(financeBankAccounts)
      .where(
        and(
          eq(financeBankAccounts.id, id),
          isNull(financeBankAccounts.deletedAt),
        ),
      );
    if (rows.length === 0) {
      throw new NotFoundException('银行账户不存在');
    }
    return rows[0];
  }
}
