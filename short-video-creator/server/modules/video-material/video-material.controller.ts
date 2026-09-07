import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import type {
  BitableSelectOptions,
  CreateVideoMaterialRequest,
  CreateVideoMaterialResponse,
  DeleteVideoMaterialResponse,
  StartGenerateResponse,
  SyncStatusItem,
  SyncStatusResponse,
  TopOrderBy,
  TopMaterialsResponse,
  UpdateVideoMaterialRequest,
  UpdateVideoMaterialResponse,
  VideoMaterialDetail,
  VideoMaterialListParams,
  VideoMaterialListResponse,
  VideoMaterialOptions,
} from '@shared/video-material';
import { BitableService } from '../bitable/bitable.service';
import { SyncStateService } from './sync-state.service';
import { VideoMaterialService } from './video-material.service';

interface RequestContext {
  userContext: { userId: string };
}

@Controller('api/video-material')
export class VideoMaterialController {
  constructor(
    private readonly videoMaterialService: VideoMaterialService,
    private readonly bitableService: BitableService,
    private readonly syncState: SyncStateService,
  ) {}

  @Get()
  async list(
    @Query('keyword') keyword?: string,
    @Query('videoType') videoType?: string,
    @Query('targetPlatform') targetPlatform?: string,
    @Query('processStatus') processStatus?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<VideoMaterialListResponse> {
    const params: VideoMaterialListParams = {
      keyword: keyword || undefined,
      videoType: videoType || undefined,
      targetPlatform: targetPlatform || undefined,
      processStatus: processStatus || undefined,
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 20,
    };
    return this.videoMaterialService.list(params);
  }

  @Get('options')
  async getOptions(): Promise<VideoMaterialOptions> {
    return this.videoMaterialService.getOptions();
  }

  @Get('top')
  async getTop(
    @Query('orderBy') orderBy?: string,
    @Query('limit') limit?: string,
  ): Promise<TopMaterialsResponse> {
    const sortBy: TopOrderBy = orderBy === 'likeCount' ? 'likeCount' : 'playCount';
    const maxLimit: number = limit ? Math.min(Number(limit), 50) : 10;
    return this.videoMaterialService.getTop(sortBy, maxLimit);
  }

  @NeedLogin()
  @Post()
  async create(
    @Req() req: RequestContext,
    @Body() dto: CreateVideoMaterialRequest,
  ): Promise<CreateVideoMaterialResponse> {
    const userId: string = req.userContext.userId;
    return this.videoMaterialService.create(dto, userId);
  }

  @NeedLogin()
  @Post(':id/generate')
  async startGenerate(
    @Req() req: RequestContext,
    @Param('id') id: string,
  ): Promise<StartGenerateResponse> {
    const userId: string = req.userContext.userId;
    return this.videoMaterialService.startGenerate(id, userId);
  }

  @Get('sync-status')
  async getSyncStatus(): Promise<SyncStatusResponse> {
    const items: SyncStatusItem[] = await this.syncState.getLatest();
    const lastSuccess: SyncStatusItem | undefined = items.find(
      (item: SyncStatusItem) => item.status === 'success',
    );
    const lastFailed: SyncStatusItem | undefined = items.find(
      (item: SyncStatusItem) => item.status === 'failed',
    );
    return {
      items,
      lastSuccessAt: lastSuccess?.syncedAt ?? null,
      lastError: lastFailed?.message ?? null,
    };
  }

  @Get('bitable-options')
  async getBitableOptions(): Promise<BitableSelectOptions> {
    const options: Record<string, string[]> =
      await this.bitableService.getSelectOptions();
    return {
      videoTypes: options['视频类型'] ?? [],
      targetPlatforms: options['目标平台'] ?? [],
      subtitleStyles: options['字幕样式'] ?? [],
      cameraMovements: options['运镜偏好'] ?? [],
      colorAtmospheres: options['色调氛围'] ?? [],
      visualStyles: options['视觉风格'] ?? [],
      aspectRatios: options['画面比例'] ?? [],
      storyboardFinenessOptions: options['分镜精细度'] ?? [],
    };
  }

  @NeedLogin()
  @Patch(':id')
  async update(
    @Req() req: RequestContext,
    @Param('id') id: string,
    @Body() dto: UpdateVideoMaterialRequest,
  ): Promise<UpdateVideoMaterialResponse> {
    const userId: string = req.userContext.userId;
    return this.videoMaterialService.update(id, dto, userId);
  }

  @NeedLogin()
  @Delete(':id')
  async remove(
    @Req() req: RequestContext,
    @Param('id') id: string,
  ): Promise<DeleteVideoMaterialResponse> {
    const userId: string = req.userContext.userId;
    return this.videoMaterialService.remove(id, userId);
  }

  @Get(':id')
  async getDetail(@Param('id') id: string): Promise<VideoMaterialDetail> {
    return this.videoMaterialService.detail(id);
  }
}
