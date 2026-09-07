import { Inject, Injectable } from '@nestjs/common';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { and, count, desc, eq, gte, lt, sql, type SQL } from 'drizzle-orm';
import type {
  SyncLogItem,
  SyncLogListParams,
  SyncLogListResponse,
  SyncOperation,
  SyncStatsResponse,
  SyncStatus,
  SyncTableStat,
} from '@shared/api.interface';
import { syncConfigs, syncLogs } from '@server/database/schema';
import { SYNC_TABLE_MAP } from './sync-tables.constants';
import { FeishuBitableService } from './feishu-bitable.service';

export interface SyncLogEntry {
  configId: number | null;
  tableName: string;
  recordId: string;
  operation: SyncOperation;
  status: SyncStatus;
  retryCount?: number;
  errorMessage?: string | null;
  durationMs?: number | null;
}

type SyncLogRow = typeof syncLogs.$inferSelect;
type SyncConfigRow = typeof syncConfigs.$inferSelect;

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;
const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;

/** 业务时区（Asia/Shanghai）当日零点对应的 UTC 时刻 */
function shanghaiTodayStart(): Date {
  const now = new Date();
  const shanghaiDate: string = now.toLocaleDateString('sv-SE', {
    timeZone: 'Asia/Shanghai',
  });
  return new Date(`${shanghaiDate}T00:00:00+08:00`);
}

@Injectable()
export class SyncLogService {
  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly bitableService: FeishuBitableService,
  ) {}

  async insertLog(entry: SyncLogEntry): Promise<void> {
    await this.db.insert(syncLogs).values({
      configId: entry.configId,
      tableName: entry.tableName,
      recordId: entry.recordId,
      operation: entry.operation,
      status: entry.status,
      retryCount: entry.retryCount ?? 0,
      errorMessage: entry.errorMessage ?? null,
      durationMs: entry.durationMs ?? null,
    });
  }

  async listLogs(params: SyncLogListParams): Promise<SyncLogListResponse> {
    const conditions: SQL[] = [];
    if (params.tableName) {
      conditions.push(eq(syncLogs.tableName, params.tableName));
    }
    if (params.status) {
      conditions.push(eq(syncLogs.status, params.status));
    }
    if (params.operation) {
      conditions.push(eq(syncLogs.operation, params.operation));
    }
    const startTime: Date | null = this.parseDate(params.startTime);
    if (startTime) {
      conditions.push(gte(syncLogs.createdAt, startTime));
    }
    const endTime: Date | null = this.parseEndBound(params.endTime);
    if (endTime) {
      conditions.push(lt(syncLogs.createdAt, endTime));
    }
    const where: SQL | undefined =
      conditions.length > 0 ? and(...conditions) : undefined;

    const page: number = Math.max(1, Number(params.page ?? 1) || 1);
    const pageSize: number = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, Number(params.pageSize ?? DEFAULT_PAGE_SIZE) || DEFAULT_PAGE_SIZE),
    );

    const totalRows: Array<{ value: number }> = await this.db
      .select({ value: count() })
      .from(syncLogs)
      .where(where);
    const total: number = Number(totalRows[0]?.value ?? 0);

    const rows: SyncLogRow[] = await this.db
      .select()
      .from(syncLogs)
      .where(where)
      .orderBy(desc(syncLogs.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return {
      items: rows.map((row: SyncLogRow): SyncLogItem => this.toItem(row)),
      total,
      page,
      pageSize,
    };
  }

  async getStats(): Promise<SyncStatsResponse> {
    const grouped = await this.db
      .select({
        tableName: syncLogs.tableName,
        total: count(),
        successCount: sql<number>`count(*) filter (where ${syncLogs.status} = 'success')`,
        failedCount: sql<number>`count(*) filter (where ${syncLogs.status} = 'failed')`,
        retryingCount: sql<number>`count(*) filter (where ${syncLogs.status} = 'retrying')`,
      })
      .from(syncLogs)
      .groupBy(syncLogs.tableName);

    const statMap = new Map<string, { success: number; failed: number }>();
    let total = 0;
    let success = 0;
    let failed = 0;
    let retrying = 0;
    for (const row of grouped) {
      const tableTotal: number = Number(row.total);
      const tableSuccess: number = Number(row.successCount);
      const tableFailed: number = Number(row.failedCount);
      total += tableTotal;
      success += tableSuccess;
      failed += tableFailed;
      retrying += Number(row.retryingCount);
      statMap.set(row.tableName, {
        success: tableSuccess,
        failed: tableFailed,
      });
    }

    const todayRows: Array<{ value: number }> = await this.db
      .select({ value: count() })
      .from(syncLogs)
      .where(gte(syncLogs.createdAt, shanghaiTodayStart()));

    const configs: SyncConfigRow[] = await this.db
      .select()
      .from(syncConfigs)
      .orderBy(syncConfigs.tableName);
    const tables: SyncTableStat[] = configs.map(
      (row: SyncConfigRow): SyncTableStat => {
        const stat = statMap.get(row.tableName);
        const successCount: number = stat?.success ?? 0;
        const failedCount: number = stat?.failed ?? 0;
        const attempts: number = successCount + failedCount;
        return {
          tableName: row.tableName,
          displayName:
            SYNC_TABLE_MAP.get(row.tableName)?.displayName ?? row.tableName,
          enabled: row.enabled,
          syncCount: row.syncCount,
          successCount,
          failedCount,
          successRate:
            attempts > 0
              ? Math.round((successCount / attempts) * 10000) / 100
              : 0,
          lastSyncTime: row.lastSyncTime
            ? row.lastSyncTime.toISOString()
            : null,
        };
      },
    );

    return {
      total,
      success,
      failed,
      retrying,
      successRate:
        total > 0 ? Math.round((success / total) * 10000) / 100 : 0,
      todayCount: Number(todayRows[0]?.value ?? 0),
      credentialsConfigured: await this.bitableService.testCredentials(),
      tables,
    };
  }

  private toItem(row: SyncLogRow): SyncLogItem {
    return {
      id: row.id,
      configId: row.configId,
      tableName: row.tableName,
      recordId: row.recordId,
      operation: row.operation as SyncOperation,
      status: row.status as SyncStatus,
      retryCount: row.retryCount,
      errorMessage: row.errorMessage,
      durationMs: row.durationMs,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private parseDate(value: string | undefined): Date | null {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  /** endTime 为半开区间上界；纯日期（YYYY-MM-DD）时按次日零点前（lt 次日）处理 */
  private parseEndBound(value: string | undefined): Date | null {
    if (!value) return null;
    if (DATE_ONLY_PATTERN.test(value)) {
      const date = new Date(`${value}T00:00:00+08:00`);
      if (Number.isNaN(date.getTime())) return null;
      date.setDate(date.getDate() + 1);
      return date;
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
}
