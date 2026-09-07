import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { and, count, desc, eq, ilike, inArray, isNull } from 'drizzle-orm';
import {
  financeAccounts,
  financePayments,
  financeReceipts,
} from '@server/database/schema';
import type {
  CreateFinanceAccountRequest,
  FinanceAccount,
  FinanceAccountListParams,
  FinanceAccountListResult,
  FinanceAccountTxn,
  PageResult,
  UpdateFinanceAccountRequest,
} from '@shared/api.interface';

type AccountRow = typeof financeAccounts.$inferSelect;
type AccountInsert = typeof financeAccounts.$inferInsert;
type ReceiptRow = typeof financeReceipts.$inferSelect;
type PaymentRow = typeof financePayments.$inferSelect;

const ACCOUNT_ENABLED_STATUS: string = '启用';
const ACCOUNT_DISABLED_STATUS: string = '停用';
const ACCOUNT_STATUSES: string[] = [
  ACCOUNT_ENABLED_STATUS,
  ACCOUNT_DISABLED_STATUS,
];
/** 计入流水的收款状态 */
const RECEIPT_TXN_STATUSES: string[] = ['已确认', '已核销'];
/** 计入流水的付款状态 */
const PAYMENT_TXN_STATUS: string = '已付款';

@Injectable()
export class FinanceAccountsService {
  private readonly logger: Logger = new Logger(FinanceAccountsService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
  ) {}

  private mapAccount(row: AccountRow): FinanceAccount {
    return {
      id: row.id,
      accountName: row.accountName,
      accountType: row.accountType ?? '',
      bankName: row.bankName ?? '',
      bankAccount: row.bankAccount ?? '',
      balance: Number(row.balance),
      initialBalance: Number(row.initialBalance),
      status: row.status,
      remark: row.remark ?? '',
      createdAt: row.createdAt.toISOString(),
    };
  }

  async findAll(
    params: FinanceAccountListParams,
  ): Promise<FinanceAccountListResult> {
    const page: number = Math.max(params.page ?? 1, 1);
    const pageSize: number = Math.min(Math.max(params.pageSize ?? 20, 1), 50);

    const conditions = [isNull(financeAccounts.deletedAt)];
    if (params.accountName) {
      conditions.push(
        ilike(financeAccounts.accountName, `%${params.accountName}%`),
      );
    }
    if (params.accountType) {
      conditions.push(eq(financeAccounts.accountType, params.accountType));
    }
    if (params.status) {
      conditions.push(eq(financeAccounts.status, params.status));
    }
    const where = and(...conditions);

    const rows: AccountRow[] = await this.db
      .select()
      .from(financeAccounts)
      .where(where)
      .orderBy(desc(financeAccounts.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const totalResult: { count: number | string }[] = await this.db
      .select({ count: count() })
      .from(financeAccounts)
      .where(where);
    const total: number = Number(totalResult[0]?.count ?? 0);

    return {
      items: rows.map((row: AccountRow): FinanceAccount =>
        this.mapAccount(row),
      ),
      total,
    };
  }

  async create(dto: CreateFinanceAccountRequest): Promise<FinanceAccount> {
    if (!dto.accountName || dto.accountName.trim().length === 0) {
      throw new BadRequestException('请填写账户名称');
    }
    const initialBalance: number = Number(dto.initialBalance ?? 0);
    if (!Number.isFinite(initialBalance) || initialBalance < 0) {
      throw new BadRequestException('期初余额必须为不小于 0 的数字');
    }

    const values: AccountInsert = {
      accountName: dto.accountName.trim(),
      accountType: dto.accountType ?? '银行账户',
      bankName: dto.bankName ?? '',
      bankAccount: dto.bankAccount ?? '',
      balance: String(initialBalance),
      initialBalance: String(initialBalance),
      status: ACCOUNT_ENABLED_STATUS,
      remark: dto.remark ?? '',
    };
    const inserted: AccountRow[] = await this.db
      .insert(financeAccounts)
      .values(values)
      .returning();
    this.logger.log(`资金账户创建成功: ${inserted[0].accountName}`);
    return this.mapAccount(inserted[0]);
  }

  /** 编辑不允许改 balance / initialBalance / status */
  async update(
    id: number,
    dto: UpdateFinanceAccountRequest,
  ): Promise<{ success: boolean }> {
    const rows: AccountRow[] = await this.db
      .select()
      .from(financeAccounts)
      .where(
        and(eq(financeAccounts.id, id), isNull(financeAccounts.deletedAt)),
      );
    if (rows.length === 0) {
      throw new NotFoundException('资金账户不存在');
    }

    const patch: Partial<AccountInsert> = {};
    if (dto.accountName !== undefined) {
      if (dto.accountName.trim().length === 0) {
        throw new BadRequestException('账户名称不能为空');
      }
      patch.accountName = dto.accountName.trim();
    }
    if (dto.accountType !== undefined) {
      patch.accountType = dto.accountType;
    }
    if (dto.bankName !== undefined) {
      patch.bankName = dto.bankName;
    }
    if (dto.bankAccount !== undefined) {
      patch.bankAccount = dto.bankAccount;
    }
    if (dto.remark !== undefined) {
      patch.remark = dto.remark;
    }
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }
    patch.updatedAt = new Date();

    const updated: { id: number }[] = await this.db
      .update(financeAccounts)
      .set(patch)
      .where(
        and(eq(financeAccounts.id, id), isNull(financeAccounts.deletedAt)),
      )
      .returning({ id: financeAccounts.id });
    if (updated.length === 0) {
      throw new NotFoundException('资金账户不存在');
    }
    return { success: true };
  }

  /** 启用/停用（未完结流水不阻止，简单置状态） */
  async setStatus(id: number, status: string): Promise<{ success: boolean }> {
    if (!ACCOUNT_STATUSES.includes(status)) {
      throw new BadRequestException('账户状态只能是 启用 或 停用');
    }
    const rows: AccountRow[] = await this.db
      .select()
      .from(financeAccounts)
      .where(
        and(eq(financeAccounts.id, id), isNull(financeAccounts.deletedAt)),
      );
    if (rows.length === 0) {
      throw new NotFoundException('资金账户不存在');
    }

    const updated: { id: number }[] = await this.db
      .update(financeAccounts)
      .set({ status, updatedAt: new Date() })
      .where(
        and(eq(financeAccounts.id, id), isNull(financeAccounts.deletedAt)),
      )
      .returning({ id: financeAccounts.id });
    if (updated.length === 0) {
      throw new NotFoundException('资金账户不存在');
    }
    return { success: true };
  }

  /**
   * 账户流水：收款（已确认/已核销）+ 付款（已付款）合并，按时间倒序分页
   */
  async transactions(
    id: number,
    page: number,
    pageSize: number,
  ): Promise<PageResult<FinanceAccountTxn>> {
    const rows: AccountRow[] = await this.db
      .select()
      .from(financeAccounts)
      .where(
        and(eq(financeAccounts.id, id), isNull(financeAccounts.deletedAt)),
      );
    if (rows.length === 0) {
      throw new NotFoundException('资金账户不存在');
    }

    const receiptRows: ReceiptRow[] = await this.db
      .select()
      .from(financeReceipts)
      .where(
        and(
          eq(financeReceipts.accountId, id),
          inArray(financeReceipts.status, RECEIPT_TXN_STATUSES),
          isNull(financeReceipts.deletedAt),
        ),
      );
    const paymentRows: PaymentRow[] = await this.db
      .select()
      .from(financePayments)
      .where(
        and(
          eq(financePayments.accountId, id),
          eq(financePayments.status, PAYMENT_TXN_STATUS),
          isNull(financePayments.deletedAt),
        ),
      );

    const txns: FinanceAccountTxn[] = [
      ...receiptRows.map((row: ReceiptRow): FinanceAccountTxn => ({
        direction: '收入',
        bizNo: row.receiptNo,
        bizType: '收款',
        amount: Number(row.amount),
        counterparty: row.customerName,
        status: row.status,
        occurredAt: (row.receiptDate ?? row.createdAt).toISOString(),
      })),
      ...paymentRows.map((row: PaymentRow): FinanceAccountTxn => ({
        direction: '支出',
        bizNo: row.paymentNo,
        bizType: '付款',
        amount: Number(row.amount),
        counterparty: row.payeeName,
        status: row.status,
        occurredAt: (row.paymentDate ?? row.createdAt).toISOString(),
      })),
    ].sort(
      (a: FinanceAccountTxn, b: FinanceAccountTxn): number =>
        Date.parse(b.occurredAt) - Date.parse(a.occurredAt),
    );

    const start: number = (page - 1) * pageSize;
    return { items: txns.slice(start, start + pageSize), total: txns.length };
  }
}
