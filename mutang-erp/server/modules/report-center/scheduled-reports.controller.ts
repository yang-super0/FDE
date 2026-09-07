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
  ScheduledPreviewResponse,
  ScheduledReportCreateInput,
  ScheduledReportListParams,
  ScheduledReportListResponse,
  ScheduledReportRecord,
  ScheduledReportRunResponse,
  ScheduledReportUpdateInput,
} from '@shared/api.interface';
import { parseIdParam } from '@server/modules/finance-core/query.util';
import {
  ScheduledReportsService,
  type ScheduleStatusInput,
  type ScheduledRunsResponse,
} from './scheduled-reports.service';

interface UserContextRequest {
  userContext?: { userId?: string };
}

const resolveUserId = (req: UserContextRequest): string =>
  req.userContext?.userId ?? '';

@Controller('api/report-center/schedules')
export class ScheduledReportsController {
  constructor(private readonly schedulesService: ScheduledReportsService) {}

  @Get()
  async findAll(
    @Query() params: ScheduledReportListParams,
  ): Promise<ScheduledReportListResponse> {
    return this.schedulesService.findAll(params);
  }

  @NeedLogin()
  @Post()
  async create(
    @Body() dto: ScheduledReportCreateInput,
    @Req() req: UserContextRequest,
  ): Promise<ScheduledReportRecord> {
    return this.schedulesService.create(dto, resolveUserId(req));
  }

  @Get('runs/logs')
  async listRunLogs(): Promise<ScheduledRunsResponse> {
    return this.schedulesService.listRunLogs();
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<ScheduledReportRecord> {
    return this.schedulesService.findById(parseIdParam(id));
  }

  @NeedLogin()
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: ScheduledReportUpdateInput,
    @Req() req: UserContextRequest,
  ): Promise<ScheduledReportRecord> {
    return this.schedulesService.update(
      parseIdParam(id),
      dto,
      resolveUserId(req),
    );
  }

  @NeedLogin()
  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @Req() req: UserContextRequest,
  ): Promise<{ deleted: boolean }> {
    return this.schedulesService.remove(parseIdParam(id), resolveUserId(req));
  }

  @NeedLogin()
  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: ScheduleStatusInput,
    @Req() req: UserContextRequest,
  ): Promise<ScheduledReportRecord> {
    return this.schedulesService.updateStatus(
      parseIdParam(id),
      dto?.status ?? '',
      resolveUserId(req),
    );
  }

  @NeedLogin()
  @Post(':id/run')
  async runNow(
    @Param('id') id: string,
    @Req() req: UserContextRequest,
  ): Promise<ScheduledReportRunResponse> {
    return this.schedulesService.runNow(
      parseIdParam(id),
      resolveUserId(req),
    );
  }

  @Get(':id/preview')
  async preview(@Param('id') id: string): Promise<ScheduledPreviewResponse> {
    return this.schedulesService.preview(parseIdParam(id));
  }
}
