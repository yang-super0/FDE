import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import type {
  FinanceMonthlyTrendItem,
  FinanceRecord,
  FinanceRecordType,
  FinanceSummary,
  PageResult,
} from '@shared/api.interface';
import {
  FinanceService,
  type FinanceRecordInput,
} from './finance.service';

interface UserContext {
  userId: string;
  tenantId: string;
  appId: string;
  env: string;
  userName: string;
}

type AuthedRequest = Request & { userContext: UserContext };

@Controller('api/finance-records')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('summary')
  async getSummary(@Query('month') month?: string): Promise<FinanceSummary> {
    return this.financeService.summary(month);
  }

  @Get('monthly-trend')
  async getMonthlyTrend(): Promise<{ items: FinanceMonthlyTrendItem[] }> {
    return this.financeService.monthlyTrend();
  }

  @Get()
  async list(
    @Query('month') month?: string,
    @Query('type') type?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<PageResult<FinanceRecord>> {
    const parsedPage: number = Number.parseInt(page ?? '1', 10);
    const parsedPageSize: number = Number.parseInt(pageSize ?? '20', 10);
    const typeFilter: FinanceRecordType | undefined =
      type === 'income' || type === 'expense' ? type : undefined;
    return this.financeService.findAll({
      month: month || undefined,
      type: typeFilter,
      page: Number.isNaN(parsedPage) ? 1 : parsedPage,
      pageSize: Number.isNaN(parsedPageSize) ? 20 : parsedPageSize,
    });
  }

  @NeedLogin()
  @Post()
  async create(
    @Req() req: AuthedRequest,
    @Body() body: FinanceRecordInput,
  ): Promise<{ id: string }> {
    return this.financeService.create(body, req.userContext.userId);
  }

  @NeedLogin()
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Req() req: AuthedRequest,
    @Body() body: FinanceRecordInput,
  ): Promise<{ success: boolean }> {
    await this.financeService.update(id, body, req.userContext.userId);
    return { success: true };
  }

  @NeedLogin()
  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @Req() req: AuthedRequest,
  ): Promise<{ success: boolean }> {
    await this.financeService.remove(id, req.userContext.userId);
    return { success: true };
  }
}
