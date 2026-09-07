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
  CreateHrEmployeeBody,
  HrEmployee,
  HrEmployeeLeaveApplyBody,
  HrEmployeePage,
  HrEmployeeRegularBody,
  HrEmployeeTransferConfirmBody,
  UpdateHrEmployeeBody,
} from '@shared/api.interface';
import { parseIdParam } from '../finance-core/query.util';
import {
  HrEmployeesService,
  type HrEmployeeTransferApplyBody,
} from './hr-employees.service';

interface HrEmployeeUserRequest {
  userContext: { userId: string };
}

@Controller('api/hr-enhance/employees')
export class HrEmployeesController {
  constructor(private readonly employeesService: HrEmployeesService) {}

  @Get()
  async listEmployees(
    @Query('department') department?: string,
    @Query('status') status?: string,
    @Query('keyword') keyword?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<HrEmployeePage> {
    return this.employeesService.listEmployees({
      department,
      status,
      keyword,
      page,
      pageSize,
    });
  }

  @NeedLogin()
  @Post()
  async createEmployee(
    @Req() req: HrEmployeeUserRequest,
    @Body() dto: CreateHrEmployeeBody,
  ): Promise<HrEmployee> {
    return this.employeesService.createEmployee(
      dto,
      req.userContext.userId,
    );
  }

  @Get(':id')
  async getEmployee(@Param('id') id: string): Promise<HrEmployee> {
    return this.employeesService.getEmployee(parseIdParam(id));
  }

  @NeedLogin()
  @Patch(':id')
  async updateEmployee(
    @Req() req: HrEmployeeUserRequest,
    @Param('id') id: string,
    @Body() dto: UpdateHrEmployeeBody,
  ): Promise<HrEmployee> {
    return this.employeesService.updateEmployee(
      parseIdParam(id),
      dto,
      req.userContext.userId,
    );
  }

  @NeedLogin()
  @Delete(':id')
  async deleteEmployee(
    @Req() req: HrEmployeeUserRequest,
    @Param('id') id: string,
  ): Promise<HrEmployee> {
    return this.employeesService.deleteEmployee(
      parseIdParam(id),
      req.userContext.userId,
    );
  }

  @NeedLogin()
  @Post(':id/regular')
  async regularizeEmployee(
    @Req() req: HrEmployeeUserRequest,
    @Param('id') id: string,
    @Body() dto: HrEmployeeRegularBody,
  ): Promise<HrEmployee> {
    return this.employeesService.regularizeEmployee(
      parseIdParam(id),
      dto,
      req.userContext.userId,
    );
  }

  @NeedLogin()
  @Post(':id/transfer-apply')
  async applyTransfer(
    @Req() req: HrEmployeeUserRequest,
    @Param('id') id: string,
    @Body() dto: HrEmployeeTransferApplyBody,
  ): Promise<HrEmployee> {
    return this.employeesService.applyTransfer(
      parseIdParam(id),
      dto,
      req.userContext.userId,
    );
  }

  @NeedLogin()
  @Post(':id/transfer-confirm')
  async confirmTransfer(
    @Req() req: HrEmployeeUserRequest,
    @Param('id') id: string,
    @Body() dto: HrEmployeeTransferConfirmBody,
  ): Promise<HrEmployee> {
    return this.employeesService.confirmTransfer(
      parseIdParam(id),
      dto,
      req.userContext.userId,
    );
  }

  @NeedLogin()
  @Post(':id/leave-apply')
  async applyLeave(
    @Req() req: HrEmployeeUserRequest,
    @Param('id') id: string,
    @Body() dto: HrEmployeeLeaveApplyBody,
  ): Promise<HrEmployee> {
    return this.employeesService.applyLeave(
      parseIdParam(id),
      dto,
      req.userContext.userId,
    );
  }

  @NeedLogin()
  @Post(':id/leave-confirm')
  async confirmLeave(
    @Req() req: HrEmployeeUserRequest,
    @Param('id') id: string,
  ): Promise<HrEmployee> {
    return this.employeesService.confirmLeave(
      parseIdParam(id),
      req.userContext.userId,
    );
  }
}
