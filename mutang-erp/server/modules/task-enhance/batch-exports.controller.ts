import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import type {
  BatchExport,
  BatchExportCreateDto,
  BatchExportFinishDto,
  BatchExportListParams,
  TaskEnhanceListResponse,
} from '@shared/api.interface';
import { parseIdParam } from '../finance-core/query.util';
import { BatchExportsService } from './batch-exports.service';
import {
  resolveTaskEnhanceUserId,
  type TaskEnhanceUserContextRequest,
} from './task-enhance-shared.util';

@Controller('api/task-enhance/batch-exports')
export class BatchExportsController {
  constructor(private readonly exportsService: BatchExportsService) {}

  @Get()
  async list(
    @Query('exportType') exportType?: string,
    @Query('status') status?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<TaskEnhanceListResponse<BatchExport>> {
    const params: BatchExportListParams = {
      exportType,
      status,
      dateFrom,
      dateTo,
      sortBy,
      sortOrder,
      page,
      pageSize,
    };
    return this.exportsService.list(params);
  }

  @NeedLogin()
  @Post()
  async create(
    @Body() dto: BatchExportCreateDto,
    @Req() req: TaskEnhanceUserContextRequest,
  ): Promise<BatchExport> {
    return this.exportsService.create(dto, resolveTaskEnhanceUserId(req));
  }

  @Get(':id')
  async detail(@Param('id') id: string): Promise<BatchExport> {
    return this.exportsService.findById(parseIdParam(id));
  }

  @NeedLogin()
  @Post(':id/start')
  async start(
    @Param('id') id: string,
    @Req() req: TaskEnhanceUserContextRequest,
  ): Promise<BatchExport> {
    return this.exportsService.start(
      parseIdParam(id),
      resolveTaskEnhanceUserId(req),
    );
  }

  @NeedLogin()
  @Post(':id/finish')
  async finish(
    @Param('id') id: string,
    @Body() dto: BatchExportFinishDto,
    @Req() req: TaskEnhanceUserContextRequest,
  ): Promise<BatchExport> {
    return this.exportsService.finish(
      parseIdParam(id),
      dto,
      resolveTaskEnhanceUserId(req),
    );
  }

  @NeedLogin()
  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @Req() req: TaskEnhanceUserContextRequest,
  ): Promise<{ success: boolean }> {
    return this.exportsService.remove(
      parseIdParam(id),
      resolveTaskEnhanceUserId(req),
    );
  }
}
