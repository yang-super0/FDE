import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuthNPaasService,
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { and, count, desc, eq } from 'drizzle-orm';
import { announcement, asset } from '@server/database/schema';
import type {
  Announcement,
  Asset,
  AssetStatus,
  AssetSummary,
  PageResult,
} from '@shared/api.interface';
import { OperationLogService } from '../operation-log/operation-log.service';

const MODULE_NAME = '行政管理';

const ASSET_STATUS_IN_STOCK = 'in_stock';
const ASSET_STATUS_IN_USE = 'in_use';

@Injectable()
export class AdminAffairService {
  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
    private readonly authn: AuthNPaasService,
    private readonly operationLog: OperationLogService,
  ) {}

  private async resolveUserNames(ids: string[]): Promise<Map<string, string>> {
    const nameMap = new Map<string, string>();
    const uniqueIds: string[] = Array.from(
      new Set(ids.filter((id: string) => Boolean(id))),
    );
    if (uniqueIds.length === 0) return nameMap;
    const users = await this.authn.listUsersByIds(uniqueIds.slice(0, 100));
    users.forEach((user, index: number) => {
      if (user) {
        nameMap.set(
          uniqueIds[index],
          user.name?.zh_cn ?? user.name?.en_us ?? '',
        );
      }
    });
    return nameMap;
  }

  async getAssetSummary(): Promise<AssetSummary> {
    const rows = await this.db
      .select({ status: asset.status, count: count() })
      .from(asset)
      .groupBy(asset.status);
    let total = 0;
    let inUse = 0;
    let inStock = 0;
    rows.forEach((row: { status: string; count: number }) => {
      const rowCount: number = Number(row.count);
      total += rowCount;
      if (row.status === ASSET_STATUS_IN_USE) inUse = rowCount;
      if (row.status === ASSET_STATUS_IN_STOCK) inStock = rowCount;
    });
    return { total, inUse, inStock };
  }

  async listAssets(params: {
    status?: AssetStatus;
    page: number;
    pageSize: number;
  }): Promise<PageResult<Asset>> {
    const { status, page, pageSize } = params;
    const where = status ? eq(asset.status, status) : undefined;

    const rows = where
      ? await this.db
          .select()
          .from(asset)
          .where(where)
          .limit(pageSize)
          .offset((page - 1) * pageSize)
      : await this.db
          .select()
          .from(asset)
          .limit(pageSize)
          .offset((page - 1) * pageSize);

    const totalResult = where
      ? await this.db.select({ count: count() }).from(asset).where(where)
      : await this.db.select({ count: count() }).from(asset);
    const total: number = Number(totalResult[0]?.count ?? 0);

    const holderIds: string[] = rows
      .map((row) => row.holder)
      .filter((holder): holder is string => Boolean(holder));
    const nameMap = await this.resolveUserNames(holderIds);

    const items: Asset[] = rows.map((row) => ({
      id: row.id,
      name: row.name,
      assetNo: row.assetNo,
      holderId: row.holder ?? '',
      holderName: row.holder ? nameMap.get(row.holder) ?? '' : '',
      status: row.status as AssetStatus,
    }));

    return { items, total };
  }

  async createAsset(input: {
    name: string;
    assetNo: string;
    status?: AssetStatus;
    operatorId: string;
  }): Promise<{ id: string }> {
    const inserted = await this.db
      .insert(asset)
      .values({
        name: input.name,
        assetNo: input.assetNo,
        status: input.status ?? ASSET_STATUS_IN_STOCK,
        createdBy: input.operatorId,
      })
      .returning({ id: asset.id });
    const created = inserted[0];
    if (!created) {
      throw new ConflictException('资产创建失败');
    }
    await this.operationLog.record({
      module: MODULE_NAME,
      actionType: 'create',
      target: `登记资产 ${input.name}（${input.assetNo}）`,
      operatorId: input.operatorId,
    });
    return { id: created.id };
  }

  async claimAsset(
    id: string,
    operatorId: string,
  ): Promise<{ success: boolean }> {
    const updated = await this.db
      .update(asset)
      .set({ holder: operatorId, status: ASSET_STATUS_IN_USE })
      .where(and(eq(asset.id, id), eq(asset.status, ASSET_STATUS_IN_STOCK)))
      .returning({ id: asset.id, name: asset.name });

    if (updated.length === 0) {
      const existing = await this.db
        .select({ id: asset.id })
        .from(asset)
        .where(eq(asset.id, id));
      if (existing.length === 0) {
        throw new NotFoundException('资产不存在');
      }
      throw new ConflictException('该资产当前不在库，无法领用');
    }

    const claimed = updated[0];
    await this.operationLog.record({
      module: MODULE_NAME,
      actionType: 'status_change',
      target: `领用资产 ${claimed?.name ?? id}`,
      operatorId,
    });
    return { success: true };
  }

  async returnAsset(
    id: string,
    operatorId: string,
  ): Promise<{ success: boolean }> {
    const updated = await this.db
      .update(asset)
      .set({ holder: null, status: ASSET_STATUS_IN_STOCK })
      .where(and(eq(asset.id, id), eq(asset.status, ASSET_STATUS_IN_USE)))
      .returning({ id: asset.id, name: asset.name });

    if (updated.length === 0) {
      const existing = await this.db
        .select({ id: asset.id })
        .from(asset)
        .where(eq(asset.id, id));
      if (existing.length === 0) {
        throw new NotFoundException('资产不存在');
      }
      throw new ConflictException('该资产当前不在用，无法归还');
    }

    const returned = updated[0];
    await this.operationLog.record({
      module: MODULE_NAME,
      actionType: 'status_change',
      target: `归还资产 ${returned?.name ?? id}`,
      operatorId,
    });
    return { success: true };
  }

  async listAnnouncements(params: {
    page: number;
    pageSize: number;
  }): Promise<PageResult<Announcement>> {
    const { page, pageSize } = params;
    const rows = await this.db
      .select()
      .from(announcement)
      .orderBy(desc(announcement.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const totalResult = await this.db
      .select({ count: count() })
      .from(announcement);
    const total: number = Number(totalResult[0]?.count ?? 0);

    const publisherIds: string[] = rows
      .map((row) => row.createdBy)
      .filter((createdBy): createdBy is string => Boolean(createdBy));
    const nameMap = await this.resolveUserNames(publisherIds);

    const items: Announcement[] = rows.map((row) => ({
      id: row.id,
      title: row.title,
      content: row.content,
      publisherName: row.createdBy
        ? nameMap.get(row.createdBy) ?? ''
        : '',
      createdAt: row.createdAt.toISOString(),
    }));

    return { items, total };
  }

  async createAnnouncement(input: {
    title: string;
    content: string;
    operatorId: string;
  }): Promise<{ id: string }> {
    const inserted = await this.db
      .insert(announcement)
      .values({
        title: input.title,
        content: input.content,
        createdBy: input.operatorId,
      })
      .returning({ id: announcement.id });
    const created = inserted[0];
    if (!created) {
      throw new ConflictException('公告创建失败');
    }
    await this.operationLog.record({
      module: MODULE_NAME,
      actionType: 'create',
      target: `发布公告 ${input.title}`,
      operatorId: input.operatorId,
    });
    return { id: created.id };
  }
}
