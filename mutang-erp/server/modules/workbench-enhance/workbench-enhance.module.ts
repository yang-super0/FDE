import { Module } from '@nestjs/common';
import { OperationLogModule } from '@server/modules/operation-log/operation-log.module';
import { DailyConsumptionController } from './daily-consumption.controller';
import { DailyConsumptionService } from './daily-consumption.service';
import { DepartmentTargetsController } from './department-targets.controller';
import { DepartmentTargetsService } from './department-targets.service';
import { PerformanceTasksController } from './performance-tasks.controller';
import { PerformanceTasksService } from './performance-tasks.service';

@Module({
  imports: [OperationLogModule],
  controllers: [
    DailyConsumptionController,
    DepartmentTargetsController,
    PerformanceTasksController,
  ],
  providers: [
    DailyConsumptionService,
    DepartmentTargetsService,
    PerformanceTasksService,
  ],
})
export class WorkbenchEnhanceModule {}
