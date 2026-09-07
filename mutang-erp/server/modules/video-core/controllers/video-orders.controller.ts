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
  BatchIdsApproveRequest,
  CreateVideoOrderRequest,
  UpdateVideoOrderRequest,
  VideoOrder,
  VideoOrderListResult,
  VideoOrderStatusRequest,
} from '@shared/api.interface';
import { VideoOrdersService } from '../services/video-orders.service';
import {
  parseIdList,
  parseIdParam,
  parsePage,
  type UserContextRequest,
} from '@server/modules/finance-core/query.util';

const DEFAULT_PAGE_SIZE: number = 10;
const MAX_PAGE_SIZE: number = 100;

const parsePageSize = (value?: string): number => {
  const parsed: number = value ? parseInt(value, 10) : DEFAULT_PAGE_SIZE;
  if (Number.isNaN(parsed) || parsed < 1) {
    return DEFAULT_PAGE_SIZE;
  }
  return Math.min(parsed, MAX_PAGE_SIZE);
};

@Controller('api/video-core/orders')
export class VideoOrdersController {
  constructor(private readonly videoOrdersService: VideoOrdersService) {}

  @Get()
  async findAll(
    @Query('orderNo') orderNo?: string,
    @Query('groupName') groupName?: string,
    @Query('subjectName') subjectName?: string,
    @Query('videoType') videoType?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<VideoOrderListResult> {
    return this.videoOrdersService.findAll({
      orderNo,
      groupName,
      subjectName,
      videoType,
      status,
      startDate,
      endDate,
      page: parsePage(page),
      pageSize: parsePageSize(pageSize),
    });
  }

  /** 静态路由声明在 :id 动态路由之前 */
  @NeedLogin()
  @Post('batch-approve')
  async batchApprove(
    @Req() req: UserContextRequest,
    @Body() body: BatchIdsApproveRequest,
  ): Promise<{ updated: number; skipped: number }> {
    const ids: number[] = parseIdList(body?.ids);
    return this.videoOrdersService.batchApprove(
      ids,
      {
        approved: Boolean(body?.approved),
        rejectReason: body?.rejectReason,
      },
      req.userContext.userId,
    );
  }

  @NeedLogin()
  @Post()
  async create(
    @Req() req: UserContextRequest,
    @Body() dto: CreateVideoOrderRequest,
  ): Promise<{ id: number }> {
    const created: VideoOrder = await this.videoOrdersService.create(
      dto,
      req.userContext.userId,
    );
    return { id: created.id };
  }

  @Get(':id')
  async detail(@Param('id') id: string): Promise<VideoOrder> {
    return this.videoOrdersService.detail(parseIdParam(id));
  }

  @NeedLogin()
  @Patch(':id')
  async update(
    @Req() req: UserContextRequest,
    @Param('id') id: string,
    @Body() dto: UpdateVideoOrderRequest,
  ): Promise<{ success: boolean }> {
    return this.videoOrdersService.update(
      parseIdParam(id),
      dto,
      req.userContext.userId,
    );
  }

  @NeedLogin()
  @Post(':id/status')
  async updateStatus(
    @Req() req: UserContextRequest,
    @Param('id') id: string,
    @Body() body: VideoOrderStatusRequest,
  ): Promise<{ success: boolean }> {
    return this.videoOrdersService.updateStatus(
      parseIdParam(id),
      {
        status: body?.status,
      },
      req.userContext.userId,
    );
  }

  @NeedLogin()
  @Delete(':id')
  async remove(
    @Req() req: UserContextRequest,
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    return this.videoOrdersService.remove(
      parseIdParam(id),
      req.userContext.userId,
    );
  }
}
