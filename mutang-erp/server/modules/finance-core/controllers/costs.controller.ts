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
  CreateFinanceCostRequest,
  FinanceCost,
  FinanceCostListResult,
  FinanceCostStats,
  FinanceReportRangeParams,
  UpdateFinanceCostRequest,
} from '@shared/api.interface';
import { CostsService } from '../services/costs.service';
import {
  parseIdParam,
  parseIdList,
  parsePage,
  parsePageSize,
  type UserContextRequest,
} from '../query.util';
import { FieldPermissionService } from '../../field-permission/field-permission.service';

/** 财务模块：成本金额字段映射 */
const COST_FIELD_MAP: Record<string, string> = {
  amount: 'cost',
};

interface BatchIdsBody {
  ids: number[];
}

@Controller('api/finance-core')
export class CostsController {
  constructor(
    private readonly costsService: CostsService,
    private readonly fieldPermissionService: FieldPermissionService,
  ) {}

  private async resolveRoleCode(req: UserContextRequest): Promise<string> {
    const { roleCode } = await this.fieldPermissionService.resolveUserRole(
      req?.userContext?.userId ?? '',
    );
    return roleCode;
  }

  @Get('costs')
  async findAll(
    @Req() req: UserContextRequest,
    @Query('costNo') costNo?: string,
    @Query('costType') costType?: string,
    @Query('costCategory') costCategory?: string,
    @Query('relatedAccount') relatedAccount?: string,
    @Query('relatedCustomer') relatedCustomer?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<FinanceCostListResult> {
    const result: FinanceCostListResult = await this.costsService.findAll({
      costNo,
      costType,
      costCategory,
      relatedAccount,
      relatedCustomer,
      status,
      startDate,
      endDate,
      page: parsePage(page),
      pageSize: parsePageSize(pageSize),
    });
    const roleCode: string = await this.resolveRoleCode(req);
    await this.fieldPermissionService.filterRows(
      result.items,
      roleCode,
      '财务',
      COST_FIELD_MAP,
    );
    return result;
  }

  /** 静态路由声明在 :id 动态路由之前 */
  @NeedLogin()
  @Post('costs/calculate')
  async calculate(
    @Req() req: UserContextRequest,
    @Body() body: BatchIdsBody,
  ): Promise<{ calculated: number }> {
    const ids: number[] = parseIdList(body?.ids);
    return this.costsService.calculate(ids, req.userContext.userId);
  }

  @NeedLogin()
  @Post('costs/transfer')
  async transfer(@Body() body: BatchIdsBody): Promise<{ transferred: number }> {
    const ids: number[] = parseIdList(body?.ids);
    return this.costsService.transfer(ids);
  }

  @Get('costs/stats')
  async stats(
    @Query() query: FinanceReportRangeParams,
  ): Promise<FinanceCostStats> {
    return this.costsService.stats(query);
  }

  @NeedLogin()
  @Post('costs')
  async create(
    @Req() req: UserContextRequest,
    @Body() dto: CreateFinanceCostRequest,
  ): Promise<{ id: number }> {
    const roleCode: string = await this.resolveRoleCode(req);
    await this.fieldPermissionService.assertEditable(roleCode, '财务', [
      'cost',
    ]);
    const created: FinanceCost = await this.costsService.create(dto);
    return { id: created.id };
  }

  @Get('costs/:id')
  async detail(
    @Req() req: UserContextRequest,
    @Param('id') id: string,
  ): Promise<FinanceCost> {
    const item: FinanceCost = await this.costsService.detail(parseIdParam(id));
    const roleCode: string = await this.resolveRoleCode(req);
    await this.fieldPermissionService.filterRows(
      [item],
      roleCode,
      '财务',
      COST_FIELD_MAP,
    );
    return item;
  }

  @NeedLogin()
  @Patch('costs/:id')
  async update(
    @Req() req: UserContextRequest,
    @Param('id') id: string,
    @Body() dto: UpdateFinanceCostRequest,
  ): Promise<{ success: boolean }> {
    if (dto?.amount !== undefined) {
      const roleCode: string = await this.resolveRoleCode(req);
      await this.fieldPermissionService.assertEditable(roleCode, '财务', [
        'cost',
      ]);
    }
    return this.costsService.update(parseIdParam(id), dto);
  }

  @NeedLogin()
  @Delete('costs/:id')
  async remove(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.costsService.remove(parseIdParam(id));
  }
}
