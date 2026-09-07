import { Module } from '@nestjs/common';
import { ContractTemplatesController } from './contract-templates.controller';
import { ContractTemplatesService } from './contract-templates.service';
import { ContractExpensesController } from './contract-expenses.controller';
import { ContractPaymentRecordsController } from './contract-payment-records.controller';
import { ContractExpensesService } from './contract-expenses.service';
import { ContractExtrasController } from './contract-extras.controller';
import { CommissionApplicationsController } from './contract-extras.controller';
import { ContractExtrasService } from './contract-extras.service';

@Module({
  controllers: [
    ContractTemplatesController,
    ContractExpensesController,
    ContractPaymentRecordsController,
    ContractExtrasController,
    CommissionApplicationsController,
  ],
  providers: [
    ContractTemplatesService,
    ContractExpensesService,
    ContractExtrasService,
  ],
})
export class ContractEnhanceModule {}
