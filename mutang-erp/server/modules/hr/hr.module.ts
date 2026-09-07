import { Module } from '@nestjs/common';
import { OperationLogModule } from '../operation-log/operation-log.module';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { DepartmentController } from './department.controller';
import { DepartmentService } from './department.service';
import { EmployeeController } from './employee.controller';
import { EmployeeService } from './employee.service';
import { LeaveController } from './leave.controller';
import { LeaveService } from './leave.service';

@Module({
  imports: [OperationLogModule],
  controllers: [
    DepartmentController,
    EmployeeController,
    AttendanceController,
    LeaveController,
  ],
  providers: [
    DepartmentService,
    EmployeeService,
    AttendanceService,
    LeaveService,
  ],
})
export class HrModule {}
