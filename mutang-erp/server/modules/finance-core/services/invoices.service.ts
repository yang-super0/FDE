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
import { financeInvoices } from '@server/database/schema';
import type {
  CreateFinanceInvoiceRequest,
  FinanceInvoice,
  FinanceInvoiceListParams,
  FinanceInvoiceListResult,
  SendFinanceInvoiceRequest,
  UpdateFinanceInvoiceRequest,
} from '@shared/api.interface';
import { INVOICE_NO_PREFIX, insertWithSeqNo } from '../fin-seq.util';
import {
  addDays,
  parseAmountParam,
  parseDateParam,
  round2,
} from '../query.util';
import { publishSyncEvent } from '@server/modules/feishu-sync/sync-event.publisher';

type InvoiceRow = typeof financeInvoices.$inferSelect;
type InvoiceInsert = typeof financeInvoices.$inferInsert;

const PENDING_ISSUE_STATUS: string = '待开具';
const ISSUED_STATUS: string = '已开具';
const SENT_STATUS: string = '已寄出';
const RECEIVED_STATUS: string = '已收讫';
const VOIDED_STATUS: string = '已作废';
const VOIDABLE_STATUSES: string[] = [
  PENDING_ISSUE_STATUS,
  ISSUED_STATUS,
  SENT_STATUS,
];

@Injectable()
export class InvoicesService {
  private readonly logger: Logger = new Logger(InvoicesService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
  ) {}

  private mapInvoice(row: InvoiceRow): FinanceInvoice {
    return {
      id: row.id,
      invoiceNo: row.invoiceNo,
      invoiceType: row.invoiceType ?? '',
      title: row.title,
      taxNumber: row.taxNumber ?? '',
      amount: Number(row.amount),
      taxAmount: Number(row.taxAmount ?? '0'),
      totalAmount: Number(row.totalAmount ?? '0'),
      invoiceDate: (row.invoiceDate ?? row.createdAt).toISOString(),
      customerName: row.customerName ?? '',
      status: row.status,
      drawer: row.drawer ?? '',
      expressNo: row.expressNo ?? '',
      expressDate: row.expressDate ? row.expressDate.toISOString() : null,
      remark: row.remark ?? '',
      createdAt: row.createdAt.toISOString(),
    };
  }

  private parseTaxAmount(value: number | undefined): number {
    const parsed: number = Number(value ?? 0);
    if (!Number.isFinite(parsed) || parsed < 0) {
      throw new BadRequestException('税额必须为不小于 0 的数字');
    }
    return parsed;
  }

  async findAll(
    params: FinanceInvoiceListParams,
  ): Promise<FinanceInvoiceListResult> {
    const page: number = Math.max(params.page ?? 1, 1);
    const pageSize: number = Math.min(Math.max(params.pageSize ?? 20, 1), 50);

    const conditions = [isNull(financeInvoices.deletedAt)];
    if (params.invoiceNo) {
      conditions.push(ilike(financeInvoices.invoiceNo, `%${params.invoiceNo}%`));
    }
    if (params.title) {
      conditions.push(ilike(financeInvoices.title, `%${params.title}%`));
    }
    if (params.customerName) {
      conditions.push(
        ilike(financeInvoices.customerName, `%${params.customerName}%`),
      );
    }
    if (params.invoiceType) {
      conditions.push(eq(financeInvoices.invoiceType, params.invoiceType));
    }
    if (params.status) {
      conditions.push(eq(financeInvoices.status, params.status));
    }
    if (params.startDate) {
      conditions.push(
        gte(financeInvoices.invoiceDate, parseDateParam(params.startDate)),
      );
    }
    if (params.endDate) {
      conditions.push(
        lt(
          financeInvoices.invoiceDate,
          addDays(parseDateParam(params.endDate), 1),
        ),
      );
    }
    const where = and(...conditions);

    const rows: InvoiceRow[] = await this.db
      .select()
      .from(financeInvoices)
      .where(where)
      .orderBy(desc(financeInvoices.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const totalResult: { count: number | string }[] = await this.db
      .select({ count: count() })
      .from(financeInvoices)
      .where(where);
    const total: number = Number(totalResult[0]?.count ?? 0);

    return {
      items: rows.map((row: InvoiceRow): FinanceInvoice =>
        this.mapInvoice(row),
      ),
      total,
    };
  }

  async detail(id: number): Promise<FinanceInvoice> {
    const rows: InvoiceRow[] = await this.db
      .select()
      .from(financeInvoices)
      .where(
        and(eq(financeInvoices.id, id), isNull(financeInvoices.deletedAt)),
      );
    if (rows.length === 0) {
      throw new NotFoundException('发票不存在');
    }
    return this.mapInvoice(rows[0]);
  }

  /** 创建：totalAmount = amount + (taxAmount ?? 0) */
  async create(dto: CreateFinanceInvoiceRequest): Promise<FinanceInvoice> {
    if (!dto.title || dto.title.trim().length === 0) {
      throw new BadRequestException('请填写发票抬头');
    }
    const amount: number = parseAmountParam(dto.amount);
    const taxAmount: number = this.parseTaxAmount(dto.taxAmount);
    const totalAmount: number = round2(amount + taxAmount);

    const result = await insertWithSeqNo<InvoiceRow>({
      db: this.db,
      table: financeInvoices,
      noColumn: financeInvoices.invoiceNo,
      prefix: INVOICE_NO_PREFIX,
      insert: (invoiceNo: string): Promise<InvoiceRow[]> =>
        this.db
          .insert(financeInvoices)
          .values({
            invoiceNo,
            invoiceType: dto.invoiceType ?? '增值税普通发票',
            title: dto.title.trim(),
            taxNumber: dto.taxNumber ?? '',
            amount: String(amount),
            taxAmount: String(taxAmount),
            totalAmount: String(totalAmount),
            invoiceDate: dto.invoiceDate
              ? parseDateParam(dto.invoiceDate)
              : new Date(),
            customerName: dto.customerName ?? '',
            status: PENDING_ISSUE_STATUS,
            remark: dto.remark ?? '',
          })
          .returning(),
    });
    this.logger.log(`发票创建成功: ${result.no}`);
    publishSyncEvent('finance_invoices', result.id, 'create');
    return this.mapInvoice(result.row);
  }

  /** 仅 待开具 可编辑 */
  async update(
    id: number,
    dto: UpdateFinanceInvoiceRequest,
  ): Promise<{ success: boolean }> {
    const rows: InvoiceRow[] = await this.db
      .select()
      .from(financeInvoices)
      .where(
        and(eq(financeInvoices.id, id), isNull(financeInvoices.deletedAt)),
      );
    if (rows.length === 0) {
      throw new NotFoundException('发票不存在');
    }
    if (rows[0].status !== PENDING_ISSUE_STATUS) {
      throw new BadRequestException('仅待开具的发票可以编辑');
    }

    const patch: Partial<InvoiceInsert> = {};
    if (dto.title !== undefined) {
      if (dto.title.trim().length === 0) {
        throw new BadRequestException('发票抬头不能为空');
      }
      patch.title = dto.title.trim();
    }
    if (dto.invoiceType !== undefined) {
      patch.invoiceType = dto.invoiceType;
    }
    if (dto.taxNumber !== undefined) {
      patch.taxNumber = dto.taxNumber;
    }
    if (dto.customerName !== undefined) {
      patch.customerName = dto.customerName;
    }
    if (dto.invoiceDate !== undefined) {
      patch.invoiceDate = parseDateParam(dto.invoiceDate);
    }
    if (dto.remark !== undefined) {
      patch.remark = dto.remark;
    }

    let finalAmount: number = Number(rows[0].amount);
    let finalTaxAmount: number = Number(rows[0].taxAmount ?? '0');
    if (dto.amount !== undefined) {
      finalAmount = parseAmountParam(dto.amount);
      patch.amount = String(finalAmount);
    }
    if (dto.taxAmount !== undefined) {
      finalTaxAmount = this.parseTaxAmount(dto.taxAmount);
      patch.taxAmount = String(finalTaxAmount);
    }
    if (dto.amount !== undefined || dto.taxAmount !== undefined) {
      patch.totalAmount = String(round2(finalAmount + finalTaxAmount));
    }
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }
    patch.updatedAt = new Date();

    const updated: { id: number }[] = await this.db
      .update(financeInvoices)
      .set(patch)
      .where(
        and(eq(financeInvoices.id, id), isNull(financeInvoices.deletedAt)),
      )
      .returning({ id: financeInvoices.id });
    if (updated.length === 0) {
      throw new NotFoundException('发票不存在');
    }
    publishSyncEvent('finance_invoices', updated[0].id, 'update');
    return { success: true };
  }

  /** 软删除：仅 待开具 可删 */
  async remove(id: number): Promise<{ success: boolean }> {
    const rows: InvoiceRow[] = await this.db
      .select()
      .from(financeInvoices)
      .where(
        and(eq(financeInvoices.id, id), isNull(financeInvoices.deletedAt)),
      );
    if (rows.length === 0) {
      throw new NotFoundException('发票不存在');
    }
    if (rows[0].status !== PENDING_ISSUE_STATUS) {
      throw new BadRequestException('仅待开具的发票可以删除');
    }

    const now: Date = new Date();
    const updated: { id: number }[] = await this.db
      .update(financeInvoices)
      .set({ deletedAt: now, updatedAt: now })
      .where(
        and(eq(financeInvoices.id, id), isNull(financeInvoices.deletedAt)),
      )
      .returning({ id: financeInvoices.id });
    if (updated.length === 0) {
      throw new NotFoundException('发票不存在');
    }
    publishSyncEvent('finance_invoices', updated[0].id, 'delete');
    return { success: true };
  }

  /** 开具：待开具 → 已开具，写 drawer=当前用户 */
  async issue(id: number, userId: string): Promise<{ success: boolean }> {
    const now: Date = new Date();
    const updated: { id: number }[] = await this.db
      .update(financeInvoices)
      .set({
        status: ISSUED_STATUS,
        drawer: userId,
        updatedAt: now,
      })
      .where(
        and(
          eq(financeInvoices.id, id),
          eq(financeInvoices.status, PENDING_ISSUE_STATUS),
          isNull(financeInvoices.deletedAt),
        ),
      )
      .returning({ id: financeInvoices.id });
    if (updated.length === 0) {
      await this.throwInvalidTransition(id, '开具');
    }
    publishSyncEvent('finance_invoices', updated[0].id, 'update');
    return { success: true };
  }

  /** 批量开具：事务内仅处理 待开具 */
  async batchIssue(ids: number[], userId: string): Promise<{ issued: number }> {
    let issued: number = 0;
    const syncedIds: number[] = [];
    await this.db.transaction(async (tx) => {
      const rows: InvoiceRow[] = await tx
        .select()
        .from(financeInvoices)
        .where(
          and(
            inArray(financeInvoices.id, ids),
            eq(financeInvoices.status, PENDING_ISSUE_STATUS),
            isNull(financeInvoices.deletedAt),
          ),
        );
      const now: Date = new Date();
      for (const row of rows) {
        const updated: { id: number }[] = await tx
          .update(financeInvoices)
          .set({ status: ISSUED_STATUS, drawer: userId, updatedAt: now })
          .where(
            and(
              eq(financeInvoices.id, row.id),
              eq(financeInvoices.status, PENDING_ISSUE_STATUS),
            ),
          )
          .returning({ id: financeInvoices.id });
        if (updated.length > 0) {
          syncedIds.push(row.id);
          issued += 1;
        }
      }
    });
    syncedIds.forEach((invoiceId: number) => {
      publishSyncEvent('finance_invoices', invoiceId, 'update');
    });
    this.logger.log(`发票批量开具完成: ${String(issued)} 条`);
    return { issued };
  }

  /** 寄出：已开具 → 已寄出，必填快递单号 */
  async send(
    id: number,
    dto: SendFinanceInvoiceRequest,
  ): Promise<{ success: boolean }> {
    if (!dto.expressNo || dto.expressNo.trim().length === 0) {
      throw new BadRequestException('请填写快递单号');
    }
    const now: Date = new Date();
    const updated: { id: number }[] = await this.db
      .update(financeInvoices)
      .set({
        status: SENT_STATUS,
        expressNo: dto.expressNo.trim(),
        expressDate: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(financeInvoices.id, id),
          eq(financeInvoices.status, ISSUED_STATUS),
          isNull(financeInvoices.deletedAt),
        ),
      )
      .returning({ id: financeInvoices.id });
    if (updated.length === 0) {
      await this.throwInvalidTransition(id, '寄出');
    }
    publishSyncEvent('finance_invoices', updated[0].id, 'update');
    return { success: true };
  }

  /** 批量寄出：事务内仅处理 已开具，共用一个快递单号 */
  async batchSend(
    ids: number[],
    expressNo: string,
  ): Promise<{ sent: number }> {
    if (!expressNo || expressNo.trim().length === 0) {
      throw new BadRequestException('请填写快递单号');
    }
    let sent: number = 0;
    const syncedIds: number[] = [];
    await this.db.transaction(async (tx) => {
      const rows: InvoiceRow[] = await tx
        .select()
        .from(financeInvoices)
        .where(
          and(
            inArray(financeInvoices.id, ids),
            eq(financeInvoices.status, ISSUED_STATUS),
            isNull(financeInvoices.deletedAt),
          ),
        );
      const now: Date = new Date();
      for (const row of rows) {
        const updated: { id: number }[] = await tx
          .update(financeInvoices)
          .set({
            status: SENT_STATUS,
            expressNo: expressNo.trim(),
            expressDate: now,
            updatedAt: now,
          })
          .where(
            and(
              eq(financeInvoices.id, row.id),
              eq(financeInvoices.status, ISSUED_STATUS),
            ),
          )
          .returning({ id: financeInvoices.id });
        if (updated.length > 0) {
          syncedIds.push(row.id);
          sent += 1;
        }
      }
    });
    syncedIds.forEach((invoiceId: number) => {
      publishSyncEvent('finance_invoices', invoiceId, 'update');
    });
    this.logger.log(`发票批量寄出完成: ${String(sent)} 条`);
    return { sent };
  }

  /** 收讫：已寄出 → 已收讫 */
  async receive(id: number): Promise<{ success: boolean }> {
    const updated: { id: number }[] = await this.db
      .update(financeInvoices)
      .set({ status: RECEIVED_STATUS, updatedAt: new Date() })
      .where(
        and(
          eq(financeInvoices.id, id),
          eq(financeInvoices.status, SENT_STATUS),
          isNull(financeInvoices.deletedAt),
        ),
      )
      .returning({ id: financeInvoices.id });
    if (updated.length === 0) {
      await this.throwInvalidTransition(id, '收讫');
    }
    publishSyncEvent('finance_invoices', updated[0].id, 'update');
    return { success: true };
  }

  /** 作废：待开具/已开具/已寄出 → 已作废；已收讫/已作废不可作废(409) */
  async void(id: number): Promise<{ success: boolean }> {
    const updated: { id: number }[] = await this.db
      .update(financeInvoices)
      .set({ status: VOIDED_STATUS, updatedAt: new Date() })
      .where(
        and(
          eq(financeInvoices.id, id),
          inArray(financeInvoices.status, VOIDABLE_STATUSES),
          isNull(financeInvoices.deletedAt),
        ),
      )
      .returning({ id: financeInvoices.id });
    if (updated.length === 0) {
      await this.throwInvalidTransition(id, '作废');
    }
    publishSyncEvent('finance_invoices', updated[0].id, 'update');
    return { success: true };
  }

  /** 非法流转统一报错：区分不存在(404)与状态不符(409) */
  private async throwInvalidTransition(
    id: number,
    action: string,
  ): Promise<never> {
    const rows: InvoiceRow[] = await this.db
      .select()
      .from(financeInvoices)
      .where(
        and(eq(financeInvoices.id, id), isNull(financeInvoices.deletedAt)),
      );
    if (rows.length === 0) {
      throw new NotFoundException('发票不存在');
    }
    throw new ConflictException(
      `当前状态「${rows[0].status}」不允许${action}操作`,
    );
  }
}
