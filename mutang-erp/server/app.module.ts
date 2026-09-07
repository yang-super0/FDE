import { APP_FILTER } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { PlatformModule } from '@lark-apaas/fullstack-nestjs-core';

import { GlobalExceptionFilter } from './common/filters/exception.filter';
import { OperationLogModule } from './modules/operation-log/operation-log.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { CustomerModule } from './modules/customer/customer.module';
import { AdCampaignModule } from './modules/ad-campaign/ad-campaign.module';
import { VideoProjectModule } from './modules/video-project/video-project.module';
import { ContractModule } from './modules/contract/contract.module';
import { FinanceModule } from './modules/finance/finance.module';
import { HrModule } from './modules/hr/hr.module';
import { AdminAffairModule } from './modules/admin-affair/admin-affair.module';
import { TaskModule } from './modules/task/task.module';
import { SystemModule } from './modules/system/system.module';
import { SupportModule } from './modules/support/support.module';
import { CustomerPoolModule } from './modules/customer-pool/customer-pool.module';
import { AdBusinessModule } from './modules/ad-business/ad-business.module';
import { FinanceCoreModule } from './modules/finance-core/finance-core.module';
import { VideoCoreModule } from './modules/video-core/video-core.module';
import { ContractEnhanceModule } from './modules/contract-enhance/contract-enhance.module';
import { WorkbenchEnhanceModule } from './modules/workbench-enhance/workbench-enhance.module';
import { FinanceEnhanceModule } from './modules/finance-enhance/finance-enhance.module';
import { HrEnhanceModule } from './modules/hr-enhance/hr-enhance.module';
import { AdminEnhanceModule } from './modules/admin-enhance/admin-enhance.module';
import { TaskEnhanceModule } from './modules/task-enhance/task-enhance.module';
import { SystemEnhanceModule } from './modules/system-enhance/system-enhance.module';
import { SupportEnhanceModule } from './modules/support-enhance/support-enhance.module';
import { ReportCenterModule } from './modules/report-center/report-center.module';
import { FieldPermissionModule } from './modules/field-permission/field-permission.module';
import { MessageNotificationModule } from './modules/message-notification/message-notification.module';
import { FeishuSyncModule } from './modules/feishu-sync/feishu-sync.module';
import { ViewModule } from './modules/view/view.module';

@Module({
  imports: [
    // 平台 Module，提供平台能力
    PlatformModule.forRoot(),
    // ====== @route-section: business-modules START ======
    // Place all business modules here.Do NOT add fallback modules here.
    OperationLogModule,
    DashboardModule,
    CustomerModule,
    AdCampaignModule,
    VideoProjectModule,
    ContractModule,
    FinanceModule,
    HrModule,
    AdminAffairModule,
    TaskModule,
    SystemModule,
    SupportModule,
    CustomerPoolModule,
    AdBusinessModule,
    FinanceCoreModule,
    VideoCoreModule,
    ContractEnhanceModule,
    WorkbenchEnhanceModule,
    FinanceEnhanceModule,
    HrEnhanceModule,
    AdminEnhanceModule,
    TaskEnhanceModule,
    SystemEnhanceModule,
    SupportEnhanceModule,
    ReportCenterModule,
    FieldPermissionModule,
    MessageNotificationModule,
    FeishuSyncModule,
    // ====== @route-section: business-modules END ======

    // ⚠️ @route-order: last
    // ViewModule is the fallback route module, must be registered last.
    ViewModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule {}
