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
  CustomReportCreateInput,
  CustomReportListParams,
  CustomReportListResponse,
  CustomReportRecord,
  CustomReportShareInput,
  CustomReportUpdateInput,
  ReportRunParams,
  ReportRunResult,
  ReportTemplateCreateInput,
  ReportTemplateRecord,
} from '@shared/api.interface';
import { parseIdParam } from '@server/modules/finance-core/query.util';
import {
  CustomReportsService,
  type CustomReportBatchDeleteResult,
} from './custom-reports.service';

interface UserContextRequest {
  userContext?: { userId?: string };
}

interface BatchDeleteBody {
  ids: number[];
}

const resolveUserId = (req: UserContextRequest): string =>
  req.userContext?.userId ?? '';

@Controller('api/report-center/reports')
export class CustomReportsController {
  constructor(private readonly reportsService: CustomReportsService) {}

  @Get()
  async list(
    @Query() params: CustomReportListParams,
  ): Promise<CustomReportListResponse> {
    return this.reportsService.list(params);
  }

  @NeedLogin()
  @Post()
  async create(
    @Body() dto: CustomReportCreateInput,
    @Req() req: UserContextRequest,
  ): Promise<CustomReportRecord> {
    return this.reportsService.create(dto, resolveUserId(req));
  }

  @NeedLogin()
  @Post('batch-delete')
  async batchDelete(
    @Body() dto: BatchDeleteBody,
    @Req() req: UserContextRequest,
  ): Promise<CustomReportBatchDeleteResult> {
    return this.reportsService.batchDelete(dto?.ids, resolveUserId(req));
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<CustomReportRecord> {
    return this.reportsService.findById(parseIdParam(id));
  }

  @NeedLogin()
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: CustomReportUpdateInput,
    @Req() req: UserContextRequest,
  ): Promise<CustomReportRecord> {
    return this.reportsService.update(
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
  ): Promise<{ success: boolean }> {
    return this.reportsService.remove(parseIdParam(id), resolveUserId(req));
  }

  @NeedLogin()
  @Post(':id/copy')
  async copy(
    @Param('id') id: string,
    @Req() req: UserContextRequest,
  ): Promise<CustomReportRecord> {
    return this.reportsService.copy(parseIdParam(id), resolveUserId(req));
  }

  @NeedLogin()
  @Patch(':id/share')
  async share(
    @Param('id') id: string,
    @Body() dto: CustomReportShareInput,
    @Req() req: UserContextRequest,
  ): Promise<CustomReportRecord> {
    return this.reportsService.share(
      parseIdParam(id),
      dto,
      resolveUserId(req),
    );
  }

  @NeedLogin()
  @Post(':id/save-as-template')
  async saveAsTemplate(
    @Param('id') id: string,
    @Body() dto: ReportTemplateCreateInput,
    @Req() req: UserContextRequest,
  ): Promise<ReportTemplateRecord> {
    return this.reportsService.saveAsTemplate(
      parseIdParam(id),
      dto,
      resolveUserId(req),
    );
  }

  @NeedLogin()
  @Post(':id/run')
  async run(
    @Param('id') id: string,
    @Body() params?: ReportRunParams,
  ): Promise<ReportRunResult> {
    return this.reportsService.run(parseIdParam(id), params);
  }

  @Get(':id/preview')
  async preview(@Param('id') id: string): Promise<ReportRunResult> {
    return this.reportsService.preview(parseIdParam(id));
  }
}
