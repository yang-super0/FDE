import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import type {
  CreateFinanceAccountRequest,
  FinanceAccount,
  FinanceAccountListResult,
  FinanceAccountTxn,
  PageResult,
  UpdateFinanceAccountRequest,
} from '@shared/api.interface';
import { FinanceAccountsService } from '../services/accounts.service';
import {
  parseIdParam,
  parsePage,
  parsePageSize,
  type UserContextRequest,
} from '../query.util';
import { FieldPermissionService } from '../../field-permission/field-permission.service';

/** 财务模块：账户余额字段映射 */
const ACCOUNT_FIELD_MAP: Record<string, string> = {
  balance: 'balance',
};

interface SetAccountStatusBody {
  status: string;
}

@Controller('api/finance-core')
export class FinanceAccountsController {
  constructor(
    private readonly accountsService: FinanceAccountsService,
    private readonly fieldPermissionService: FieldPermissionService,
  ) {}

  private async resolveRoleCode(req: UserContextRequest): Promise<string> {
    const { roleCode } = await this.fieldPermissionService.resolveUserRole(
      req?.userContext?.userId ?? '',
    );
    return roleCode;
  }

  @Get('accounts')
  async findAll(
    @Req() req: UserContextRequest,
    @Query('accountName') accountName?: string,
    @Query('accountType') accountType?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<FinanceAccountListResult> {
    const result: FinanceAccountListResult =
      await this.accountsService.findAll({
        accountName,
        accountType,
        status,
        page: parsePage(page),
        pageSize: parsePageSize(pageSize),
      });
    const roleCode: string = await this.resolveRoleCode(req);
    await this.fieldPermissionService.filterRows(
      result.items,
      roleCode,
      '财务',
      ACCOUNT_FIELD_MAP,
    );
    return result;
  }

  @NeedLogin()
  @Post('accounts')
  async create(
    @Req() req: UserContextRequest,
    @Body() dto: CreateFinanceAccountRequest,
  ): Promise<{ id: number }> {
    const roleCode: string = await this.resolveRoleCode(req);
    await this.fieldPermissionService.assertEditable(roleCode, '财务', [
      'balance',
    ]);
    const created: FinanceAccount = await this.accountsService.create(dto);
    return { id: created.id };
  }

  @NeedLogin()
  @Patch('accounts/:id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateFinanceAccountRequest,
  ): Promise<{ success: boolean }> {
    return this.accountsService.update(parseIdParam(id), dto);
  }

  @NeedLogin()
  @Post('accounts/:id/status')
  async setStatus(
    @Param('id') id: string,
    @Body() body: SetAccountStatusBody,
  ): Promise<{ success: boolean }> {
    const status: string = body?.status;
    if (typeof status !== 'string' || status.trim().length === 0) {
      throw new BadRequestException('请提供账户状态');
    }
    return this.accountsService.setStatus(parseIdParam(id), status);
  }

  @Get('accounts/:id/transactions')
  async transactions(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<PageResult<FinanceAccountTxn>> {
    return this.accountsService.transactions(
      parseIdParam(id),
      parsePage(page),
      parsePageSize(pageSize),
    );
  }
}
