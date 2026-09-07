import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import type {
  ApplyContractCommissionRequest,
  ContractCommissionApplication,
  ContractCommissionApplicationListParams,
  ContractCommissionApplicationListResult,
  ContractReminder,
  CreateContractReminderRequest,
  RejectContractCommissionRequest,
} from '@shared/api.interface';
import { ContractExtrasService } from './contract-extras.service';

interface RequestWithUserContext {
  userContext: {
    userId: string;
    userName?: string;
  };
}

@Controller('api/contracts')
export class ContractExtrasController {
  constructor(private readonly contractExtrasService: ContractExtrasService) {}

  @NeedLogin()
  @Post(':id/remind')
  async createReminder(
    @Req() req: RequestWithUserContext,
    @Param('id') id: string,
    @Body() dto: CreateContractReminderRequest,
  ): Promise<ContractReminder> {
    const userId: string = req.userContext.userId;
    return this.contractExtrasService.createReminder(id, dto, userId);
  }

  @Get(':id/reminders')
  async listReminders(
    @Param('id') id: string,
  ): Promise<ContractReminder[]> {
    return this.contractExtrasService.listReminders(id);
  }

  @NeedLogin()
  @Post(':id/apply-commission')
  async applyCommission(
    @Req() req: RequestWithUserContext,
    @Param('id') id: string,
    @Body() dto: ApplyContractCommissionRequest,
  ): Promise<ContractCommissionApplication> {
    const userId: string = req.userContext.userId;
    const userName: string = req.userContext.userName || userId;
    return this.contractExtrasService.applyCommission(
      id,
      dto,
      userName,
      userId,
    );
  }
}

@Controller('api/contract-commission-applications')
export class CommissionApplicationsController {
  constructor(private readonly contractExtrasService: ContractExtrasService) {}

  @Get()
  async list(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
    @Query('contractId') contractId?: string,
  ): Promise<ContractCommissionApplicationListResult> {
    const params: ContractCommissionApplicationListParams = {
      page: Math.max(Number(page) || 1, 1),
      pageSize: Math.min(Math.max(Number(pageSize) || 20, 1), 100),
      status: status || undefined,
      contractId: contractId || undefined,
    };
    return this.contractExtrasService.listApplications(params);
  }

  @NeedLogin()
  @Put(':id/approve')
  async approve(
    @Req() req: RequestWithUserContext,
    @Param('id') id: string,
  ): Promise<ContractCommissionApplication> {
    const userName: string = req.userContext.userName || req.userContext.userId;
    return this.contractExtrasService.approveApplication(Number(id), userName);
  }

  @NeedLogin()
  @Put(':id/reject')
  async reject(
    @Req() req: RequestWithUserContext,
    @Param('id') id: string,
    @Body() dto: RejectContractCommissionRequest,
  ): Promise<ContractCommissionApplication> {
    const userName: string = req.userContext.userName || req.userContext.userId;
    return this.contractExtrasService.rejectApplication(
      Number(id),
      dto.reason,
      userName,
    );
  }
}
