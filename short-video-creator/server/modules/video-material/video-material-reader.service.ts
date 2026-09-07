import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { eq, inArray } from 'drizzle-orm';
import { videoMaterial } from '@server/database/schema';
import {
  BitableService,
  type BitableRecordItem,
} from '@server/modules/bitable/bitable.service';
import {
  BITABLE_STATUS_TO_LOCAL,
  PROCESS_STATUS_TO_BITABLE,
  bitableDayFromMillis,
  buildLocalInsertValues,
  collectAttachmentEntries,
  type MediaTokenEntry,
  toLocalFields,
} from '@server/modules/bitable/bitable-mapping';
import type {
  GeneratedVideo,
  StoryboardPromptGroup,
  VideoMaterialDetail,
  VideoMaterialListItem,
  VideoMaterialListParams,
  VideoMaterialListResponse,
} from '@shared/video-material';

interface BitableFilterCondition {
  field_name: string;
  operator: string;
  value: string[];
}

interface BitableFilterGroup {
  conjunction: 'and' | 'or';
  conditions: Array<BitableFilterCondition | BitableFilterGroup>;
}

const LIST_PAGE_SIZE_MAX = 50;
const LIST_MAX_PAGE = 100;

@Injectable()
export class VideoMaterialReaderService {
  private readonly logger = new Logger(VideoMaterialReaderService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly bitableService: BitableService,
  ) {}

  // 实时从多维表格分页读取列表（列表不含附件字段，无需换链接）
  async listFromBitable(
    params: VideoMaterialListParams,
  ): Promise<VideoMaterialListResponse> {
    const pageSize: number = Math.min(
      Math.max(1, Math.floor(params.pageSize) || 20),
      LIST_PAGE_SIZE_MAX,
    );
    const page: number = Math.min(
      Math.max(1, Math.floor(params.page) || 1),
      LIST_MAX_PAGE,
    );
    const filter: BitableFilterGroup | undefined = this.buildFilter(params);
    const sort: Array<{ field_name: string; desc?: boolean }> = [
      { field_name: '创建时间', desc: true },
    ];

    let items: BitableRecordItem[] = [];
    let total: number = 0;
    let pageToken: string | undefined;
    for (let current = 1; current <= page; current += 1) {
      const res = await this.bitableService.searchRecords({
        filter,
        sort,
        pageSize,
        pageToken,
      });
      total = res.total;
      if (current === page) {
        items = res.items;
        break;
      }
      if (!res.hasMore || !res.pageToken) {
        break;
      }
      pageToken = res.pageToken;
    }

    const recordIds: string[] = items.map(
      (item: BitableRecordItem) => item.record_id,
    );
    const localRows: Array<{ id: string; baseRecordId: string | null }> =
      recordIds.length > 0
        ? await this.db
            .select({
              id: videoMaterial.id,
              baseRecordId: videoMaterial.baseRecordId,
            })
            .from(videoMaterial)
            .where(inArray(videoMaterial.baseRecordId, recordIds))
        : [];
    const localIdByRecord: Map<string, string> = new Map();
    localRows.forEach(
      (row: { id: string; baseRecordId: string | null }): void => {
        if (row.baseRecordId) {
          localIdByRecord.set(row.baseRecordId, row.id);
        }
      },
    );

    const listItems: VideoMaterialListItem[] = items.map(
      (item: BitableRecordItem) => this.toListItem(item, localIdByRecord),
    );

    // best-effort 回写本地缓存，失败仅告警（附件存原始链接，不存短期直链）
    void this.upsertLocalCache(items).catch((error: unknown) => {
      this.logger.warn(
        `多维表格记录回写本地缓存失败: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    });

    return { items: listItems, total, dataSource: 'bitable' };
  }

  // 实时读取详情：支持 uuid（先查本地行取 baseRecordId）或 recXXX
  async detailFromBitable(identifier: string): Promise<VideoMaterialDetail> {
    let recordId: string;
    let localId: string | null = null;
    if (identifier.startsWith('rec')) {
      recordId = identifier;
    } else {
      const rows: Array<{ id: string; baseRecordId: string | null }> =
        await this.db
          .select({
            id: videoMaterial.id,
            baseRecordId: videoMaterial.baseRecordId,
          })
          .from(videoMaterial)
          .where(eq(videoMaterial.id, identifier))
          .limit(1);
      const row: { id: string; baseRecordId: string | null } | undefined =
        rows[0];
      if (!row) {
        throw new NotFoundException('素材不存在');
      }
      if (!row.baseRecordId) {
        throw new NotFoundException('该素材未关联多维表格');
      }
      recordId = row.baseRecordId;
      localId = row.id;
    }

    const fields: Record<string, unknown> =
      await this.bitableService.getRecord(recordId);
    const fieldIdByName: Map<string, string> =
      await this.bitableService.getAttachmentFieldIds();
    const mediaEntries: MediaTokenEntry[] = collectAttachmentEntries(
      fields,
      fieldIdByName,
      recordId,
    );
    const local: Record<string, unknown> = toLocalFields(fields);
    const str = (key: string): string | null => {
      const value: unknown = local[key];
      return typeof value === 'string' ? value : null;
    };
    const arr = (key: string): string[] => {
      const value: unknown = local[key];
      if (!Array.isArray(value)) {
        return [];
      }
      return (value as unknown[]).filter(
        (item: unknown): item is string => typeof item === 'string',
      );
    };

    const storyboardPrompts: StoryboardPromptGroup[] = [];
    for (let i = 1; i <= 4; i += 1) {
      const prompt: string | null = str(`storyboardPrompt${i}`);
      const images: string[] = arr(`storyboardImage${i}`);
      if (!prompt && images.length === 0) {
        continue;
      }
      storyboardPrompts.push({ index: i, prompt, images });
    }
    const generatedVideos: GeneratedVideo[] = [];
    for (let i = 1; i <= 4; i += 1) {
      const urls: string[] = arr(`generatedVideo${i}`);
      if (urls.length === 0) {
        continue;
      }
      generatedVideos.push({ index: i, urls });
    }

    const rawStatus: unknown = local.processStatus;
    const processStatus: string | null =
      typeof rawStatus === 'string'
        ? BITABLE_STATUS_TO_LOCAL[rawStatus] ?? rawStatus
        : null;

    const detail: VideoMaterialDetail = {
      id: localId ?? recordId,
      baseRecordId: recordId,
      videoLink: str('videoLink'),
      originalCopy: str('originalCopy'),
      videoCopyText: str('videoCopyText'),
      hitStructureAnalysis: str('hitStructureAnalysis'),
      storyboardScript: str('storyboardScript'),
      storyboardPrompts,
      styleReferenceImages: arr('styleReferenceImage'),
      characterReferenceImages: arr('characterReferenceImage'),
      sceneSetting: str('sceneSetting'),
      protagonistSetting: str('protagonistSetting'),
      subtitleStyle: str('subtitleStyle'),
      cameraMovementPreference: arr('cameraMovementPreference'),
      colorAtmosphere: str('colorAtmosphere'),
      visualStyle: str('visualStyle'),
      aspectRatio: str('aspectRatio'),
      storyboardFineness: str('storyboardFineness'),
      generatedVideos,
      playCount: str('playCount'),
      likeCount: str('likeCount'),
      commentCount: str('commentCount'),
      processStatus,
      createTime: bitableDayFromMillis(fields['创建时间']),
    };
    return this.bitableService.resolveMediaUrls(detail, mediaEntries);
  }

  private buildFilter(
    params: VideoMaterialListParams,
  ): BitableFilterGroup | undefined {
    const conditions: Array<BitableFilterCondition | BitableFilterGroup> = [];
    if (params.keyword) {
      const kw: string = params.keyword.trim();
      if (kw) {
        conditions.push({
          conjunction: 'or',
          conditions: [
            { field_name: '视频文案.文本', operator: 'contains', value: [kw] },
            { field_name: '原创文案', operator: 'contains', value: [kw] },
          ],
        });
      }
    }
    if (params.videoType) {
      conditions.push({
        field_name: '视频类型',
        operator: 'is',
        value: [params.videoType],
      });
    }
    if (params.targetPlatform) {
      conditions.push({
        field_name: '目标平台',
        operator: 'is',
        value: [params.targetPlatform],
      });
    }
    if (params.processStatus) {
      conditions.push({
        field_name: '处理状态',
        operator: 'is',
        value: [
          PROCESS_STATUS_TO_BITABLE[params.processStatus] ??
            params.processStatus,
        ],
      });
    }
    return conditions.length > 0
      ? { conjunction: 'and', conditions }
      : undefined;
  }

  private toListItem(
    item: BitableRecordItem,
    localIdByRecord: Map<string, string>,
  ): VideoMaterialListItem {
    const local: Record<string, unknown> = toLocalFields(item.fields);
    const str = (key: string): string | null => {
      const value: unknown = local[key];
      return typeof value === 'string' ? value : null;
    };
    const rawStatus: unknown = local.processStatus;
    const processStatus: string | null =
      typeof rawStatus === 'string'
        ? BITABLE_STATUS_TO_LOCAL[rawStatus] ?? rawStatus
        : null;
    return {
      id: localIdByRecord.get(item.record_id) ?? item.record_id,
      baseRecordId: item.record_id,
      videoCopyText: str('videoCopyText'),
      originalCopy: str('originalCopy'),
      videoType: str('videoType'),
      targetPlatform: str('targetPlatform'),
      processStatus,
      playCount: str('playCount'),
      likeCount: str('likeCount'),
      commentCount: str('commentCount'),
      createTime: bitableDayFromMillis(item.fields['创建时间']),
    };
  }

  // 按 baseRecordId ON CONFLICT DO UPDATE，保持本地缓存新鲜
  private async upsertLocalCache(items: BitableRecordItem[]): Promise<void> {
    for (const item of items) {
      const values: typeof videoMaterial.$inferInsert =
        this.buildInsertValues(item);
      const patch: Partial<typeof videoMaterial.$inferInsert> = { ...values };
      delete patch.baseRecordId;
      patch.updatedAt = new Date();
      await this.db
        .insert(videoMaterial)
        .values(values)
        .onConflictDoUpdate({
          target: videoMaterial.baseRecordId,
          set: patch,
        });
    }
  }

  private buildInsertValues(
    item: BitableRecordItem,
  ): typeof videoMaterial.$inferInsert {
    const values: Record<string, unknown> = buildLocalInsertValues(
      item.record_id,
      item.fields,
    );
    return values as typeof videoMaterial.$inferInsert;
  }
}
