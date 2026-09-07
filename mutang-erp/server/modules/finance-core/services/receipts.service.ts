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
import {
  financeAccounts,
  financeReceipts,
  financeSettlements,
} from '@server/database/schema';
import type {
  CreateFinanceReceiptRequest,
  FinanceReceipt,
  FinanceReceiptListParams,
  FinanceReceiptListResult,
  UpdateFinanceReceiptRequest,
} from '@shared/api.interface';
import { RECEIPT_NO_PREFIX, insertWithSeqNo } from '../fin-seq.util';
import { addDays, parseAmountParam, parseDateParam } from '../query.util';
import { publishSyncEvent } from '@server/modules/feishu-sync/sync-event.publisher';

type ReceiptRow = typeof financeReceipts.$inferSelect;
type ReceiptInsert = typeof financeReceipts.$inferInsert;
type AccountRow = typeof financeAccounts.$inferSelect;
type SettlementRow = typeof financeSettlements.$inferSelect;

const PENDING_STATUS: string = '待确认';
const CONFIRMED_STATUS: string = '已确认';
const WRITTEN_OFF_STATUS: string = '已核销';
const CANCELLED_STATUS: string = '已取消';
const ACCOUNT_ENABLED_STATUS: string = '启用';
const REMOVABLE_STATUSES: string[] = [PENDING_STATUS, CANCELLED_STATUS];
const WRITE_OFF_ALLOWED_STATUSES: string[] = [
  PENDING_STATUS,
  CONFIRMED_STATUS,
];

@Injectable()
export class ReceiptsService {
  private readonly logger: Logger = new Logger(ReceiptsService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
  ) {}

  private mapReceipt(
    row: ReceiptRow,
    accountName: string,
    settlementNo: string,
  ): FinanceReceipt {
    return {
      id: row.id,
      receiptNo: row.receiptNo,
      customerName: row.customerName,
      groupName: row.groupName ?? '',
      amount: Number(row.amount),
      receiptType: row.receiptType ?? '',
      paymentMethod: row.paymentMethod ?? '',
      accountId: row.accountId,
      accountName,
      status: row.status,
      receiptDate: (row.receiptDate ?? row.createdAt).toISOString(),
      confirmedBy: row.confirmedBy ?? '',
      confirmedAt: row.confirmedAt ? row.confirmedAt.toISOString() : null,
      settlementId: row.settlementId,
      settlementNo,
      relatedContract: row.relatedContract ?? '',
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
      .select({ id: financeAccounts.id, accountName: financeAccounts.accountName })
      .from(financeAccounts)
      .where(inArray(financeAccounts.id, ids));
    for (const row of rows) {
      map.set(row.id, row.accountName);
    }
    return map;
  }

  private async loadSettlementNos(
    ids: number[],
  ): Promise<Map<number, string>> {
    const map: Map<number, string> = new Map();
    if (ids.length === 0) {
      return map;
    }
    const rows: { id: number; settlementNo: string }[] = await this.db
      .select({
        id: financeSettlements.id,
        settlementNo: financeSettlements.settlementNo,
      })
      .from(financeSettlements)
      .where(inArray(financeSettlements.id, ids));
    for (const row of rows) {
      map.set(row.id, row.settlementNo);
    }
    return map;
  }

  private async mapRows(rows: ReceiptRow[]): Promise<FinanceReceipt[]> {
    const accountIds: number[] = [
      ...new Set(
        rows
          .map((row: ReceiptRow): number | null => row.accountId)
          .filter((value: number | null): value is number => value !== null),
      ),
    ];
    const settlementIds: number[] = [
      ...new Set(
        rows
          .map((row: ReceiptRow): number | null => row.settlementId)
          .filter((value: number | null): value is number => value !== null),
      ),
    ];
    const accountNames: Map<number, string> =
      await this.loadAccountNames(accountIds);
    const settlementNos: Map<number, string> =
      await this.loadSettlementNos(settlementIds);
    return rows.map((row: ReceiptRow): FinanceReceipt =>
      this.mapReceipt(
        row,
        row.accountId !== null ? accountNames.get(row.accountId) ?? '' : '',
        row.settlementId !== null
          ? settlementNos.get(row.settlementId) ?? ''
          : '',
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
      throw new BadRequestException('资金账户未启用，不能关联收款');
    }
    return rows[0];
  }

  async findAll(
    params: FinanceReceiptListParams,
  ): Promise<FinanceReceiptListResult> {
    const page: number = Math.max(params.page ?? 1, 1);
    const pageSize: number = Math.min(Math.max(params.pageSize ?? 20, 1), 50);

    const conditions = [isNull(financeReceipts.deletedAt)];
    if (params.receiptNo) {
      conditions.push(ilike(financeReceipts.receiptNo, `%${params.receiptNo}%`));
    }
    if (params.customerName) {
      conditions.push(
        ilike(financeReceipts.customerName, `%${params.customerName}%`),
      );
    }
    if (params.groupName) {
      conditions.push(ilike(financeReceipts.groupName, `%${params.groupName}%`));
    }
    if (params.receiptType) {
      conditions.push(eq(financeReceipts.receiptType, params.receiptType));
    }
    if (params.status) {
      conditions.push(eq(financeReceipts.status, params.status));
    }
    if (params.startDate) {
      conditions.push(
        gte(financeReceipts.receiptDate, parseDateParam(params.startDate)),
      );
    }
    if (params.endDate) {
      conditions.push(
        lt(
          financeReceipts.receiptDate,
          addDays(parseDateParam(params.endDate), 1),
        ),
      );
    }
    const where = and(...conditions);

    const rows: ReceiptRow[] = await this.db
      .select()
      .from(financeReceipts)
      .where(where)
      .orderBy(desc(financeReceipts.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const totalResult: { count: number | string }[] = await this.db
      .select({ count: count() })
      .from(financeReceipts)
      .where(where);
    const total: number = Number(totalResult[0]?.count ?? 0);

    return { items: await this.mapRows(rows), total };
  }

  async detail(id: number): Promise<FinanceReceipt> {
    const rows: ReceiptRow[] = await this.db
      .select()
      .from(financeReceipts)
      .where(
        and(eq(financeReceipts.id, id), isNull(financeReceipts.deletedAt)),
      );
    if (rows.length === 0) {
      throw new NotFoundException('收款不存在');
    }
    const mapped: FinanceReceipt[] = await this.mapRows(rows);
    return mapped[0];
  }

  async create(dto: CreateFinanceReceiptRequest): Promise<FinanceReceipt> {
    if (!dto.customerName || dto.customerName.trim().length === 0) {
      throw new BadRequestException('请填写客户名称');
    }
    const amount: number = parseAmountParam(dto.amount);
    let accountName: string = '';
    if (dto.accountId !== undefined && dto.accountId !== null) {
      const account: AccountRow = await this.verifyActiveAccount(
        dto.accountId,
      );
      accountName = account.accountName;
    }

    const result = await insertWithSeqNo<ReceiptRow>({
      db: this.db,
      table: financeReceipts,
      noColumn: financeReceipts.receiptNo,
      prefix: RECEIPT_NO_PREFIX,
      insert: (receiptNo: string): Promise<ReceiptRow[]> =>
        this.db
          .insert(financeReceipts)
          .values({
            receiptNo,
            customerName: dto.customerName.trim(),
            groupName: dto.groupName ?? '',
            amount: String(amount),
            receiptType: dto.receiptType ?? '广告费',
            paymentMethod: dto.paymentMethod ?? '银行转账',
            accountId: dto.accountId ?? null,
            status: PENDING_STATUS,
            receiptDate: dto.receiptDate
              ? parseDateParam(dto.receiptDate)
              : new Date(),
            relatedContract: dto.relatedContract ?? '',
            remark: dto.remark ?? '',
          })
          .returning(),
    });
    this.logger.log(`收款创建成功: ${result.no}`);
    publishSyncEvent('finance_receipts', result.id, 'create');
    return this.mapReceipt(
      result.row,
      accountName,
      '',
    );
  }

  /** 仅 待确认 状态可编辑 */
  async update(
    id: number,
    dto: UpdateFinanceReceiptRequest,
  ): Promise<{ success: boolean }> {
    const rows: ReceiptRow[] = await this.db
      .select()
      .from(financeReceipts)
      .where(
        and(eq(financeReceipts.id, id), isNull(financeReceipts.deletedAt)),
      );
    if (rows.length === 0) {
      throw new NotFoundException('收款不存在');
    }
    if (rows[0].status !== PENDING_STATUS) {
      throw new BadRequestException('仅待确认的收款可以编辑');
    }

    const patch: Partial<ReceiptInsert> = {};
    if (dto.customerName !== undefined) {
      if (dto.customerName.trim().length === 0) {
        throw new BadRequestException('客户名称不能为空');
      }
      patch.customerName = dto.customerName.trim();
    }
    if (dto.amount !== undefined) {
      patch.amount = String(parseAmountParam(dto.amount));
    }
    if (dto.groupName !== undefined) {
      patch.groupName = dto.groupName;
    }
    if (dto.receiptType !== undefined) {
      patch.receiptType = dto.receiptType;
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
    if (dto.receiptDate !== undefined) {
      patch.receiptDate = parseDateParam(dto.receiptDate);
    }
    if (dto.relatedContract !== undefined) {
      patch.relatedContract = dto.relatedContract;
    }
    if (dto.remark !== undefined) {
      patch.remark = dto.remark;
    }
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }
    patch.updatedAt = new Date();

    const updated: { id: number }[] = await this.db
      .update(financeReceipts)
      .set(patch)
      .where(
        and(eq(financeReceipts.id, id), isNull(financeReceipts.deletedAt)),
      )
      .returning({ id: financeReceipts.id });
    if (updated.length === 0) {
      throw new NotFoundException('收款不存在');
    }
    publishSyncEvent('finance_receipts', updated[0].id, 'update');
    return { success: true };
  }

  /** 软删除：仅 待确认/已取消 可删 */
  async remove(id: number): Promise<{ success: boolean }> {
    const rows: ReceiptRow[] = await this.db
      .select()
      .from(financeReceipts)
      .where(
        and(eq(financeReceipts.id, id), isNull(financeReceipts.deletedAt)),
      );
    if (rows.length === 0) {
      throw new NotFoundException('收款不存在');
    }
    if (!REMOVABLE_STATUSES.includes(rows[0].status)) {
      throw new BadRequestException('仅待确认或已取消的收款可以删除');
    }

    const now: Date = new Date();
    const updated: { id: number }[] = await this.db
      .update(financeReceipts)
      .set({ deletedAt: now, updatedAt: now })
      .where(
        and(eq(financeReceipts.id, id), isNull(financeReceipts.deletedAt)),
      )
      .returning({ id: financeReceipts.id });
    if (updated.length === 0) {
      throw new NotFoundException('收款不存在');
    }
    publishSyncEvent('finance_receipts', updated[0].id, 'delete');
    return { success: true };
  }

  /**
   * 批量确认：事务内逐条处理，仅 待确认 → 已确认；
   * 同事务原子加账户余额；已确认的幂等跳过并返回提示
   */
  async confirm(
    ids: number[],
    userId: string,
  ): Promise<{ confirmed: number; message: string }> {
    let confirmed: number = 0;
    let alreadyConfirmed: number = 0;
    const syncedIds: number[] = [];
    await this.db.transaction(async (tx) => {
      const foundRows: ReceiptRow[] = await tx
        .select()
        .from(financeReceipts)
        .where(
          and(
            inArray(financeReceipts.id, ids),
            isNull(financeReceipts.deletedAt),
          ),
        );
      if (foundRows.length === 0) {
        throw new NotFoundException('收款单不存在');
      }
      const rows: ReceiptRow[] = foundRows;
      const now: Date = new Date();
      for (const row of rows) {
        if (row.status !== PENDING_STATUS) {
          alreadyConfirmed += 1;
          continue;
        }
        const updated: { id: number }[] = await tx
          .update(financeReceipts)
          .set({
            status: CONFIRMED_STATUS,
            confirmedBy: userId,
            confirmedAt: now,
            updatedAt: now,
          })
          .where(
            and(
              eq(financeReceipts.id, row.id),
              eq(financeReceipts.status, PENDING_STATUS),
            ),
          )
          .returning({ id: financeReceipts.id });
        if (updated.length === 0) {
          continue;
        }
        syncedIds.push(row.id);
        if (row.accountId !== null) {
          const amount: number = Number(row.amount);
          const balanceUpdated: { id: number }[] = await tx
            .update(financeAccounts)
            .set({
              balance: sql`${financeAccounts.balance} + ${amount}`,
              updatedAt: now,
            })
            .where(eq(financeAccounts.id, row.accountId))
            .returning({ id: financeAccounts.id });
          if (balanceUpdated.length === 0) {
            this.logger.warn(
              `收款 ${row.receiptNo} 关联账户 ${String(
                row.accountId,
              )} 余额更新未生效`,
            );
          }
        }
        confirmed += 1;
      }
    });
    syncedIds.forEach((receiptId: number) => {
      publishSyncEvent('finance_receipts', receiptId, 'update');
    });
    let message: string = '该收款单已确认';
    if (confirmed > 0 && alreadyConfirmed > 0) {
      message = `已确认 ${String(confirmed)} 条，${String(
        alreadyConfirmed,
      )} 条已确认跳过`;
    } else if (confirmed > 0) {
      message = `已确认 ${String(confirmed)} 条收款单`;
    }
    this.logger.log(`收款确认完成: ${String(confirmed)} 条`);
    return { confirmed, message };
  }

  /** 单条核销：事务内更新收款状态并原子累加结算单已收金额 */
  async writeOff(
    id: number,
    settlementId: number,
  ): Promise<{ success: boolean }> {
    await this.db.transaction(async (tx) => {
      const rows: ReceiptRow[] = await tx
        .select()
        .from(financeReceipts)
        .where(
          and(eq(financeReceipts.id, id), isNull(financeReceipts.deletedAt)),
        );
      if (rows.length === 0) {
        throw new NotFoundException('收款不存在');
      }
      const row: ReceiptRow = rows[0];
      if (!WRITE_OFF_ALLOWED_STATUSES.includes(row.status)) {
        throw new ConflictException(
          `当前状态「${row.status}」不允许核销，仅待确认/已确认可核销`,
        );
      }
      const settlements: SettlementRow[] = await tx
        .select()
        .from(financeSettlements)
        .where(
          and(
            eq(financeSettlements.id, settlementId),
            isNull(financeSettlements.deletedAt),
          ),
        );
      if (settlements.length === 0) {
        throw new NotFoundException('结算单不存在');
      }

      const now: Date = new Date();
      const amount: number = Number(row.amount);
      const updatedReceipt: { id: number }[] = await tx
        .update(financeReceipts)
        .set({ status: WRITTEN_OFF_STATUS, settlementId, updatedAt: now })
        .where(
          and(
            eq(financeReceipts.id, id),
            inArray(financeReceipts.status, WRITE_OFF_ALLOWED_STATUSES),
          ),
        )
        .returning({ id: financeReceipts.id });
      if (updatedReceipt.length === 0) {
        throw new ConflictException('收款状态已变更，请刷新后重试');
      }
      const updatedSettlement: { id: number }[] = await tx
        .update(financeSettlements)
        .set({
          receiptAmount: sql`${financeSettlements.receiptAmount} + ${amount}`,
          updatedAt: now,
        })
        .where(eq(financeSettlements.id, settlementId))
        .returning({ id: financeSettlements.id });
      if (updatedSettlement.length === 0) {
        throw new ConflictException('结算单更新失败');
      }
    });
    this.logger.log(`收款 ${String(id)} 核销至结算单 ${String(settlementId)}`);
    publishSyncEvent('finance_receipts', id, 'update');
    return { success: true };
  }

  /** 批量核销：事务内仅处理 待确认/已确认，返回实际核销条数 */
  async batchWriteOff(
    ids: number[],
    settlementId: number,
  ): Promise<{ writtenOff: number }> {
    let writtenOff: number = 0;
    const syncedIds: number[] = [];
    await this.db.transaction(async (tx) => {
      const settlements: SettlementRow[] = await tx
        .select()
        .from(financeSettlements)
        .where(
          and(
            eq(financeSettlements.id, settlementId),
            isNull(financeSettlements.deletedAt),
          ),
        );
      if (settlements.length === 0) {
        throw new NotFoundException('结算单不存在');
      }

      const rows: ReceiptRow[] = await tx
        .select()
        .from(financeReceipts)
        .where(
          and(
            inArray(financeReceipts.id, ids),
            isNull(financeReceipts.deletedAt),
          ),
        );
      const now: Date = new Date();
      for (const row of rows) {
        if (!WRITE_OFF_ALLOWED_STATUSES.includes(row.status)) {
          continue;
        }
        const amount: number = Number(row.amount);
        const updatedReceipt: { id: number }[] = await tx
          .update(financeReceipts)
          .set({ status: WRITTEN_OFF_STATUS, settlementId, updatedAt: now })
          .where(
            and(
              eq(financeReceipts.id, row.id),
              inArray(financeReceipts.status, WRITE_OFF_ALLOWED_STATUSES),
            ),
          )
          .returning({ id: financeReceipts.id });
        if (updatedReceipt.length === 0) {
          continue;
        }
        syncedIds.push(row.id);
        await tx
          .update(financeSettlements)
          .set({
            receiptAmount: sql`${financeSettlements.receiptAmount} + ${amount}`,
            updatedAt: now,
          })
          .where(eq(financeSettlements.id, settlementId));
        writtenOff += 1;
      }
    });
    syncedIds.forEach((receiptId: number) => {
      publishSyncEvent('finance_receipts', receiptId, 'update');
    });
    this.logger.log(`收款批量核销完成: ${String(writtenOff)} 条`);
    return { writtenOff };
  }
}
