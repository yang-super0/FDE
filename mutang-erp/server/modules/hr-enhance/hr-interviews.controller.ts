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
  CreateHrInterviewBody,
  HrInterview,
  HrInterviewEvaluateBody,
  HrInterviewOfferBody,
  HrInterviewListParams,
  HrInterviewPage,
  UpdateHrInterviewBody,
} from '@shared/api.interface';
import { parseIdParam } from '../finance-core/query.util';
import { HrInterviewsService } from './hr-interviews.service';

interface HrUserRequest {
  userContext: { userId: string };
}

@Controller('api/hr-enhance/interviews')
export class HrInterviewsController {
  constructor(private readonly interviewsService: HrInterviewsService) {}

  @Get()
  async list(
    @Query() query: HrInterviewListParams,
  ): Promise<HrInterviewPage> {
    return this.interviewsService.listInterviews(query);
  }

  @NeedLogin()
  @Post()
  async create(
    @Req() req: HrUserRequest,
    @Body() dto: CreateHrInterviewBody,
  ): Promise<HrInterview> {
    return this.interviewsService.createInterview(
      dto,
      req.userContext.userId,
    );
  }

  @NeedLogin()
  @Patch(':id')
  async update(
    @Req() req: HrUserRequest,
    @Param('id') id: string,
    @Body() dto: UpdateHrInterviewBody,
  ): Promise<HrInterview> {
    return this.interviewsService.updateInterview(
      parseIdParam(id),
      dto,
      req.userContext.userId,
    );
  }

  @NeedLogin()
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.interviewsService.deleteInterview(parseIdParam(id));
  }

  @NeedLogin()
  @Post(':id/evaluate')
  async evaluate(
    @Req() req: HrUserRequest,
    @Param('id') id: string,
    @Body() body: HrInterviewEvaluateBody,
  ): Promise<HrInterview> {
    return this.interviewsService.evaluateInterview(
      parseIdParam(id),
      body,
      req.userContext.userId,
    );
  }

  @NeedLogin()
  @Post(':id/offer')
  async offer(
    @Req() req: HrUserRequest,
    @Param('id') id: string,
    @Body() body: HrInterviewOfferBody,
  ): Promise<HrInterview> {
    return this.interviewsService.updateOfferStatus(
      parseIdParam(id),
      body,
      req.userContext.userId,
    );
  }
}
