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
import { adminPurchaseDetails, adminPurchaseOrders } from '@server/database/schema';
import type {
  AdminEnhanceListResponse, AdminEnhanceReceiveDto, AdminPurchaseDetail,
  CreateAdminPurchaseDetailDto, UpdateAdminPurchaseDetailDto,
} from '@shared/api.interface';
import { insertWithSeqNo } from '../finance-core/fin-seq.util';
import { parseIdList } from '../finance-core/query.util';
import {
  adminToday, assertAdminNonNegativeNumber, assertAdminPositiveInt, assertAdminRequired,
  formatAdminDateTime, increaseInventoryStock, resolveAdminPagination,
} from './admin-enhance-shared.util';

type DetailRow = typeof adminPurchaseDetails.$inferSelect;
type DetailInsert = typeof adminPurchaseDetails.$inferInsert;
type OrderRow = typeof adminPurchaseOrders.$inferSelect;

const DETAIL_NO_PREFIX: string = 'CGXQ';
const STATUS_WAITING: string = '待收货';
const STATUS_PARTIAL: string = '部分收货';
const STATUS_RECEIVED: string = '已收货';
const STATUS_DIFF: string = '有差异';
const STATUS_ORDER_STORED: string = '已入库';
const STATUS_ORDER_CANCELLED: string = '已取消';
const QUALITY_CHECKS: string[] = ['合格', '不合格', '待检'];
const RECEIVABLE_STATUSES: string[] = [STATUS_WAITING, STATUS_PARTIAL];
const DELETABLE_STATUSES: string[] = [STATUS_WAITING];
const ORDER_DONE_STATUSES: string[] = [STATUS_RECEIVED, STATUS_DIFF];
const QUALITY_CHECK_ERROR: string = '质检结果必须为 合格/不合格/待检';

const aliveCond = (id: number): SQL | undefined =>
  and(eq(adminPurchaseDetails.id, id), isNull(adminPurchaseDetails.deletedAt));

/** 正整数 ID 校验（订单 ID / 明细 ID） */
const parsePositiveId = (value: unknown, label: string): number => {
  const parsed: number = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new BadRequestException(`请提供有效的${label}`);
  }
  return parsed;
};

function mapDetail(row: DetailRow): AdminPurchaseDetail {
  return {
    id: row.id,
    detailNo: row.detailNo,
    orderId: row.orderId,
    itemName: row.itemName,
    specification: row.specification,
    quantity: row.quantity,
    unit: row.unit,
    unitPrice: Number(row.unitPrice),
    totalPrice: Number(row.totalPrice),
    receivedQuantity: row.receivedQuantity,
    status: row.status,
    receiveDate: row.receiveDate ?? null,
    qualityCheck: row.qualityCheck,
    remark: row.remark,
    createdAt: formatAdminDateTime(row.createdAt) ?? '',
    updatedAt: formatAdminDateTime(row.updatedAt) ?? '',
  };
}

@Injectable()
export class AdminPurchaseDetailsService {
  private readonly logger = new Logger(AdminPurchaseDetailsService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
  ) {}

  async list(params: {
    orderId?: string;
    status?: string;
    keyword?: string;
    page?: string;
    pageSize?: string;
  }): Promise<AdminEnhanceListResponse<AdminPurchaseDetail>> {
    const { page, pageSize, offset } = resolveAdminPagination(params.page, params.pageSize);
    const conditions: SQL[] = [isNull(adminPurchaseDetails.deletedAt)];
    if (params.orderId) {
      const orderId: number = parsePositiveId(params.orderId, '订单 ID');
      conditions.push(eq(adminPurchaseDetails.orderId, orderId));
    }
    if (params.status) conditions.push(eq(adminPurchaseDetails.status, params.status));
    if (params.keyword) {
      const kw: string = `%${params.keyword}%`;
      const keywordFilter = or(
        ilike(adminPurchaseDetails.detailNo, kw),
        ilike(adminPurchaseDetails.itemName, kw),
      );
      if (keywordFilter) conditions.push(keywordFilter);
    }
    const where = and(...conditions);
    const totalRows: { count: number | string }[] = await this.db
      .select({ count: count() })
      .from(adminPurchaseDetails)
      .where(where);
    const rows: DetailRow[] = await this.db
      .select()
      .from(adminPurchaseDetails)
      .where(where)
      .orderBy(desc(adminPurchaseDetails.id))
      .limit(pageSize)
      .offset(offset);
    return {
      items: rows.map((row: DetailRow) => mapDetail(row)),
      total: Number(totalRows[0]?.count ?? 0),
      page,
      pageSize,
    };
  }

  async create(dto: CreateAdminPurchaseDetailDto): Promise<AdminPurchaseDetail> {
    const orderId: number = parsePositiveId(dto?.orderId, '订单 ID');
    assertAdminRequired(dto?.itemName, '物品名称');
    const quantity: number = assertAdminPositiveInt(dto?.quantity, '数量');
    const unitPrice: number = dto?.unitPrice === undefined || dto.unitPrice === null
      ? 0
      : assertAdminNonNegativeNumber(dto.unitPrice, '单价');
    const totalPrice: number = dto?.totalPrice === undefined || dto.totalPrice === null
      ? quantity * unitPrice
      : assertAdminNonNegativeNumber(dto.totalPrice, '总金额');
    const orders: OrderRow[] = await this.db
      .select()
      .from(adminPurchaseOrders)
      .where(and(eq(adminPurchaseOrders.id, orderId), isNull(adminPurchaseOrders.deletedAt)))
      .limit(1);
    if (orders.length === 0 || orders[0].status === STATUS_ORDER_CANCELLED) {
      throw new BadRequestException('采购订单不存在或已取消');
    }
    const { row } = await insertWithSeqNo<DetailRow>({
      db: this.db,
      table: adminPurchaseDetails,
      noColumn: adminPurchaseDetails.detailNo,
      prefix: DETAIL_NO_PREFIX,
      insert: (no: string) =>
        this.db.insert(adminPurchaseDetails).values({
          detailNo: no,
          orderId,
          itemName: String(dto.itemName).trim(),
          specification: String(dto?.specification ?? '').trim(),
          quantity,
          unit: String(dto?.unit ?? '件').trim() || '件',
          unitPrice: unitPrice.toFixed(2),
          totalPrice: totalPrice.toFixed(2),
          receivedQuantity: 0,
          status: STATUS_WAITING,
          qualityCheck: '待检',
          remark: dto?.remark ?? '',
        } satisfies DetailInsert).returning(),
    });
    this.logger.log(`采购明细创建成功 id=${String(row.id)} no=${row.detailNo}`);
    return mapDetail(row);
  }

  async update(id: number, dto: UpdateAdminPurchaseDetailDto): Promise<AdminPurchaseDetail> {
    const existing: DetailRow = await this.findDetailOrThrow(id);
    if (existing.status !== STATUS_WAITING) throw new ConflictException('仅待收货状态的明细允许修改');
    const patch: Partial<DetailInsert> = {};
    if (dto?.itemName !== undefined) {
      assertAdminRequired(dto.itemName, '物品名称');
      patch.itemName = String(dto.itemName).trim();
    }
    if (dto?.specification !== undefined) patch.specification = String(dto.specification);
    if (dto?.quantity !== undefined) patch.quantity = assertAdminPositiveInt(dto.quantity, '数量');
    if (dto?.unit !== undefined) patch.unit = String(dto.unit).trim() || '件';
    if (dto?.unitPrice !== undefined) {
      patch.unitPrice = assertAdminNonNegativeNumber(dto.unitPrice, '单价').toFixed(2);
    }
    if (dto?.remark !== undefined) patch.remark = String(dto.remark);
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
    return mapDetail(await this.applyPatch(id, patch));
  }

  async receive(id: number, dto: AdminEnhanceReceiveDto): Promise<AdminPurchaseDetail> {
    const receivedQuantity: number = assertAdminPositiveInt(dto?.receivedQuantity, '收货数量');
    const qualityCheck: string = String(dto?.qualityCheck ?? '').trim();
    if (!QUALITY_CHECKS.includes(qualityCheck)) {
      throw new BadRequestException(QUALITY_CHECK_ERROR);
    }
    const existing: DetailRow = await this.findDetailOrThrow(id);
    if (!RECEIVABLE_STATUSES.includes(existing.status)) {
      throw new ConflictException('仅待收货或部分收货的明细允许收货');
    }
    if (receivedQuantity > existing.quantity) {
      throw new BadRequestException('收货数量不能超过采购数量');
    }
    const nextStatus: string = qualityCheck === '不合格'
      ? STATUS_DIFF
      : receivedQuantity >= existing.quantity ? STATUS_RECEIVED : STATUS_PARTIAL;
    let updatedRow: DetailRow | undefined;
    await this.db.transaction(async (tx) => {
      const updated: DetailRow[] = await tx
        .update(adminPurchaseDetails)
        .set({
          receivedQuantity,
          receiveDate: adminToday(),
          qualityCheck,
          status: nextStatus,
          updatedAt: new Date(),
        })
        .where(aliveCond(id))
        .returning();
      if (updated.length === 0) throw new NotFoundException('记录不存在');
      updatedRow = updated[0];
      await increaseInventoryStock(tx, {
        itemName: existing.itemName,
        specification: existing.specification || '',
        itemType: '其他',
        unit: existing.unit || '件',
        quantity: receivedQuantity,
      });
      const siblings: { status: string }[] = await tx
        .select({ status: adminPurchaseDetails.status })
        .from(adminPurchaseDetails)
        .where(and(eq(adminPurchaseDetails.orderId, existing.orderId), isNull(adminPurchaseDetails.deletedAt)));
      const allDone: boolean = siblings.length > 0
        && siblings.every((s: { status: string }) => ORDER_DONE_STATUSES.includes(s.status));
      if (allDone) {
        const orderUpdated: { id: number }[] = await tx
          .update(adminPurchaseOrders)
          .set({ status: STATUS_ORDER_STORED, updatedAt: new Date() })
          .where(and(eq(adminPurchaseOrders.id, existing.orderId), isNull(adminPurchaseOrders.deletedAt)))
          .returning({ id: adminPurchaseOrders.id });
        if (orderUpdated.length === 0) throw new NotFoundException('采购订单不存在');
      }
    });
    if (!updatedRow) throw new NotFoundException('记录不存在');
    return mapDetail(updatedRow);
  }

  async remove(id: number): Promise<{ success: boolean }> {
    const existing: DetailRow = await this.findDetailOrThrow(id);
    if (!DELETABLE_STATUSES.includes(existing.status)) {
      throw new ConflictException('仅待收货状态的明细允许删除');
    }
    await this.applyPatch(id, { deletedAt: new Date(), updatedAt: new Date() });
    return { success: true };
  }

  async batchRemove(ids: unknown): Promise<{ deleted: number }> {
    const idList: number[] = parseIdList(ids);
    const rows: { id: number; status: string }[] = await this.db
      .select({ id: adminPurchaseDetails.id, status: adminPurchaseDetails.status })
      .from(adminPurchaseDetails)
      .where(and(inArray(adminPurchaseDetails.id, idList), isNull(adminPurchaseDetails.deletedAt)));
    const deletableIds: number[] = rows
      .filter((row: { id: number; status: string }) => DELETABLE_STATUSES.includes(row.status))
      .map((row: { id: number; status: string }) => row.id);
    if (deletableIds.length === 0) return { deleted: 0 };
    const updated: { id: number }[] = await this.db
      .update(adminPurchaseDetails)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(inArray(adminPurchaseDetails.id, deletableIds), isNull(adminPurchaseDetails.deletedAt)))
      .returning({ id: adminPurchaseDetails.id });
    return { deleted: updated.length };
  }

  private async applyPatch(id: number, patch: Partial<DetailInsert>): Promise<DetailRow> {
    const updated: DetailRow[] = await this.db
      .update(adminPurchaseDetails)
      .set(patch)
      .where(aliveCond(id))
      .returning();
    if (updated.length === 0) throw new NotFoundException('记录不存在');
    return updated[0];
  }

  private async findDetailOrThrow(id: number): Promise<DetailRow> {
    const rows: DetailRow[] = await this.db
      .select()
      .from(adminPurchaseDetails)
      .where(aliveCond(id))
      .limit(1);
    if (rows.length === 0) throw new NotFoundException('记录不存在');
    return rows[0];
  }
}
