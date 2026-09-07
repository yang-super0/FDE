import {
  BadRequestException,
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
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import type {
  AdAccountDetail,
  AdAccountListResult,
  CreateAdAccountRequest,
  RechargeRequest,
  UpdateAdAccountRequest,
} from '@shared/api.interface';
import { AccountsService } from '../services/accounts.service';
import {
  parsePage,
  parsePageSize,
  type UserContextRequest,
} from '../query.util';

const MAX_BATCH_ITEMS: number = 500;

interface BatchCreateAccountsBody {
  items: CreateAdAccountRequest[];
}

@Controller('api/ad-business')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get('accounts')
  async findAll(
    @Query('accountNo') accountNo?: string,
    @Query('accountName') accountName?: string,
    @Query('groupName') groupName?: string,
    @Query('subjectName') subjectName?: string,
    @Query('platform') platform?: string,
    @Query('portType') portType?: string,
    @Query('status') status?: string,
    @Query('salesperson') salesperson?: string,
    @Query('lowBalance') lowBalance?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<AdAccountListResult> {
    return this.accountsService.findAll({
      accountNo,
      accountName,
      groupName,
      subjectName,
      platform,
      portType,
      status,
      salesperson,
      lowBalance: lowBalance === 'true',
      page: parsePage(page),
      pageSize: parsePageSize(pageSize),
    });
  }

  @NeedLogin()
  @Post('accounts')
  async create(
    @Req() req: UserContextRequest,
    @Body() dto: CreateAdAccountRequest,
  ): Promise<{ id: string }> {
    return this.accountsService.create(dto, req.userContext.userId);
  }

  @NeedLogin()
  @Post('accounts/batch')
  async batchCreate(
    @Req() req: UserContextRequest,
    @Body() body: BatchCreateAccountsBody,
  ): Promise<{ created: number }> {
    if (!Array.isArray(body?.items) || body.items.length === 0) {
      throw new BadRequestException('请提供要创建的广告账户');
    }
    if (body.items.length > MAX_BATCH_ITEMS) {
      throw new BadRequestException(
        `单次批量最多 ${String(MAX_BATCH_ITEMS)} 条`,
      );
    }
    return this.accountsService.batchCreate(body.items, req.userContext.userId);
  }

  @Get('accounts/:id')
  async detail(@Param('id') id: string): Promise<AdAccountDetail> {
    return this.accountsService.detail(id);
  }

  @NeedLogin()
  @Put('accounts/:id')
  async update(
    @Req() req: UserContextRequest,
    @Param('id') id: string,
    @Body() dto: UpdateAdAccountRequest,
  ): Promise<{ success: boolean }> {
    return this.accountsService.update(id, dto, req.userContext.userId);
  }

  @NeedLogin()
  @Delete('accounts/:id')
  async remove(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.accountsService.remove(id);
  }

  @NeedLogin()
  @Post('accounts/:id/recharge')
  async recharge(
    @Req() req: UserContextRequest,
    @Param('id') id: string,
    @Body() dto: RechargeRequest,
  ): Promise<{ success: boolean }> {
    if (!dto || typeof dto.amount !== 'number' || dto.amount <= 0) {
      throw new BadRequestException('请提供有效的充值金额');
    }
    return this.accountsService.recharge(id, dto, req.userContext.userId);
  }
}
