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
  CompetitorComparisonItem,
  CompetitorCreateDto,
  CompetitorListParams,
  CompetitorMonitoring,
  CompetitorMonitoringStats,
  CompetitorRankItem,
  CompetitorTrendPoint,
  CompetitorUpdateDto,
} from '@shared/api.interface';
import { parseIdParam } from '../finance-core/query.util';
import {
  resolveSupportEnhanceUserId,
  type SupportEnhanceUserContextRequest,
} from './support-enhance-shared.util';
import { CompetitorMonitoringService } from './competitor-monitoring.service';
import type { CompetitorMonitoringPage } from './competitor-monitoring.service';

@Controller('api/support-enhance/competitors')
export class CompetitorMonitoringController {
  constructor(
    private readonly competitorService: CompetitorMonitoringService,
  ) {}

  @Get()
  async list(
    @Query() query: CompetitorListParams,
  ): Promise<CompetitorMonitoringPage> {
    return this.competitorService.list(query);
  }

  @Get('stats')
  async stats(): Promise<CompetitorMonitoringStats> {
    return this.competitorService.getStats();
  }

  @Get('comparison')
  async comparison(
    @Query('names') names?: string,
  ): Promise<CompetitorComparisonItem[]> {
    return this.competitorService.getComparison(names);
  }

  @Get('trend')
  async trend(@Query('name') name?: string): Promise<CompetitorTrendPoint[]> {
    return this.competitorService.getTrend(name);
  }

  @Get('ranking')
  async ranking(
    @Query('industry') industry?: string,
    @Query('sortBy') sortBy?: string,
  ): Promise<CompetitorRankItem[]> {
    return this.competitorService.getRanking(industry, sortBy);
  }

  @Get(':id')
  async detail(@Param('id') id: string): Promise<CompetitorMonitoring> {
    return this.competitorService.getById(parseIdParam(id));
  }

  @NeedLogin()
  @Post()
  async create(
    @Req() req: SupportEnhanceUserContextRequest,
    @Body() dto: CompetitorCreateDto,
  ): Promise<CompetitorMonitoring> {
    return this.competitorService.create(
      dto,
      resolveSupportEnhanceUserId(req),
    );
  }

  @NeedLogin()
  @Patch(':id')
  async update(
    @Req() req: SupportEnhanceUserContextRequest,
    @Param('id') id: string,
    @Body() dto: CompetitorUpdateDto,
  ): Promise<CompetitorMonitoring> {
    return this.competitorService.update(
      parseIdParam(id),
      dto,
      resolveSupportEnhanceUserId(req),
    );
  }

  @NeedLogin()
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.competitorService.remove(parseIdParam(id));
  }
}
