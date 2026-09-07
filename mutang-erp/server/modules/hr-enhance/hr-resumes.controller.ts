import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import type {
  CreateHrResumeBody,
  HrBatchStatusBody,
  HrResume,
  HrResumeListParams,
  HrResumePage,
  HrResumeRatingBody,
  UpdateHrResumeBody,
} from '@shared/api.interface';
import { HrResumesService } from './hr-resumes.service';

const parseHrResumeIdParam = (raw: string): number => {
  const parsed: number = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new BadRequestException('无效的简历 ID');
  }
  return parsed;
};

@Controller('api/hr-enhance/resumes')
export class HrResumesController {
  constructor(private readonly resumesService: HrResumesService) {}

  @Get()
  async list(@Query() query: HrResumeListParams): Promise<HrResumePage> {
    return this.resumesService.list(query);
  }

  @NeedLogin()
  @Post()
  async create(@Body() dto: CreateHrResumeBody): Promise<HrResume> {
    return this.resumesService.create(dto);
  }

  @Get(':id')
  async getById(@Param('id') id: string): Promise<HrResume> {
    return this.resumesService.getById(parseHrResumeIdParam(id));
  }

  @NeedLogin()
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateHrResumeBody,
  ): Promise<HrResume> {
    return this.resumesService.update(parseHrResumeIdParam(id), dto);
  }

  @NeedLogin()
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.resumesService.remove(parseHrResumeIdParam(id));
  }

  @NeedLogin()
  @Post(':id/rating')
  async updateRating(
    @Param('id') id: string,
    @Body() body: HrResumeRatingBody,
  ): Promise<HrResume> {
    return this.resumesService.updateRating(
      parseHrResumeIdParam(id),
      body,
    );
  }

  @NeedLogin()
  @Post('batch-status')
  async batchStatus(
    @Body() body: HrBatchStatusBody,
  ): Promise<{ updated: number }> {
    return this.resumesService.batchStatus(body);
  }
}
