import {
  BadRequestException, ConflictException, Inject, Injectable, Logger, NotFoundException,
} from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import {
  and, count, desc, eq, ilike, isNull, ne, or, sql, type SQL,
} from 'drizzle-orm';
import { adminAssets } from '@server/database/schema';
import type {
  AdminAsset, AdminEnhanceAssetStats, AdminEnhanceListResponse,
  CreateAdminAssetDto, UpdateAdminAssetDto,
} from '@shared/api.interface';
import { insertWithSeqNo } from '@server/modules/finance-core/fin-seq.util';
import { publishSyncEvent } from '@server/modules/feishu-sync/sync-event.publisher';
import {
  adminToday, assertAdminDepreciationRate, assertAdminNonNegativeNumber,
  assertAdminRequired, computeAssetCurrentValue, formatAdminDateTime,
  resolveAdminPagination,
} from './admin-enhance-shared.util';

type AssetRow = typeof adminAssets.$inferSelect;
type AssetInsert = typeof adminAssets.$inferInsert;

export const ASSET_NO_PREFIX: string = 'ZC';

const STATUS_IN_USE: string = '在用';
const STATUS_SCRAPPED: string = '已报废';
const STATUS_CHECKED: string = '已盘点';
const ASSET_TYPES: string[] = ['电子设备', '办公家具', '车辆', '其他'];
const DATE_PATTERN: RegExp = /^\d{4}-\d{2}-\d{2}$/u;

const assertAssetType = (value: unknown): string => {
  const assetType: string = String(value ?? '').trim();
  if (!ASSET_TYPES.includes(assetType))
    throw new BadRequestException('资产类型必须为：电子设备/办公家具/车辆/其他');
  return assetType;
};

const assertAssetDate = (value: unknown, label: string): string => {
  const date: string = String(value ?? '').trim();
  if (!DATE_PATTERN.test(date))
    throw new BadRequestException(`${label}格式必须为 YYYY-MM-DD`);
  return date;
};

/** 可选折旧率：未提供 → 0；提供则 0-1 校验 */
const parseOptionalRate = (value: unknown, label: string): number =>
  value === undefined || value === null || String(value).trim() === ''
    ? 0
    : assertAdminDepreciationRate(value, label);

const round2 = (value: unknown): number =>
  Math.round(Number(value ?? 0) * 100) / 100;

function mapAsset(row: AssetRow): AdminAsset {
  return {
    id: row.id, assetNo: row.assetNo, assetName: row.assetName,
    assetType: row.assetType, specification: row.specification,
    purchaseDate: row.purchaseDate, purchasePrice: Number(row.purchasePrice),
    currentValue: Number(row.currentValue),
    depreciationRate: Number(row.depreciationRate),
    department: row.department, userName: row.userName,
    location: row.location, status: row.status,
    lastInventoryDate: row.lastInventoryDate ?? null, remark: row.remark,
    createdAt: formatAdminDateTime(row.createdAt) ?? '',
    updatedAt: formatAdminDateTime(row.updatedAt) ?? '',
  };
}

@Injectable()
export class AdminAssetsService {
  private readonly logger = new Logger(AdminAssetsService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async list(params: {
    assetType?: string; department?: string; status?: string;
    keyword?: string; page?: string; pageSize?: string;
  }): Promise<AdminEnhanceListResponse<AdminAsset>> {
    const { page, pageSize, offset } = resolveAdminPagination(
      params.page,
      params.pageSize,
    );
    const conditions: SQL[] = [isNull(adminAssets.deletedAt)];
    if (params.assetType) conditions.push(eq(adminAssets.assetType, params.assetType));
    if (params.department) {
      conditions.push(eq(adminAssets.department, params.department));
    }
    if (params.status) conditions.push(eq(adminAssets.status, params.status));
    if (params.keyword) {
      const kw: SQL | undefined = or(
        ilike(adminAssets.assetNo, `%${params.keyword}%`),
        ilike(adminAssets.assetName, `%${params.keyword}%`),
        ilike(adminAssets.userName, `%${params.keyword}%`),
      );
      if (kw) conditions.push(kw);
    }
    const where = and(...conditions);
    const totalRows: { count: number | string }[] = await this.db
      .select({ count: count() })
      .from(adminAssets)
      .where(where);
    const rows: AssetRow[] = await this.db
      .select()
      .from(adminAssets)
      .where(where)
      .orderBy(desc(adminAssets.id))
      .limit(pageSize)
      .offset(offset);
    return {
      items: rows.map((row: AssetRow) => mapAsset(row)),
      total: Number(totalRows[0]?.count ?? 0),
      page,
      pageSize,
    };
  }

  async stats(): Promise<AdminEnhanceAssetStats> {
    const rows = await this.db
      .select({
        total: count(),
        inUse: sql<number>`count(*) filter (where ${adminAssets.status} = '在用')`,
        idle: sql<number>`count(*) filter (where ${adminAssets.status} = '闲置')`,
        repairing: sql<number>`count(*) filter (where ${adminAssets.status} = '维修中')`,
        scrapped: sql<number>`count(*) filter (where ${adminAssets.status} = '已报废')`,
        totalPurchaseValue: sql<string>`coalesce(sum(${adminAssets.purchasePrice}), 0)`,
        totalCurrentValue: sql<string>`coalesce(sum(${adminAssets.currentValue}), 0)`,
      })
      .from(adminAssets)
      .where(isNull(adminAssets.deletedAt));
    const row = rows[0];
    return {
      total: Number(row?.total ?? 0),
      inUse: Number(row?.inUse ?? 0),
      idle: Number(row?.idle ?? 0),
      repairing: Number(row?.repairing ?? 0),
      scrapped: Number(row?.scrapped ?? 0),
      totalPurchaseValue: round2(row?.totalPurchaseValue),
      totalCurrentValue: round2(row?.totalCurrentValue),
    };
  }

  async create(dto: CreateAdminAssetDto): Promise<AdminAsset> {
    assertAdminRequired(dto?.assetName, '资产名称');
    const assetType: string = assertAssetType(dto?.assetType);
    const purchaseDate: string = assertAssetDate(dto?.purchaseDate, '购置日期');
    const purchasePrice: number = assertAdminNonNegativeNumber(dto?.purchasePrice, '购置价');
    const depreciationRate: number = parseOptionalRate(dto?.depreciationRate, '折旧率');
    const { row } = await insertWithSeqNo<AssetRow>({
      db: this.db,
      table: adminAssets,
      noColumn: adminAssets.assetNo,
      prefix: ASSET_NO_PREFIX,
      insert: (no: string) =>
        this.db
          .insert(adminAssets)
          .values({
            assetNo: no,
            assetName: String(dto.assetName).trim(),
            assetType,
            specification: dto?.specification ?? '',
            purchaseDate,
            purchasePrice: purchasePrice.toFixed(2),
            currentValue: computeAssetCurrentValue(purchasePrice, depreciationRate, purchaseDate).toFixed(2),
            depreciationRate: String(depreciationRate),
            department: dto?.department ?? '',
            userName: dto?.userName ?? '',
            location: dto?.location ?? '',
            status: typeof dto?.status === 'string' && dto.status.trim() !== '' ? dto.status.trim() : STATUS_IN_USE,
            remark: dto?.remark ?? '',
          } satisfies AssetInsert)
          .returning(),
    });
    this.logger.log(`资产创建成功 id=${String(row.id)} no=${row.assetNo}`);
    publishSyncEvent('admin_assets', row.id, 'create');
    return mapAsset(row);
  }

  async update(id: number, dto: UpdateAdminAssetDto): Promise<AdminAsset> {
    const existing: AssetRow = await this.findAssetOrThrow(id);
    if (existing.status === STATUS_SCRAPPED) {
      throw new ConflictException('已报废的资产不允许修改');
    }
    const patch: Partial<AssetInsert> = {};
    if (dto?.assetName !== undefined) {
      assertAdminRequired(dto.assetName, '资产名称');
      patch.assetName = String(dto.assetName).trim();
    }
    if (dto?.assetType !== undefined) patch.assetType = assertAssetType(dto.assetType);
    if (dto?.specification !== undefined) patch.specification = dto.specification;
    if (dto?.purchasePrice !== undefined) {
      patch.purchasePrice = assertAdminNonNegativeNumber(dto.purchasePrice, '购置价').toFixed(2);
    }
    if (dto?.depreciationRate !== undefined) {
      patch.depreciationRate = String(assertAdminDepreciationRate(dto.depreciationRate, '折旧率'));
    }
    if (dto?.purchaseDate !== undefined) {
      patch.purchaseDate = assertAssetDate(dto.purchaseDate, '购置日期');
    }
    if (
      patch.purchasePrice !== undefined ||
      patch.depreciationRate !== undefined ||
      patch.purchaseDate !== undefined
    ) {
      patch.currentValue = computeAssetCurrentValue(
        patch.purchasePrice !== undefined ? Number(patch.purchasePrice) : Number(existing.purchasePrice),
        patch.depreciationRate !== undefined ? Number(patch.depreciationRate) : Number(existing.depreciationRate),
        patch.purchaseDate !== undefined ? patch.purchaseDate : existing.purchaseDate,
      ).toFixed(2);
    }
    if (dto?.department !== undefined) patch.department = dto.department;
    if (dto?.userName !== undefined) patch.userName = dto.userName;
    if (dto?.location !== undefined) patch.location = dto.location;
    if (dto?.status !== undefined) patch.status = dto.status;
    if (dto?.remark !== undefined) patch.remark = dto.remark;
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }
    patch.updatedAt = new Date();
    const updated: AssetRow[] = await this.db
      .update(adminAssets)
      .set(patch)
      .where(and(eq(adminAssets.id, id), isNull(adminAssets.deletedAt)))
      .returning();
    if (updated.length === 0) {
      throw new NotFoundException('资产不存在');
    }
    publishSyncEvent('admin_assets', id, 'update');
    return mapAsset(updated[0]);
  }

  /** 盘点登记：任意非报废状态均可，登记后状态置为已盘点 */
  async inventoryCheck(id: number): Promise<AdminAsset> {
    const existing: AssetRow = await this.findAssetOrThrow(id);
    if (existing.status === STATUS_SCRAPPED) {
      throw new ConflictException('已报废的资产不允许盘点');
    }
    const updated: AssetRow[] = await this.db
      .update(adminAssets)
      .set({ lastInventoryDate: adminToday(), status: STATUS_CHECKED, updatedAt: new Date() })
      .where(and(eq(adminAssets.id, id), isNull(adminAssets.deletedAt)))
      .returning();
    if (updated.length === 0) {
      throw new NotFoundException('资产不存在');
    }
    publishSyncEvent('admin_assets', id, 'update');
    return mapAsset(updated[0]);
  }

  async remove(id: number): Promise<{ success: boolean }> {
    const existing: AssetRow = await this.findAssetOrThrow(id);
    if (existing.status === STATUS_SCRAPPED) {
      throw new ConflictException('已报废的资产不允许删除');
    }
    const updated: { id: number }[] = await this.db
      .update(adminAssets)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(adminAssets.id, id), isNull(adminAssets.deletedAt)))
      .returning({ id: adminAssets.id });
    if (updated.length === 0) {
      throw new NotFoundException('资产不存在');
    }
    publishSyncEvent('admin_assets', id, 'delete');
    return { success: true };
  }

  /** 批量软删：跳过已报废与已删除记录，返回实际删除数 */
  async batchRemove(ids: number[]): Promise<number> {
    if (ids.length === 0) {
      throw new BadRequestException('请提供要删除的资产');
    }
    const updated: { id: number }[] = await this.db
      .update(adminAssets)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(
        sql`${adminAssets.id} = ANY(ARRAY[${sql.join(
          ids.map((v: number) => sql`${v}`),
          sql`, `,
        )}]::bigint[])`,
        isNull(adminAssets.deletedAt),
        ne(adminAssets.status, STATUS_SCRAPPED),
      ))
      .returning({ id: adminAssets.id });
    for (const id of ids) {
      publishSyncEvent('admin_assets', id, 'delete');
    }
    return updated.length;
  }

  private async findAssetOrThrow(id: number): Promise<AssetRow> {
    const rows: AssetRow[] = await this.db
      .select()
      .from(adminAssets)
      .where(and(eq(adminAssets.id, id), isNull(adminAssets.deletedAt)));
    if (rows.length === 0) {
      throw new NotFoundException('资产不存在');
    }
    return rows[0];
  }
}
