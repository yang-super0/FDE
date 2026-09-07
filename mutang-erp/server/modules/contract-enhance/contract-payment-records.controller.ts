import { Controller, Delete, Param } from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import { parseIdParam } from '@server/modules/finance-core/query.util';
import { ContractExpensesService } from './contract-expenses.service';

@Controller('api/contract-payment-records')
export class ContractPaymentRecordsController {
  constructor(
    private readonly contractExpensesService: ContractExpensesService,
  ) {}

  @NeedLogin()
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.contractExpensesService.deletePaymentRecord(parseIdParam(id));
  }
}
