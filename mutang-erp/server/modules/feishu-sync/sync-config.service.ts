import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  type OnModuleInit,
} from '@nestjs/common';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { eq, sql } from 'drizzle-orm';
import type {
  SyncConfigItem,
  SyncConfigUpdateDto,
  SyncFieldMappingItem,
} from '@shared/api.interface';
import { syncConfigs } from '@server/database/schema';
import { SYNC_TABLES, SYNC_TABLE_MAP } from './sync-tables.constants';
import { FeishuBitableService } from './feishu-bitable.service';
import { FieldMappingService } from './field-mapping.service';

const CONFIG_CACHE_TTL_MS = 30 * 1000;
const BOOTSTRAP_DELAY_MS = 3000;

export type SyncConfigRow = typeof syncConfigs.$inferSelect;

interface ConfigCacheEntry {
  config: SyncConfigRow | null;
  expiresAt: number;
}

@Injectable()
export class SyncConfigService implements OnModuleInit {
  private readonly logger = new Logger(SyncConfigService.name);
  private readonly configCache = new Map<string, ConfigCacheEntry>();

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly bitableService: FeishuBitableService,
    private readonly fieldMappingService: FieldMappingService,
  ) {}

  /** 启动时仅做纯 DB 快操作；飞书建表放后台延迟任务，绝不阻塞启动 */
  async onModuleInit(): Promise<void> {
    await this.ensureConfigs();
    setTimeout((): void => {
      void this.bootstrapBitableTables();
    }, BOOTSTRAP_DELAY_MS);
  }

  /** 为 23 张业务表初始化同步配置（幂等，已存在不动） */
  async ensureConfigs(): Promise<void> {
    await this.db
      .insert(syncConfigs)
      .values(
        SYNC_TABLES.map(
          (entry): typeof syncConfigs.$inferInsert => ({
            tableName: entry.tableName,
            bitableTableName: entry.displayName,
            enabled: true,
          }),
        ),
      )
      .onConflictDoNothing({ target: syncConfigs.tableName });
  }

  async listConfigs(): Promise<SyncConfigItem[]> {
    const rows: SyncConfigRow[] = await this.db
      .select()
      .from(syncConfigs)
      .orderBy(syncConfigs.tableName);
    return rows.map((row: SyncConfigRow): SyncConfigItem => this.toItem(row));
  }

  /** PATCH 语义：只写 dto 中明确提供的字段 */
  async updateConfig(
    id: number,
    dto: SyncConfigUpdateDto,
  ): Promise<SyncConfigItem> {
    const patch: Partial<typeof syncConfigs.$inferInsert> = {};
    if (dto.enabled !== undefined) patch.enabled = dto.enabled;
    if (dto.fieldMapping !== undefined) {
      patch.fieldMapping = JSON.stringify(dto.fieldMapping);
    }
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }
    patch.updatedAt = new Date();
    const updated: SyncConfigRow[] = await this.db
      .update(syncConfigs)
      .set(patch)
      .where(eq(syncConfigs.id, id))
      .returning();
    if (updated.length === 0) {
      throw new NotFoundException('同步配置不存在');
    }
    this.invalidateConfigCache(updated[0].tableName);
    return this.toItem(updated[0]);
  }

  async setEnabled(id: number, enabled: boolean): Promise<SyncConfigItem> {
    const updated: SyncConfigRow[] = await this.db
      .update(syncConfigs)
      .set({ enabled, updatedAt: new Date() })
      .where(eq(syncConfigs.id, id))
      .returning();
    if (updated.length === 0) {
      throw new NotFoundException('同步配置不存在');
    }
    this.invalidateConfigCache(updated[0].tableName);
    return this.toItem(updated[0]);
  }

  /** 同步成功后原子自增 syncCount 并刷新 lastSyncTime */
  async markSynced(tableName: string, count: number): Promise<void> {
    const updated: Array<{ id: number }> = await this.db
      .update(syncConfigs)
      .set({
        syncCount: sql`${syncConfigs.syncCount} + ${count}`,
        lastSyncTime: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(syncConfigs.tableName, tableName))
      .returning({ id: syncConfigs.id });
    if (updated.length === 0) {
      this.logger.warn(`同步配置不存在，跳过统计更新: ${tableName}`);
    }
  }

  /** 按表名读取配置（30s 内存缓存，供事件消费判断 enabled） */
  async getConfigByTableName(tableName: string): Promise<SyncConfigRow | null> {
    const now: number = Date.now();
    const cached = this.configCache.get(tableName);
    if (cached && now < cached.expiresAt) {
      return cached.config;
    }
    const rows: SyncConfigRow[] = await this.db
      .select()
      .from(syncConfigs)
      .where(eq(syncConfigs.tableName, tableName))
      .limit(1);
    const config: SyncConfigRow | null = rows[0] ?? null;
    this.configCache.set(tableName, {
      config,
      expiresAt: now + CONFIG_CACHE_TTL_MS,
    });
    return config;
  }

  invalidateConfigCache(tableName: string): void {
    this.configCache.delete(tableName);
  }

  /** 后台初始化：凭证有效时为缺 bitableTableId 的表创建多维表格（凭证无效直接跳过） */
  private async bootstrapBitableTables(): Promise<void> {
    try {
      const credentialsOk: boolean =
        await this.bitableService.testCredentials();
      if (!credentialsOk) {
        this.logger.warn('飞书凭证无效，跳过多维表格初始化');
        return;
      }
      const configs: SyncConfigRow[] = await this.db
        .select()
        .from(syncConfigs)
        .orderBy(syncConfigs.tableName);
      for (const config of configs) {
        if (config.bitableTableId) continue;
        try {
          const mapping: SyncFieldMappingItem[] =
            this.fieldMappingService.getTableMapping(config.tableName);
          const displayName: string =
            config.bitableTableName ??
            SYNC_TABLE_MAP.get(config.tableName)?.displayName ??
            config.tableName;
          const tableId: string = await this.bitableService.createTable(
            displayName,
            mapping,
          );
          await this.db
            .update(syncConfigs)
            .set({
              bitableTableId: tableId,
              bitableTableName: displayName,
              fieldMapping:
                config.fieldMapping ?? JSON.stringify(mapping),
              updatedAt: new Date(),
            })
            .where(eq(syncConfigs.id, config.id));
          this.invalidateConfigCache(config.tableName);
          this.logger.log(`已创建多维表格: ${displayName}(${tableId})`);
        } catch (error) {
          this.logger.error(
            `初始化多维表格失败 ${config.tableName}: ${stringifyError(error)}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(`多维表格初始化异常: ${stringifyError(error)}`);
    }
  }

  private toItem(row: SyncConfigRow): SyncConfigItem {
    const displayName: string =
      SYNC_TABLE_MAP.get(row.tableName)?.displayName ?? row.tableName;
    let fieldMapping: SyncFieldMappingItem[] | null = null;
    if (Array.isArray(row.fieldMapping) && row.fieldMapping.length > 0) {
      fieldMapping = row.fieldMapping as SyncFieldMappingItem[];
    }
    return {
      id: row.id,
      tableName: row.tableName,
      displayName,
      bitableTableId: row.bitableTableId,
      bitableTableName: row.bitableTableName,
      fieldMapping:
        fieldMapping ?? this.fieldMappingService.getTableMapping(row.tableName),
      enabled: row.enabled,
      lastSyncTime: row.lastSyncTime ? row.lastSyncTime.toISOString() : null,
      syncCount: row.syncCount,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}

export function stringifyError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
