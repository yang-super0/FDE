import { Logger } from '@nestjs/common';
import {
  Automation,
  BindTrigger,
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { Inject } from '@nestjs/common';
import { videoMaterial } from '@server/database/schema';
import {
  BitableService,
  type BitableRecordItem,
} from '@server/modules/bitable/bitable.service';
import {
  BITABLE_TO_LOCAL,
  buildLocalInsertValues,
} from '@server/modules/bitable/bitable-mapping';
import { SyncStateService } from './sync-state.service';

const RECONCILE_PAGE_SIZE = 100;
const RECONCILE_MAX_PAGES = 50;

@Automation()
export class VideoMaterialAutomation {
  private readonly logger = new Logger(VideoMaterialAutomation.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly bitableService: BitableService,
    private readonly syncState: SyncStateService,
  ) {}

  // 兜底校准：多维表格 → 本地补齐缺失记录（禁止删除本地记录）
  @BindTrigger('video_material_reconcile')
  async reconcile(): Promise<void> {
    try {
      const fieldNames: string[] = [
        ...Object.keys(BITABLE_TO_LOCAL),
        '创建时间',
      ];
      const records: BitableRecordItem[] = [];
      let pageToken: string | undefined;
      for (let round = 0; round < RECONCILE_MAX_PAGES; round += 1) {
        const res = await this.bitableService.searchRecords({
          pageSize: RECONCILE_PAGE_SIZE,
          pageToken,
          fieldNames,
        });
        records.push(...res.items);
        if (!res.hasMore || !res.pageToken) {
          break;
        }
        pageToken = res.pageToken;
      }

      const localRows: Array<{ baseRecordId: string | null }> = await this.db
        .select({ baseRecordId: videoMaterial.baseRecordId })
        .from(videoMaterial);
      const existingIds: Set<string> = new Set(
        localRows
          .map(
            (row: { baseRecordId: string | null }): string | null =>
              row.baseRecordId,
          )
          .filter((value: string | null): value is string => Boolean(value)),
      );

      let inserted: number = 0;
      for (const record of records) {
        if (existingIds.has(record.record_id)) {
          continue;
        }
        try {
          const values: Record<string, unknown> = buildLocalInsertValues(
            record.record_id,
            record.fields,
          );
          await this.db
            .insert(videoMaterial)
            .values(values as typeof videoMaterial.$inferInsert);
          inserted += 1;
        } catch (error) {
          this.logger.warn(
            `兜底校准插入失败 ${record.record_id}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      }

      await this.syncState.record(
        'bitable_to_app',
        'success',
        `兜底校准完成，补齐 ${inserted} 条`,
        inserted,
      );
    } catch (error) {
      const message: string =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `兜底校准失败: ${
          error instanceof Error ? error.stack ?? error.message : message
        }`,
      );
      await this.syncState.record('bitable_to_app', 'failed', `兜底校准失败: ${message}`, 0);
    }
  }
}
