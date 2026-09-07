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
  ApproveFinancePaymentRequest,
  CreateFinancePaymentRequest,
  FinancePayment,
  FinancePaymentListResult,
  UpdateFinancePaymentRequest,
} from '@shared/api.interface';
import { PaymentsService } from '../services/payments.service';
import {
  parseIdParam,
  parseIdList,
  parsePage,
  parsePageSize,
  type UserContextRequest,
} from '../query.util';
import { FieldPermissionService } from '../../field-permission/field-permission.service';

/** 财务模块：付款金额字段映射 */
const PAYMENT_FIELD_MAP: Record<string, string> = {
  amount: 'payment_amount',
};

interface BatchApproveBody {
  ids: number[];
  approved: boolean;
  rejectReason?: string;
}

@Controller('api/finance-core')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly fieldPermissionService: FieldPermissionService,
  ) {}

  private async resolveRoleCode(req: UserContextRequest): Promise<string> {
    const { roleCode } = await this.fieldPermissionService.resolveUserRole(
      req?.userContext?.userId ?? '',
    );
    return roleCode;
  }

  @Get('payments')
  async findAll(
    @Req() req: UserContextRequest,
    @Query('paymentNo') paymentNo?: string,
    @Query('payeeName') payeeName?: string,
    @Query('paymentType') paymentType?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<FinancePaymentListResult> {
    const result: FinancePaymentListResult =
      await this.paymentsService.findAll({
        paymentNo,
        payeeName,
        paymentType,
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
      PAYMENT_FIELD_MAP,
    );
    return result;
  }

  /** 静态路由声明在 :id 动态路由之前 */
  @NeedLogin()
  @Post('payments/batch-approve')
  async batchApprove(
    @Req() req: UserContextRequest,
    @Body() body: BatchApproveBody,
  ): Promise<{ approved: number }> {
    const ids: number[] = parseIdList(body?.ids);
    if (typeof body?.approved !== 'boolean') {
      throw new BadRequestException('请提供审批结果 approved');
    }
    return this.paymentsService.batchApprove(
      ids,
      body.approved,
      body.rejectReason,
      req.userContext.userId,
    );
  }

  @NeedLogin()
  @Post('payments')
  async create(
    @Req() req: UserContextRequest,
    @Body() dto: CreateFinancePaymentRequest,
  ): Promise<{ id: number }> {
    const roleCode: string = await this.resolveRoleCode(req);
    await this.fieldPermissionService.assertEditable(
      roleCode,
      '财务',
      ['payment_amount'],
    );
    const created: FinancePayment = await this.paymentsService.create(
      dto,
      req.userContext.userId,
    );
    return { id: created.id };
  }

  @Get('payments/:id')
  async detail(
    @Req() req: UserContextRequest,
    @Param('id') id: string,
  ): Promise<FinancePayment> {
    const item: FinancePayment = await this.paymentsService.detail(
      parseIdParam(id),
    );
    const roleCode: string = await this.resolveRoleCode(req);
    await this.fieldPermissionService.filterRows(
      [item],
      roleCode,
      '财务',
      PAYMENT_FIELD_MAP,
    );
    return item;
  }

  @NeedLogin()
  @Patch('payments/:id')
  async update(
    @Req() req: UserContextRequest,
    @Param('id') id: string,
    @Body() dto: UpdateFinancePaymentRequest,
  ): Promise<{ success: boolean }> {
    if (dto?.amount !== undefined) {
      const roleCode: string = await this.resolveRoleCode(req);
      await this.fieldPermissionService.assertEditable(
        roleCode,
        '财务',
        ['payment_amount'],
      );
    }
    return this.paymentsService.update(parseIdParam(id), dto);
  }

  @NeedLogin()
  @Delete('payments/:id')
  async remove(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.paymentsService.remove(parseIdParam(id));
  }

  @NeedLogin()
  @Post('payments/:id/approve')
  async approve(
    @Req() req: UserContextRequest,
    @Param('id') id: string,
    @Body() dto: ApproveFinancePaymentRequest,
  ): Promise<{ success: boolean }> {
    if (typeof dto?.approved !== 'boolean') {
      throw new BadRequestException('请提供审批结果 approved');
    }
    return this.paymentsService.approve(parseIdParam(id), dto, req.userContext.userId);
  }

  @NeedLogin()
  @Post('payments/:id/pay')
  async pay(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.paymentsService.pay(parseIdParam(id));
  }
}
