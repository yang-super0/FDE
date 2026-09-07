import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { eq, getTableColumns } from 'drizzle-orm';
import type {
  SyncFieldMappingItem,
  SyncOperation,
} from '@shared/api.interface';
import {
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
import { bindSyncPublisher } from './sync-event.publisher';

const CONSUME_INTERVAL_MS = 1000;
const RETRY_DELAYS: ReadonlyArray<number> = [1000, 5000, 30000];
const MAX_RETRY_COUNT = 3;

interface SyncQueueItem {
  tableName: string;
  recordId: string;
  operation: SyncOperation;
  retryCount: number;
}

@Injectable()
export class SyncEventService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SyncEventService.name);
  private readonly queue: SyncQueueItem[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private consuming = false;

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly bitableService: FeishuBitableService,
    private readonly configService: SyncConfigService,
    private readonly logService: SyncLogService,
    private readonly fieldMappingService: FieldMappingService,
  ) {}

  onModuleInit(): void {
    bindSyncPublisher(
      (tableName: string, recordId: string, operation: SyncOperation): void => {
        this.enqueue(tableName, recordId, operation);
      },
    );
    this.timer = setInterval((): void => {
      void this.consume();
    }, CONSUME_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** 入队：只对 SYNC_TABLE_MAP 内的表生效 */
  enqueue(tableName: string, recordId: string, operation: SyncOperation): void {
    if (!SYNC_TABLE_MAP.has(tableName)) return;
    this.queue.push({ tableName, recordId, operation, retryCount: 0 });
  }

  private async consume(): Promise<void> {
    if (this.consuming) return;
    this.consuming = true;
    try {
      const items: SyncQueueItem[] = this.dedupe(
        this.queue.splice(0, this.queue.length),
      );
      for (const item of items) {
        await this.processEvent(item);
      }
    } catch (error) {
      this.logger.error(`同步队列消费异常: ${stringifyError(error)}`);
    } finally {
      this.consuming = false;
    }
  }

  /** 去重：同表同记录保留最后一条；存在 delete 时优先保留 delete */
  private dedupe(items: SyncQueueItem[]): SyncQueueItem[] {
    const lastById = new Map<string, SyncQueueItem>();
    const lastDeleteById = new Map<string, SyncQueueItem>();
    for (const item of items) {
      const key: string = `${item.tableName}:${item.recordId}`;
      lastById.set(key, item);
      if (item.operation === 'delete') {
        lastDeleteById.set(key, item);
      }
    }
    const result: SyncQueueItem[] = [];
    for (const [key, item] of lastById) {
      result.push(lastDeleteById.get(key) ?? item);
    }
    return result;
  }

  private async processEvent(item: SyncQueueItem): Promise<void> {
    const start: number = Date.now();
    let config: SyncConfigRow | null = null;
    try {
      config = await this.configService.getConfigByTableName(item.tableName);
      if (!config || !config.enabled) return;

      const credentialsOk: boolean =
        await this.bitableService.testCredentials();
      if (!credentialsOk) {
        throw new Error('飞书凭证未配置或无效');
      }

      const entry: SyncTableEntry | undefined = SYNC_TABLE_MAP.get(
        item.tableName,
      );
      if (!entry) return;

      let operation: SyncOperation = item.operation;
      let row: Record<string, unknown> | null = null;
      if (operation !== 'delete') {
        row = await this.findRow(entry, item.recordId);
        if (!row) return; // 行已不存在，视为已删除
        const deletedAt: unknown = row['deletedAt'];
        if (deletedAt !== null && deletedAt !== undefined) {
          operation = 'delete';
        }
      }

      const tableId: string | null = config.bitableTableId;
      if (!tableId) {
        throw new Error(`表 ${item.tableName} 尚未创建对应的飞书多维表格`);
      }

      if (operation === 'delete') {
        const bitableRecordId = await this.bitableService.searchByRecordKey(
          tableId,
          item.recordId,
        );
        if (bitableRecordId) {
          await this.bitableService.batchDeleteRecords(tableId, [
            bitableRecordId,
          ]);
        }
      } else if (row) {
        const mapping: SyncFieldMappingItem[] = this.resolveMapping(config);
        const fields: SyncFieldValues =
          this.fieldMappingService.convertRowToFields(
            item.tableName,
            mapping,
            row,
          );
        const existingRecordId = await this.bitableService.searchByRecordKey(
          tableId,
          item.recordId,
        );
        if (existingRecordId) {
          await this.bitableService.batchUpdateRecords(tableId, [
            { recordId: existingRecordId, fields },
          ]);
        } else {
          await this.bitableService.batchCreateRecords(tableId, [fields]);
        }
      }

      await this.logService.insertLog({
        configId: config.id,
        tableName: item.tableName,
        recordId: item.recordId,
        operation,
        status: 'success',
        durationMs: Date.now() - start,
      });
      await this.configService.markSynced(item.tableName, 1);
    } catch (error) {
      await this.handleFailure(item, error, Date.now() - start);
    }
  }

  private async handleFailure(
    item: SyncQueueItem,
    error: unknown,
    durationMs: number,
  ): Promise<void> {
    const message: string = stringifyError(error);
    try {
      let configId: number | null = null;
      try {
        const config = await this.configService.getConfigByTableName(
          item.tableName,
        );
        configId = config?.id ?? null;
      } catch {
        configId = null;
      }
      if (item.retryCount < MAX_RETRY_COUNT) {
        await this.logService.insertLog({
          configId,
          tableName: item.tableName,
          recordId: item.recordId,
          operation: item.operation,
          status: 'retrying',
          retryCount: item.retryCount + 1,
          errorMessage: message,
          durationMs,
        });
        const retryItem: SyncQueueItem = {
          ...item,
          retryCount: item.retryCount + 1,
        };
        const delay: number =
          RETRY_DELAYS[Math.min(item.retryCount, RETRY_DELAYS.length - 1)];
        setTimeout((): void => {
          this.queue.push(retryItem);
        }, delay);
      } else {
        await this.logService.insertLog({
          configId,
          tableName: item.tableName,
          recordId: item.recordId,
          operation: item.operation,
          status: 'failed',
          retryCount: item.retryCount,
          errorMessage: message,
          durationMs,
        });
      }
    } catch (logError) {
      this.logger.error(`同步日志写入失败: ${stringifyError(logError)}`);
    }
    this.logger.warn(
      `同步事件处理失败 ${item.tableName}/${item.recordId}: ${message}`,
    );
  }

  private async findRow(
    entry: SyncTableEntry,
    recordId: string,
  ): Promise<Record<string, unknown> | null> {
    const columns = getTableColumns(entry.table);
    const idColumn = columns['id'];
    if (!idColumn) return null;
    const idValue: string | number = /^\d+$/u.test(recordId)
      ? Number(recordId)
      : recordId;
    const rows: Record<string, unknown>[] = await this.db
      .select()
      .from(entry.table)
      .where(eq(idColumn, idValue))
      .limit(1);
    return rows[0] ?? null;
  }

  private resolveMapping(config: SyncConfigRow): SyncFieldMappingItem[] {
    const stored: unknown = config.fieldMapping;
    if (Array.isArray(stored) && stored.length > 0) {
      return stored as SyncFieldMappingItem[];
    }
    return this.fieldMappingService.getTableMapping(config.tableName);
  }
}
