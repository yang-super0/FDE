import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import type {
  CreateHrPerformanceBody,
  HrPerformance,
  HrPerformanceAppealBody,
  HrPerformanceLeaderScoreBody,
  HrPerformancePage,
  HrPerformanceSelfScoreBody,
  UpdateHrPerformanceBody,
} from '@shared/api.interface';
import { parseIdParam } from '../finance-core/query.util';
import { HrPerformancesService } from './hr-performances.service';

@Controller('api/hr-enhance/performances')
export class HrPerformancesController {
  constructor(private readonly performancesService: HrPerformancesService) {}

  @Get()
  async list(
    @Query('period') period?: string,
    @Query('mode') mode?: string,
    @Query('grade') grade?: string,
    @Query('status') status?: string,
    @Query('employeeName') employeeName?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<HrPerformancePage> {
    return this.performancesService.list({
      period,
      mode,
      grade,
      status,
      employeeName,
      page,
      pageSize,
    });
  }

  @NeedLogin()
  @Post()
  async create(@Body() dto: CreateHrPerformanceBody): Promise<HrPerformance> {
    return this.performancesService.create(dto);
  }

  @NeedLogin()
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateHrPerformanceBody,
  ): Promise<HrPerformance> {
    return this.performancesService.update(parseIdParam(id), dto);
  }

  @NeedLogin()
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.performancesService.remove(parseIdParam(id));
  }

  @NeedLogin()
  @Post(':id/self-score')
  async selfScore(
    @Param('id') id: string,
    @Body() dto: HrPerformanceSelfScoreBody,
  ): Promise<HrPerformance> {
    return this.performancesService.selfScore(parseIdParam(id), dto);
  }

  @NeedLogin()
  @Post(':id/leader-score')
  async leaderScore(
    @Param('id') id: string,
    @Body() dto: HrPerformanceLeaderScoreBody,
  ): Promise<HrPerformance> {
    return this.performancesService.leaderScore(parseIdParam(id), dto);
  }

  @NeedLogin()
  @Post(':id/appeal')
  async appeal(
    @Param('id') id: string,
    @Body() dto: HrPerformanceAppealBody,
  ): Promise<HrPerformance> {
    return this.performancesService.appeal(parseIdParam(id), dto);
  }
}
