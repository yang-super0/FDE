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
import type {
  IndustryRoiBenchmark,
  IndustryRoiComparisonItem,
  IndustryRoiCorrectDto,
  IndustryRoiCreateDto,
  IndustryRoiImportResult,
  IndustryRoiImportRow,
  IndustryRoiListParams,
  IndustryRoiUpdateDto,
} from '@shared/api.interface';
import { parseIdParam } from '@server/modules/finance-core/query.util';
import {
  resolveSupportEnhanceUserId,
  type SupportEnhanceUserContextRequest,
} from './support-enhance-shared.util';
import { IndustryRoiListResponse, IndustryRoiService } from './industry-roi.service';

@Controller('api/support-enhance/industry-roi')
export class IndustryRoiController {
  constructor(private readonly roiService: IndustryRoiService) {}

  /** 列表（入口自动过期，静态路由须在 :id 之前） */
  @Get()
  async list(
    @Query() params: IndustryRoiListParams,
  ): Promise<IndustryRoiListResponse> {
    return this.roiService.list(params);
  }

  @Get('comparison/industry')
  async comparisonByIndustry(): Promise<IndustryRoiComparisonItem[]> {
    return this.roiService.comparisonByIndustry();
  }

  @Get('comparison/platform')
  async comparisonByPlatform(): Promise<IndustryRoiComparisonItem[]> {
    return this.roiService.comparisonByPlatform();
  }

  @Post('import')
  async importRows(
    @Body() body: { rows?: IndustryRoiImportRow[] },
  ): Promise<IndustryRoiImportResult> {
    return this.roiService.importRows(body?.rows ?? []);
  }

  @Post()
  async create(
    @Body() dto: IndustryRoiCreateDto,
    @Req() req: SupportEnhanceUserContextRequest,
  ): Promise<IndustryRoiBenchmark> {
    return this.roiService.create(dto, resolveSupportEnhanceUserId(req));
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<IndustryRoiBenchmark> {
    return this.roiService.findById(parseIdParam(id));
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: IndustryRoiUpdateDto,
    @Req() req: SupportEnhanceUserContextRequest,
  ): Promise<IndustryRoiBenchmark> {
    return this.roiService.update(
      parseIdParam(id),
      dto,
      resolveSupportEnhanceUserId(req),
    );
  }

  @Post(':id/correct')
  async correct(
    @Param('id') id: string,
    @Body() dto: IndustryRoiCorrectDto,
    @Req() req: SupportEnhanceUserContextRequest,
  ): Promise<IndustryRoiBenchmark> {
    return this.roiService.correct(
      parseIdParam(id),
      dto,
      resolveSupportEnhanceUserId(req),
    );
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @Req() req: SupportEnhanceUserContextRequest,
  ): Promise<{ deleted: boolean }> {
    return this.roiService.remove(
      parseIdParam(id),
      resolveSupportEnhanceUserId(req),
    );
  }

  @Get(':id/versions')
  async versions(@Param('id') id: string): Promise<IndustryRoiBenchmark[]> {
    return this.roiService.versions(parseIdParam(id));
  }
}
