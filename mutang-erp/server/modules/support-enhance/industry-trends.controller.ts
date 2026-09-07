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
import type {
  IndustryTrendComparisonItem,
  IndustryTrendCreateDto,
  IndustryTrendListParams,
  IndustryTrendPoint,
  IndustryTrendRecord,
  IndustryTrendStats,
  IndustryTrendUpdateDto,
} from '@shared/api.interface';
import { parseIdParam } from '@server/modules/finance-core/query.util';
import {
  resolveSupportEnhanceUserId,
  type SupportEnhanceUserContextRequest,
} from './support-enhance-shared.util';
import {
  IndustryTrendListResponse,
  IndustryTrendsService,
} from './industry-trends.service';

@Controller('api/support-enhance/industry-trends')
export class IndustryTrendsController {
  constructor(private readonly trendsService: IndustryTrendsService) {}

  /** 列表（静态路由须在 :id 之前） */
  @Get()
  async list(
    @Query() params: IndustryTrendListParams,
  ): Promise<IndustryTrendListResponse> {
    return this.trendsService.list(params);
  }

  @Get('stats')
  async stats(): Promise<IndustryTrendStats> {
    return this.trendsService.stats();
  }

  @Get('series')
  async series(
    @Query('industry') industry?: string,
    @Query('platform') platform?: string,
    @Query('granularity') granularity?: string,
  ): Promise<IndustryTrendPoint[]> {
    return this.trendsService.series(industry, platform, granularity);
  }

  @Get('comparison/industry')
  async comparisonByIndustry(
    @Query('platform') platform?: string,
  ): Promise<IndustryTrendComparisonItem[]> {
    return this.trendsService.comparisonByIndustry(platform);
  }

  @Get('comparison/platform')
  async comparisonByPlatform(
    @Query('industry') industry?: string,
  ): Promise<IndustryTrendComparisonItem[]> {
    return this.trendsService.comparisonByPlatform(industry);
  }

  @Post()
  async create(
    @Body() dto: IndustryTrendCreateDto,
    @Req() req: SupportEnhanceUserContextRequest,
  ): Promise<IndustryTrendRecord> {
    return this.trendsService.create(
      dto,
      resolveSupportEnhanceUserId(req),
    );
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<IndustryTrendRecord> {
    return this.trendsService.findById(parseIdParam(id));
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: IndustryTrendUpdateDto,
    @Req() req: SupportEnhanceUserContextRequest,
  ): Promise<IndustryTrendRecord> {
    return this.trendsService.update(
      parseIdParam(id),
      dto,
      resolveSupportEnhanceUserId(req),
    );
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @Req() req: SupportEnhanceUserContextRequest,
  ): Promise<{ deleted: boolean }> {
    return this.trendsService.remove(
      parseIdParam(id),
      resolveSupportEnhanceUserId(req),
    );
  }
}
