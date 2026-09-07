import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import type {
  SyncConfigItem,
  SyncConfigListResponse,
  SyncConfigUpdateDto,
  SyncFullSyncResult,
  SyncLogListParams,
  SyncLogListResponse,
  SyncStatsResponse,
} from '@shared/api.interface';
import { FeishuBitableService } from './feishu-bitable.service';
import { SyncConfigService } from './sync-config.service';
import { SyncLogService } from './sync-log.service';
import { SyncService } from './sync.service';

const CREDENTIALS_UNCONFIGURED_MESSAGE =
  '飞书应用凭证未配置或无效，请检查 FEISHU_APP_ID / FEISHU_APP_SECRET';

@NeedLogin()
@Controller('api/sync')
export class SyncController {
  constructor(
    private readonly bitableService: FeishuBitableService,
    private readonly configService: SyncConfigService,
    private readonly logService: SyncLogService,
    private readonly syncService: SyncService,
  ) {}

  @Get('configs')
  async listConfigs(): Promise<SyncConfigListResponse> {
    const [items, credentialsConfigured] = await Promise.all([
      this.configService.listConfigs(),
      this.bitableService.testCredentials(),
    ]);
    return { items, credentialsConfigured };
  }

  @Put('configs/:id')
  async updateConfig(
    @Param('id') id: string,
    @Body() dto: SyncConfigUpdateDto,
  ): Promise<SyncConfigItem> {
    return this.configService.updateConfig(this.parseId(id), dto);
  }

  @Post('configs/:id/enable')
  async enableConfig(@Param('id') id: string): Promise<SyncConfigItem> {
    return this.configService.setEnabled(this.parseId(id), true);
  }

  @Post('configs/:id/disable')
  async disableConfig(@Param('id') id: string): Promise<SyncConfigItem> {
    return this.configService.setEnabled(this.parseId(id), false);
  }

  @Post('full-sync/:tableName')
  async fullSync(
    @Param('tableName') tableName: string,
  ): Promise<SyncFullSyncResult> {
    return this.syncService.fullSyncTable(tableName);
  }

  @Post('full-sync-all')
  async fullSyncAll(): Promise<SyncFullSyncResult[]> {
    return this.syncService.fullSyncAll();
  }

  @Get('logs')
  async listLogs(
    @Query('tableName') tableName?: string,
    @Query('status') status?: string,
    @Query('operation') operation?: string,
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<SyncLogListResponse> {
    const params: SyncLogListParams = {
      tableName,
      status,
      operation,
      startTime,
      endTime,
      page,
      pageSize,
    };
    return this.logService.listLogs(params);
  }

  @Get('stats')
  async stats(): Promise<SyncStatsResponse> {
    return this.logService.getStats();
  }

  @Get('credentials')
  async credentials(): Promise<{ configured: boolean; message: string }> {
    const configured: boolean = await this.bitableService.testCredentials();
    return {
      configured,
      message: configured ? '飞书应用凭证有效' : CREDENTIALS_UNCONFIGURED_MESSAGE,
    };
  }

  private parseId(id: string): number {
    const parsed: number = Number(id);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new BadRequestException('无效的同步配置ID');
    }
    return parsed;
  }
}
