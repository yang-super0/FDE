import { Module } from '@nestjs/common';
import { FieldPermissionModule } from '../field-permission/field-permission.module';
import { HrResumesController } from './hr-resumes.controller';
import { HrResumesService } from './hr-resumes.service';
import { HrInvitationsController } from './hr-invitations.controller';
import { HrInvitationsService } from './hr-invitations.service';
import { HrInterviewsController } from './hr-interviews.controller';
import { HrInterviewsService } from './hr-interviews.service';
import { HrCheckinsController } from './hr-checkins.controller';
import { HrCheckinsService } from './hr-checkins.service';
import { HrPlansController } from './hr-plans.controller';
import { HrPlansService } from './hr-plans.service';
import { HrEmployeesController } from './hr-employees.controller';
import { HrEmployeesService } from './hr-employees.service';
import { HrDashboardController } from './hr-dashboard.controller';
import { HrDashboardService } from './hr-dashboard.service';
import { HrSalariesController } from './hr-salaries.controller';
import { HrSalariesService } from './hr-salaries.service';
import { HrPerformancesController } from './hr-performances.controller';
import { HrPerformancesService } from './hr-performances.service';
import { HrAttendancesController } from './hr-attendances.controller';
import { HrAttendancesService } from './hr-attendances.service';

@Module({
  imports: [FieldPermissionModule],
  controllers: [
    HrResumesController,
    HrInvitationsController,
    HrInterviewsController,
    HrCheckinsController,
    HrPlansController,
    HrEmployeesController,
    HrDashboardController,
    HrSalariesController,
    HrPerformancesController,
    HrAttendancesController,
  ],
  providers: [
    HrResumesService,
    HrInvitationsService,
    HrInterviewsService,
    HrCheckinsService,
    HrPlansService,
    HrEmployeesService,
    HrDashboardService,
    HrSalariesService,
    HrPerformancesService,
    HrAttendancesService,
  ],
})
export class HrEnhanceModule {}
