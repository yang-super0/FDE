import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import type { Request } from 'express';
import type {
  CreateDepartmentTargetRequest,
  DashboardTargetSummary,
  DepartmentTarget,
  DepartmentTargetListResult,
  UpdateDepartmentTargetRequest,
} from '@shared/api.interface';
import { DepartmentTargetsService } from './department-targets.service';

@Controller('api/department-targets')
export class DepartmentTargetsController {
  constructor(private readonly targetsService: DepartmentTargetsService) {}

  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('year') year?: string,
    @Query('targetType') targetType?: string,
    @Query('department') department?: string,
    @Query('status') status?: string,
  ): Promise<DepartmentTargetListResult> {
    return this.targetsService.findAll({
      page: Number(page ?? 1) || 1,
      pageSize: Number(pageSize ?? 10) || 10,
      year: year ? Number(year) : undefined,
      targetType: targetType || undefined,
      department: department || undefined,
      status: status || undefined,
    });
  }

  @Get('summary')
  async summary(
    @Query('targetType') targetType?: string,
  ): Promise<DashboardTargetSummary> {
    return this.targetsService.summary(targetType ?? '月度');
  }

  @NeedLogin()
  @Post()
  async create(
    @Req() req: Request,
    @Body() dto: CreateDepartmentTargetRequest,
  ): Promise<DepartmentTarget> {
    return this.targetsService.create(dto, req.userContext.userId);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<DepartmentTarget> {
    return this.targetsService.findOne(id);
  }

  @NeedLogin()
  @Patch(':id')
  async update(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDepartmentTargetRequest,
  ): Promise<DepartmentTarget> {
    return this.targetsService.update(id, dto, req.userContext.userId);
  }

  @NeedLogin()
  @Delete(':id')
  async remove(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ id: number }> {
    return this.targetsService.remove(id, req.userContext.userId);
  }

  @NeedLogin()
  @Post(':id/recalculate')
  async recalculate(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<DepartmentTarget> {
    return this.targetsService.recalculate(id, req.userContext.userId);
  }
}
