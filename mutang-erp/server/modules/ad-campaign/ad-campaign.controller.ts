import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import { OperationLogService } from '@server/modules/operation-log/operation-log.service';
import type {
  AdCampaignDetail,
  PageResult,
  AdCampaign,
  PerformanceDetailItem,
  PerformanceGranularity,
  PerformanceTrendItem,
} from '@shared/api.interface';
import {
  AdCampaignService,
  type CampaignStatusAction,
} from './ad-campaign.service';

interface RequestContext {
  userContext: { userId: string };
}

interface CreateCampaignBody {
  name: string;
  customerId: string;
  platform: string;
  budget: number;
  startDate: string;
  endDate: string;
}

interface UpdateStatusBody {
  status: CampaignStatusAction;
}

@Controller('api/ad-campaigns')
export class AdCampaignController {
  constructor(
    private readonly adCampaignService: AdCampaignService,
    private readonly operationLogService: OperationLogService,
  ) {}

  @Get()
  async list(
    @Query('status') status?: string,
    @Query('platform') platform?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<PageResult<AdCampaign>> {
    return this.adCampaignService.list({
      status,
      platform,
      page: parseInt(page ?? '1', 10) || 1,
      pageSize: parseInt(pageSize ?? '20', 10) || 20,
    });
  }

  @NeedLogin()
  @Post()
  async create(
    @Req() req: RequestContext,
    @Body() body: CreateCampaignBody,
  ): Promise<{ id: string }> {
    const result: { id: string } = await this.adCampaignService.create({
      name: body.name,
      customerId: body.customerId,
      platform: body.platform,
      budget: Number(body.budget),
      startDate: body.startDate,
      endDate: body.endDate,
    });
    await this.operationLogService.record({
      module: '广告业务',
      actionType: 'create',
      target: body.name,
      operatorId: req.userContext.userId,
    });
    return result;
  }

  @NeedLogin()
  @Patch(':id/status')
  async updateStatus(
    @Req() req: RequestContext,
    @Param('id') id: string,
    @Body() body: UpdateStatusBody,
  ): Promise<{ success: boolean }> {
    const result: { campaignName: string } =
      await this.adCampaignService.updateStatus(id, body.status);
    await this.operationLogService.record({
      module: '广告业务',
      actionType: 'status_change',
      target: `${result.campaignName}（${body.status}）`,
      operatorId: req.userContext.userId,
    });
    return { success: true };
  }

  @Get(':id')
  async getDetail(@Param('id') id: string): Promise<AdCampaignDetail> {
    return this.adCampaignService.getDetail(id);
  }

  @Get(':id/performance')
  async getPerformanceTrend(
    @Param('id') id: string,
    @Query('granularity') granularity?: string,
  ): Promise<{ items: PerformanceTrendItem[] }> {
    const normalized: PerformanceGranularity =
      granularity === 'week' || granularity === 'month' ? granularity : 'day';
    return this.adCampaignService.getPerformanceTrend(id, normalized);
  }

  @Get(':id/performance-details')
  async getPerformanceDetails(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<PageResult<PerformanceDetailItem>> {
    return this.adCampaignService.getPerformanceDetails(
      id,
      parseInt(page ?? '1', 10) || 1,
      parseInt(pageSize ?? '20', 10) || 20,
    );
  }
}
