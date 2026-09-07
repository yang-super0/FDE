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
  and, count, desc, eq, gte, ilike, inArray, isNull, lte, or, type SQL,
} from 'drizzle-orm';
import { adminRequisitions, adminReturns } from '@server/database/schema';
import type {
  AdminEnhanceListResponse,
  AdminReturnRecord,
  CreateAdminReturnRecordDto,
  UpdateAdminReturnRecordDto,
} from '@shared/api.interface';
import { insertWithSeqNo } from '../finance-core/fin-seq.util';
import { parseIdList } from '../finance-core/query.util';
import {
  adminToday, assertAdminPositiveInt, assertAdminRequired,
  formatAdminDateTime, increaseInventoryStock, resolveAdminPagination,
} from './admin-enhance-shared.util';

type ReturnRow = typeof adminReturns.$inferSelect;
type ReturnInsert = typeof adminReturns.$inferInsert;
type RequisitionRow = typeof adminRequisitions.$inferSelect;

const RETURN_NO_PREFIX: string = 'GH';
const STATUS_PENDING: string = '待确认';
const STATUS_CONFIRMED: string = '已确认';
const STATUS_DAMAGED: string = '有损坏';
const STATUS_RETURNED: string = '已归还';
const CONDITION_GOOD: string = '完好';
const CONDITION_DAMAGED: string = '损坏';

function mapReturn(row: ReturnRow): AdminReturnRecord {
  return {
    id: row.id, returnNo: row.returnNo, requisitionId: row.requisitionId,
    itemName: row.itemName, itemType: row.itemType,
    specification: row.specification, quantity: row.quantity, unit: row.unit,
    returnDate: row.returnDate ?? null, operator: row.operator,
    condition: row.condition, status: row.status,
    damageRemark: row.damageRemark, remark: row.remark,
    createdAt: formatAdminDateTime(row.createdAt) ?? '',
    updatedAt: formatAdminDateTime(row.updatedAt) ?? '',
  };
}

@Injectable()
export class AdminReturnsService {
  private readonly logger = new Logger(AdminReturnsService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
  ) {}

  async list(params: {
    status?: string; dateFrom?: string; dateTo?: string;
    keyword?: string; page?: string; pageSize?: string;
  }): Promise<AdminEnhanceListResponse<AdminReturnRecord>> {
    const { page, pageSize, offset } = resolveAdminPagination(params.page, params.pageSize);
    const conditions: SQL[] = [isNull(adminReturns.deletedAt)];
    if (params.status) conditions.push(eq(adminReturns.status, params.status));
    if (params.dateFrom) {
      conditions.push(gte(adminReturns.returnDate, params.dateFrom));
    }
    if (params.dateTo) {
      conditions.push(lte(adminReturns.returnDate, params.dateTo));
    }
    if (params.keyword) {
      const kw: string = `%${params.keyword}%`;
      const keywordCond = or(
        ilike(adminReturns.returnNo, kw),
        ilike(adminReturns.itemName, kw),
      );
      if (keywordCond) conditions.push(keywordCond);
    }
    const where = and(...conditions);
    const totalRows: { count: number | string }[] = await this.db
      .select({ count: count() }).from(adminReturns).where(where);
    const rows: ReturnRow[] = await this.db.select().from(adminReturns)
      .where(where).orderBy(desc(adminReturns.id))
      .limit(pageSize).offset(offset);
    return {
      items: rows.map((row: ReturnRow) => mapReturn(row)),
      total: Number(totalRows[0]?.count ?? 0), page, pageSize,
    };
  }

  async create(dto: CreateAdminReturnRecordDto): Promise<AdminReturnRecord> {
    const requisitionId: number = assertAdminPositiveInt(
      dto?.requisitionId, '领用单 ID',
    );
    const quantity: number = assertAdminPositiveInt(dto?.quantity, '数量');
    const requisition: RequisitionRow = await this.findIssuedRequisitionOrThrow(
      requisitionId,
    );
    const { row } = await insertWithSeqNo<ReturnRow>({
      db: this.db,
      table: adminReturns,
      noColumn: adminReturns.returnNo,
      prefix: RETURN_NO_PREFIX,
      insert: (no: string) =>
        this.db.insert(adminReturns).values({
          returnNo: no, requisitionId,
          itemName: dto?.itemName ?? requisition.itemName,
          itemType: dto?.itemType ?? requisition.itemType,
          specification: dto?.specification ?? requisition.specification,
          quantity, unit: dto?.unit ?? requisition.unit,
          returnDate: dto?.returnDate ?? adminToday(),
          operator: dto?.operator ?? '',
          condition: dto?.condition ?? CONDITION_GOOD,
          status: STATUS_PENDING,
          damageRemark: dto?.damageRemark ?? '', remark: dto?.remark ?? '',
        } satisfies ReturnInsert).returning(),
    });
    this.logger.log(`归还单创建成功 id=${String(row.id)} no=${row.returnNo}`);
    return mapReturn(row);
  }

  async update(id: number, dto: UpdateAdminReturnRecordDto): Promise<AdminReturnRecord> {
    const existing: ReturnRow = await this.findReturnOrThrow(id);
    if (existing.status !== STATUS_PENDING) {
      throw new ConflictException('只有待确认的归还单可以修改');
    }
    const patch: Partial<ReturnInsert> = {};
    if (dto?.requisitionId !== undefined) {
      patch.requisitionId = assertAdminPositiveInt(dto.requisitionId, '领用单 ID');
      await this.findIssuedRequisitionOrThrow(patch.requisitionId as number);
    }
    if (dto?.itemName !== undefined) patch.itemName = dto.itemName;
    if (dto?.itemType !== undefined) patch.itemType = dto.itemType;
    if (dto?.specification !== undefined) patch.specification = dto.specification;
    if (dto?.quantity !== undefined) {
      patch.quantity = assertAdminPositiveInt(dto.quantity, '数量');
    }
    if (dto?.unit !== undefined) patch.unit = dto.unit;
    if (dto?.returnDate !== undefined) patch.returnDate = dto.returnDate;
    if (dto?.operator !== undefined) patch.operator = dto.operator;
    if (dto?.condition !== undefined) patch.condition = dto.condition;
    if (dto?.damageRemark !== undefined) patch.damageRemark = dto.damageRemark;
    if (dto?.remark !== undefined) patch.remark = dto.remark;
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }
    patch.updatedAt = new Date();
    const updated: ReturnRow[] = await this.db.update(adminReturns)
      .set(patch)
      .where(and(eq(adminReturns.id, id), isNull(adminReturns.deletedAt)))
      .returning();
    if (updated.length === 0) throw new NotFoundException('归还单不存在');
    return mapReturn(updated[0]);
  }

  /** 确认归还：完好/损坏回补库存，丢失不加；领用单 → 已归还 */
  async confirm(id: number, operator: string): Promise<AdminReturnRecord> {
    const existing: ReturnRow = await this.findReturnOrThrow(id);
    if (existing.status !== STATUS_PENDING) {
      throw new ConflictException('只有待确认的归还单可以确认');
    }
    const newStatus: string =
      existing.condition === CONDITION_DAMAGED ? STATUS_DAMAGED : STATUS_CONFIRMED;
    const returnDate: string = existing.returnDate ?? adminToday();
    return this.db.transaction(async (tx) => {
      if (
        existing.condition === CONDITION_GOOD ||
        existing.condition === CONDITION_DAMAGED
      ) {
        await increaseInventoryStock(tx, {
          itemName: existing.itemName,
          specification: existing.specification || '',
          itemType: existing.itemType || '其他',
          unit: existing.unit || '件',
          quantity: existing.quantity,
        });
      }
      const updated: ReturnRow[] = await tx.update(adminReturns)
        .set({ status: newStatus, returnDate, operator, updatedAt: new Date() })
        .where(and(
          eq(adminReturns.id, id),
          eq(adminReturns.status, STATUS_PENDING),
          isNull(adminReturns.deletedAt),
        ))
        .returning();
      if (updated.length === 0) {
        throw new ConflictException('归还单状态已变更，请刷新后重试');
      }
      await tx.update(adminRequisitions)
        .set({ status: STATUS_RETURNED, updatedAt: new Date() })
        .where(eq(adminRequisitions.id, existing.requisitionId));
      this.logger.log(
        `归还单确认成功 id=${String(id)} no=${existing.returnNo} condition=${existing.condition}`,
      );
      return mapReturn(updated[0]);
    });
  }

  async remove(id: number): Promise<{ success: boolean }> {
    const existing: ReturnRow = await this.findReturnOrThrow(id);
    if (existing.status !== STATUS_PENDING) {
      throw new ConflictException('只有待确认的归还单可以删除');
    }
    const updated: { id: number }[] = await this.db.update(adminReturns)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(adminReturns.id, id), isNull(adminReturns.deletedAt)))
      .returning({ id: adminReturns.id });
    if (updated.length === 0) throw new NotFoundException('归还单不存在');
    return { success: true };
  }

  async batchDelete(ids: unknown): Promise<number> {
    const idList: number[] = parseIdList(ids);
    const updated: { id: number }[] = await this.db.update(adminReturns)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(
        inArray(adminReturns.id, idList),
        eq(adminReturns.status, STATUS_PENDING),
        isNull(adminReturns.deletedAt),
      ))
      .returning({ id: adminReturns.id });
    return updated.length;
  }

  /** 领用单校验：存在且已领用 */
  private async findIssuedRequisitionOrThrow(
    requisitionId: number,
  ): Promise<RequisitionRow> {
    const rows: RequisitionRow[] = await this.db.select().from(adminRequisitions)
      .where(and(eq(adminRequisitions.id, requisitionId), isNull(adminRequisitions.deletedAt)));
    if (rows.length === 0 || rows[0].status !== '已领用') {
      throw new BadRequestException('领用单不存在或未处于已领用状态');
    }
    return rows[0];
  }

  private async findReturnOrThrow(id: number): Promise<ReturnRow> {
    const rows: ReturnRow[] = await this.db.select().from(adminReturns)
      .where(and(eq(adminReturns.id, id), isNull(adminReturns.deletedAt)));
    if (rows.length === 0) throw new NotFoundException('归还单不存在');
    return rows[0];
  }
}
