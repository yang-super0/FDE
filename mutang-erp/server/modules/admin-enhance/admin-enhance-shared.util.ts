import { and, eq, isNull, sql } from 'drizzle-orm';
import { BadRequestException, ConflictException } from '@nestjs/common';
import type { PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { adminInventory } from '@server/database/schema';
import { insertWithSeqNo } from '@server/modules/finance-core/fin-seq.util';

export const ADMIN_PAGE_SIZE_MAX: number = 100;
export const INVENTORY_NO_PREFIX: string = 'KC';

export interface AdminPagination {
  page: number;
  pageSize: number;
  offset: number;
}

export function resolveAdminPagination(
  page?: string,
  pageSize?: string,
): AdminPagination {
  const parsedPage: number = Math.max(1, Number(page ?? 1) || 1);
  const parsedSize: number = Math.min(
    ADMIN_PAGE_SIZE_MAX,
    Math.max(1, Number(pageSize ?? 10) || 10),
  );
  return {
    page: parsedPage,
    pageSize: parsedSize,
    offset: (parsedPage - 1) * parsedSize,
  };
}

/** 必填校验：undefined / null / 空白字符串 → 400 */
export function assertAdminRequired(value: unknown, label: string): void {
  if (value === undefined || value === null || String(value).trim() === '') {
    throw new BadRequestException(`${label}不能为空`);
  }
}

/** 正整数校验（数量），非正整数 → 400 */
export function assertAdminPositiveInt(value: unknown, label: string): number {
  const num: number = Number(value);
  if (!Number.isInteger(num) || num <= 0) {
    throw new BadRequestException(`${label}必须为正整数`);
  }
  return num;
}

/** 非负整数校验（数量），负数 → 400 */
export function assertAdminNonNegativeInt(
  value: unknown,
  label: string,
): number {
  const num: number = Number(value);
  if (!Number.isInteger(num) || num < 0) {
    throw new BadRequestException(`${label}不能为负数`);
  }
  return num;
}

/** 正数校验（金额），非正数 → 400 */
export function assertAdminPositiveNumber(
  value: unknown,
  label: string,
): number {
  const num: number = Number(value);
  if (!Number.isFinite(num) || num <= 0) {
    throw new BadRequestException(`${label}必须大于0`);
  }
  return num;
}

/** 非负数校验（金额），负数 → 400 */
export function assertAdminNonNegativeNumber(
  value: unknown,
  label: string,
): number {
  const num: number = Number(value);
  if (!Number.isFinite(num) || num < 0) {
    throw new BadRequestException(`${label}不能为负数`);
  }
  return num;
}

/** 折旧率校验：0 <= rate <= 1 */
export function assertAdminDepreciationRate(
  value: unknown,
  label: string,
): number {
  const num: number = Number(value);
  if (!Number.isFinite(num) || num < 0 || num > 1) {
    throw new BadRequestException(`${label}必须在0-1之间`);
  }
  return num;
}

/** 业务时区（Asia/Shanghai）当天日期，YYYY-MM-DD */
export function adminToday(): string {
  const now: Date = new Date();
  return new Date(now.getTime() + 8 * 3600 * 1000)
    .toISOString()
    .slice(0, 10);
}

/** 时间戳 → YYYY-MM-DD HH:mm:ss（东八区） */
export function formatAdminDateTime(
  value: Date | null | undefined,
): string | null {
  if (!value) return null;
  return new Date(value.getTime() + 8 * 3600 * 1000)
    .toISOString()
    .slice(0, 19)
    .replace('T', ' ');
}

/** 库存状态：<=0 缺货；< minStock 预警；否则 正常 */
export function computeInventoryStatus(
  quantity: number,
  minStock: number,
): string {
  if (quantity <= 0) return '缺货';
  if (minStock > 0 && quantity < minStock) return '预警';
  return '正常';
}

/** 资产当前价值 = 购置价 × (1 - 折旧率 × 使用年限)，下限 0，保留 2 位小数 */
export function computeAssetCurrentValue(
  purchasePrice: number,
  depreciationRate: number,
  purchaseDate: string,
): number {
  const purchaseTime: number = new Date(`${purchaseDate}T00:00:00Z`).getTime();
  if (!Number.isFinite(purchaseTime)) return purchasePrice;
  const years: number =
    (Date.now() - purchaseTime) / (365 * 24 * 3600 * 1000);
  const value: number = purchasePrice * (1 - depreciationRate * years);
  return Math.round(Math.max(0, value) * 100) / 100;
}

export interface InventoryAdjustOptions {
  itemName: string;
  specification: string;
  itemType: string;
  unit: string;
  quantity: number;
}

/** 入库：库存增加（物资不存在时自动建档），同时更新状态与最近入库日期。可在事务内传 tx。 */
export async function increaseInventoryStock(
  db: PostgresJsDatabase,
  opts: InventoryAdjustOptions,
): Promise<void> {
  const existing = await db
    .select({ id: adminInventory.id })
    .from(adminInventory)
    .where(
      and(
        eq(adminInventory.itemName, opts.itemName),
        eq(adminInventory.specification, opts.specification),
        isNull(adminInventory.deletedAt),
      ),
    )
    .limit(1);
  const today: string = adminToday();
  if (existing.length > 0) {
    await db
      .update(adminInventory)
      .set({
        quantity: sql`${adminInventory.quantity} + ${opts.quantity}`,
        status: sql`CASE
          WHEN ${adminInventory.quantity} + ${opts.quantity} <= 0 THEN '缺货'
          WHEN ${adminInventory.quantity} + ${opts.quantity} < ${adminInventory.minStock} THEN '预警'
          ELSE '正常' END`,
        lastInDate: today,
        updatedAt: new Date(),
      })
      .where(eq(adminInventory.id, existing[0].id));
    return;
  }
  await insertWithSeqNo({
    db,
    table: adminInventory,
    noColumn: adminInventory.inventoryNo,
    prefix: INVENTORY_NO_PREFIX,
    insert: async (no: string) =>
      db
        .insert(adminInventory)
        .values({
          inventoryNo: no,
          itemName: opts.itemName,
          itemType: opts.itemType,
          specification: opts.specification,
          unit: opts.unit,
          quantity: opts.quantity,
          minStock: 0,
          maxStock: 0,
          location: '',
          status: computeInventoryStatus(opts.quantity, 0),
          lastInDate: today,
          remark: '',
        })
        .returning(),
  });
}

/** 出库：原子扣减库存（WHERE quantity >= 扣减数），不足 → 409 */
export async function decreaseInventoryStock(
  db: PostgresJsDatabase,
  opts: {
    itemName: string;
    specification: string;
    quantity: number;
  },
): Promise<void> {
  const updated = await db
    .update(adminInventory)
    .set({
      quantity: sql`${adminInventory.quantity} - ${opts.quantity}`,
      status: sql`CASE
        WHEN ${adminInventory.quantity} - ${opts.quantity} <= 0 THEN '缺货'
        WHEN ${adminInventory.quantity} - ${opts.quantity} < ${adminInventory.minStock} THEN '预警'
        ELSE '正常' END`,
      lastOutDate: adminToday(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(adminInventory.itemName, opts.itemName),
        eq(adminInventory.specification, opts.specification),
        isNull(adminInventory.deletedAt),
        sql`${adminInventory.quantity} >= ${opts.quantity}`,
      ),
    )
    .returning({ id: adminInventory.id });
  if (updated.length === 0) {
    throw new ConflictException(
      `库存不足：${opts.itemName} 当前库存无法满足出库数量 ${opts.quantity}`,
    );
  }
}
