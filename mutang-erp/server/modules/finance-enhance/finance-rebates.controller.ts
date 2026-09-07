import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import type {
  CreateFinanceConsumptionRequest,
  CreateFinanceDeductionRequest,
  CreateFinanceRebateRequest,
  FinanceConsumption,
  FinanceConsumptionListResult,
  FinanceDeduction,
  FinanceDeductionListResult,
  FinanceRebate,
  FinanceRebateListResult,
} from '@shared/api.interface';
import {
  parseIdParam,
  parsePage,
  parsePageSize,
} from '../finance-core/query.util';
import { FinanceRebatesService } from './finance-rebates.service';

interface RebatesUserRequest {
  userContext: { userId: string; userName?: string };
}

interface IssueRebateBody {
  accountId: number;
}

interface DeductionApproveBody {
  approved: boolean;
  rejectReason?: string;
}

interface UpdateRebateBody {
  customerId?: string;
  customerName?: string;
  portId?: number;
  period?: string;
  consumptionBase?: number;
  rebateRate?: number;
  remark?: string;
}

interface UpdateConsumptionBody {
  customerId?: string;
  adAccountId?: string;
  portId?: number;
  consumptionDate?: string;
  amount?: number;
  platformData?: number;
  systemData?: number;
  remark?: string;
}

@Controller('api/finance-enhance')
export class FinanceRebatesController {
  constructor(private readonly rebatesService: FinanceRebatesService) {}

  private resolveUserName(req: RebatesUserRequest): string {
    return req.userContext.userName || req.userContext.userId;
  }

  @Get('rebates')
  async findRebates(
    @Query('customerName') customerName?: string,
    @Query('status') status?: string,
    @Query('period') period?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<FinanceRebateListResult> {
    return this.rebatesService.findRebates({
      customerName,
      status,
      period,
      page: parsePage(page),
      pageSize: parsePageSize(pageSize),
    });
  }

  @NeedLogin()
  @Post('rebates')
  async createRebate(
    @Req() req: RebatesUserRequest,
    @Body() dto: CreateFinanceRebateRequest,
  ): Promise<{ id: number }> {
    const rebate: FinanceRebate = await this.rebatesService.createRebate(
      dto,
      this.resolveUserName(req),
    );
    return { id: rebate.id };
  }

  @NeedLogin()
  @Post('rebates/:id/calculate')
  async calculateRebate(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.rebatesService.calculateRebate(parseIdParam(id));
  }

  @NeedLogin()
  @Post('rebates/:id/issue')
  async issueRebate(
    @Param('id') id: string,
    @Body() body: IssueRebateBody,
  ): Promise<{ success: boolean }> {
    return this.rebatesService.issueRebate(
      parseIdParam(id),
      this.parseBodyId(body?.accountId, '资金账户'),
    );
  }

  @NeedLogin()
  @Post('rebates/:id/cancel')
  async cancelRebate(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.rebatesService.cancelRebate(parseIdParam(id));
  }

  @NeedLogin()
  @Patch('rebates/:id')
  async updateRebate(
    @Param('id') id: string,
    @Body() dto: UpdateRebateBody,
  ): Promise<{ success: boolean }> {
    return this.rebatesService.updateRebate(parseIdParam(id), dto);
  }

  @NeedLogin()
  @Delete('rebates/:id')
  async removeRebate(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.rebatesService.removeRebate(parseIdParam(id));
  }

  @Get('deductions')
  async findDeductions(
    @Query('customerName') customerName?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<FinanceDeductionListResult> {
    return this.rebatesService.findDeductions({
      customerName,
      status,
      page: parsePage(page),
      pageSize: parsePageSize(pageSize),
    });
  }

  @NeedLogin()
  @Post('deductions')
  async createDeduction(
    @Req() req: RebatesUserRequest,
    @Body() dto: CreateFinanceDeductionRequest,
  ): Promise<{ id: number }> {
    const deduction: FinanceDeduction =
      await this.rebatesService.createDeduction(
        dto,
        this.resolveUserName(req),
      );
    return { id: deduction.id };
  }

  @NeedLogin()
  @Post('deductions/:id/approve')
  async approveDeduction(
    @Req() req: RebatesUserRequest,
    @Param('id') id: string,
    @Body() body: DeductionApproveBody,
  ): Promise<{ success: boolean }> {
    const approved: boolean = body?.approved === true;
    return this.rebatesService.approveDeduction(
      parseIdParam(id),
      approved,
      body?.rejectReason,
      this.resolveUserName(req),
    );
  }

  @NeedLogin()
  @Post('deductions/:id/execute')
  async executeDeduction(
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    return this.rebatesService.executeDeduction(parseIdParam(id));
  }

  @NeedLogin()
  @Delete('deductions/:id')
  async removeDeduction(
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    return this.rebatesService.removeDeduction(parseIdParam(id));
  }

  @Get('consumptions')
  async findConsumptions(
    @Query('consumptionDateFrom') consumptionDateFrom?: string,
    @Query('consumptionDateTo') consumptionDateTo?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<FinanceConsumptionListResult> {
    return this.rebatesService.findConsumptions({
      consumptionDateFrom,
      consumptionDateTo,
      status,
      page: parsePage(page),
      pageSize: parsePageSize(pageSize),
    });
  }

  @NeedLogin()
  @Post('consumptions')
  async createConsumption(
    @Body() dto: CreateFinanceConsumptionRequest,
  ): Promise<{ id: number }> {
    const consumption: FinanceConsumption =
      await this.rebatesService.createConsumption(dto);
    return { id: consumption.id };
  }

  @NeedLogin()
  @Patch('consumptions/:id')
  async updateConsumption(
    @Param('id') id: string,
    @Body() dto: UpdateConsumptionBody,
  ): Promise<{ success: boolean }> {
    return this.rebatesService.updateConsumption(parseIdParam(id), dto);
  }

  @NeedLogin()
  @Post('consumptions/:id/check')
  async checkConsumption(
    @Req() req: RebatesUserRequest,
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    return this.rebatesService.checkConsumption(
      parseIdParam(id),
      this.resolveUserName(req),
    );
  }

  private parseBodyId(value: unknown, label: string): number {
    const parsed: number = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new BadRequestException(`请提供有效的${label}ID`);
    }
    return parsed;
  }
}
