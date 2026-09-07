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
import { adminInbounds, adminPurchaseOrders } from '@server/database/schema';
import type {
  AdminEnhanceListResponse,
  AdminInbound,
  CreateAdminInboundDto,
  UpdateAdminInboundDto,
} from '@shared/api.interface';
import { insertWithSeqNo } from '../finance-core/fin-seq.util';
import { parseIdList } from '../finance-core/query.util';
import {
  adminToday, assertAdminNonNegativeNumber, assertAdminPositiveInt,
  assertAdminRequired, formatAdminDateTime, increaseInventoryStock,
  resolveAdminPagination,
} from './admin-enhance-shared.util';

type InboundRow = typeof adminInbounds.$inferSelect;
type InboundInsert = typeof adminInbounds.$inferInsert;

const INBOUND_NO_PREFIX: string = 'RK';
const STATUS_PENDING: string = '待入库';
const STATUS_DONE: string = '已入库';
const STATUS_CANCELLED: string = '已取消';
const DELETABLE_STATUSES: string[] = [STATUS_PENDING, STATUS_CANCELLED];

function mapInbound(row: InboundRow): AdminInbound {
  return {
    id: row.id, inboundNo: row.inboundNo,
    purchaseOrderId: row.purchaseOrderId ?? null,
    itemName: row.itemName, itemType: row.itemType,
    specification: row.specification, quantity: row.quantity, unit: row.unit,
    unitPrice: Number(row.unitPrice), totalPrice: Number(row.totalPrice),
    supplierName: row.supplierName, inboundDate: row.inboundDate ?? null,
    operator: row.operator, status: row.status, remark: row.remark,
    createdAt: formatAdminDateTime(row.createdAt) ?? '',
    updatedAt: formatAdminDateTime(row.updatedAt) ?? '',
  };
}

@Injectable()
export class AdminInboundsService {
  private readonly logger = new Logger(AdminInboundsService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
  ) {}

  async list(params: {
    supplierName?: string; status?: string; dateFrom?: string;
    dateTo?: string; keyword?: string; page?: string; pageSize?: string;
  }): Promise<AdminEnhanceListResponse<AdminInbound>> {
    const { page, pageSize, offset } = resolveAdminPagination(
      params.page, params.pageSize,
    );
    const conditions: SQL[] = [isNull(adminInbounds.deletedAt)];
    if (params.supplierName) {
      conditions.push(ilike(adminInbounds.supplierName, `%${params.supplierName}%`));
    }
    if (params.status) conditions.push(eq(adminInbounds.status, params.status));
    if (params.dateFrom) {
      conditions.push(gte(adminInbounds.inboundDate, params.dateFrom));
    }
    if (params.dateTo) {
      conditions.push(lte(adminInbounds.inboundDate, params.dateTo));
    }
    if (params.keyword) {
      const kw: string = `%${params.keyword}%`;
      const keywordCond = or(
        ilike(adminInbounds.inboundNo, kw),
        ilike(adminInbounds.itemName, kw),
        ilike(adminInbounds.supplierName, kw),
      );
      if (keywordCond) conditions.push(keywordCond);
    }
    const where = and(...conditions);
    const totalRows: { count: number | string }[] = await this.db
      .select({ count: count() }).from(adminInbounds).where(where);
    const rows: InboundRow[] = await this.db.select().from(adminInbounds)
      .where(where).orderBy(desc(adminInbounds.id))
      .limit(pageSize).offset(offset);
    return {
      items: rows.map((row: InboundRow) => mapInbound(row)),
      total: Number(totalRows[0]?.count ?? 0), page, pageSize,
    };
  }

  async create(dto: CreateAdminInboundDto): Promise<AdminInbound> {
    assertAdminRequired(dto?.itemName, '物品名称');
    const quantity: number = assertAdminPositiveInt(dto?.quantity, '数量');
    const unitPrice: number =
      dto?.unitPrice === undefined || dto?.unitPrice === null
        ? 0
        : assertAdminNonNegativeNumber(dto.unitPrice, '单价');
    const purchaseOrderId: number | null =
      dto?.purchaseOrderId === undefined || dto?.purchaseOrderId === null
        ? null
        : await this.resolvePurchaseOrderId(dto.purchaseOrderId);
    const totalPrice: number =
      dto?.totalPrice === undefined || dto?.totalPrice === null
        ? quantity * unitPrice
        : assertAdminNonNegativeNumber(dto.totalPrice, '总金额');
    const { row } = await insertWithSeqNo<InboundRow>({
      db: this.db,
      table: adminInbounds,
      noColumn: adminInbounds.inboundNo,
      prefix: INBOUND_NO_PREFIX,
      insert: (no: string) =>
        this.db.insert(adminInbounds).values({
          inboundNo: no, purchaseOrderId,
          itemName: String(dto.itemName).trim(),
          itemType: dto?.itemType ?? '办公用品',
          specification: dto?.specification ?? '', quantity,
          unit: dto?.unit ?? '件', unitPrice: unitPrice.toFixed(2),
          totalPrice: totalPrice.toFixed(2),
          supplierName: dto?.supplierName ?? '', inboundDate: null,
          operator: '', status: STATUS_PENDING, remark: dto?.remark ?? '',
        } satisfies InboundInsert).returning(),
    });
    this.logger.log(`入库单创建成功 id=${String(row.id)} no=${row.inboundNo}`);
    return mapInbound(row);
  }

  async update(id: number, dto: UpdateAdminInboundDto): Promise<AdminInbound> {
    const existing: InboundRow = await this.findInboundOrThrow(id);
    if (existing.status !== STATUS_PENDING) {
      throw new ConflictException('只有待入库的入库单可以修改');
    }
    const patch: Partial<InboundInsert> = {};
    if (dto?.purchaseOrderId !== undefined) {
      patch.purchaseOrderId =
        dto.purchaseOrderId === null
          ? null
          : await this.resolvePurchaseOrderId(dto.purchaseOrderId);
    }
    if (dto?.itemName !== undefined) {
      assertAdminRequired(dto.itemName, '物品名称');
      patch.itemName = String(dto.itemName).trim();
    }
    if (dto?.itemType !== undefined) patch.itemType = dto.itemType;
    if (dto?.specification !== undefined) patch.specification = dto.specification;
    if (dto?.quantity !== undefined) {
      patch.quantity = assertAdminPositiveInt(dto.quantity, '数量');
    }
    if (dto?.unit !== undefined) patch.unit = dto.unit;
    if (dto?.unitPrice !== undefined) {
      patch.unitPrice = assertAdminNonNegativeNumber(dto.unitPrice, '单价').toFixed(2);
    }
    if (dto?.totalPrice !== undefined) {
      patch.totalPrice = assertAdminNonNegativeNumber(dto.totalPrice, '总金额').toFixed(2);
    } else if (patch.quantity !== undefined || patch.unitPrice !== undefined) {
      const qty: number = patch.quantity ?? existing.quantity;
      const price: number = patch.unitPrice !== undefined
        ? Number(patch.unitPrice)
        : Number(existing.unitPrice);
      patch.totalPrice = (qty * price).toFixed(2);
    }
    if (dto?.supplierName !== undefined) patch.supplierName = dto.supplierName;
    if (dto?.remark !== undefined) patch.remark = dto.remark;
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }
    patch.updatedAt = new Date();
    const updated: InboundRow[] = await this.db.update(adminInbounds)
      .set(patch)
      .where(and(eq(adminInbounds.id, id), isNull(adminInbounds.deletedAt)))
      .returning();
    if (updated.length === 0) throw new NotFoundException('入库单不存在');
    return mapInbound(updated[0]);
  }

  /** 确认入库：事务内更新状态、增加库存、回写采购订单 */
  async confirm(id: number, operator: string): Promise<AdminInbound> {
    const existing: InboundRow = await this.findInboundOrThrow(id);
    if (existing.status !== STATUS_PENDING) {
      throw new ConflictException('只有待入库的入库单可以确认');
    }
    const inboundDate: string = existing.inboundDate ?? adminToday();
    return this.db.transaction(async (tx) => {
      const updated: InboundRow[] = await tx.update(adminInbounds)
        .set({ status: STATUS_DONE, inboundDate, operator, updatedAt: new Date() })
        .where(and(
          eq(adminInbounds.id, id),
          eq(adminInbounds.status, STATUS_PENDING),
          isNull(adminInbounds.deletedAt),
        ))
        .returning();
      if (updated.length === 0) {
        throw new ConflictException('入库单状态已变更，请刷新后重试');
      }
      await increaseInventoryStock(tx, {
        itemName: existing.itemName,
        specification: existing.specification || '',
        itemType: existing.itemType || '其他',
        unit: existing.unit || '件',
        quantity: existing.quantity,
      });
      if (existing.purchaseOrderId) {
        await tx.update(adminPurchaseOrders)
          .set({ status: STATUS_DONE, updatedAt: new Date() })
          .where(eq(adminPurchaseOrders.id, existing.purchaseOrderId));
      }
      this.logger.log(
        `入库单确认成功 id=${String(id)} no=${existing.inboundNo} operator=${operator}`,
      );
      return mapInbound(updated[0]);
    });
  }

  async cancel(id: number): Promise<AdminInbound> {
    const existing: InboundRow = await this.findInboundOrThrow(id);
    if (existing.status !== STATUS_PENDING) {
      throw new ConflictException('只有待入库的入库单可以取消');
    }
    const updated: InboundRow[] = await this.db.update(adminInbounds)
      .set({ status: STATUS_CANCELLED, updatedAt: new Date() })
      .where(and(
        eq(adminInbounds.id, id),
        eq(adminInbounds.status, STATUS_PENDING),
        isNull(adminInbounds.deletedAt),
      ))
      .returning();
    if (updated.length === 0) {
      throw new ConflictException('入库单状态已变更，请刷新后重试');
    }
    return mapInbound(updated[0]);
  }

  async remove(id: number): Promise<{ success: boolean }> {
    const existing: InboundRow = await this.findInboundOrThrow(id);
    if (!DELETABLE_STATUSES.includes(existing.status)) {
      throw new ConflictException('只有待入库或已取消的入库单可以删除');
    }
    const updated: { id: number }[] = await this.db.update(adminInbounds)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(adminInbounds.id, id), isNull(adminInbounds.deletedAt)))
      .returning({ id: adminInbounds.id });
    if (updated.length === 0) throw new NotFoundException('入库单不存在');
    return { success: true };
  }

  async batchDelete(ids: unknown): Promise<number> {
    const idList: number[] = parseIdList(ids);
    const updated: { id: number }[] = await this.db.update(adminInbounds)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(
        inArray(adminInbounds.id, idList),
        inArray(adminInbounds.status, DELETABLE_STATUSES),
        isNull(adminInbounds.deletedAt),
      ))
      .returning({ id: adminInbounds.id });
    return updated.length;
  }

  /** 采购订单校验：存在且未取消 */
  private async resolvePurchaseOrderId(value: unknown): Promise<number> {
    const purchaseOrderId: number = assertAdminPositiveInt(value, '采购订单 ID');
    const orders: { id: number; status: string }[] = await this.db
      .select({ id: adminPurchaseOrders.id, status: adminPurchaseOrders.status })
      .from(adminPurchaseOrders)
      .where(and(
        eq(adminPurchaseOrders.id, purchaseOrderId),
        isNull(adminPurchaseOrders.deletedAt),
      ));
    if (orders.length === 0 || orders[0].status === STATUS_CANCELLED) {
      throw new BadRequestException('采购订单不存在或已取消');
    }
    return purchaseOrderId;
  }

  private async findInboundOrThrow(id: number): Promise<InboundRow> {
    const rows: InboundRow[] = await this.db.select().from(adminInbounds)
      .where(and(eq(adminInbounds.id, id), isNull(adminInbounds.deletedAt)));
    if (rows.length === 0) throw new NotFoundException('入库单不存在');
    return rows[0];
  }
}
