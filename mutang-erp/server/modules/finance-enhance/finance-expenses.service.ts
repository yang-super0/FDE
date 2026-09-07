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
  isNull,
  lt,
  sql,
} from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import {
  financeDeposits,
  financeExpenses,
  financeFees,
  financeIncomes,
} from '@server/database/schema';
import type {
  CreateFinanceDepositRequest,
  CreateFinanceExpenseRequest,
  CreateFinanceFeeRequest,
  CreateFinanceIncomeRequest,
  DepositReturnRequest,
  ExpensePayRequest,
  FeeReimburseRequest,
  FinanceDeposit,
  FinanceDepositListParams,
  FinanceDepositListResult,
  FinanceExpense,
  FinanceExpenseListParams,
  FinanceExpenseListResult,
  FinanceFee,
  FinanceFeeListParams,
  FinanceFeeListResult,
  FinanceIncome,
  FinanceIncomeListParams,
  FinanceIncomeListResult,
} from '@shared/api.interface';
import { insertWithSeqNo } from '../finance-core/fin-seq.util';
import { MessageNotificationService } from '../message-notification/message-notification.service';
import {
  assertPositiveAmount,
  decreaseAccountBalance,
  increaseAccountBalance,
} from './finance-enhance-shared.util';
import type { FinanceIncomeSummaryResult } from './finance-expenses.util';
import {
  DEPOSIT_COLLECTED,
  DEPOSIT_CONFISCATED,
  DEPOSIT_NO_PREFIX,
  DEPOSIT_PARTIAL_RETURNED,
  DEPOSIT_RETURNED,
  EXPENSE_APPROVED,
  EXPENSE_NO_PREFIX,
  EXPENSE_PAID,
  EXPENSE_PENDING,
  EXPENSE_REJECTED,
  FEE_APPROVED,
  FEE_DRAFT,
  FEE_EDITABLE_STATUSES,
  FEE_NO_PREFIX,
  FEE_PENDING,
  FEE_REIMBURSED,
  FEE_REJECTED,
  formatToday,
  INCOME_CONFIRMED,
  INCOME_NO_PREFIX,
  INCOME_PENDING,
  appendRejectReason,
  mapDeposit,
  mapExpense,
  mapFee,
  mapIncome,
  paginationFrom,
  parseAccountId,
  requireText,
} from './finance-expenses.util';

type IncomeRow = typeof financeIncomes.$inferSelect;
type ExpenseRow = typeof financeExpenses.$inferSelect;
type FeeRow = typeof financeFees.$inferSelect;
type DepositRow = typeof financeDeposits.$inferSelect;
type FeeInsert = typeof financeFees.$inferInsert;


@Injectable()
export class FinanceExpensesService {
  private readonly logger = new Logger(FinanceExpensesService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
    private readonly messageNotificationService: MessageNotificationService,
  ) {}

  async listIncomes(
    params: FinanceIncomeListParams,
  ): Promise<FinanceIncomeListResult> {
    const conditions: SQL[] = [isNull(financeIncomes.deletedAt)];
    if (params.incomeType) {
      conditions.push(eq(financeIncomes.incomeType, params.incomeType));
    }
    if (params.status) {
      conditions.push(eq(financeIncomes.status, params.status));
    }
    if (params.dateFrom) {
      conditions.push(gte(financeIncomes.incomeDate, params.dateFrom));
    }
    if (params.dateTo) {
      conditions.push(lt(financeIncomes.incomeDate, params.dateTo));
    }
    const where: SQL = and(...conditions);
    const { limit, offset } = paginationFrom(params);
    const [totalRows, rows]: [
      { count: number | string }[],
      IncomeRow[],
    ] = await Promise.all([
      this.db.select({ count: count() }).from(financeIncomes).where(where),
      this.db
        .select()
        .from(financeIncomes)
        .where(where)
        .orderBy(desc(financeIncomes.id))
        .limit(limit)
        .offset(offset),
    ]);
    return {
      items: rows.map((row: IncomeRow): FinanceIncome => mapIncome(row)),
      total: Number(totalRows[0]?.count ?? 0),
    };
  }

  async createIncome(
    dto: CreateFinanceIncomeRequest,
    operator: string,
  ): Promise<FinanceIncome> {
    assertPositiveAmount(dto?.amount, '金额');
    const incomeType: string = requireText(dto?.incomeType, '收入类型');
    const incomeDate: string = requireText(dto?.incomeDate, '收入日期');
    const accountId: number = parseAccountId(dto?.accountId);
    const amount: number = Number(dto.amount);
    const { row } = await insertWithSeqNo<IncomeRow>({
      db: this.db,
      table: financeIncomes,
      noColumn: financeIncomes.incomeNo,
      prefix: INCOME_NO_PREFIX,
      insert: async (no: string): Promise<IncomeRow[]> =>
        this.db
          .insert(financeIncomes)
          .values({
            incomeNo: no,
            incomeType,
            customerId: dto.customerId ?? '',
            customerName: dto.customerName ?? '',
            amount: amount.toFixed(2),
            accountId,
            incomeDate,
            relatedOrderNo: dto.relatedOrderNo ?? '',
            status: INCOME_PENDING,
            operator,
            remark: dto.remark ?? '',
          })
          .returning(),
    });
    return mapIncome(row);
  }

  async confirmIncome(id: number): Promise<FinanceIncome> {
    const confirmed: IncomeRow = await this.db.transaction(
      async (tx: PostgresJsDatabase): Promise<IncomeRow> => {
        const rows: IncomeRow[] = await tx
          .select()
          .from(financeIncomes)
          .where(
            and(
              eq(financeIncomes.id, id),
              isNull(financeIncomes.deletedAt),
            ),
          );
        if (rows.length === 0) {
          throw new NotFoundException('收入记录不存在');
        }
        const row: IncomeRow = rows[0];
        if (row.status !== INCOME_PENDING) {
          throw new ConflictException('仅待确认状态的收入可确认');
        }
        const amount: number = Number(row.amount);
        await increaseAccountBalance(tx, row.accountId, amount);
        const updated: IncomeRow[] = await tx
          .update(financeIncomes)
          .set({
            status: INCOME_CONFIRMED,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(financeIncomes.id, id),
              eq(financeIncomes.status, INCOME_PENDING),
            ),
          )
          .returning();
        if (updated.length === 0) {
          throw new ConflictException('收入状态已变更，请刷新后重试');
        }
        return updated[0];
      },
    );
    return mapIncome(confirmed);
  }

  async removeIncome(id: number): Promise<{ success: boolean }> {
    const rows: IncomeRow[] = await this.db
      .select()
      .from(financeIncomes)
      .where(and(eq(financeIncomes.id, id), isNull(financeIncomes.deletedAt)));
    if (rows.length === 0) {
      throw new NotFoundException('收入记录不存在');
    }
    if (rows[0].status === INCOME_CONFIRMED) {
      throw new ConflictException('已确认的收入不可删除');
    }
    const deleted: { id: number }[] = await this.db
      .update(financeIncomes)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(financeIncomes.id, id), isNull(financeIncomes.deletedAt)))
      .returning({ id: financeIncomes.id });
    if (deleted.length === 0) {
      throw new NotFoundException('收入记录不存在');
    }
    return { success: true };
  }

  async incomeSummary(params: {
    dateFrom?: string;
    dateTo?: string;
  }): Promise<FinanceIncomeSummaryResult> {
    const conditions: SQL[] = [isNull(financeIncomes.deletedAt)];
    if (params.dateFrom) {
      conditions.push(gte(financeIncomes.incomeDate, params.dateFrom));
    }
    if (params.dateTo) {
      conditions.push(lt(financeIncomes.incomeDate, params.dateTo));
    }
    const rows: {
      incomeType: string;
      totalAmount: string;
      count: number;
    }[] = await this.db
      .select({
        incomeType: financeIncomes.incomeType,
        totalAmount: sql<string>`coalesce(sum(${financeIncomes.amount}), 0)::numeric`,
        count: count(),
      })
      .from(financeIncomes)
      .where(and(...conditions))
      .groupBy(financeIncomes.incomeType);
    return {
      items: rows.map(
        (row: {
          incomeType: string;
          totalAmount: string;
          count: number;
        }): {
          incomeType: string;
          totalAmount: number;
          count: number;
        } => ({
          incomeType: row.incomeType,
          totalAmount: Number(row.totalAmount ?? 0),
          count: Number(row.count),
        }),
      ),
    };
  }

  async listExpenses(
    params: FinanceExpenseListParams,
  ): Promise<FinanceExpenseListResult> {
    const conditions: SQL[] = [isNull(financeExpenses.deletedAt)];
    if (params.expenseType) {
      conditions.push(eq(financeExpenses.expenseType, params.expenseType));
    }
    if (params.status) {
      conditions.push(eq(financeExpenses.status, params.status));
    }
    if (params.applicant) {
      conditions.push(ilike(financeExpenses.applicant, `%${params.applicant}%`));
    }
    const where: SQL = and(...conditions);
    const { limit, offset } = paginationFrom(params);
    const [totalRows, rows]: [
      { count: number | string }[],
      ExpenseRow[],
    ] = await Promise.all([
      this.db.select({ count: count() }).from(financeExpenses).where(where),
      this.db
        .select()
        .from(financeExpenses)
        .where(where)
        .orderBy(desc(financeExpenses.id))
        .limit(limit)
        .offset(offset),
    ]);
    return {
      items: rows.map((row: ExpenseRow): FinanceExpense => mapExpense(row)),
      total: Number(totalRows[0]?.count ?? 0),
    };
  }

  async createExpense(
    dto: CreateFinanceExpenseRequest,
    operator: string,
  ): Promise<FinanceExpense> {
    assertPositiveAmount(dto?.amount, '金额');
    const applicant: string = requireText(dto?.applicant, '申请人');
    const applyDate: string = requireText(dto?.applyDate, '申请日期');
    const amount: number = Number(dto.amount);
    const { row } = await insertWithSeqNo<ExpenseRow>({
      db: this.db,
      table: financeExpenses,
      noColumn: financeExpenses.expenseNo,
      prefix: EXPENSE_NO_PREFIX,
      insert: async (no: string): Promise<ExpenseRow[]> =>
        this.db
          .insert(financeExpenses)
          .values({
            expenseNo: no,
            expenseType: dto.expenseType ?? '其他',
            amount: amount.toFixed(2),
            applicant,
            applyDate,
            status: EXPENSE_PENDING,
            approver: '',
            operator,
            remark: dto.remark ?? '',
          })
          .returning(),
    });
    return mapExpense(row);
  }

  async approveExpense(
    id: number,
    approved: boolean,
    rejectReason: string | undefined,
    approver: string,
  ): Promise<{ success: boolean }> {
    const rows: ExpenseRow[] = await this.db
      .select()
      .from(financeExpenses)
      .where(and(eq(financeExpenses.id, id), isNull(financeExpenses.deletedAt)));
    if (rows.length === 0) {
      throw new NotFoundException('支出记录不存在');
    }
    const row: ExpenseRow = rows[0];
    if (row.status !== EXPENSE_PENDING) {
      throw new ConflictException('仅待审批的支出可审批');
    }
    const reason: string = rejectReason ?? '';
    if (!approved && reason === '') {
      throw new BadRequestException('驳回时必须填写驳回原因');
    }
    const status: string = approved
      ? EXPENSE_APPROVED
      : EXPENSE_REJECTED;
    const remark: string = approved
      ? row.remark
      : appendRejectReason(row.remark, reason);
    const now: Date = new Date();
    const updated: { id: number }[] = await this.db
      .update(financeExpenses)
      .set({
        status,
        approver,
        approveTime: now,
        remark,
        updatedAt: now,
      })
      .where(
        and(
          eq(financeExpenses.id, id),
          eq(financeExpenses.status, EXPENSE_PENDING),
          isNull(financeExpenses.deletedAt),
        ),
      )
      .returning({ id: financeExpenses.id });
    if (updated.length === 0) {
      throw new ConflictException('支出状态已变更，请刷新后重试');
    }
    if (row.createdBy) {
      try {
        await this.messageNotificationService.pushApprovalResult({
          title: approved ? '报销审批通过' : '报销被驳回',
          content: approved
            ? `您的报销单「${row.expenseNo}」（${row.expenseType}，金额 ${row.amount} 元）已审批通过。`
            : `您的报销单「${row.expenseNo}」被驳回：${reason}`,
          toUserId: row.createdBy,
          relatedModule: '财务',
          relatedBusinessId: String(id),
          relatedBusinessNo: row.expenseNo,
        });
      } catch (error: unknown) {
        this.logger.warn(
          `报销审批结果推送失败: ${JSON.stringify({ id, error: String(error) })}`,
        );
      }
    }
    return { success: true };
  }

  async payExpense(
    id: number,
    body: ExpensePayRequest,
  ): Promise<{ success: boolean }> {
    const accountId: number = parseAccountId(body?.accountId);
    const rows: ExpenseRow[] = await this.db
      .select()
      .from(financeExpenses)
      .where(and(eq(financeExpenses.id, id), isNull(financeExpenses.deletedAt)));
    if (rows.length === 0) {
      throw new NotFoundException('支出记录不存在');
    }
    const row: ExpenseRow = rows[0];
    if (row.status !== EXPENSE_APPROVED) {
      throw new ConflictException('仅审批通过的支出可支付');
    }
    const amount: number = Number(row.amount);
    const now: Date = new Date();
    await this.db.transaction(async (tx: PostgresJsDatabase): Promise<void> => {
      await decreaseAccountBalance(tx, accountId, amount);
      const updated: { id: number }[] = await tx
        .update(financeExpenses)
        .set({
          status: EXPENSE_PAID,
          payTime: now,
          accountId,
          updatedAt: now,
        })
        .where(
          and(
            eq(financeExpenses.id, id),
            eq(financeExpenses.status, EXPENSE_APPROVED),
          ),
        )
        .returning({ id: financeExpenses.id });
      if (updated.length === 0) {
        throw new ConflictException('支出状态已变更，请刷新后重试');
      }
    });
    return { success: true };
  }

  async removeExpense(id: number): Promise<{ success: boolean }> {
    const rows: ExpenseRow[] = await this.db
      .select()
      .from(financeExpenses)
      .where(and(eq(financeExpenses.id, id), isNull(financeExpenses.deletedAt)));
    if (rows.length === 0) {
      throw new NotFoundException('支出记录不存在');
    }
    if (rows[0].status === EXPENSE_PAID) {
      throw new ConflictException('已支付的支出不可删除');
    }
    const deleted: { id: number }[] = await this.db
      .update(financeExpenses)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(financeExpenses.id, id), isNull(financeExpenses.deletedAt)))
      .returning({ id: financeExpenses.id });
    if (deleted.length === 0) {
      throw new NotFoundException('支出记录不存在');
    }
    return { success: true };
  }

  async listFees(params: FinanceFeeListParams): Promise<FinanceFeeListResult> {
    const conditions: SQL[] = [isNull(financeFees.deletedAt)];
    if (params.feeType) {
      conditions.push(eq(financeFees.feeType, params.feeType));
    }
    if (params.status) {
      conditions.push(eq(financeFees.status, params.status));
    }
    if (params.applicant) {
      conditions.push(ilike(financeFees.applicant, `%${params.applicant}%`));
    }
    const where: SQL = and(...conditions);
    const { limit, offset } = paginationFrom(params);
    const [totalRows, rows]: [{ count: number | string }[], FeeRow[]] =
      await Promise.all([
        this.db.select({ count: count() }).from(financeFees).where(where),
        this.db
          .select()
          .from(financeFees)
          .where(where)
          .orderBy(desc(financeFees.id))
          .limit(limit)
          .offset(offset),
      ]);
    return {
      items: rows.map((row: FeeRow): FinanceFee => mapFee(row)),
      total: Number(totalRows[0]?.count ?? 0),
    };
  }

  async createFee(
    dto: CreateFinanceFeeRequest,
    operator: string,
  ): Promise<FinanceFee> {
    assertPositiveAmount(dto?.amount, '金额');
    const applicant: string = requireText(dto?.applicant, '申请人');
    const expenseDate: string = requireText(dto?.expenseDate, '费用日期');
    const amount: number = Number(dto.amount);
    const { row } = await insertWithSeqNo<FeeRow>({
      db: this.db,
      table: financeFees,
      noColumn: financeFees.feeNo,
      prefix: FEE_NO_PREFIX,
      insert: async (no: string): Promise<FeeRow[]> =>
        this.db
          .insert(financeFees)
          .values({
            feeNo: no,
            feeType: dto.feeType ?? '其他',
            applicant,
            department: dto.department ?? '',
            amount: amount.toFixed(2),
            expenseDate,
            invoiceNo: dto.invoiceNo ?? '',
            status: FEE_DRAFT,
            approver: operator,
            attachmentUrl: dto.attachmentUrl ?? '',
            remark: dto.remark ?? '',
          })
          .returning(),
    });
    return mapFee(row);
  }

  async updateFee(
    id: number,
    dto: Partial<CreateFinanceFeeRequest>,
  ): Promise<FinanceFee> {
    const rows: FeeRow[] = await this.db
      .select()
      .from(financeFees)
      .where(and(eq(financeFees.id, id), isNull(financeFees.deletedAt)));
    if (rows.length === 0) {
      throw new NotFoundException('报销记录不存在');
    }
    if (!FEE_EDITABLE_STATUSES.includes(rows[0].status)) {
      throw new ConflictException('仅待提交或已驳回的报销单可修改');
    }
    const patch: Partial<FeeInsert> = {};
    if (dto.feeType !== undefined) {
      patch.feeType = dto.feeType;
    }
    if (dto.applicant !== undefined) {
      patch.applicant = dto.applicant;
    }
    if (dto.department !== undefined) {
      patch.department = dto.department;
    }
    if (dto.amount !== undefined) {
      assertPositiveAmount(dto.amount, '金额');
      patch.amount = Number(dto.amount).toFixed(2);
    }
    if (dto.expenseDate !== undefined) {
      patch.expenseDate = dto.expenseDate;
    }
    if (dto.invoiceNo !== undefined) {
      patch.invoiceNo = dto.invoiceNo;
    }
    if (dto.attachmentUrl !== undefined) {
      patch.attachmentUrl = dto.attachmentUrl;
    }
    if (dto.remark !== undefined) {
      patch.remark = dto.remark;
    }
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }
    patch.updatedAt = new Date();
    const updated: FeeRow[] = await this.db
      .update(financeFees)
      .set(patch)
      .where(and(eq(financeFees.id, id), isNull(financeFees.deletedAt)))
      .returning();
    if (updated.length === 0) {
      throw new NotFoundException('报销记录不存在');
    }
    return mapFee(updated[0]);
  }

  async submitFee(id: number): Promise<{ success: boolean }> {
    const rows: FeeRow[] = await this.db
      .select()
      .from(financeFees)
      .where(and(eq(financeFees.id, id), isNull(financeFees.deletedAt)));
    if (rows.length === 0) {
      throw new NotFoundException('报销记录不存在');
    }
    if (rows[0].status !== FEE_DRAFT) {
      throw new ConflictException('仅待提交的报销单可提交');
    }
    const updated: { id: number }[] = await this.db
      .update(financeFees)
      .set({ status: FEE_PENDING, updatedAt: new Date() })
      .where(
        and(
          eq(financeFees.id, id),
          eq(financeFees.status, FEE_DRAFT),
          isNull(financeFees.deletedAt),
        ),
      )
      .returning({ id: financeFees.id });
    if (updated.length === 0) {
      throw new ConflictException('报销单状态已变更，请刷新后重试');
    }
    return { success: true };
  }

  async approveFee(
    id: number,
    approved: boolean,
    rejectReason: string | undefined,
    approver: string,
  ): Promise<{ success: boolean }> {
    const rows: FeeRow[] = await this.db
      .select()
      .from(financeFees)
      .where(and(eq(financeFees.id, id), isNull(financeFees.deletedAt)));
    if (rows.length === 0) {
      throw new NotFoundException('报销记录不存在');
    }
    const row: FeeRow = rows[0];
    if (row.status !== FEE_PENDING) {
      throw new ConflictException('仅待审批的报销单可审批');
    }
    const reason: string = rejectReason ?? '';
    if (!approved && reason === '') {
      throw new BadRequestException('驳回时必须填写驳回原因');
    }
    const status: string = approved ? FEE_APPROVED : FEE_REJECTED;
    const remark: string = approved
      ? row.remark
      : appendRejectReason(row.remark, reason);
    const now: Date = new Date();
    const updated: { id: number }[] = await this.db
      .update(financeFees)
      .set({
        status,
        approver,
        approveTime: now,
        remark,
        updatedAt: now,
      })
      .where(
        and(
          eq(financeFees.id, id),
          eq(financeFees.status, FEE_PENDING),
          isNull(financeFees.deletedAt),
        ),
      )
      .returning({ id: financeFees.id });
    if (updated.length === 0) {
      throw new ConflictException('报销单状态已变更，请刷新后重试');
    }
    return { success: true };
  }

  async reimburseFee(
    id: number,
    body: FeeReimburseRequest,
  ): Promise<{ success: boolean }> {
    const accountId: number = parseAccountId(body?.accountId);
    const rows: FeeRow[] = await this.db
      .select()
      .from(financeFees)
      .where(and(eq(financeFees.id, id), isNull(financeFees.deletedAt)));
    if (rows.length === 0) {
      throw new NotFoundException('报销记录不存在');
    }
    const row: FeeRow = rows[0];
    if (row.status !== FEE_APPROVED) {
      throw new ConflictException('仅审批通过的报销单可报销');
    }
    const amount: number = Number(row.amount);
    const now: Date = new Date();
    await this.db.transaction(async (tx: PostgresJsDatabase): Promise<void> => {
      await decreaseAccountBalance(tx, accountId, amount);
      const updated: { id: number }[] = await tx
        .update(financeFees)
        .set({
          status: FEE_REIMBURSED,
          reimburseTime: now,
          accountId,
          updatedAt: now,
        })
        .where(
          and(
            eq(financeFees.id, id),
            eq(financeFees.status, FEE_APPROVED),
          ),
        )
        .returning({ id: financeFees.id });
      if (updated.length === 0) {
        throw new ConflictException('报销单状态已变更，请刷新后重试');
      }
    });
    return { success: true };
  }

  async removeFee(id: number): Promise<{ success: boolean }> {
    const rows: FeeRow[] = await this.db
      .select()
      .from(financeFees)
      .where(and(eq(financeFees.id, id), isNull(financeFees.deletedAt)));
    if (rows.length === 0) {
      throw new NotFoundException('报销记录不存在');
    }
    if (rows[0].status === FEE_REIMBURSED) {
      throw new ConflictException('已报销的报销单不可删除');
    }
    const deleted: { id: number }[] = await this.db
      .update(financeFees)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(financeFees.id, id), isNull(financeFees.deletedAt)))
      .returning({ id: financeFees.id });
    if (deleted.length === 0) {
      throw new NotFoundException('报销记录不存在');
    }
    return { success: true };
  }

  async listDeposits(
    params: FinanceDepositListParams,
  ): Promise<FinanceDepositListResult> {
    const conditions: SQL[] = [isNull(financeDeposits.deletedAt)];
    if (params.customerName) {
      conditions.push(
        ilike(financeDeposits.customerName, `%${params.customerName}%`),
      );
    }
    if (params.depositType) {
      conditions.push(eq(financeDeposits.depositType, params.depositType));
    }
    if (params.status) {
      conditions.push(eq(financeDeposits.status, params.status));
    }
    const where: SQL = and(...conditions);
    const { limit, offset } = paginationFrom(params);
    const [totalRows, rows]: [
      { count: number | string }[],
      DepositRow[],
    ] = await Promise.all([
      this.db.select({ count: count() }).from(financeDeposits).where(where),
      this.db
        .select()
        .from(financeDeposits)
        .where(where)
        .orderBy(desc(financeDeposits.id))
        .limit(limit)
        .offset(offset),
    ]);
    return {
      items: rows.map((row: DepositRow): FinanceDeposit => mapDeposit(row)),
      total: Number(totalRows[0]?.count ?? 0),
    };
  }

  async createDeposit(
    dto: CreateFinanceDepositRequest,
    operator: string,
  ): Promise<FinanceDeposit> {
    assertPositiveAmount(dto?.amount, '金额');
    const customerId: string = requireText(dto?.customerId, '客户 ID');
    const customerName: string = requireText(dto?.customerName, '客户名称');
    const collectDate: string = requireText(dto?.collectDate, '收取日期');
    const collectAccount: string = requireText(dto?.collectAccount, '收款账户');
    const amount: number = Number(dto.amount);
    const { row } = await insertWithSeqNo<DepositRow>({
      db: this.db,
      table: financeDeposits,
      noColumn: financeDeposits.depositNo,
      prefix: DEPOSIT_NO_PREFIX,
      insert: async (no: string): Promise<DepositRow[]> =>
        this.db
          .insert(financeDeposits)
          .values({
            depositNo: no,
            customerId,
            customerName,
            depositType: dto.depositType ?? '保证金',
            amount: amount.toFixed(2),
            collectDate,
            collectAccount,
            status: DEPOSIT_COLLECTED,
            returnedAmount: '0.00',
            returnAccount: '',
            operator,
            remark: dto.remark ?? '',
          })
          .returning(),
    });
    return mapDeposit(row);
  }

  async returnDeposit(
    id: number,
    body: DepositReturnRequest,
  ): Promise<FinanceDeposit> {
    assertPositiveAmount(body?.returnAmount, '退还金额');
    const returnAmount: number = Number(body.returnAmount);
    const accountId: number = parseAccountId(body?.accountId);
    const returnDate: string = body.returnDate ?? formatToday();
    const returned: DepositRow = await this.db.transaction(
      async (tx: PostgresJsDatabase): Promise<DepositRow> => {
        const updated: DepositRow[] = await tx
          .update(financeDeposits)
          .set({
            returnedAmount: sql`${financeDeposits.returnedAmount} + ${returnAmount.toFixed(2)}`,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(financeDeposits.id, id),
              isNull(financeDeposits.deletedAt),
              sql`${financeDeposits.returnedAmount} + ${returnAmount.toFixed(2)} <= ${financeDeposits.amount}`,
            ),
          )
          .returning();
        if (updated.length === 0) {
          const exists: { id: number }[] = await tx
            .select({ id: financeDeposits.id })
            .from(financeDeposits)
            .where(eq(financeDeposits.id, id));
          if (exists.length === 0) {
            throw new NotFoundException('保证金记录不存在');
          }
          throw new ConflictException('退还金额超出保证金金额');
        }
        await decreaseAccountBalance(tx, accountId, returnAmount);
        const newReturned: number = Number(updated[0].returnedAmount);
        const total: number = Number(updated[0].amount);
        const status: string =
          newReturned >= total ? DEPOSIT_RETURNED : DEPOSIT_PARTIAL_RETURNED;
        const finalRows: DepositRow[] = await tx
          .update(financeDeposits)
          .set({
            status,
            returnDate,
            updatedAt: new Date(),
          })
          .where(eq(financeDeposits.id, id))
          .returning();
        return finalRows[0];
      },
    );
    return mapDeposit(returned);
  }

  async confiscateDeposit(id: number): Promise<FinanceDeposit> {
    const rows: DepositRow[] = await this.db
      .select()
      .from(financeDeposits)
      .where(and(eq(financeDeposits.id, id), isNull(financeDeposits.deletedAt)));
    if (rows.length === 0) {
      throw new NotFoundException('保证金记录不存在');
    }
    if (
      rows[0].status === DEPOSIT_RETURNED ||
      rows[0].status === DEPOSIT_CONFISCATED
    ) {
      throw new ConflictException('已退还或已没收的保证金不可没收');
    }
    const updated: DepositRow[] = await this.db
      .update(financeDeposits)
      .set({ status: DEPOSIT_CONFISCATED, updatedAt: new Date() })
      .where(and(eq(financeDeposits.id, id), isNull(financeDeposits.deletedAt)))
      .returning();
    if (updated.length === 0) {
      throw new NotFoundException('保证金记录不存在');
    }
    return mapDeposit(updated[0]);
  }

  async removeDeposit(id: number): Promise<{ success: boolean }> {
    const rows: DepositRow[] = await this.db
      .select()
      .from(financeDeposits)
      .where(and(eq(financeDeposits.id, id), isNull(financeDeposits.deletedAt)));
    if (rows.length === 0) {
      throw new NotFoundException('保证金记录不存在');
    }
    const row: DepositRow = rows[0];
    if (
      row.status === DEPOSIT_RETURNED ||
      row.status === DEPOSIT_CONFISCATED ||
      Number(row.returnedAmount) > 0
    ) {
      throw new ConflictException('已发生退还或没收的保证金不可删除');
    }
    const deleted: { id: number }[] = await this.db
      .update(financeDeposits)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(financeDeposits.id, id), isNull(financeDeposits.deletedAt)))
      .returning({ id: financeDeposits.id });
    if (deleted.length === 0) {
      throw new NotFoundException('保证金记录不存在');
    }
    return { success: true };
  }
}
