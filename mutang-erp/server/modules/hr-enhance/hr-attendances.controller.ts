import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import type {
  CreateHrAttendanceBody,
  HrAttendance,
  HrAttendanceCheckinBody,
  HrAttendanceLeaveApplyBody,
  HrAttendanceListParams,
  HrAttendanceOvertimeBody,
  HrAttendancePage,
  HrAttendanceStats,
  UpdateHrAttendanceBody,
} from '@shared/api.interface';
import { parseIdParam } from '../finance-core/query.util';
import { HrAttendancesService } from './hr-attendances.service';

interface HrUserRequest {
  userContext: { userId: string };
}

interface HrLeaveRejectBody {
  reason: string;
}

@Controller('api/hr-enhance/attendances')
export class HrAttendancesController {
  constructor(private readonly attendancesService: HrAttendancesService) {}

  @Get()
  async list(@Query() query: HrAttendanceListParams): Promise<HrAttendancePage> {
    return this.attendancesService.list(query);
  }

  @Get('stats')
  async stats(
    @Query('month') month?: string,
    @Query('department') department?: string,
    @Query('employeeId') employeeId?: string,
  ): Promise<HrAttendanceStats> {
    return this.attendancesService.stats({ month, department, employeeId });
  }

  @NeedLogin()
  @Post()
  async create(
    @Req() req: HrUserRequest,
    @Body() dto: CreateHrAttendanceBody,
  ): Promise<HrAttendance> {
    return this.attendancesService.create(dto, req.userContext.userId);
  }

  @NeedLogin()
  @Patch(':id')
  async update(
    @Req() req: HrUserRequest,
    @Param('id') id: string,
    @Body() dto: UpdateHrAttendanceBody,
  ): Promise<HrAttendance> {
    return this.attendancesService.update(
      parseIdParam(id),
      dto,
      req.userContext.userId,
    );
  }

  @NeedLogin()
  @Delete(':id')
  async remove(
    @Req() req: HrUserRequest,
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    return this.attendancesService.remove(
      parseIdParam(id),
      req.userContext.userId,
    );
  }

  @NeedLogin()
  @Post(':id/check-in')
  async checkIn(
    @Req() req: HrUserRequest,
    @Param('id') id: string,
    @Body() body: HrAttendanceCheckinBody,
  ): Promise<HrAttendance> {
    return this.attendancesService.checkIn(
      parseIdParam(id),
      body,
      req.userContext.userId,
    );
  }

  @NeedLogin()
  @Post(':id/check-out')
  async checkOut(
    @Req() req: HrUserRequest,
    @Param('id') id: string,
    @Body() body: HrAttendanceCheckinBody,
  ): Promise<HrAttendance> {
    return this.attendancesService.checkOut(
      parseIdParam(id),
      body,
      req.userContext.userId,
    );
  }

  @NeedLogin()
  @Post(':id/leave-apply')
  async leaveApply(
    @Req() req: HrUserRequest,
    @Param('id') id: string,
    @Body() body: HrAttendanceLeaveApplyBody,
  ): Promise<HrAttendance> {
    return this.attendancesService.leaveApply(
      parseIdParam(id),
      body,
      req.userContext.userId,
    );
  }

  @NeedLogin()
  @Post(':id/leave-approve')
  async leaveApprove(
    @Req() req: HrUserRequest,
    @Param('id') id: string,
  ): Promise<HrAttendance> {
    return this.attendancesService.leaveApprove(
      parseIdParam(id),
      req.userContext.userId,
    );
  }

  @NeedLogin()
  @Post(':id/leave-reject')
  async leaveReject(
    @Req() req: HrUserRequest,
    @Param('id') id: string,
    @Body() body: HrLeaveRejectBody,
  ): Promise<HrAttendance> {
    return this.attendancesService.leaveReject(
      parseIdParam(id),
      body.reason,
      req.userContext.userId,
    );
  }

  @NeedLogin()
  @Post(':id/overtime')
  async overtime(
    @Req() req: HrUserRequest,
    @Param('id') id: string,
    @Body() body: HrAttendanceOvertimeBody,
  ): Promise<HrAttendance> {
    return this.attendancesService.overtime(
      parseIdParam(id),
      body,
      req.userContext.userId,
    );
  }
}
