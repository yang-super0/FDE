import { Module } from '@nestjs/common';
import { FieldPermissionModule } from '../field-permission/field-permission.module';
import { FinanceAccountsController } from './controllers/accounts.controller';
import { CostsController } from './controllers/costs.controller';
import { FinanceReportsController } from './controllers/finance-reports.controller';
import { InvoicesController } from './controllers/invoices.controller';
import { PaymentsController } from './controllers/payments.controller';
import { ReceiptsController } from './controllers/receipts.controller';
import { SettlementsController } from './controllers/settlements.controller';
import { FinanceAccountsService } from './services/accounts.service';
import { CostsService } from './services/costs.service';
import { FinanceReportsService } from './services/finance-reports.service';
import { InvoicesService } from './services/invoices.service';
import { PaymentsService } from './services/payments.service';
import { ReceiptsService } from './services/receipts.service';
import { SettlementsService } from './services/settlements.service';

@Module({
  imports: [FieldPermissionModule],
  controllers: [
    FinanceAccountsController,
    ReceiptsController,
    PaymentsController,
    InvoicesController,
    CostsController,
    SettlementsController,
    FinanceReportsController,
  ],
  providers: [
    FinanceAccountsService,
    ReceiptsService,
    PaymentsService,
    InvoicesService,
    CostsService,
    SettlementsService,
    FinanceReportsService,
  ],
})
export class FinanceCoreModule {}
