import { Module } from '@nestjs/common';
import { MessageNotificationModule } from '../message-notification/message-notification.module';
import { AccountsController } from './controllers/accounts.controller';
import { ApplicationsController } from './controllers/applications.controller';
import { CommissionRecordsController } from './controllers/commission-records.controller';
import { CommissionRulesController } from './controllers/commission-rules.controller';
import { FilingsController } from './controllers/filings.controller';
import { TransfersController } from './controllers/transfers.controller';
import { AccountsService } from './services/accounts.service';
import { ApplicationsService } from './services/applications.service';
import { CommissionRecordsService } from './services/commission-records.service';
import { CommissionRulesService } from './services/commission-rules.service';
import { FilingsService } from './services/filings.service';
import { TransfersService } from './services/transfers.service';

@Module({
  imports: [MessageNotificationModule],
  controllers: [
    ApplicationsController,
    AccountsController,
    FilingsController,
    TransfersController,
    CommissionRulesController,
    CommissionRecordsController,
  ],
  providers: [
    ApplicationsService,
    AccountsService,
    FilingsService,
    TransfersService,
    CommissionRulesService,
    CommissionRecordsService,
  ],
})
export class AdBusinessModule {}
