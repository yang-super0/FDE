import { Controller, Get, Post, Query } from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import type {
  ConsumptionSummarySyncResult,
  GroupRankItem,
  IndustryRankItem,
  NewAccountRankItem,
  PortRankItem,
  RankListResult,
  SalespersonRankItem,
} from '@shared/api.interface';
import { DailyConsumptionService } from './daily-consumption.service';

@Controller('api/daily-consumption')
export class DailyConsumptionController {
  constructor(private readonly consumptionService: DailyConsumptionService) {}

  @Get('ranks/salesperson')
  async salespersonRank(
    @Query('timeRange') timeRange?: string,
    @Query('port') port?: string,
  ): Promise<RankListResult> {
    const items: SalespersonRankItem[] =
      await this.consumptionService.getSalespersonRank(
        timeRange ?? '本月',
        port ?? '全部',
      );
    return {
      items,
      lastSyncedAt: await this.consumptionService.getLastSyncedAt(),
    };
  }

  @Get('ranks/group')
  async groupRank(
    @Query('timeRange') timeRange?: string,
    @Query('port') port?: string,
  ): Promise<RankListResult> {
    const items: GroupRankItem[] = await this.consumptionService.getGroupRank(
      timeRange ?? '本月',
      port ?? '全部',
    );
    return {
      items,
      lastSyncedAt: await this.consumptionService.getLastSyncedAt(),
    };
  }

  @Get('ranks/port')
  async portRank(
    @Query('timeRange') timeRange?: string,
    @Query('port') port?: string,
  ): Promise<RankListResult> {
    const items: PortRankItem[] = await this.consumptionService.getPortRank(
      timeRange ?? '本月',
      port ?? '全部',
    );
    return {
      items,
      lastSyncedAt: await this.consumptionService.getLastSyncedAt(),
    };
  }

  @Get('ranks/industry')
  async industryRank(
    @Query('timeRange') timeRange?: string,
    @Query('port') port?: string,
  ): Promise<RankListResult> {
    const items: IndustryRankItem[] =
      await this.consumptionService.getIndustryRank(
        timeRange ?? '本月',
        port ?? '全部',
      );
    return {
      items,
      lastSyncedAt: await this.consumptionService.getLastSyncedAt(),
    };
  }

  @Get('ranks/new-accounts')
  async newAccountRank(
    @Query('timeRange') timeRange?: string,
    @Query('port') port?: string,
    @Query('dimension') dimension?: string,
  ): Promise<RankListResult> {
    const items: NewAccountRankItem[] =
      await this.consumptionService.getNewAccountRank(
        timeRange ?? '本月',
        port ?? '全部',
        dimension ?? '商务',
      );
    return {
      items,
      lastSyncedAt: await this.consumptionService.getLastSyncedAt(),
    };
  }

  @NeedLogin()
  @Post('sync')
  async sync(): Promise<ConsumptionSummarySyncResult> {
    const result: ConsumptionSummarySyncResult =
      await this.consumptionService.syncConsumption();
    return result;
  }
}
