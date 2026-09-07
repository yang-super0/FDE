import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import type {
  OperationLogCreateDto,
  OperationLogEnhance,
  OperationLogEnhanceListParams,
  OperationLogStats,
  TaskEnhanceListResponse,
} from '@shared/api.interface';
import { parseIdParam } from '../finance-core/query.util';
import { OperationLogsEnhanceService } from './operation-logs-enhance.service';
import {
  resolveSystemEnhanceUserId,
  type SystemEnhanceUserContextRequest,
} from './system-enhance-shared.util';

@Controller('api/system-enhance/operation-logs')
export class OperationLogsEnhanceController {
  constructor(
    private readonly operationLogsService: OperationLogsEnhanceService,
  ) {}

  @Get()
  async list(
    @Query('module') module?: string,
    @Query('operation') operation?: string,
    @Query('username') username?: string,
    @Query('riskLevel') riskLevel?: string,
    @Query('includeArchived') includeArchived?: string,
    @Query('status') status?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<TaskEnhanceListResponse<OperationLogEnhance>> {
    const params: OperationLogEnhanceListParams = {
      module,
      operation,
      username,
      riskLevel,
      includeArchived,
      status,
      dateFrom,
      dateTo,
      sortBy,
      sortOrder,
      page,
      pageSize,
    };
    return this.operationLogsService.list(params);
  }

  @Get('stats')
  async stats(): Promise<OperationLogStats> {
    return this.operationLogsService.stats();
  }

  @Get(':id')
  async detail(@Param('id') id: string): Promise<OperationLogEnhance> {
    return this.operationLogsService.detail(parseIdParam(id));
  }

  @NeedLogin()
  @Post()
  async create(
    @Body() dto: OperationLogCreateDto,
    @Req() req: SystemEnhanceUserContextRequest,
  ): Promise<OperationLogEnhance> {
    const userId: string =
      resolveSystemEnhanceUserId(req) !== '' ? resolveSystemEnhanceUserId(req) : 'system';
    const rawName: string = req.userContext?.userName ?? '';
    const username: string = rawName.trim() !== '' ? rawName.trim() : '系统';
    return this.operationLogsService.create(dto, userId, username);
  }

  @NeedLogin()
  @Post('archive')
  async archive(
    @Req() req: SystemEnhanceUserContextRequest,
  ): Promise<{ archived: number }> {
    return this.operationLogsService.archive(
      resolveSystemEnhanceUserId(req),
    );
  }
}
