import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { MessageNotificationModule } from '../message-notification/message-notification.module';
import { SystemSettingsController } from './system-settings.controller';
import { SystemSettingsService } from './system-settings.service';
import { OrgController } from './org.controller';
import { OrgService } from './org.service';
import { CustomerAccountsController } from './customer-accounts.controller';
import { CustomerAccountsService } from './customer-accounts.service';
import { SystemRolesController } from './system-roles.controller';
import { SystemRolesService } from './system-roles.service';
import { OperationLogsEnhanceController } from './operation-logs-enhance.controller';
import { OperationLogsEnhanceService } from './operation-logs-enhance.service';
import { LoginLogsController } from './login-logs.controller';
import { LoginLogsService } from './login-logs.service';
import { OperationLogInterceptor } from './operation-log.interceptor';

@Module({
  imports: [MessageNotificationModule],
  controllers: [
    SystemSettingsController,
    OrgController,
    CustomerAccountsController,
    SystemRolesController,
    OperationLogsEnhanceController,
    LoginLogsController,
  ],
  providers: [
    SystemSettingsService,
    OrgService,
    CustomerAccountsService,
    SystemRolesService,
    OperationLogsEnhanceService,
    LoginLogsService,
    {
      provide: APP_INTERCEPTOR,
      useClass: OperationLogInterceptor,
    },
  ],
})
export class SystemEnhanceModule {}
