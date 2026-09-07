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
  CreateFinanceReceiptRequest,
  FinanceReceipt,
  FinanceReceiptListResult,
  UpdateFinanceReceiptRequest,
} from '@shared/api.interface';
import { ReceiptsService } from '../services/receipts.service';
import {
  parseIdParam,
  parseIdList,
  parsePage,
  parsePageSize,
  type UserContextRequest,
} from '../query.util';
import { FieldPermissionService } from '../../field-permission/field-permission.service';

/** 财务模块：收款金额字段映射 */
const RECEIPT_FIELD_MAP: Record<string, string> = {
  amount: 'receipt_amount',
};

interface BatchIdsBody {
  ids: number[];
}

interface WriteOffBody {
  settlementId: number;
}

interface BatchWriteOffBody {
  ids: number[];
  settlementId: number;
}

const parseSettlementId = (value: unknown): number => {
  const parsed: number = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new BadRequestException('请提供有效的结算单 ID');
  }
  return parsed;
};

@Controller('api/finance-core')
export class ReceiptsController {
  constructor(
    private readonly receiptsService: ReceiptsService,
    private readonly fieldPermissionService: FieldPermissionService,
  ) {}

  private async resolveRoleCode(req: UserContextRequest): Promise<string> {
    const { roleCode } = await this.fieldPermissionService.resolveUserRole(
      req?.userContext?.userId ?? '',
    );
    return roleCode;
  }

  @Get('receipts')
  async findAll(
    @Req() req: UserContextRequest,
    @Query('receiptNo') receiptNo?: string,
    @Query('customerName') customerName?: string,
    @Query('groupName') groupName?: string,
    @Query('receiptType') receiptType?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<FinanceReceiptListResult> {
    const result: FinanceReceiptListResult =
      await this.receiptsService.findAll({
        receiptNo,
        customerName,
        groupName,
        receiptType,
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
      RECEIPT_FIELD_MAP,
    );
    return result;
  }

  /** 静态路由声明在 :id 动态路由之前 */
  @NeedLogin()
  @Post('receipts/confirm')
  async confirm(
    @Req() req: UserContextRequest,
    @Body() body: BatchIdsBody,
  ): Promise<{ confirmed: number; message: string }> {
    const ids: number[] = parseIdList(body?.ids);
    return this.receiptsService.confirm(ids, req.userContext.userId);
  }

  @NeedLogin()
  @Post('receipts/batch-write-off')
  async batchWriteOff(
    @Body() body: BatchWriteOffBody,
  ): Promise<{ writtenOff: number }> {
    const ids: number[] = parseIdList(body?.ids);
    const settlementId: number = parseSettlementId(body?.settlementId);
    return this.receiptsService.batchWriteOff(ids, settlementId);
  }

  @NeedLogin()
  @Post('receipts')
  async create(
    @Req() req: UserContextRequest,
    @Body() dto: CreateFinanceReceiptRequest,
  ): Promise<{ id: number }> {
    const roleCode: string = await this.resolveRoleCode(req);
    await this.fieldPermissionService.assertEditable(
      roleCode,
      '财务',
      ['receipt_amount'],
    );
    const created: FinanceReceipt = await this.receiptsService.create(dto);
    return { id: created.id };
  }

  @Get('receipts/:id')
  async detail(
    @Req() req: UserContextRequest,
    @Param('id') id: string,
  ): Promise<FinanceReceipt> {
    const item: FinanceReceipt = await this.receiptsService.detail(
      parseIdParam(id),
    );
    const roleCode: string = await this.resolveRoleCode(req);
    await this.fieldPermissionService.filterRows(
      [item],
      roleCode,
      '财务',
      RECEIPT_FIELD_MAP,
    );
    return item;
  }

  @NeedLogin()
  @Patch('receipts/:id')
  async update(
    @Req() req: UserContextRequest,
    @Param('id') id: string,
    @Body() dto: UpdateFinanceReceiptRequest,
  ): Promise<{ success: boolean }> {
    if (dto?.amount !== undefined) {
      const roleCode: string = await this.resolveRoleCode(req);
      await this.fieldPermissionService.assertEditable(
        roleCode,
        '财务',
        ['receipt_amount'],
      );
    }
    return this.receiptsService.update(parseIdParam(id), dto);
  }

  @NeedLogin()
  @Delete('receipts/:id')
  async remove(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.receiptsService.remove(parseIdParam(id));
  }

  @NeedLogin()
  @Post('receipts/:id/write-off')
  async writeOff(
    @Param('id') id: string,
    @Body() body: WriteOffBody,
  ): Promise<{ success: boolean }> {
    const settlementId: number = parseSettlementId(body?.settlementId);
    return this.receiptsService.writeOff(parseIdParam(id), settlementId);
  }
}
