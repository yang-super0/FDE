import { Module } from '@nestjs/common';
import { OperationLogModule } from '@server/modules/operation-log/operation-log.module';
import { CustomReportsController } from './custom-reports.controller';
import { CustomReportsService } from './custom-reports.service';
import { DrilldownsController } from './drilldowns.controller';
import { DrilldownsService } from './drilldowns.service';
import { ReportTemplatesController } from './report-templates.controller';
import { ReportTemplatesService } from './report-templates.service';
import { ScheduledReportsController } from './scheduled-reports.controller';
import { ScheduledReportsService } from './scheduled-reports.service';

@Module({
  imports: [OperationLogModule],
  controllers: [
    CustomReportsController,
    ReportTemplatesController,
    ScheduledReportsController,
    DrilldownsController,
  ],
  providers: [
    CustomReportsService,
    ReportTemplatesService,
    ScheduledReportsService,
    DrilldownsService,
  ],
})
export class ReportCenterModule {}
