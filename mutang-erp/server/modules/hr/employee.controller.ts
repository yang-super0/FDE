import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import type { Employee, PageResult } from '@shared/api.interface';
import { EmployeeService } from './employee.service';
import type { CreateEmployeeInput, UpdateEmployeeInput } from './hr.dto';

@Controller('api/employees')
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Get()
  async list(
    @Query('departmentId') departmentId?: string,
    @Query('keyword') keyword?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<PageResult<Employee>> {
    return this.employeeService.list({
      departmentId,
      keyword,
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 20,
    });
  }

  @NeedLogin()
  @Post()
  async create(
    @Req() req: Request,
    @Body() body: CreateEmployeeInput,
  ): Promise<{ id: string }> {
    const { userId } = req.userContext;
    return this.employeeService.create(body, userId);
  }

  @Get(':id')
  async detail(@Param('id') id: string): Promise<Employee> {
    return this.employeeService.findById(id);
  }

  @NeedLogin()
  @Put(':id')
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: UpdateEmployeeInput,
  ): Promise<{ success: boolean }> {
    const { userId } = req.userContext;
    return this.employeeService.update(id, body, userId);
  }
}
