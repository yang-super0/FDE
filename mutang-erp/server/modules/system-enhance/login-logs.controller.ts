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
  LoginLog,
  LoginLogCreateDto,
  LoginLogListParams,
  LoginLogRecordResult,
  LoginLogStats,
  TaskEnhanceListResponse,
} from '@shared/api.interface';
import { parseIdParam } from '../finance-core/query.util';
import { LoginLogsService } from './login-logs.service';
import {
  resolveSystemEnhanceUserId,
  type SystemEnhanceUserContextRequest,
} from './system-enhance-shared.util';

@Controller('api/system-enhance/login-logs')
export class LoginLogsController {
  constructor(private readonly loginLogsService: LoginLogsService) {}

  @Get()
  async list(
    @Query('loginStatus') loginStatus?: string,
    @Query('loginType') loginType?: string,
    @Query('username') username?: string,
    @Query('status') status?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<TaskEnhanceListResponse<LoginLog>> {
    const params: LoginLogListParams = {
      loginStatus,
      loginType,
      username,
      status,
      dateFrom,
      dateTo,
      sortBy,
      sortOrder,
      page,
      pageSize,
    };
    return this.loginLogsService.list(params);
  }

  @Get('stats')
  async stats(
    @Query('loginStatus') loginStatus?: string,
    @Query('loginType') loginType?: string,
    @Query('username') username?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ): Promise<LoginLogStats> {
    return this.loginLogsService.stats({
      loginStatus,
      loginType,
      username,
      dateFrom,
      dateTo,
    });
  }

  @Get(':id')
  async detail(@Param('id') id: string): Promise<LoginLog> {
    return this.loginLogsService.detail(parseIdParam(id));
  }

  @NeedLogin()
  @Post('record')
  async record(
    @Req() req: SystemEnhanceUserContextRequest & {
      headers: Record<string, unknown>;
      socket?: { remoteAddress?: string };
    },
  ): Promise<LoginLogRecordResult> {
    const forwarded: unknown = req.headers['x-forwarded-for'];
    const ipAddress: string =
      typeof forwarded === 'string' && forwarded.trim() !== ''
        ? forwarded.split(',')[0].trim()
        : (req.socket?.remoteAddress ?? '');
    const userAgent: string = String(
      req.headers['user-agent'] ?? '',
    ).slice(0, 490);
    const userId: string = resolveSystemEnhanceUserId(req);
    return this.loginLogsService.recordLogin(
      userId,
      req.userContext?.userName || userId || '未知用户',
      ipAddress,
      userAgent,
    );
  }

  @NeedLogin()
  @Post()
  async create(
    @Body() dto: LoginLogCreateDto,
  ): Promise<LoginLog> {
    return this.loginLogsService.create(dto);
  }

  @NeedLogin()
  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @Req() req: SystemEnhanceUserContextRequest,
  ): Promise<{ success: boolean }> {
    return this.loginLogsService.remove(
      parseIdParam(id),
      resolveSystemEnhanceUserId(req),
    );
  }
}
