import {
  BadRequestException, Inject, Injectable, Logger, NotFoundException,
} from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import {
  and, count, desc, eq, ilike, inArray, isNull, or, sql, type SQL,
} from 'drizzle-orm';
import { adminInventory } from '@server/database/schema';
import type {
  AdminEnhanceInventoryStats, AdminEnhanceListResponse, AdminInventoryItem,
  CreateAdminInventoryItemDto, UpdateAdminInventoryItemDto,
} from '@shared/api.interface';
import { insertWithSeqNo } from '@server/modules/finance-core/fin-seq.util';
import { publishSyncEvent } from '@server/modules/feishu-sync/sync-event.publisher';
import {
  INVENTORY_NO_PREFIX, adminToday, assertAdminNonNegativeInt,
  assertAdminPositiveInt, assertAdminRequired, computeInventoryStatus,
  formatAdminDateTime, resolveAdminPagination,
} from './admin-enhance-shared.util';

type InventoryRow = typeof adminInventory.$inferSelect;
type InventoryInsert = typeof adminInventory.$inferInsert;

const ITEM_TYPES: string[] = ['办公用品', '电子设备', '耗材', '其他'];

const assertItemType = (value: unknown): string => {
  const itemType: string = String(value ?? '').trim();
  if (!ITEM_TYPES.includes(itemType))
    throw new BadRequestException('物品类型必须为：办公用品/电子设备/耗材/其他');
  return itemType;
};

/** 可选非负整数：未提供 → 0；提供则非负校验 */
const parseOptionalNonNegativeInt = (
  value: unknown,
  label: string,
): number => {
  if (value === undefined || value === null || String(value).trim() === '') {
    return 0;
  }
  return assertAdminNonNegativeInt(value, label);
};

function mapInventory(row: InventoryRow): AdminInventoryItem {
  return {
    id: row.id, inventoryNo: row.inventoryNo, itemName: row.itemName,
    itemType: row.itemType, specification: row.specification, unit: row.unit,
    quantity: row.quantity, minStock: row.minStock, maxStock: row.maxStock,
    location: row.location, status: row.status, remark: row.remark,
    lastInDate: row.lastInDate ?? null, lastOutDate: row.lastOutDate ?? null,
    createdAt: formatAdminDateTime(row.createdAt) ?? '',
    updatedAt: formatAdminDateTime(row.updatedAt) ?? '',
  };
}

@Injectable()
export class AdminInventoryService {
  private readonly logger = new Logger(AdminInventoryService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async list(params: {
    itemType?: string; status?: string; location?: string;
    keyword?: string; page?: string; pageSize?: string;
  }): Promise<AdminEnhanceListResponse<AdminInventoryItem>> {
    const { page, pageSize, offset } = resolveAdminPagination(
      params.page,
      params.pageSize,
    );
    const conditions: SQL[] = [isNull(adminInventory.deletedAt)];
    if (params.itemType) conditions.push(eq(adminInventory.itemType, params.itemType));
    if (params.status) conditions.push(eq(adminInventory.status, params.status));
    if (params.location) {
      conditions.push(eq(adminInventory.location, params.location));
    }
    if (params.keyword) {
      const keywordCondition: SQL | undefined = or(
        ilike(adminInventory.inventoryNo, `%${params.keyword}%`),
        ilike(adminInventory.itemName, `%${params.keyword}%`),
        ilike(adminInventory.specification, `%${params.keyword}%`),
      );
      if (keywordCondition) conditions.push(keywordCondition);
    }
    const where = and(...conditions);
    const totalRows: { count: number | string }[] = await this.db
      .select({ count: count() })
      .from(adminInventory)
      .where(where);
    const rows: InventoryRow[] = await this.db
      .select()
      .from(adminInventory)
      .where(where)
      .orderBy(desc(adminInventory.id))
      .limit(pageSize)
      .offset(offset);
    return {
      items: rows.map((row: InventoryRow) => mapInventory(row)),
      total: Number(totalRows[0]?.count ?? 0),
      page,
      pageSize,
    };
  }

  async stats(): Promise<AdminEnhanceInventoryStats> {
    const rows = await this.db
      .select({
        totalItems: count(),
        totalQuantity: sql<string>`coalesce(sum(${adminInventory.quantity}), 0)`,
        warningCount: sql<number>`count(*) filter (where ${adminInventory.status} = '预警')`,
        shortageCount: sql<number>`count(*) filter (where ${adminInventory.status} = '缺货')`,
      })
      .from(adminInventory)
      .where(isNull(adminInventory.deletedAt));
    const row = rows[0];
    return {
      totalItems: Number(row?.totalItems ?? 0),
      totalQuantity: Number(row?.totalQuantity ?? 0),
      warningCount: Number(row?.warningCount ?? 0),
      shortageCount: Number(row?.shortageCount ?? 0),
    };
  }

  async create(dto: CreateAdminInventoryItemDto): Promise<AdminInventoryItem> {
    assertAdminRequired(dto?.itemName, '物品名称');
    const itemType: string = assertItemType(dto?.itemType);
    assertAdminRequired(dto?.unit, '单位');
    assertAdminRequired(dto?.location, '存放位置');
    const quantity: number = assertAdminPositiveInt(dto?.quantity, '库存数量');
    const minStock: number = parseOptionalNonNegativeInt(dto?.minStock, '最低库存');
    const maxStock: number = parseOptionalNonNegativeInt(dto?.maxStock, '最高库存');
    const status: string = computeInventoryStatus(quantity, minStock);
    const { row } = await insertWithSeqNo<InventoryRow>({
      db: this.db,
      table: adminInventory,
      noColumn: adminInventory.inventoryNo,
      prefix: INVENTORY_NO_PREFIX,
      insert: (no: string) =>
        this.db
          .insert(adminInventory)
          .values({
            inventoryNo: no,
            itemName: String(dto.itemName).trim(),
            itemType,
            specification: dto?.specification ?? '',
            unit: String(dto.unit).trim(),
            quantity,
            minStock,
            maxStock,
            location: String(dto.location).trim(),
            status,
            lastInDate: adminToday(),
            remark: dto?.remark ?? '',
          } satisfies InventoryInsert)
          .returning(),
    });
    this.logger.log(`库存建档成功 id=${String(row.id)} no=${row.inventoryNo} status=${status}`);
    publishSyncEvent('admin_inventory', row.id, 'create');
    return mapInventory(row);
  }

  async update(
    id: number,
    dto: UpdateAdminInventoryItemDto,
  ): Promise<AdminInventoryItem> {
    const existing: InventoryRow = await this.findInventoryOrThrow(id);
    const patch: Partial<InventoryInsert> = {};
    if (dto?.itemName !== undefined) {
      assertAdminRequired(dto.itemName, '物品名称');
      patch.itemName = String(dto.itemName).trim();
    }
    if (dto?.itemType !== undefined) patch.itemType = assertItemType(dto.itemType);
    if (dto?.specification !== undefined) patch.specification = dto.specification;
    if (dto?.unit !== undefined) {
      assertAdminRequired(dto.unit, '单位');
      patch.unit = dto.unit;
    }
    if (dto?.quantity !== undefined) {
      patch.quantity = assertAdminNonNegativeInt(dto.quantity, '库存数量');
    }
    if (dto?.minStock !== undefined) {
      patch.minStock = assertAdminNonNegativeInt(dto.minStock, '最低库存');
    }
    if (dto?.maxStock !== undefined) {
      patch.maxStock = assertAdminNonNegativeInt(dto.maxStock, '最高库存');
    }
    if (patch.quantity !== undefined || patch.minStock !== undefined) {
      patch.status = computeInventoryStatus(
        patch.quantity !== undefined ? patch.quantity : existing.quantity,
        patch.minStock !== undefined ? patch.minStock : existing.minStock,
      );
    } else if (dto?.status !== undefined) {
      patch.status = dto.status;
    }
    if (dto?.location !== undefined) patch.location = dto.location;
    if (dto?.remark !== undefined) patch.remark = dto.remark;
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }
    patch.updatedAt = new Date();
    const updated: InventoryRow[] = await this.db
      .update(adminInventory)
      .set(patch)
      .where(and(eq(adminInventory.id, id), isNull(adminInventory.deletedAt)))
      .returning();
    if (updated.length === 0) {
      throw new NotFoundException('库存记录不存在');
    }
    publishSyncEvent('admin_inventory', id, 'update');
    return mapInventory(updated[0]);
  }

  async remove(id: number): Promise<{ success: boolean }> {
    await this.findInventoryOrThrow(id);
    const updated: { id: number }[] = await this.db
      .update(adminInventory)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(adminInventory.id, id), isNull(adminInventory.deletedAt)))
      .returning({ id: adminInventory.id });
    if (updated.length === 0) {
      throw new NotFoundException('库存记录不存在');
    }
    publishSyncEvent('admin_inventory', id, 'delete');
    return { success: true };
  }

  /** 批量软删：全部库存记录均可删除，返回实际删除数 */
  async batchRemove(ids: number[]): Promise<number> {
    if (ids.length === 0) {
      throw new BadRequestException('请提供要删除的库存记录');
    }
    const updated: { id: number }[] = await this.db
      .update(adminInventory)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(inArray(adminInventory.id, ids), isNull(adminInventory.deletedAt)))
      .returning({ id: adminInventory.id });
    for (const id of ids) {
      publishSyncEvent('admin_inventory', id, 'delete');
    }
    return updated.length;
  }

  private async findInventoryOrThrow(id: number): Promise<InventoryRow> {
    const rows: InventoryRow[] = await this.db
      .select()
      .from(adminInventory)
      .where(and(eq(adminInventory.id, id), isNull(adminInventory.deletedAt)));
    if (rows.length === 0) {
      throw new NotFoundException('库存记录不存在');
    }
    return rows[0];
  }
}
