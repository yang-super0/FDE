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
  CreateHrRecruitmentPlanBody,
  HrPlanDepartmentStat,
  HrPlanStatusBody,
  HrRecruitmentPlan,
  HrRecruitmentPlanListParams,
  HrRecruitmentPlanPage,
  UpdateHrRecruitmentPlanBody,
} from '@shared/api.interface';
import { parseIdParam } from '../finance-core/query.util';
import { HrPlansService } from './hr-plans.service';

interface HrUserRequest {
  userContext: { userId: string };
}

@Controller('api/hr-enhance/recruitment-plans')
export class HrPlansController {
  constructor(private readonly plansService: HrPlansService) {}

  @Get('department-stats')
  async departmentStats(): Promise<HrPlanDepartmentStat[]> {
    return this.plansService.getDepartmentStats();
  }

  @Get()
  async list(
    @Query() query: HrRecruitmentPlanListParams,
  ): Promise<HrRecruitmentPlanPage> {
    return this.plansService.listPlans(query);
  }

  @NeedLogin()
  @Post()
  async create(
    @Req() req: HrUserRequest,
    @Body() dto: CreateHrRecruitmentPlanBody,
  ): Promise<HrRecruitmentPlan> {
    return this.plansService.createPlan(dto, req.userContext.userId);
  }

  @NeedLogin()
  @Patch(':id')
  async update(
    @Req() req: HrUserRequest,
    @Param('id') id: string,
    @Body() dto: UpdateHrRecruitmentPlanBody,
  ): Promise<HrRecruitmentPlan> {
    return this.plansService.updatePlan(
      parseIdParam(id),
      dto,
      req.userContext.userId,
    );
  }

  @NeedLogin()
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.plansService.deletePlan(parseIdParam(id));
  }

  @NeedLogin()
  @Post(':id/status')
  async updateStatus(
    @Req() req: HrUserRequest,
    @Param('id') id: string,
    @Body() body: HrPlanStatusBody,
  ): Promise<HrRecruitmentPlan> {
    return this.plansService.updatePlanStatus(
      parseIdParam(id),
      body,
      req.userContext.userId,
    );
  }
}
