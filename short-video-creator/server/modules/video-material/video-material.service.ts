import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { and, count, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';
import { videoMaterial } from '@server/database/schema';
import {
  BITABLE_FIELDS,
  BitableService,
} from '@server/modules/bitable/bitable.service';
import {
  collectEntriesFromLocalRow,
  type MediaTokenEntry,
  toBitableEditFields,
} from '@server/modules/bitable/bitable-mapping';
import {
  VIDEO_MATERIAL_STATUS,
  type CreateVideoMaterialRequest,
  type CreateVideoMaterialResponse,
  type DeleteVideoMaterialResponse,
  type GeneratedVideo,
  type StartGenerateResponse,
  type StoryboardPromptGroup,
  type TopOrderBy,
  type TopMaterialsResponse,
  type TopMaterialItem,
  type UpdateVideoMaterialRequest,
  type UpdateVideoMaterialResponse,
  type VideoMaterialDetail,
  type VideoMaterialListItem,
  type VideoMaterialListParams,
  type VideoMaterialListResponse,
  type VideoMaterialOptions,
} from '@shared/video-material';
import { StoryboardGenerationService } from './storyboard-generation.service';
import { SyncStateService } from './sync-state.service';
import { VideoMaterialReaderService } from './video-material-reader.service';

type VideoMaterialRow = typeof videoMaterial.$inferSelect;

const LIST_PAGE_SIZE_MAX = 50;

const LIST_SELECT_FIELDS = {
  id: videoMaterial.id,
  baseRecordId: videoMaterial.baseRecordId,
  videoCopyText: videoMaterial.videoCopyText,
  originalCopy: videoMaterial.originalCopy,
  videoType: videoMaterial.videoType,
  targetPlatform: videoMaterial.targetPlatform,
  processStatus: videoMaterial.processStatus,
  playCount: videoMaterial.playCount,
  likeCount: videoMaterial.likeCount,
  commentCount: videoMaterial.commentCount,
  createTime: videoMaterial.createTime,
};

@Injectable()
export class VideoMaterialService {
  private readonly logger = new Logger(VideoMaterialService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly bitableService: BitableService,
    private readonly readerService: VideoMaterialReaderService,
    private readonly syncState: SyncStateService,
    private readonly storyboardGeneration: StoryboardGenerationService,
  ) {}

  async list(
    params: VideoMaterialListParams,
  ): Promise<VideoMaterialListResponse> {
    const page: number =
      Number.isFinite(params.page) && params.page > 0
        ? Math.floor(params.page)
        : 1;
    const pageSize: number =
      Number.isFinite(params.pageSize) && params.pageSize > 0
        ? Math.min(Math.floor(params.pageSize), LIST_PAGE_SIZE_MAX)
        : 20;
    const normalized: VideoMaterialListParams = { ...params, page, pageSize };
    try {
      const response: VideoMaterialListResponse =
        await this.readerService.listFromBitable(normalized);
      return { ...response, dataSource: 'bitable' };
    } catch (error) {
      this.logger.warn(
        `列表读取多维表格失败，降级本地缓存: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      void this.syncState.record('bitable_to_app', 'failed', '列表读取多维表格失败，已降级本地缓存', 0);
      return this.listFromLocal(normalized);
    }
  }

  async getOptions(): Promise<VideoMaterialOptions> {
    const [typeRows, platformRows, statusRows] = await Promise.all([
      this.db
        .selectDistinct({ value: videoMaterial.videoType })
        .from(videoMaterial),
      this.db
        .selectDistinct({ value: videoMaterial.targetPlatform })
        .from(videoMaterial),
      this.db
        .selectDistinct({ value: videoMaterial.processStatus })
        .from(videoMaterial),
    ]);
    return {
      videoTypes: this.toStringList(typeRows),
      targetPlatforms: this.toStringList(platformRows),
      processStatuses: this.toStringList(statusRows),
    };
  }

  async getTop(
    orderBy: TopOrderBy,
    limit: number,
  ): Promise<TopMaterialsResponse> {
    const safeLimit: number = Math.min(
      Math.max(1, Math.floor(limit) || 10),
      LIST_PAGE_SIZE_MAX,
    );
    const sortColumn =
      orderBy === 'likeCount' ? videoMaterial.likeCount : videoMaterial.playCount;

    const rows: TopMaterialItem[] = await this.db
      .select({
        id: videoMaterial.id,
        videoCopyText: videoMaterial.videoCopyText,
        playCount: videoMaterial.playCount,
        likeCount: videoMaterial.likeCount,
        commentCount: videoMaterial.commentCount,
      })
      .from(videoMaterial)
      .orderBy(sql`CAST(${sortColumn} AS numeric) DESC NULLS LAST`)
      .limit(safeLimit);

    return { items: rows };
  }

  // 详情：recXXX 直接实时读；uuid 优先实时读，失败降级本地
  async detail(identifier: string): Promise<VideoMaterialDetail> {
    if (identifier.startsWith('rec')) {
      return this.readerService.detailFromBitable(identifier);
    }
    const row: VideoMaterialRow | undefined =
      await this.findByIdentifier(identifier);
    if (!row) {
      throw new NotFoundException('素材不存在');
    }
    if (row.baseRecordId) {
      try {
        return await this.readerService.detailFromBitable(identifier);
      } catch (error) {
        this.logger.warn(
          `详情读取多维表格失败，降级本地数据: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        void this.syncState.record('bitable_to_app', 'failed', '详情读取多维表格失败，已降级本地缓存', 0);
      }
      const localDetail: VideoMaterialDetail = this.assembleLocalDetail(row);
      return this.resolveLocalDetailMedia(localDetail, row);
    }
    const localDetail: VideoMaterialDetail = this.assembleLocalDetail(row);
    return this.resolveLocalDetailMedia(localDetail, row);
  }

  async create(
    dto: CreateVideoMaterialRequest,
    userId: string,
  ): Promise<CreateVideoMaterialResponse> {
    const link: string = (dto.videoLink ?? '').trim();
    if (!link) {
      throw new BadRequestException('请输入爆款视频链接');
    }
    if (!/^https?:\/\//u.test(link)) {
      throw new BadRequestException('链接必须以 http:// 或 https:// 开头');
    }
    const today: string = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Shanghai',
    }).format(new Date());
    let recordId: string;
    try {
      recordId = await this.bitableService.createRecord({
        [BITABLE_FIELDS.videoLink]: link,
        [BITABLE_FIELDS.processStatus]: VIDEO_MATERIAL_STATUS.PENDING,
      });
    } catch (error) {
      const responsePayload: unknown = (
        error as { response?: { data?: unknown } }
      )?.response?.data;
      this.logger.error(
        `新建任务同步飞书多维表格失败: ${
          error instanceof Error ? error.stack ?? error.message : String(error)
        }${responsePayload ? ` | 响应体: ${JSON.stringify(responsePayload)}` : ''}`,
      );
      void this.syncState.record(
        'app_to_bitable',
        'failed',
        `新建任务同步多维表格失败: ${
          error instanceof Error ? error.message : String(error)
        }`,
        1,
      );
      throw new BadGatewayException('同步飞书多维表格失败，请稍后重试');
    }
    const inserted: Array<{ id: string }> = await this.db
      .insert(videoMaterial)
      .values({
        baseRecordId: recordId,
        videoLink: link,
        processStatus: VIDEO_MATERIAL_STATUS.PENDING,
        createTime: today,
        createdBy: userId,
      })
      .returning({ id: videoMaterial.id });
    const row: { id: string } | undefined = inserted[0];
    if (!row) {
      throw new BadRequestException('任务创建失败，请稍后重试');
    }
    void this.syncState.record('app_to_bitable', 'success', '新建任务已同步多维表格', 1);
    return { id: row.id };
  }

  async startGenerate(
    id: string,
    userId: string,
  ): Promise<StartGenerateResponse> {
    const row: VideoMaterialRow | undefined =
      await this.findByIdentifier(id);
    if (!row) {
      throw new NotFoundException('素材不存在');
    }
    if (row.processStatus === VIDEO_MATERIAL_STATUS.GENERATING) {
      throw new ConflictException('该任务正在生成中，请稍候');
    }
    const updated: Array<{ id: string }> = await this.db
      .update(videoMaterial)
      .set({
        processStatus: VIDEO_MATERIAL_STATUS.GENERATING,
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(eq(videoMaterial.id, row.id))
      .returning({ id: videoMaterial.id });
    if (updated.length === 0) {
      throw new NotFoundException('素材不存在');
    }
    void this.syncState.record('app_to_bitable', 'success', '生成状态已回写', 1);
    void this.storyboardGeneration
      .runStoryboardGeneration(row.id, row, userId)
      .catch((error: unknown) => {
        this.logger.error(
          `分镜脚本生成任务异常: ${
            error instanceof Error
              ? error.stack ?? error.message
              : String(error)
          }`,
        );
      });
    return { id: row.id, processStatus: VIDEO_MATERIAL_STATUS.GENERATING };
  }

  // 编辑：先写多维表格，成功后再落本地；失败不写本地
  async update(
    identifier: string,
    dto: UpdateVideoMaterialRequest,
    userId: string,
  ): Promise<UpdateVideoMaterialResponse> {
    const row: VideoMaterialRow | undefined =
      await this.findByIdentifier(identifier);
    if (!row) {
      throw new NotFoundException('素材不存在');
    }
    if (!row.baseRecordId) {
      throw new BadRequestException('该素材未关联多维表格，无法编辑');
    }
    const editFields: Record<string, unknown> = toBitableEditFields(dto);
    if (Object.keys(editFields).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }
    try {
      await this.bitableService.updateRecord(row.baseRecordId, editFields);
    } catch (error) {
      const message: string =
        error instanceof Error ? error.message : String(error);
      void this.syncState.record('app_to_bitable', 'failed', message, 1);
      throw new BadGatewayException('同步多维表格失败，编辑未保存');
    }
    const patch: Partial<typeof videoMaterial.$inferInsert> = {};
    if (dto.videoLink !== undefined) patch.videoLink = dto.videoLink;
    if (dto.videoType !== undefined) patch.videoType = dto.videoType;
    if (dto.targetPlatform !== undefined) patch.targetPlatform = dto.targetPlatform;
    if (dto.sceneSetting !== undefined) patch.sceneSetting = dto.sceneSetting;
    if (dto.protagonistSetting !== undefined) {
      patch.protagonistSetting = dto.protagonistSetting;
    }
    if (dto.subtitleStyle !== undefined) patch.subtitleStyle = dto.subtitleStyle;
    if (dto.cameraMovementPreference !== undefined) {
      patch.cameraMovementPreference = [dto.cameraMovementPreference];
    }
    if (dto.colorAtmosphere !== undefined) {
      patch.colorAtmosphere = dto.colorAtmosphere;
    }
    if (dto.visualStyle !== undefined) patch.visualStyle = dto.visualStyle;
    if (dto.aspectRatio !== undefined) patch.aspectRatio = dto.aspectRatio;
    if (dto.storyboardFineness !== undefined) {
      patch.storyboardFineness = dto.storyboardFineness;
    }
    patch.updatedAt = new Date();
    patch.updatedBy = userId;
    const updated: Array<{ id: string }> = await this.db
      .update(videoMaterial)
      .set(patch)
      .where(eq(videoMaterial.id, row.id))
      .returning({ id: videoMaterial.id });
    if (updated.length === 0) {
      throw new NotFoundException('素材不存在');
    }
    void this.syncState.record('app_to_bitable', 'success', '编辑素材已同步', 1);
    return { id: row.id, bitableSynced: true };
  }

  // 删除：先删多维表格，成功后再删本地；多维表格失败不删本地
  async remove(
    identifier: string,
    userId: string,
  ): Promise<DeleteVideoMaterialResponse> {
    const row: VideoMaterialRow | undefined =
      await this.findByIdentifier(identifier);
    if (!row) {
      throw new NotFoundException('素材不存在');
    }
    if (row.baseRecordId) {
      try {
        await this.bitableService.deleteRecord(row.baseRecordId);
      } catch (error) {
        const message: string =
          error instanceof Error ? error.message : String(error);
        this.logger.error(`多维表格删除失败 ${row.baseRecordId}: ${message}`);
        void this.syncState.record(
          'app_to_bitable',
          'failed',
          `多维表格删除失败: ${message}`,
          1,
        );
        throw new BadGatewayException('多维表格删除失败，请稍后重试');
      }
    }
    const deleted: Array<{ id: string }> = await this.db
      .delete(videoMaterial)
      .where(eq(videoMaterial.id, row.id))
      .returning({ id: videoMaterial.id });
    if (deleted.length === 0) {
      throw new NotFoundException('素材不存在');
    }
    this.logger.log(`素材已删除 ${JSON.stringify({ id: row.id, userId })}`);
    void this.syncState.record('app_to_bitable', 'success', '删除素材已同步', 1);
    return { id: row.id, bitableSynced: Boolean(row.baseRecordId) };
  }

  private async findByIdentifier(
    identifier: string,
  ): Promise<VideoMaterialRow | undefined> {
    const rows: VideoMaterialRow[] = await this.db
      .select()
      .from(videoMaterial)
      .where(
        identifier.startsWith('rec')
          ? eq(videoMaterial.baseRecordId, identifier)
          : eq(videoMaterial.id, identifier),
      )
      .limit(1);
    return rows[0];
  }

  private async listFromLocal(
    params: VideoMaterialListParams,
  ): Promise<VideoMaterialListResponse> {
    const page: number = params.page ?? 1;
    const pageSize: number = params.pageSize ?? 20;

    const conditions: SQL[] = [];
    if (params.keyword) {
      const kw: string = params.keyword.trim();
      if (kw) {
        conditions.push(
          or(
            ilike(videoMaterial.videoCopyText, `%${kw}%`),
            ilike(videoMaterial.originalCopy, `%${kw}%`),
          ) as SQL,
        );
      }
    }
    if (params.videoType) {
      conditions.push(eq(videoMaterial.videoType, params.videoType));
    }
    if (params.targetPlatform) {
      conditions.push(eq(videoMaterial.targetPlatform, params.targetPlatform));
    }
    if (params.processStatus) {
      conditions.push(eq(videoMaterial.processStatus, params.processStatus));
    }

    const whereClause: SQL =
      conditions.length > 0 ? (and(...conditions) as SQL) : sql`true`;
    const orderByClause = [
      sql`${videoMaterial.createTime} DESC NULLS LAST`,
      desc(videoMaterial.id),
    ];
    const offset: number = (page - 1) * pageSize;

    const rows: VideoMaterialListItem[] = await this.db
      .select(LIST_SELECT_FIELDS)
      .from(videoMaterial)
      .where(whereClause)
      .orderBy(...orderByClause)
      .limit(pageSize)
      .offset(offset);

    const countResult: Array<{ count: number }> = await this.db
      .select({ count: count() })
      .from(videoMaterial)
      .where(whereClause);
    const total: number = Number(countResult[0]?.count ?? 0);

    return { items: rows, total, dataSource: 'local' };
  }

  private assembleLocalDetail(row: VideoMaterialRow): VideoMaterialDetail {
    const storyboardPrompts: StoryboardPromptGroup[] = [];
    const promptSources: Array<{ prompt: string | null; images: string[] | null }> = [
      { prompt: row.storyboardPrompt1, images: row.storyboardImage1 },
      { prompt: row.storyboardPrompt2, images: row.storyboardImage2 },
      { prompt: row.storyboardPrompt3, images: row.storyboardImage3 },
      { prompt: row.storyboardPrompt4, images: row.storyboardImage4 },
    ];
    promptSources.forEach(
      (src: { prompt: string | null; images: string[] | null }, idx: number) => {
        const images: string[] = src.images ?? [];
        if (!src.prompt && images.length === 0) {
          return;
        }
        storyboardPrompts.push({ index: idx + 1, prompt: src.prompt, images });
      },
    );

    const generatedVideos: GeneratedVideo[] = [];
    const videoSources: Array<string[] | null> = [
      row.generatedVideo1,
      row.generatedVideo2,
      row.generatedVideo3,
      row.generatedVideo4,
    ];
    videoSources.forEach((urls: string[] | null, idx: number) => {
      const safeUrls: string[] = urls ?? [];
      if (safeUrls.length === 0) {
        return;
      }
      generatedVideos.push({ index: idx + 1, urls: safeUrls });
    });

    return {
      id: row.id,
      baseRecordId: row.baseRecordId,
      videoLink: row.videoLink,
      originalCopy: row.originalCopy,
      videoCopyText: row.videoCopyText,
      hitStructureAnalysis: row.hitStructureAnalysis,
      storyboardScript: row.storyboardScript,
      storyboardPrompts,
      styleReferenceImages: row.styleReferenceImage ?? [],
      characterReferenceImages: row.characterReferenceImage ?? [],
      sceneSetting: row.sceneSetting,
      protagonistSetting: row.protagonistSetting,
      subtitleStyle: row.subtitleStyle,
      cameraMovementPreference: row.cameraMovementPreference ?? [],
      colorAtmosphere: row.colorAtmosphere,
      visualStyle: row.visualStyle,
      aspectRatio: row.aspectRatio,
      storyboardFineness: row.storyboardFineness,
      generatedVideos,
      playCount: row.playCount,
      likeCount: row.likeCount,
      commentCount: row.commentCount,
      processStatus: row.processStatus,
      createTime: row.createTime,
    };
  }

  private toStringList(rows: Array<{ value: string | null }>): string[] {
    return rows
      .map((row) => row.value)
      .filter((value): value is string => Boolean(value && value.trim() !== ''))
      .sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));
  }

  // 本地降级详情的附件 URL 换取临时直链；无 baseRecordId 直接返回原值，换取失败由 resolveMediaUrls 内部兜底
  private async resolveLocalDetailMedia(
    detail: VideoMaterialDetail,
    row: VideoMaterialRow,
  ): Promise<VideoMaterialDetail> {
    if (!row.baseRecordId) {
      return detail;
    }
    const fieldIdByName: Map<string, string> =
      await this.bitableService.getAttachmentFieldIds();
    const entries: MediaTokenEntry[] = collectEntriesFromLocalRow(
      row as unknown as Record<string, unknown>,
      fieldIdByName,
      row.baseRecordId,
    );
    return this.bitableService.resolveMediaUrls(detail, entries);
  }
}
