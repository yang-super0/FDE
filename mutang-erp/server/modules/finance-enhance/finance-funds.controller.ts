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
  CreateFinanceBankAccountRequest,
  CreateFinanceCoinReturnRequest,
  CreateFinancePortRequest,
  CreateFinanceRechargeRequest,
  CreateFinanceRefundRequest,
  CustomerFinanceDetail,
  CustomerFinanceDetailListResult,
  FinanceBankAccountListResult,
  FinanceCoinReturnListResult,
  FinancePortListResult,
  FinanceRechargeListResult,
  FinanceRefundListResult,
  RefundApproveRequest,
  UpdateFinanceBankAccountRequest,
  UpdateFinancePortRequest,
} from '@shared/api.interface';
import {
  parseIdParam,
  parsePage,
  parsePageSize,
} from '../finance-core/query.util';
import {
  FinanceFundsService,
  STATUS_DISABLED,
  STATUS_ENABLED,
  type CreateCustomerFinanceDetailRequest,
} from './finance-funds.service';

interface FundsUserRequest {
  userContext: { userId: string; userName?: string };
}

interface BalanceBody {
  balance: number;
}

@Controller('api/finance-enhance')
export class FinanceFundsController {
  constructor(private readonly fundsService: FinanceFundsService) {}

  @Get('customer-details')
  async listCustomerDetails(
    @Query('customerId') customerId?: string,
    @Query('transactionType') transactionType?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<CustomerFinanceDetailListResult> {
    return this.fundsService.listCustomerDetails({
      customerId,
      transactionType,
      startDate,
      endDate,
      page: parsePage(page),
      pageSize: parsePageSize(pageSize),
    });
  }

  @NeedLogin()
  @Post('customer-details')
  async createCustomerDetail(
    @Body() dto: CreateCustomerFinanceDetailRequest,
  ): Promise<CustomerFinanceDetail> {
    return this.fundsService.createCustomerDetail(dto);
  }

  @Get('recharges')
  async listRecharges(
    @Query('customerName') customerName?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<FinanceRechargeListResult> {
    return this.fundsService.listRecharges({
      customerName,
      status,
      page: parsePage(page),
      pageSize: parsePageSize(pageSize),
    });
  }

  @NeedLogin()
  @Post('recharges')
  async createRecharge(
    @Req() req: FundsUserRequest,
    @Body() dto: CreateFinanceRechargeRequest,
  ): Promise<{ id: number }> {
    return this.fundsService.createRecharge(
      dto,
      req.userContext.userName ?? '',
    );
  }

  @NeedLogin()
  @Post('recharges/:id/confirm')
  async confirmRecharge(
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    return this.fundsService.confirmRecharge(parseIdParam(id));
  }

  @NeedLogin()
  @Post('recharges/:id/cancel')
  async cancelRecharge(
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    return this.fundsService.cancelRecharge(parseIdParam(id));
  }

  @NeedLogin()
  @Delete('recharges/:id')
  async deleteRecharge(
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    return this.fundsService.deleteRecharge(parseIdParam(id));
  }

  @Get('refunds')
  async listRefunds(
    @Query('customerName') customerName?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<FinanceRefundListResult> {
    return this.fundsService.listRefunds({
      customerName,
      status,
      page: parsePage(page),
      pageSize: parsePageSize(pageSize),
    });
  }

  @NeedLogin()
  @Post('refunds')
  async createRefund(
    @Req() req: FundsUserRequest,
    @Body() dto: CreateFinanceRefundRequest,
  ): Promise<{ id: number }> {
    return this.fundsService.createRefund(
      dto,
      req.userContext.userName ?? '',
    );
  }

  @NeedLogin()
  @Post('refunds/:id/approve')
  async approveRefund(
    @Req() req: FundsUserRequest,
    @Param('id') id: string,
    @Body() body: RefundApproveRequest,
  ): Promise<{ success: boolean }> {
    return this.fundsService.approveRefund(
      parseIdParam(id),
      body,
      req.userContext.userName ?? '',
    );
  }

  @NeedLogin()
  @Post('refunds/:id/execute')
  async executeRefund(
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    return this.fundsService.executeRefund(parseIdParam(id));
  }

  @NeedLogin()
  @Delete('refunds/:id')
  async deleteRefund(
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    return this.fundsService.deleteRefund(parseIdParam(id));
  }

  @Get('coin-returns')
  async listCoinReturns(
    @Query('status') status?: string,
    @Query('platform') platform?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<FinanceCoinReturnListResult> {
    return this.fundsService.listCoinReturns({
      status,
      platform,
      page: parsePage(page),
      pageSize: parsePageSize(pageSize),
    });
  }

  @NeedLogin()
  @Post('coin-returns')
  async createCoinReturn(
    @Req() req: FundsUserRequest,
    @Body() dto: CreateFinanceCoinReturnRequest,
  ): Promise<{ id: number }> {
    return this.fundsService.createCoinReturn(
      dto,
      req.userContext.userName ?? '',
    );
  }

  @NeedLogin()
  @Post('coin-returns/:id/process')
  async processCoinReturn(
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    return this.fundsService.transitionCoinReturn(
      parseIdParam(id),
      'process',
    );
  }

  @NeedLogin()
  @Post('coin-returns/:id/finish')
  async finishCoinReturn(
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    return this.fundsService.transitionCoinReturn(
      parseIdParam(id),
      'finish',
    );
  }

  @NeedLogin()
  @Post('coin-returns/:id/fail')
  async failCoinReturn(
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    return this.fundsService.transitionCoinReturn(parseIdParam(id), 'fail');
  }

  @NeedLogin()
  @Delete('coin-returns/:id')
  async deleteCoinReturn(
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    return this.fundsService.deleteCoinReturn(parseIdParam(id));
  }

  @Get('ports')
  async listPorts(
    @Query('portName') portName?: string,
    @Query('portType') portType?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<FinancePortListResult> {
    return this.fundsService.listPorts({
      portName,
      portType,
      status,
      page: parsePage(page),
      pageSize: parsePageSize(pageSize),
    });
  }

  @NeedLogin()
  @Post('ports')
  async createPort(
    @Body() dto: CreateFinancePortRequest,
  ): Promise<{ id: number }> {
    return this.fundsService.createPort(dto);
  }

  @NeedLogin()
  @Patch('ports/:id')
  async updatePort(
    @Param('id') id: string,
    @Body() dto: UpdateFinancePortRequest,
  ): Promise<{ success: boolean }> {
    return this.fundsService.updatePort(parseIdParam(id), dto);
  }

  @NeedLogin()
  @Post('ports/:id/enable')
  async enablePort(
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    return this.fundsService.setPortStatus(parseIdParam(id), STATUS_ENABLED);
  }

  @NeedLogin()
  @Post('ports/:id/disable')
  async disablePort(
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    return this.fundsService.setPortStatus(parseIdParam(id), STATUS_DISABLED);
  }

  @NeedLogin()
  @Post('ports/:id/balance')
  async setPortBalance(
    @Param('id') id: string,
    @Body() body: BalanceBody,
  ): Promise<{ success: boolean }> {
    return this.fundsService.setPortBalance(
      parseIdParam(id),
      Number(body?.balance),
    );
  }

  @NeedLogin()
  @Delete('ports/:id')
  async deletePort(
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    return this.fundsService.deletePort(parseIdParam(id));
  }

  @Get('bank-accounts')
  async listBankAccounts(
    @Query('bankName') bankName?: string,
    @Query('accountType') accountType?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<FinanceBankAccountListResult> {
    return this.fundsService.listBankAccounts({
      bankName,
      accountType,
      status,
      page: parsePage(page),
      pageSize: parsePageSize(pageSize),
    });
  }

  @NeedLogin()
  @Post('bank-accounts')
  async createBankAccount(
    @Body() dto: CreateFinanceBankAccountRequest,
  ): Promise<{ id: number }> {
    return this.fundsService.createBankAccount(dto);
  }

  @NeedLogin()
  @Patch('bank-accounts/:id')
  async updateBankAccount(
    @Param('id') id: string,
    @Body() dto: UpdateFinanceBankAccountRequest,
  ): Promise<{ success: boolean }> {
    return this.fundsService.updateBankAccount(parseIdParam(id), dto);
  }

  @NeedLogin()
  @Post('bank-accounts/:id/enable')
  async enableBankAccount(
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    return this.fundsService.setBankAccountStatus(
      parseIdParam(id),
      STATUS_ENABLED,
    );
  }

  @NeedLogin()
  @Post('bank-accounts/:id/disable')
  async disableBankAccount(
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    return this.fundsService.setBankAccountStatus(
      parseIdParam(id),
      STATUS_DISABLED,
    );
  }

  @NeedLogin()
  @Post('bank-accounts/:id/balance')
  async setBankAccountBalance(
    @Param('id') id: string,
    @Body() body: BalanceBody,
  ): Promise<{ success: boolean }> {
    return this.fundsService.setBankAccountBalance(
      parseIdParam(id),
      Number(body?.balance),
    );
  }

  @NeedLogin()
  @Delete('bank-accounts/:id')
  async deleteBankAccount(
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    return this.fundsService.deleteBankAccount(parseIdParam(id));
  }
}
