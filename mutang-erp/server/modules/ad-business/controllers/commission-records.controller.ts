import {
  BadRequestException,
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
  CalculateCommissionRequest,
  CommissionRecordDetail,
  CommissionRecordListResult,
  CommissionRule,
} from '@shared/api.interface';
import { CommissionRecordsService } from '../services/commission-records.service';
import { CommissionRulesService } from '../services/commission-rules.service';
import {
  parsePage,
  parsePageSize,
  type UserContextRequest,
} from '../query.util';

const MAX_BATCH_ITEMS: number = 500;

interface BatchIdsBody {
  ids: string[];
}

@Controller('api/ad-business')
export class CommissionRecordsController {
  constructor(
    private readonly recordsService: CommissionRecordsService,
    private readonly rulesService: CommissionRulesService,
  ) {}

  @Get('commission-records')
  async findAll(
    @Query('recordNo') recordNo?: string,
    @Query('salesperson') salesperson?: string,
    @Query('accountName') accountName?: string,
    @Query('groupName') groupName?: string,
    @Query('platform') platform?: string,
    @Query('period') period?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<CommissionRecordListResult> {
    return this.recordsService.findAll({
      recordNo,
      salesperson,
      accountName,
      groupName,
      platform,
      period,
      status,
      page: parsePage(page),
      pageSize: parsePageSize(pageSize),
    });
  }

  @NeedLogin()
  @Post('commission-records/calculate')
  async calculate(
    @Body() body: CalculateCommissionRequest,
  ): Promise<{ created: number }> {
    if (!body?.period?.trim()) {
      throw new BadRequestException('请提供计算期间');
    }
    const rules: CommissionRule[] = await this.rulesService.listEnabled();
    return this.recordsService.calculate(body, rules);
  }

  @NeedLogin()
  @Post('commission-records/pay')
  async pay(
    @Req() req: UserContextRequest,
    @Body() body: BatchIdsBody,
  ): Promise<{ paid: number }> {
    if (!Array.isArray(body?.ids) || body.ids.length === 0) {
      throw new BadRequestException('请提供要发放的记录 ID');
    }
    if (body.ids.length > MAX_BATCH_ITEMS) {
      throw new BadRequestException(
        `单次批量最多 ${String(MAX_BATCH_ITEMS)} 条`,
      );
    }
    return this.recordsService.pay(body.ids, req.userContext.userId);
  }

  @Get('commission-records/:id')
  async detail(@Param('id') id: string): Promise<CommissionRecordDetail> {
    return this.recordsService.detail(id);
  }

  @NeedLogin()
  @Delete('commission-records/:id')
  async remove(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.recordsService.remove(id);
  }
}
