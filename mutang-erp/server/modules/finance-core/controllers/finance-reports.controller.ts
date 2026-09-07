import { Controller, Get, Query } from '@nestjs/common';
import type {
  FinanceCostAnalysisReport,
  FinanceIncomeExpenseReport,
  FinanceProfitReport,
  FinanceReceivablePayableReport,
  FinanceReportRangeParams,
  FinanceReportTotals,
} from '@shared/api.interface';
import { FinanceReportsService } from '../services/finance-reports.service';

@Controller('api/finance-core')
export class FinanceReportsController {
  constructor(private readonly financeReportsService: FinanceReportsService) {}

  @Get('reports/totals')
  async getTotals(@Query() query: FinanceReportRangeParams): Promise<FinanceReportTotals> {
    return this.financeReportsService.getTotals(query);
  }

  @Get('reports/profit')
  async getProfitReport(@Query() query: FinanceReportRangeParams): Promise<FinanceProfitReport> {
    return this.financeReportsService.getProfitReport(query);
  }

  @Get('reports/income-expense')
  async getIncomeExpenseReport(
    @Query() query: FinanceReportRangeParams,
  ): Promise<FinanceIncomeExpenseReport> {
    return this.financeReportsService.getIncomeExpenseReport(query);
  }

  @Get('reports/cost-analysis')
  async getCostAnalysisReport(
    @Query() query: FinanceReportRangeParams,
  ): Promise<FinanceCostAnalysisReport> {
    return this.financeReportsService.getCostAnalysisReport(query);
  }

  @Get('reports/receivable-payable')
  async getReceivablePayableReport(
    @Query() query: FinanceReportRangeParams,
  ): Promise<FinanceReceivablePayableReport> {
    return this.financeReportsService.getReceivablePayableReport(query);
  }
}
