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
  AdvanceReturnRequest,
  CreateFinanceAdvanceRequest,
  CreateFinanceIncentiveRequest,
  FinanceAdvance,
  FinanceAdvanceListResult,
  FinanceIncentive,
  FinanceIncentiveListResult,
} from '@shared/api.interface';
import { FinanceAdvancesService } from './finance-advances.service';
import {
  parseIdParam,
  parsePage,
  parsePageSize,
  type UserContextRequest,
} from '../finance-core/query.util';

interface OperatorRequest extends UserContextRequest {
  userContext: { userId: string; userName: string };
}

interface ApproveIncentiveBody {
  approved?: boolean;
  rejectReason?: string;
}

interface IssueIncentiveBody {
  accountId?: number;
}

const parseApprovedFlag = (value: unknown): boolean => {
  if (typeof value !== 'boolean') {
    throw new BadRequestException('请提供有效的审批结果');
  }
  return value;
};

const parseAccountId = (value: unknown): number => {
  const parsed: number = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new BadRequestException('请提供有效的资金账户 ID');
  }
  return parsed;
};

@Controller('api/finance-enhance')
export class FinanceAdvancesController {
  constructor(private readonly financeAdvancesService: FinanceAdvancesService) {}

  @Get('advances')
  async listAdvances(
    @Query('customerName') customerName?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<FinanceAdvanceListResult> {
    return this.financeAdvancesService.listAdvances({
      customerName,
      status,
      page: parsePage(page),
      pageSize: parsePageSize(pageSize),
    });
  }

  @NeedLogin()
  @Post('advances')
  async createAdvance(
    @Req() req: OperatorRequest,
    @Body() dto: CreateFinanceAdvanceRequest,
  ): Promise<{ id: number }> {
    const advance: FinanceAdvance =
      await this.financeAdvancesService.createAdvance(
        dto,
        req.userContext.userName,
      );
    return { id: advance.id };
  }

  @NeedLogin()
  @Post('advances/:id/return')
  async returnAdvance(
    @Param('id') id: string,
    @Body() dto: AdvanceReturnRequest,
  ): Promise<{ success: boolean }> {
    return this.financeAdvancesService.returnAdvance(
      parseIdParam(id),
      dto,
    );
  }

  @NeedLogin()
  @Post('advances/:id/bad-debt')
  async markBadDebt(
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    return this.financeAdvancesService.markBadDebt(parseIdParam(id));
  }

  @NeedLogin()
  @Delete('advances/:id')
  async removeAdvance(
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    return this.financeAdvancesService.removeAdvance(parseIdParam(id));
  }

  @Get('incentives')
  async listIncentives(
    @Query('employeeName') employeeName?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<FinanceIncentiveListResult> {
    return this.financeAdvancesService.listIncentives({
      employeeName,
      status,
      page: parsePage(page),
      pageSize: parsePageSize(pageSize),
    });
  }

  @NeedLogin()
  @Post('incentives')
  async createIncentive(
    @Req() req: OperatorRequest,
    @Body() dto: CreateFinanceIncentiveRequest,
  ): Promise<{ id: number }> {
    const incentive: FinanceIncentive =
      await this.financeAdvancesService.createIncentive(
        dto,
        req.userContext.userName,
      );
    return { id: incentive.id };
  }

  @NeedLogin()
  @Post('incentives/:id/approve')
  async approveIncentive(
    @Req() req: OperatorRequest,
    @Param('id') id: string,
    @Body() body: ApproveIncentiveBody,
  ): Promise<{ success: boolean }> {
    return this.financeAdvancesService.approveIncentive(
      parseIdParam(id),
      parseApprovedFlag(body?.approved),
      body?.rejectReason,
      req.userContext.userName,
    );
  }

  @NeedLogin()
  @Post('incentives/:id/issue')
  async issueIncentive(
    @Param('id') id: string,
    @Body() body: IssueIncentiveBody,
  ): Promise<{ success: boolean }> {
    return this.financeAdvancesService.issueIncentive(
      parseIdParam(id),
      parseAccountId(body?.accountId),
    );
  }

  @NeedLogin()
  @Delete('incentives/:id')
  async removeIncentive(
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    return this.financeAdvancesService.removeIncentive(parseIdParam(id));
  }
}
