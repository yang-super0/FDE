import { Controller, Get, Query } from '@nestjs/common';
import type {
  AttendanceRecord,
  PageResult,
} from '@shared/api.interface';
import { AttendanceService } from './attendance.service';

@Controller('api/attendances')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get()
  async list(
    @Query('departmentId') departmentId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<PageResult<AttendanceRecord>> {
    return this.attendanceService.list({
      departmentId,
      dateFrom,
      dateTo,
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 20,
    });
  }
}
