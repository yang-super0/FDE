import { Module } from '@nestjs/common';
import { MessageNotificationModule } from '../message-notification/message-notification.module';
import { FinanceFundsController } from './finance-funds.controller';
import { FinanceFundsService } from './finance-funds.service';
import { FinanceRebatesController } from './finance-rebates.controller';
import { FinanceRebatesService } from './finance-rebates.service';
import { FinanceAdvancesController } from './finance-advances.controller';
import { FinanceAdvancesService } from './finance-advances.service';
import { FinanceExpensesController } from './finance-expenses.controller';
import { FinanceExpensesService } from './finance-expenses.service';

@Module({
  imports: [MessageNotificationModule],
  controllers: [
    FinanceFundsController,
    FinanceRebatesController,
    FinanceAdvancesController,
    FinanceExpensesController,
  ],
  providers: [
    FinanceFundsService,
    FinanceRebatesService,
    FinanceAdvancesService,
    FinanceExpensesService,
  ],
})
export class FinanceEnhanceModule {}
