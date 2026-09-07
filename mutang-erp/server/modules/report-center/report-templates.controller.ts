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
  CustomReportRecord,
  ReportTemplateApplyInput,
  ReportTemplateCreateInput,
  ReportTemplateListParams,
  ReportTemplateListResponse,
  ReportTemplateRatingInput,
  ReportTemplateRatingResponse,
  ReportTemplateRecord,
  ReportTemplateUpdateInput,
} from '@shared/api.interface';
import { parseIdParam } from '@server/modules/finance-core/query.util';
import {
  ReportTemplatesService,
  type ReportTemplateBatchDeleteResult,
} from './report-templates.service';

interface UserContextRequest {
  userContext?: { userId?: string };
}

interface BatchDeleteBody {
  ids: number[];
}

const resolveUserId = (req: UserContextRequest): string =>
  req.userContext?.userId ?? '';

@Controller('api/report-center/templates')
export class ReportTemplatesController {
  constructor(private readonly templatesService: ReportTemplatesService) {}

  @Get()
  async list(
    @Query() params: ReportTemplateListParams,
  ): Promise<ReportTemplateListResponse> {
    return this.templatesService.list(params);
  }

  @NeedLogin()
  @Post()
  async create(
    @Body() dto: ReportTemplateCreateInput,
    @Req() req: UserContextRequest,
  ): Promise<ReportTemplateRecord> {
    return this.templatesService.create(dto, resolveUserId(req));
  }

  @NeedLogin()
  @Post('batch-delete')
  async batchDelete(
    @Body() dto: BatchDeleteBody,
    @Req() req: UserContextRequest,
  ): Promise<ReportTemplateBatchDeleteResult> {
    return this.templatesService.batchDelete(dto?.ids, resolveUserId(req));
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<ReportTemplateRecord> {
    return this.templatesService.findById(parseIdParam(id));
  }

  @NeedLogin()
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: ReportTemplateUpdateInput,
    @Req() req: UserContextRequest,
  ): Promise<ReportTemplateRecord> {
    return this.templatesService.update(
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
    return this.templatesService.remove(parseIdParam(id), resolveUserId(req));
  }

  @NeedLogin()
  @Post(':id/apply')
  async apply(
    @Param('id') id: string,
    @Body() dto: ReportTemplateApplyInput,
    @Req() req: UserContextRequest,
  ): Promise<CustomReportRecord> {
    return this.templatesService.apply(
      parseIdParam(id),
      dto,
      resolveUserId(req),
    );
  }

  @NeedLogin()
  @Patch(':id/rating')
  async rating(
    @Param('id') id: string,
    @Body() dto: ReportTemplateRatingInput,
    @Req() req: UserContextRequest,
  ): Promise<ReportTemplateRatingResponse> {
    return this.templatesService.rating(
      parseIdParam(id),
      dto,
      resolveUserId(req),
    );
  }
}
