import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  type OnModuleInit,
} from '@nestjs/common';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { eq, getTableColumns, isNull } from 'drizzle-orm';
import type {
  SyncFieldMappingItem,
  SyncFullSyncResult,
} from '@shared/api.interface';
import { syncConfigs } from '@server/database/schema';
import {
  SYNC_TABLES,
  SYNC_TABLE_MAP,
  type SyncFieldValues,
  type SyncTableEntry,
} from './sync-tables.constants';
import { FeishuBitableService } from './feishu-bitable.service';
import { FieldMappingService } from './field-mapping.service';
import {
  SyncConfigService,
  stringifyError,
  type SyncConfigRow,
} from './sync-config.service';
import { SyncLogService } from './sync-log.service';
import { bindFullSyncTrigger } from './sync-event.publisher';

@Injectable()
export class SyncService implements OnModuleInit {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly bitableService: FeishuBitableService,
    private readonly fieldMappingService: FieldMappingService,
    private readonly configService: SyncConfigService,
    private readonly logService: SyncLogService,
  ) {}

  onModuleInit(): void {
    // 注册全量同步触发器：其他模块经 triggerFullSync 免注入调用（后台执行）
    bindFullSyncTrigger((tableName: string): void => {
      void this.fullSyncTable(tableName).catch(
        (error: unknown): void => {
          this.logger.error(
            `后台全量同步失败 ${tableName}: ${stringifyError(error)}`,
          );
        },
      );
    });
  }

  /** 单表全量同步：清空多维表格后全量重建；失败不抛 500，返回 skipped 结果 */
  async fullSyncTable(tableName: string): Promise<SyncFullSyncResult> {
    const entry: SyncTableEntry | undefined = SYNC_TABLE_MAP.get(tableName);
    if (!entry) {
      throw new BadRequestException(`不支持同步的数据表: ${tableName}`);
    }

    const credentialsOk: boolean = await this.bitableService.testCredentials();
    if (!credentialsOk) {
      return {
        tableName,
        synced: 0,
        skipped: true,
        message: '飞书凭证未配置或无效',
      };
    }

    const start: number = Date.now();
    try {
      const config: SyncConfigRow | null =
        await this.configService.getConfigByTableName(tableName);
      if (!config) {
        throw new Error(`表 ${tableName} 的同步配置不存在`);
      }

      const mapping: SyncFieldMappingItem[] = this.resolveMapping(config);

      // 缺 bitableTableId → 创建多维表格并回存配置
      let tableId: string = config.bitableTableId ?? '';
      if (!tableId) {
        tableId = await this.bitableService.createTable(
          config.bitableTableName ?? entry.displayName,
          mapping,
        );
        await this.db
          .update(syncConfigs)
          .set({
            bitableTableId: tableId,
            bitableTableName: config.bitableTableName ?? entry.displayName,
            fieldMapping:
              config.fieldMapping ?? JSON.stringify(mapping),
            updatedAt: new Date(),
          })
          .where(eq(syncConfigs.id, config.id));
        this.configService.invalidateConfigCache(tableName);
      } else if (!Array.isArray(config.fieldMapping)) {
        // 已有表但配置缺映射 → 补存默认映射
        await this.db
          .update(syncConfigs)
          .set({ fieldMapping: JSON.stringify(mapping), updatedAt: new Date() })
          .where(eq(syncConfigs.id, config.id));
        this.configService.invalidateConfigCache(tableName);
      }

      // 清空多维表格既有记录
      const existingRecordIds: string[] =
        await this.bitableService.listAllRecordIds(tableId);
      if (existingRecordIds.length > 0) {
        await this.bitableService.batchDeleteRecords(
          tableId,
          existingRecordIds,
        );
      }

      // 拉取业务表数据（软删除表过滤 deletedAt）
      const columns = getTableColumns(entry.table);
      const deletedAtColumn = columns['deletedAt'];
      const rows: Record<string, unknown>[] = deletedAtColumn
        ? await this.db
            .select()
            .from(entry.table)
            .where(isNull(deletedAtColumn))
        : await this.db.select().from(entry.table);

      // 逐行转换后批量写入
      const fieldsList: SyncFieldValues[] = [];
      for (const row of rows) {
        fieldsList.push(
          this.fieldMappingService.convertRowToFields(tableName, mapping, row),
        );
      }
      if (fieldsList.length > 0) {
        await this.bitableService.batchCreateRecords(tableId, fieldsList);
      }

      const durationMs: number = Date.now() - start;
      await this.configService.markSynced(tableName, rows.length);
      await this.logService.insertLog({
        configId: config.id,
        tableName,
        recordId: 'FULL',
        operation: 'create',
        status: 'success',
        durationMs,
      });
      return { tableName, synced: rows.length };
    } catch (error) {
      const message: string = stringifyError(error);
      const durationMs: number = Date.now() - start;
      try {
        await this.logService.insertLog({
          configId: null,
          tableName,
          recordId: 'FULL',
          operation: 'create',
          status: 'failed',
          errorMessage: message,
          durationMs,
        });
      } catch (logError) {
        this.logger.error(
          `全量同步失败日志写入异常: ${stringifyError(logError)}`,
        );
      }
      this.logger.error(`全量同步失败 ${tableName}: ${message}`);
      return { tableName, synced: 0, skipped: true, message };
    }
  }

  /** 全部 23 张表串行全量同步（结果数组含 skipped 条目） */
  async fullSyncAll(): Promise<SyncFullSyncResult[]> {
    const results: SyncFullSyncResult[] = [];
    for (const entry of SYNC_TABLES) {
      const result: SyncFullSyncResult = await this.fullSyncTable(
        entry.tableName,
      );
      results.push(result);
    }
    return results;
  }

  private resolveMapping(config: SyncConfigRow): SyncFieldMappingItem[] {
    const stored: unknown = config.fieldMapping;
    if (Array.isArray(stored) && stored.length > 0) {
      return stored as SyncFieldMappingItem[];
    }
    return this.fieldMappingService.getTableMapping(config.tableName);
  }
}
