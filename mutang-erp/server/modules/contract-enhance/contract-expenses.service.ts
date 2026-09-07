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
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  isNull,
  lt,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import {
  contract,
  contractExpenses,
  contractPaymentRecords,
  customer,
} from '@server/database/schema';
import type {
  ContractExpense,
  ContractExpenseDetail,
  ContractExpenseListParams,
  ContractExpenseListResult,
  ContractPaymentRecord,
  ContractPaymentStatus,
  CreateContractExpenseRequest,
  CreateContractPaymentRecordRequest,
  UpdateContractExpenseRequest,
} from '@shared/api.interface';
import { insertWithSeqNo } from '@server/modules/finance-core/fin-seq.util';
import { addDays, parseDateParam } from '@server/modules/finance-core/query.util';
import { publishSyncEvent } from '@server/modules/feishu-sync/sync-event.publisher';

type ExpenseRow = typeof contractExpenses.$inferSelect;

type PaymentRow = typeof contractPaymentRecords.$inferSelect;

interface ExpenseJoinRow {
  row: ExpenseRow;
  contractCode: string | null;
  customerName: string | null;
}

const EXPENSE_NO_PREFIX: string = 'HTFY';
const PAYMENT_RECORD_NO_PREFIX: string = 'FKJL';

const EXPENSE_TYPES: string[] = ['服务费', '制作费', '投放费', '差旅费', '其他'];
const PAYMENT_METHODS: string[] = ['银行转账', '支票', '现金', '其他'];

const UNPAID_STATUS: string = '未付款';
const PARTIAL_STATUS: string = '部分付款';
const PAID_STATUS: string = '已付款';

@Injectable()
export class ContractExpensesService {
  private readonly logger: Logger = new Logger(ContractExpensesService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
  ) {}

  private mapExpense(item: ExpenseJoinRow): ContractExpense {
    const row: ExpenseRow = item.row;
    return {
      id: row.id,
      expenseNo: row.expenseNo,
      contractId: row.contractId,
      contractCode: item.contractCode ?? '',
      customerName: item.customerName ?? '',
      expenseType: row.expenseType,
      amount: Number(row.amount),
      description: row.description ?? '',
      paymentStatus: row.paymentStatus as ContractPaymentStatus,
      paidAmount: Number(row.paidAmount),
      plannedPaymentDate: row.plannedPaymentDate
        ? row.plannedPaymentDate.toISOString()
        : null,
      actualPaymentDate: row.actualPaymentDate
        ? row.actualPaymentDate.toISOString()
        : null,
      paymentMethod: row.paymentMethod ?? '',
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private mapPayment(row: PaymentRow): ContractPaymentRecord {
    return {
      id: row.id,
      recordNo: row.recordNo,
      contractExpenseId: row.contractExpenseId,
      contractId: row.contractId,
      amount: Number(row.amount),
      paymentDate: row.paymentDate.toISOString(),
      paymentMethod: row.paymentMethod ?? '',
      bankAccount: row.bankAccount ?? '',
      voucherNo: row.voucherNo ?? '',
      remark: row.remark ?? '',
      createdAt: row.createdAt.toISOString(),
    };
  }

  private async loadJoinRow(id: number): Promise<ExpenseJoinRow> {
    const rows: ExpenseJoinRow[] = await this.db
      .select({
        row: contractExpenses,
        contractCode: contract.code,
        customerName: customer.name,
      })
      .from(contractExpenses)
      .leftJoin(contract, eq(contractExpenses.contractId, contract.id))
      .leftJoin(customer, eq(contract.customerId, customer.id))
      .where(and(eq(contractExpenses.id, id), isNull(contractExpenses.deletedAt)));
    if (rows.length === 0) {
      throw new NotFoundException('费用不存在');
    }
    return rows[0];
  }

  async findAll(
    params: ContractExpenseListParams,
  ): Promise<ContractExpenseListResult> {
    const page: number = Math.max(params.page ?? 1, 1);
    const pageSize: number = Math.min(Math.max(params.pageSize ?? 20, 1), 50);

    const conditions: SQL[] = [isNull(contractExpenses.deletedAt)];
    if (params.contractId) {
      conditions.push(eq(contractExpenses.contractId, params.contractId));
    }
    if (params.keyword) {
      const keyword: string = `%${params.keyword}%`;
      const keywordFilter: SQL | undefined = or(
        ilike(contractExpenses.expenseNo, keyword),
        ilike(contract.code, keyword),
        ilike(customer.name, keyword),
      );
      if (keywordFilter) {
        conditions.push(keywordFilter);
      }
    }
    if (params.expenseType) {
      conditions.push(eq(contractExpenses.expenseType, params.expenseType));
    }
    if (params.paymentStatus) {
      conditions.push(eq(contractExpenses.paymentStatus, params.paymentStatus));
    }
    if (params.dateFrom) {
      conditions.push(
        gte(contractExpenses.plannedPaymentDate, parseDateParam(params.dateFrom)),
      );
    }
    if (params.dateTo) {
      conditions.push(
        lt(
          contractExpenses.plannedPaymentDate,
          addDays(parseDateParam(params.dateTo), 1),
        ),
      );
    }
    const where: SQL | undefined = and(...conditions);

    const rows: ExpenseJoinRow[] = await this.db
      .select({
        row: contractExpenses,
        contractCode: contract.code,
        customerName: customer.name,
      })
      .from(contractExpenses)
      .leftJoin(contract, eq(contractExpenses.contractId, contract.id))
      .leftJoin(customer, eq(contract.customerId, customer.id))
      .where(where)
      .orderBy(desc(contractExpenses.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const totalResult: { count: number | string }[] = await this.db
      .select({ count: count() })
      .from(contractExpenses)
      .leftJoin(contract, eq(contractExpenses.contractId, contract.id))
      .leftJoin(customer, eq(contract.customerId, customer.id))
      .where(where);
    const total: number = Number(totalResult[0]?.count ?? 0);

    const items: ContractExpense[] = rows.map(
      (item: ExpenseJoinRow): ContractExpense => this.mapExpense(item),
    );
    const result = { items, total, page, pageSize };
    return result;
  }

  async detail(id: number): Promise<ContractExpenseDetail> {
    const expense: ContractExpense = this.mapExpense(await this.loadJoinRow(id));
    const paymentRecords: ContractPaymentRecord[] =
      await this.listPaymentRecords(id);
    return { ...expense, paymentRecords };
  }

  async create(
    dto: CreateContractExpenseRequest,
    userId: string,
  ): Promise<ContractExpense> {
    const contractRows: { id: string }[] = await this.db
      .select({ id: contract.id })
      .from(contract)
      .where(eq(contract.id, dto.contractId));
    if (contractRows.length === 0) {
      throw new NotFoundException('合同不存在');
    }
    if (!dto.expenseType || !EXPENSE_TYPES.includes(dto.expenseType)) {
      throw new BadRequestException(
        '费用类型必须为：服务费、制作费、投放费、差旅费、其他',
      );
    }
    const amount: number = Number(dto.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('费用金额必须大于 0');
    }
    const plannedPaymentDate: Date | null = dto.plannedPaymentDate
      ? parseDateParam(dto.plannedPaymentDate)
      : null;

    const result = await insertWithSeqNo<ExpenseRow>({
      db: this.db,
      table: contractExpenses,
      noColumn: contractExpenses.expenseNo,
      prefix: EXPENSE_NO_PREFIX,
      insert: (expenseNo: string): Promise<ExpenseRow[]> =>
        this.db
          .insert(contractExpenses)
          .values({
            expenseNo,
            contractId: dto.contractId,
            expenseType: dto.expenseType,
            amount: String(amount),
            description: dto.description ?? '',
            paymentStatus: UNPAID_STATUS,
            paidAmount: '0',
            plannedPaymentDate,
            paymentMethod: dto.paymentMethod ?? '',
            createdBy: userId,
          })
          .returning(),
    });
    this.logger.log(`合同费用创建成功: ${result.no}`);
    publishSyncEvent('contract_expenses', result.row.id, 'create');
    return this.mapExpense(await this.loadJoinRow(result.row.id));
  }

  async update(
    id: number,
    dto: UpdateContractExpenseRequest,
  ): Promise<ContractExpense> {
    const existingRows: ExpenseRow[] = await this.db
      .select()
      .from(contractExpenses)
      .where(and(eq(contractExpenses.id, id), isNull(contractExpenses.deletedAt)));
    if (existingRows.length === 0) {
      throw new NotFoundException('费用不存在');
    }
    const existing: ExpenseRow = existingRows[0];

    const patch: Partial<typeof contractExpenses.$inferInsert> = {};
    if (dto.expenseType !== undefined) {
      if (!EXPENSE_TYPES.includes(dto.expenseType)) {
        throw new BadRequestException(
          '费用类型必须为：服务费、制作费、投放费、差旅费、其他',
        );
      }
      patch.expenseType = dto.expenseType;
    }
    if (dto.amount !== undefined) {
      const amount: number = Number(dto.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new BadRequestException('费用金额必须大于 0');
      }
      if (amount < Number(existing.paidAmount)) {
        throw new ConflictException('金额不能小于已付金额');
      }
      patch.amount = String(amount);
    }
    if (dto.description !== undefined) {
      patch.description = dto.description;
    }
    if (dto.plannedPaymentDate !== undefined) {
      patch.plannedPaymentDate = dto.plannedPaymentDate
        ? parseDateParam(dto.plannedPaymentDate)
        : null;
    }
    if (dto.paymentMethod !== undefined) {
      patch.paymentMethod = dto.paymentMethod;
    }
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }
    patch.updatedAt = new Date();

    const updated: { id: number }[] = await this.db
      .update(contractExpenses)
      .set(patch)
      .where(and(eq(contractExpenses.id, id), isNull(contractExpenses.deletedAt)))
      .returning({ id: contractExpenses.id });
    if (updated.length === 0) {
      throw new NotFoundException('费用不存在');
    }
    this.logger.log(`合同费用更新成功: ${existing.expenseNo}`);
    publishSyncEvent('contract_expenses', id, 'update');
    return this.mapExpense(await this.loadJoinRow(id));
  }

  async remove(id: number): Promise<{ success: boolean }> {
    const existingRows: ExpenseRow[] = await this.db
      .select()
      .from(contractExpenses)
      .where(and(eq(contractExpenses.id, id), isNull(contractExpenses.deletedAt)));
    if (existingRows.length === 0) {
      throw new NotFoundException('费用不存在');
    }
    if (Number(existingRows[0].paidAmount) > 0) {
      throw new ConflictException('已付款的费用禁止删除');
    }
    const updated: { id: number }[] = await this.db
      .update(contractExpenses)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(contractExpenses.id, id), isNull(contractExpenses.deletedAt)))
      .returning({ id: contractExpenses.id });
    if (updated.length === 0) {
      throw new NotFoundException('费用不存在');
    }
    this.logger.log(`合同费用删除成功: ${existingRows[0].expenseNo}`);
    publishSyncEvent('contract_expenses', id, 'delete');
    return { success: true };
  }

  async listPaymentRecords(id: number): Promise<ContractPaymentRecord[]> {
    await this.loadJoinRow(id);
    const rows: PaymentRow[] = await this.db
      .select()
      .from(contractPaymentRecords)
      .where(
        and(
          eq(contractPaymentRecords.contractExpenseId, id),
          isNull(contractPaymentRecords.deletedAt),
        ),
      )
      .orderBy(asc(contractPaymentRecords.createdAt));
    return rows.map(
      (row: PaymentRow): ContractPaymentRecord => this.mapPayment(row),
    );
  }

  async addPaymentRecord(
    id: number,
    dto: CreateContractPaymentRecordRequest,
    userId: string,
  ): Promise<ContractPaymentRecord> {
    const amount: number = Number(dto.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('付款金额必须大于 0');
    }
    if (!dto.paymentDate) {
      throw new BadRequestException('请提供付款日期');
    }
    const paymentDate: Date = parseDateParam(dto.paymentDate);
    if (!dto.paymentMethod || !PAYMENT_METHODS.includes(dto.paymentMethod)) {
      throw new BadRequestException('付款方式必须为：银行转账、支票、现金、其他');
    }

    const insertedRow: PaymentRow = await this.db.transaction(async (tx) => {
      const expenseRows: {
        amount: string;
        paidAmount: string;
        contractId: string;
      }[] = await tx
        .select({
          amount: contractExpenses.amount,
          paidAmount: contractExpenses.paidAmount,
          contractId: contractExpenses.contractId,
        })
        .from(contractExpenses)
        .where(
          and(eq(contractExpenses.id, id), isNull(contractExpenses.deletedAt)),
        );
      if (expenseRows.length === 0) {
        throw new NotFoundException('费用不存在');
      }
      const expenseAmount: number = Number(expenseRows[0].amount);
      const newPaid: number = Number(expenseRows[0].paidAmount) + amount;

      let paymentStatus: string;
      let actualPaymentDate: Date | null;
      if (newPaid === expenseAmount) {
        paymentStatus = PAID_STATUS;
        actualPaymentDate = paymentDate;
      } else if (newPaid > 0) {
        paymentStatus = PARTIAL_STATUS;
        actualPaymentDate = null;
      } else {
        paymentStatus = UNPAID_STATUS;
        actualPaymentDate = null;
      }

      const updated: { id: number; paidAmount: string }[] = await tx
        .update(contractExpenses)
        .set({
          paidAmount: sql`${contractExpenses.paidAmount} + ${amount}`,
          paymentStatus,
          actualPaymentDate,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(contractExpenses.id, id),
            isNull(contractExpenses.deletedAt),
            sql`${contractExpenses.paidAmount} + ${amount} <= ${contractExpenses.amount}`,
          ),
        )
        .returning({
          id: contractExpenses.id,
          paidAmount: contractExpenses.paidAmount,
        });
      if (updated.length === 0) {
        throw new ConflictException('付款金额超过未付金额');
      }

      const result = await insertWithSeqNo<PaymentRow>({
        db: tx,
        table: contractPaymentRecords,
        noColumn: contractPaymentRecords.recordNo,
        prefix: PAYMENT_RECORD_NO_PREFIX,
        insert: (recordNo: string): Promise<PaymentRow[]> =>
          tx
            .insert(contractPaymentRecords)
            .values({
              recordNo,
              contractExpenseId: id,
              contractId: expenseRows[0].contractId,
              amount: String(amount),
              paymentDate,
              paymentMethod: dto.paymentMethod,
              bankAccount: dto.bankAccount ?? '',
              voucherNo: dto.voucherNo ?? '',
              remark: dto.remark ?? '',
              createdBy: userId,
            })
            .returning(),
      });
      return result.row;
    });
    this.logger.log(`付款登记成功: ${insertedRow.recordNo}`);
    publishSyncEvent('contract_expenses', id, 'update');
    return this.mapPayment(insertedRow);
  }

  async deletePaymentRecord(id: number): Promise<{ success: boolean }> {
    let updatedExpenseId: number = 0;
    const result = await this.db.transaction(async (tx) => {
      const recordRows: PaymentRow[] = await tx
        .select()
        .from(contractPaymentRecords)
        .where(
          and(
            eq(contractPaymentRecords.id, id),
            isNull(contractPaymentRecords.deletedAt),
          ),
        );
      if (recordRows.length === 0) {
        throw new NotFoundException('付款记录不存在');
      }
      const record: PaymentRow = recordRows[0];
      updatedExpenseId = record.contractExpenseId;
      const recordAmount: number = Number(record.amount);

      const expenseRows: { amount: string; paidAmount: string }[] = await tx
        .select({
          amount: contractExpenses.amount,
          paidAmount: contractExpenses.paidAmount,
        })
        .from(contractExpenses)
        .where(
          and(
            eq(contractExpenses.id, record.contractExpenseId),
            isNull(contractExpenses.deletedAt),
          ),
        );
      if (expenseRows.length === 0) {
        throw new NotFoundException('费用不存在');
      }

      const deleted: { id: number }[] = await tx
        .update(contractPaymentRecords)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(
          and(
            eq(contractPaymentRecords.id, id),
            isNull(contractPaymentRecords.deletedAt),
          ),
        )
        .returning({ id: contractPaymentRecords.id });
      if (deleted.length === 0) {
        throw new NotFoundException('付款记录不存在');
      }

      const newPaid: number = Number(expenseRows[0].paidAmount) - recordAmount;
      const expenseAmount: number = Number(expenseRows[0].amount);
      let paymentStatus: string;
      let actualPaymentDate: Date | null | undefined;
      if (newPaid <= 0) {
        paymentStatus = UNPAID_STATUS;
        actualPaymentDate = null;
      } else if (newPaid === expenseAmount) {
        paymentStatus = PAID_STATUS;
        actualPaymentDate = undefined;
      } else {
        paymentStatus = PARTIAL_STATUS;
        actualPaymentDate = null;
      }

      const updated: { id: number }[] = await tx
        .update(contractExpenses)
        .set({
          paidAmount: sql`${contractExpenses.paidAmount} - ${recordAmount}`,
          paymentStatus,
          updatedAt: new Date(),
          ...(actualPaymentDate !== undefined ? { actualPaymentDate } : {}),
        })
        .where(
          and(
            eq(contractExpenses.id, record.contractExpenseId),
            gte(contractExpenses.paidAmount, String(recordAmount)),
          ),
        )
        .returning({ id: contractExpenses.id });
      if (updated.length === 0) {
        throw new ConflictException('费用已付金额不足，无法回滚');
      }
      this.logger.log(`付款记录删除成功: ${record.recordNo}`);
      return { success: true };
    });
    publishSyncEvent('contract_expenses', updatedExpenseId, 'update');
    return result;
  }
}
