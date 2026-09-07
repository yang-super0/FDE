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
  CreateFinanceDepositRequest,
  CreateFinanceExpenseRequest,
  CreateFinanceFeeRequest,
  CreateFinanceIncomeRequest,
  DepositReturnRequest,
  ExpensePayRequest,
  FeeReimburseRequest,
  FinanceDeposit,
  FinanceDepositListResult,
  FinanceExpense,
  FinanceExpenseListResult,
  FinanceFee,
  FinanceFeeListResult,
  FinanceIncome,
  FinanceIncomeListResult,
} from '@shared/api.interface';
import { FinanceExpensesService } from './finance-expenses.service';
import type { FinanceIncomeSummaryResult } from './finance-expenses.util';
import {
  parseIdParam,
  parsePage,
  parsePageSize,
} from '../finance-core/query.util';

interface RequestWithUserName {
  userContext: {
    userId: string;
    userName?: string;
  };
}

interface ApproveBody {
  approved: boolean;
  rejectReason?: string;
}

const resolveOperator = (req: RequestWithUserName): string =>
  req.userContext.userName || req.userContext.userId;

const parseApproveBody = (body: ApproveBody | undefined): {
  approved: boolean;
  rejectReason: string | undefined;
} => ({
  approved: body?.approved === true,
  rejectReason:
    typeof body?.rejectReason === 'string' && body.rejectReason.trim() !== ''
      ? body.rejectReason.trim()
      : undefined,
});

@Controller('api/finance-enhance')
export class FinanceExpensesController {
  constructor(
    private readonly financeExpensesService: FinanceExpensesService,
  ) {}

  @Get('incomes/summary')
  async incomeSummary(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ): Promise<FinanceIncomeSummaryResult> {
    return this.financeExpensesService.incomeSummary({ dateFrom, dateTo });
  }

  @Get('incomes')
  async listIncomes(
    @Query('incomeType') incomeType?: string,
    @Query('status') status?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<FinanceIncomeListResult> {
    return this.financeExpensesService.listIncomes({
      incomeType,
      status,
      dateFrom,
      dateTo,
      page: parsePage(page),
      pageSize: parsePageSize(pageSize),
    });
  }

  @NeedLogin()
  @Post('incomes')
  async createIncome(
    @Req() req: RequestWithUserName,
    @Body() dto: CreateFinanceIncomeRequest,
  ): Promise<{ id: number }> {
    const income: FinanceIncome = await this.financeExpensesService.createIncome(
      dto,
      resolveOperator(req),
    );
    return { id: income.id };
  }

  @NeedLogin()
  @Post('incomes/:id/confirm')
  async confirmIncome(@Param('id') id: string): Promise<FinanceIncome> {
    return this.financeExpensesService.confirmIncome(parseIdParam(id));
  }

  @NeedLogin()
  @Delete('incomes/:id')
  async removeIncome(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.financeExpensesService.removeIncome(parseIdParam(id));
  }

  @Get('expenses')
  async listExpenses(
    @Query('expenseType') expenseType?: string,
    @Query('status') status?: string,
    @Query('applicant') applicant?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<FinanceExpenseListResult> {
    return this.financeExpensesService.listExpenses({
      expenseType,
      status,
      applicant,
      page: parsePage(page),
      pageSize: parsePageSize(pageSize),
    });
  }

  @NeedLogin()
  @Post('expenses')
  async createExpense(
    @Req() req: RequestWithUserName,
    @Body() dto: CreateFinanceExpenseRequest,
  ): Promise<{ id: number }> {
    const expense: FinanceExpense =
      await this.financeExpensesService.createExpense(
        dto,
        resolveOperator(req),
      );
    return { id: expense.id };
  }

  @NeedLogin()
  @Post('expenses/:id/approve')
  async approveExpense(
    @Req() req: RequestWithUserName,
    @Param('id') id: string,
    @Body() body: ApproveBody,
  ): Promise<{ success: boolean }> {
    const { approved, rejectReason } = parseApproveBody(body);
    return this.financeExpensesService.approveExpense(
      parseIdParam(id),
      approved,
      rejectReason,
      resolveOperator(req),
    );
  }

  @NeedLogin()
  @Post('expenses/:id/pay')
  async payExpense(
    @Param('id') id: string,
    @Body() body: ExpensePayRequest,
  ): Promise<{ success: boolean }> {
    return this.financeExpensesService.payExpense(parseIdParam(id), body);
  }

  @NeedLogin()
  @Delete('expenses/:id')
  async removeExpense(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.financeExpensesService.removeExpense(parseIdParam(id));
  }

  @Get('fees')
  async listFees(
    @Query('feeType') feeType?: string,
    @Query('status') status?: string,
    @Query('applicant') applicant?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<FinanceFeeListResult> {
    return this.financeExpensesService.listFees({
      feeType,
      status,
      applicant,
      page: parsePage(page),
      pageSize: parsePageSize(pageSize),
    });
  }

  @NeedLogin()
  @Post('fees')
  async createFee(
    @Req() req: RequestWithUserName,
    @Body() dto: CreateFinanceFeeRequest,
  ): Promise<{ id: number }> {
    const fee: FinanceFee = await this.financeExpensesService.createFee(
      dto,
      resolveOperator(req),
    );
    return { id: fee.id };
  }

  @NeedLogin()
  @Patch('fees/:id')
  async updateFee(
    @Param('id') id: string,
    @Body() dto: Partial<CreateFinanceFeeRequest>,
  ): Promise<FinanceFee> {
    return this.financeExpensesService.updateFee(parseIdParam(id), dto);
  }

  @NeedLogin()
  @Post('fees/:id/submit')
  async submitFee(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.financeExpensesService.submitFee(parseIdParam(id));
  }

  @NeedLogin()
  @Post('fees/:id/approve')
  async approveFee(
    @Req() req: RequestWithUserName,
    @Param('id') id: string,
    @Body() body: ApproveBody,
  ): Promise<{ success: boolean }> {
    const { approved, rejectReason } = parseApproveBody(body);
    return this.financeExpensesService.approveFee(
      parseIdParam(id),
      approved,
      rejectReason,
      resolveOperator(req),
    );
  }

  @NeedLogin()
  @Post('fees/:id/reimburse')
  async reimburseFee(
    @Param('id') id: string,
    @Body() body: FeeReimburseRequest,
  ): Promise<{ success: boolean }> {
    return this.financeExpensesService.reimburseFee(parseIdParam(id), body);
  }

  @NeedLogin()
  @Delete('fees/:id')
  async removeFee(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.financeExpensesService.removeFee(parseIdParam(id));
  }

  @Get('deposits')
  async listDeposits(
    @Query('customerName') customerName?: string,
    @Query('depositType') depositType?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<FinanceDepositListResult> {
    return this.financeExpensesService.listDeposits({
      customerName,
      depositType,
      status,
      page: parsePage(page),
      pageSize: parsePageSize(pageSize),
    });
  }

  @NeedLogin()
  @Post('deposits')
  async createDeposit(
    @Req() req: RequestWithUserName,
    @Body() dto: CreateFinanceDepositRequest,
  ): Promise<{ id: number }> {
    const deposit: FinanceDeposit =
      await this.financeExpensesService.createDeposit(
        dto,
        resolveOperator(req),
      );
    return { id: deposit.id };
  }

  @NeedLogin()
  @Post('deposits/:id/return')
  async returnDeposit(
    @Param('id') id: string,
    @Body() body: DepositReturnRequest,
  ): Promise<FinanceDeposit> {
    return this.financeExpensesService.returnDeposit(parseIdParam(id), body);
  }

  @NeedLogin()
  @Post('deposits/:id/confiscate')
  async confiscateDeposit(@Param('id') id: string): Promise<FinanceDeposit> {
    return this.financeExpensesService.confiscateDeposit(parseIdParam(id));
  }

  @NeedLogin()
  @Delete('deposits/:id')
  async removeDeposit(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.financeExpensesService.removeDeposit(parseIdParam(id));
  }
}
