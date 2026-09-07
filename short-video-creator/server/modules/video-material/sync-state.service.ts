import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { desc } from 'drizzle-orm';
import { bitableSyncState } from '@server/database/schema';
import type { SyncStatusItem } from '@shared/video-material';

export type SyncDirection = 'app_to_bitable' | 'bitable_to_app';
export type SyncStatus = 'success' | 'failed';

type SyncStateRow = typeof bitableSyncState.$inferSelect;

@Injectable()
export class SyncStateService {
  private readonly logger = new Logger(SyncStateService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  // 记录一次同步动作；写入失败只记日志，不影响主流程
  async record(
    direction: SyncDirection,
    status: SyncStatus,
    message: string | null,
    recordCount: number,
  ): Promise<void> {
    try {
      await this.db.insert(bitableSyncState).values({
        direction,
        status,
        message,
        recordCount,
      });
    } catch (error) {
      this.logger.error(
        `同步状态记录写入失败: ${
          error instanceof Error ? error.stack ?? error.message : String(error)
        }`,
      );
    }
  }

  async getLatest(limit: number = 20): Promise<SyncStatusItem[]> {
    const rows: SyncStateRow[] = await this.db
      .select()
      .from(bitableSyncState)
      .orderBy(desc(bitableSyncState.syncedAt))
      .limit(limit);
    return rows.map((row: SyncStateRow): SyncStatusItem => {
      return {
        id: row.id,
        direction: row.direction,
        status: row.status,
        message: row.message,
        recordCount: row.recordCount,
        syncedAt: row.syncedAt.toISOString(),
      };
    });
  }
}
