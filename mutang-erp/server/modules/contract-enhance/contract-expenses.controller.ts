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
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import type {
  ContractExpense,
  ContractExpenseDetail,
  ContractExpenseListResult,
  ContractPaymentRecord,
  CreateContractExpenseRequest,
  CreateContractPaymentRecordRequest,
  UpdateContractExpenseRequest,
} from '@shared/api.interface';
import {
  parseIdParam,
  parsePage,
  parsePageSize,
  type UserContextRequest,
} from '@server/modules/finance-core/query.util';
import { ContractExpensesService } from './contract-expenses.service';

@Controller('api/contract-expenses')
export class ContractExpensesController {
  constructor(
    private readonly contractExpensesService: ContractExpensesService,
  ) {}

  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('contractId') contractId?: string,
    @Query('keyword') keyword?: string,
    @Query('expenseType') expenseType?: string,
    @Query('paymentStatus') paymentStatus?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ): Promise<ContractExpenseListResult> {
    return this.contractExpensesService.findAll({
      page: parsePage(page),
      pageSize: parsePageSize(pageSize),
      contractId,
      keyword,
      expenseType,
      paymentStatus,
      dateFrom,
      dateTo,
    });
  }

  @NeedLogin()
  @Post()
  async create(
    @Req() req: UserContextRequest,
    @Body() dto: CreateContractExpenseRequest,
  ): Promise<ContractExpense> {
    return this.contractExpensesService.create(dto, req.userContext.userId);
  }

  @Get(':id')
  async detail(@Param('id') id: string): Promise<ContractExpenseDetail> {
    return this.contractExpensesService.detail(parseIdParam(id));
  }

  @Get(':id/payment-records')
  async listPaymentRecords(
    @Param('id') id: string,
  ): Promise<ContractPaymentRecord[]> {
    return this.contractExpensesService.listPaymentRecords(parseIdParam(id));
  }

  @NeedLogin()
  @Post(':id/payment-records')
  async addPaymentRecord(
    @Req() req: UserContextRequest,
    @Param('id') id: string,
    @Body() dto: CreateContractPaymentRecordRequest,
  ): Promise<ContractPaymentRecord> {
    return this.contractExpensesService.addPaymentRecord(
      parseIdParam(id),
      dto,
      req.userContext.userId,
    );
  }

  @NeedLogin()
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateContractExpenseRequest,
  ): Promise<ContractExpense> {
    return this.contractExpensesService.update(parseIdParam(id), dto);
  }

  @NeedLogin()
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.contractExpensesService.remove(parseIdParam(id));
  }
}
