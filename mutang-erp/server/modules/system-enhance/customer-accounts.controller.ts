import {
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
  CustomerAccount,
  CustomerAccountCreateDto,
  CustomerAccountListParams,
  CustomerAccountUpdateDto,
  LoginLog,
  TaskEnhanceListResponse,
} from '@shared/api.interface';
import { parseIdParam } from '../finance-core/query.util';
import { CustomerAccountsService } from './customer-accounts.service';
import {
  resolveSystemEnhanceUserId,
  type SystemEnhanceUserContextRequest,
} from './system-enhance-shared.util';

@Controller('api/system-enhance/customer-accounts')
export class CustomerAccountsController {
  constructor(private readonly accountsService: CustomerAccountsService) {}

  @Get()
  async list(
    @Query('customerId') customerId?: string,
    @Query('customerName') customerName?: string,
    @Query('username') username?: string,
    @Query('status') status?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<TaskEnhanceListResponse<CustomerAccount>> {
    const params: CustomerAccountListParams = {
      customerId,
      customerName,
      username,
      status,
      dateFrom,
      dateTo,
      sortBy,
      sortOrder,
      page,
      pageSize,
    };
    return this.accountsService.list(params);
  }

  @NeedLogin()
  @Post()
  async create(
    @Body() dto: CustomerAccountCreateDto,
    @Req() req: SystemEnhanceUserContextRequest,
  ): Promise<CustomerAccount> {
    return this.accountsService.create(
      dto,
      resolveSystemEnhanceUserId(req),
    );
  }

  @NeedLogin()
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: CustomerAccountUpdateDto,
    @Req() req: SystemEnhanceUserContextRequest,
  ): Promise<CustomerAccount> {
    return this.accountsService.update(
      parseIdParam(id),
      dto,
      resolveSystemEnhanceUserId(req),
    );
  }

  @NeedLogin()
  @Post(':id/reset-password')
  async resetPassword(
    @Param('id') id: string,
    @Req() req: SystemEnhanceUserContextRequest,
  ): Promise<{ password: string }> {
    return this.accountsService.resetPassword(
      parseIdParam(id),
      resolveSystemEnhanceUserId(req),
    );
  }

  @NeedLogin()
  @Patch(':id/unlock')
  async unlock(
    @Param('id') id: string,
    @Req() req: SystemEnhanceUserContextRequest,
  ): Promise<CustomerAccount> {
    return this.accountsService.unlock(
      parseIdParam(id),
      resolveSystemEnhanceUserId(req),
    );
  }

  @Get(':id/login-logs')
  async loginLogs(@Param('id') id: string): Promise<LoginLog[]> {
    return this.accountsService.loginLogs(parseIdParam(id));
  }

  @NeedLogin()
  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @Req() req: SystemEnhanceUserContextRequest,
  ): Promise<{ success: boolean }> {
    return this.accountsService.remove(
      parseIdParam(id),
      resolveSystemEnhanceUserId(req),
    );
  }
}
