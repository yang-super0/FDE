import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { and, count, desc, eq, ilike, inArray, isNull, or, type SQL } from 'drizzle-orm';
import { adminPurchaseOrders, adminPurchaseRequests } from '@server/database/schema';
import type {
  AdminEnhanceListResponse, AdminEnhanceShipDto, AdminPurchaseOrder,
  CreateAdminPurchaseOrderDto, UpdateAdminPurchaseOrderDto,
} from '@shared/api.interface';
import { insertWithSeqNo } from '../finance-core/fin-seq.util';
import { parseIdList } from '../finance-core/query.util';
import {
  assertAdminNonNegativeNumber, assertAdminPositiveInt, assertAdminPositiveNumber,
  assertAdminRequired, formatAdminDateTime, resolveAdminPagination,
} from './admin-enhance-shared.util';

type OrderRow = typeof adminPurchaseOrders.$inferSelect;
type OrderInsert = typeof adminPurchaseOrders.$inferInsert;
type RequestRow = typeof adminPurchaseRequests.$inferSelect;
type OrderStrKey = 'supplierName' | 'itemName' | 'unit' | 'logisticsNo' | 'remark';

const ORDER_NO_PREFIX: string = 'CGDD';
const STATUS_PENDING: string = '待发货';
const STATUS_SHIPPED: string = '已发货';
const STATUS_CANCELLED: string = '已取消';
const STATUS_PURCHASED: string = '已采购';
const ITEM_TYPES: string[] = ['办公用品', '电子设备', '耗材', '其他'];
const CANCELLABLE_STATUSES: string[] = [STATUS_PENDING, STATUS_SHIPPED];
const DELETABLE_STATUSES: string[] = [STATUS_PENDING, STATUS_CANCELLED];
const ITEM_TYPE_ERROR: string = '物品类型必须为 办公用品/电子设备/耗材/其他';

const aliveCond = (id: number): SQL | undefined =>
  and(eq(adminPurchaseOrders.id, id), isNull(adminPurchaseOrders.deletedAt));

function mapOrder(row: OrderRow): AdminPurchaseOrder {
  return {
    id: row.id,
    orderNo: row.orderNo,
    requestId: row.requestId ?? null,
    supplierName: row.supplierName,
    itemName: row.itemName,
    itemType: row.itemType,
    quantity: row.quantity,
    unit: row.unit,
    unitPrice: Number(row.unitPrice),
    totalPrice: Number(row.totalPrice),
    orderDate: row.orderDate,
    expectedDate: row.expectedDate ?? null,
    status: row.status,
    logisticsNo: row.logisticsNo,
    remark: row.remark,
    createdAt: formatAdminDateTime(row.createdAt) ?? '',
    updatedAt: formatAdminDateTime(row.updatedAt) ?? '',
  };
}

/** 仅当字段提供时写入必填字符串（undefined 跳过，空白 → 400） */
function setRequiredString(
  patch: Partial<OrderInsert>, key: OrderStrKey, value: unknown, label: string,
): void {
  if (value === undefined) return;
  assertAdminRequired(value, label);
  patch[key] = String(value).trim();
}

/** 可选正整数 ID：未提供 / 空 → null；提供则非法 → 400 */
function parseOptionalId(value: unknown, label: string): number | null {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const parsed: number = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new BadRequestException(`请提供有效的${label}`);
  }
  return parsed;
}

@Injectable()
export class AdminPurchaseOrdersService {
  private readonly logger = new Logger(AdminPurchaseOrdersService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
  ) {}

  async list(params: {
    supplierName?: string;
    status?: string;
    keyword?: string;
    page?: string;
    pageSize?: string;
  }): Promise<AdminEnhanceListResponse<AdminPurchaseOrder>> {
    const { page, pageSize, offset } = resolveAdminPagination(params.page, params.pageSize);
    const conditions: SQL[] = [isNull(adminPurchaseOrders.deletedAt)];
    if (params.supplierName) {
      conditions.push(eq(adminPurchaseOrders.supplierName, params.supplierName));
    }
    if (params.status) conditions.push(eq(adminPurchaseOrders.status, params.status));
    if (params.keyword) {
      const kw: string = `%${params.keyword}%`;
      const keywordFilter = or(
        ilike(adminPurchaseOrders.orderNo, kw),
        ilike(adminPurchaseOrders.itemName, kw),
        ilike(adminPurchaseOrders.supplierName, kw),
      );
      if (keywordFilter) conditions.push(keywordFilter);
    }
    const where = and(...conditions);
    const totalRows: { count: number | string }[] = await this.db
      .select({ count: count() })
      .from(adminPurchaseOrders)
      .where(where);
    const rows: OrderRow[] = await this.db
      .select()
      .from(adminPurchaseOrders)
      .where(where)
      .orderBy(desc(adminPurchaseOrders.id))
      .limit(pageSize)
      .offset(offset);
    return {
      items: rows.map((row: OrderRow) => mapOrder(row)),
      total: Number(totalRows[0]?.count ?? 0),
      page,
      pageSize,
    };
  }

  async create(dto: CreateAdminPurchaseOrderDto): Promise<AdminPurchaseOrder> {
    assertAdminRequired(dto?.supplierName, '供应商');
    assertAdminRequired(dto?.itemName, '物品名称');
    assertAdminRequired(dto?.orderDate, '订单日期');
    const quantity: number = assertAdminPositiveInt(dto?.quantity, '数量');
    const unitPrice: number = assertAdminPositiveNumber(dto?.unitPrice, '单价');
    const itemType: string = String(dto?.itemType ?? '').trim() || '办公用品';
    if (!ITEM_TYPES.includes(itemType)) throw new BadRequestException(ITEM_TYPE_ERROR);
    const requestId: number | null = parseOptionalId(dto?.requestId, '采购申请 ID');
    const insertOrder = (db: PostgresJsDatabase, no: string): Promise<OrderRow[]> =>
      db.insert(adminPurchaseOrders).values({
        orderNo: no,
        requestId,
        supplierName: String(dto.supplierName).trim(),
        itemName: String(dto.itemName).trim(),
        itemType,
        quantity,
        unit: String(dto?.unit ?? '件').trim() || '件',
        unitPrice: unitPrice.toFixed(2),
        totalPrice: (quantity * unitPrice).toFixed(2),
        orderDate: String(dto.orderDate).trim(),
        expectedDate: dto?.expectedDate ?? null,
        status: STATUS_PENDING,
        logisticsNo: String(dto?.logisticsNo ?? '').trim(),
        remark: dto?.remark ?? '',
      } satisfies OrderInsert).returning();
    let row: OrderRow;
    if (requestId === null) {
      ({ row } = await insertWithSeqNo<OrderRow>({
        db: this.db,
        table: adminPurchaseOrders,
        noColumn: adminPurchaseOrders.orderNo,
        prefix: ORDER_NO_PREFIX,
        insert: (no: string) => insertOrder(this.db, no),
      }));
    } else {
      row = await this.db.transaction(async (tx) => {
        const requests: RequestRow[] = await tx.select().from(adminPurchaseRequests)
          .where(and(eq(adminPurchaseRequests.id, requestId), isNull(adminPurchaseRequests.deletedAt)))
          .limit(1);
        if (requests.length === 0 || requests[0].status !== '已通过') throw new BadRequestException('采购申请不存在或未通过审批');
        const inserted = await insertWithSeqNo<OrderRow>({
          db: tx,
          table: adminPurchaseOrders,
          noColumn: adminPurchaseOrders.orderNo,
          prefix: ORDER_NO_PREFIX,
          insert: (no: string) => insertOrder(tx, no),
        });
        const updated: { id: number }[] = await tx.update(adminPurchaseRequests)
          .set({ status: STATUS_PURCHASED, updatedAt: new Date() })
          .where(eq(adminPurchaseRequests.id, requestId))
          .returning({ id: adminPurchaseRequests.id });
        if (updated.length === 0) throw new NotFoundException('采购申请不存在');
        return inserted.row;
      });
    }
    this.logger.log(`采购订单创建成功 id=${String(row.id)} no=${row.orderNo}`);
    return mapOrder(row);
  }

  async update(id: number, dto: UpdateAdminPurchaseOrderDto): Promise<AdminPurchaseOrder> {
    const existing: OrderRow = await this.findOrderOrThrow(id);
    if (existing.status !== STATUS_PENDING) throw new ConflictException('仅待发货状态的采购订单允许修改');
    const patch: Partial<OrderInsert> = {};
    setRequiredString(patch, 'supplierName', dto?.supplierName, '供应商');
    setRequiredString(patch, 'itemName', dto?.itemName, '物品名称');
    setRequiredString(patch, 'unit', dto?.unit, '单位');
    setRequiredString(patch, 'logisticsNo', dto?.logisticsNo, '物流单号');
    if (dto?.remark !== undefined) patch.remark = String(dto.remark);
    if (dto?.itemType !== undefined) {
      const itemType: string = String(dto.itemType).trim();
      if (!ITEM_TYPES.includes(itemType)) throw new BadRequestException(ITEM_TYPE_ERROR);
      patch.itemType = itemType;
    }
    if (dto?.quantity !== undefined) {
      patch.quantity = assertAdminPositiveInt(dto.quantity, '数量');
    }
    if (dto?.unitPrice !== undefined) {
      patch.unitPrice = assertAdminPositiveNumber(dto.unitPrice, '单价').toFixed(2);
    }
    if (dto?.orderDate !== undefined) {
      assertAdminRequired(dto.orderDate, '订单日期');
      patch.orderDate = String(dto.orderDate).trim();
    }
    if (dto?.expectedDate !== undefined) patch.expectedDate = dto.expectedDate ?? null;
    if (dto?.totalPrice !== undefined) {
      patch.totalPrice = assertAdminNonNegativeNumber(dto.totalPrice, '总金额').toFixed(2);
    } else if (patch.quantity !== undefined || patch.unitPrice !== undefined) {
      const quantity: number = patch.quantity ?? existing.quantity;
      const price: number = patch.unitPrice !== undefined
        ? Number(patch.unitPrice)
        : Number(existing.unitPrice);
      patch.totalPrice = (quantity * price).toFixed(2);
    }
    if (Object.keys(patch).length === 0) throw new BadRequestException('未提供可更新字段');
    patch.updatedAt = new Date();
    return mapOrder(await this.applyPatch(id, patch));
  }

  async ship(id: number, dto: AdminEnhanceShipDto): Promise<AdminPurchaseOrder> {
    assertAdminRequired(dto?.logisticsNo, '物流单号');
    const existing: OrderRow = await this.findOrderOrThrow(id);
    if (existing.status !== STATUS_PENDING) throw new ConflictException('仅待发货状态的采购订单允许发货');
    return mapOrder(await this.applyPatch(id, {
      status: STATUS_SHIPPED,
      logisticsNo: String(dto.logisticsNo).trim(),
      updatedAt: new Date(),
    }));
  }

  async cancel(id: number): Promise<AdminPurchaseOrder> {
    const existing: OrderRow = await this.findOrderOrThrow(id);
    if (!CANCELLABLE_STATUSES.includes(existing.status)) throw new ConflictException('仅待发货或已发货的采购订单允许取消');
    return mapOrder(await this.applyPatch(id, {
      status: STATUS_CANCELLED,
      updatedAt: new Date(),
    }));
  }

  async remove(id: number): Promise<{ success: boolean }> {
    const existing: OrderRow = await this.findOrderOrThrow(id);
    if (!DELETABLE_STATUSES.includes(existing.status)) throw new ConflictException('仅待发货或已取消的采购订单允许删除');
    await this.applyPatch(id, { deletedAt: new Date(), updatedAt: new Date() });
    return { success: true };
  }

  async batchRemove(ids: unknown): Promise<{ deleted: number }> {
    const idList: number[] = parseIdList(ids);
    const rows: { id: number; status: string }[] = await this.db
      .select({ id: adminPurchaseOrders.id, status: adminPurchaseOrders.status })
      .from(adminPurchaseOrders)
      .where(and(inArray(adminPurchaseOrders.id, idList), isNull(adminPurchaseOrders.deletedAt)));
    const deletableIds: number[] = rows
      .filter((row: { id: number; status: string }) => DELETABLE_STATUSES.includes(row.status))
      .map((row: { id: number; status: string }) => row.id);
    if (deletableIds.length === 0) return { deleted: 0 };
    const updated: { id: number }[] = await this.db
      .update(adminPurchaseOrders)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(inArray(adminPurchaseOrders.id, deletableIds), isNull(adminPurchaseOrders.deletedAt)))
      .returning({ id: adminPurchaseOrders.id });
    return { deleted: updated.length };
  }

  private async applyPatch(id: number, patch: Partial<OrderInsert>): Promise<OrderRow> {
    const updated: OrderRow[] = await this.db
      .update(adminPurchaseOrders)
      .set(patch)
      .where(aliveCond(id))
      .returning();
    if (updated.length === 0) throw new NotFoundException('记录不存在');
    return updated[0];
  }

  private async findOrderOrThrow(id: number): Promise<OrderRow> {
    const rows: OrderRow[] = await this.db
      .select()
      .from(adminPurchaseOrders)
      .where(aliveCond(id))
      .limit(1);
    if (rows.length === 0) throw new NotFoundException('记录不存在');
    return rows[0];
  }
}
