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
  BatchImport,
  BatchImportCreateDto,
  BatchImportFinishDto,
  BatchImportListParams,
  TaskEnhanceListResponse,
} from '@shared/api.interface';
import { parseIdParam } from '../finance-core/query.util';
import { BatchImportsService } from './batch-imports.service';
import {
  resolveTaskEnhanceUserId,
  type TaskEnhanceUserContextRequest,
} from './task-enhance-shared.util';

@Controller('api/task-enhance/batch-imports')
export class BatchImportsController {
  constructor(private readonly importsService: BatchImportsService) {}

  @Get()
  async list(
    @Query('importType') importType?: string,
    @Query('status') status?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<TaskEnhanceListResponse<BatchImport>> {
    const params: BatchImportListParams = {
      importType,
      status,
      dateFrom,
      dateTo,
      sortBy,
      sortOrder,
      page,
      pageSize,
    };
    return this.importsService.list(params);
  }

  @NeedLogin()
  @Post()
  async create(
    @Body() dto: BatchImportCreateDto,
    @Req() req: TaskEnhanceUserContextRequest,
  ): Promise<BatchImport> {
    return this.importsService.create(dto, resolveTaskEnhanceUserId(req));
  }

  @Get(':id')
  async detail(@Param('id') id: string): Promise<BatchImport> {
    return this.importsService.findById(parseIdParam(id));
  }

  @NeedLogin()
  @Post(':id/start')
  async start(
    @Param('id') id: string,
    @Req() req: TaskEnhanceUserContextRequest,
  ): Promise<BatchImport> {
    return this.importsService.start(
      parseIdParam(id),
      resolveTaskEnhanceUserId(req),
    );
  }

  @NeedLogin()
  @Post(':id/finish')
  async finish(
    @Param('id') id: string,
    @Body() dto: BatchImportFinishDto,
    @Req() req: TaskEnhanceUserContextRequest,
  ): Promise<BatchImport> {
    return this.importsService.finish(
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
    return this.importsService.remove(
      parseIdParam(id),
      resolveTaskEnhanceUserId(req),
    );
  }
}
