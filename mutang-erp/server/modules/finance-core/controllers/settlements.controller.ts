import { Controller, Get, Query } from '@nestjs/common';
import type { FinanceSettlementListResult } from '@shared/api.interface';
import { SettlementsService } from '../services/settlements.service';
import { parsePage, parsePageSize } from '../query.util';

@Controller('api/finance-core')
export class SettlementsController {
  constructor(private readonly settlementsService: SettlementsService) {}

  @Get('settlements')
  async findAll(
    @Query('customerName') customerName?: string,
    @Query('period') period?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<FinanceSettlementListResult> {
    return this.settlementsService.findAll({
      customerName,
      period,
      status,
      page: parsePage(page),
      pageSize: parsePageSize(pageSize),
    });
  }
}
