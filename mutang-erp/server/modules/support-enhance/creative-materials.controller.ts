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
  CreativeMaterial,
  MaterialCreateDto,
  MaterialListParams,
  MaterialPerformancePoint,
  MaterialPerformanceRecord,
  MaterialRankItem,
  MaterialRecommendItem,
  MaterialStats,
  MaterialUpdateDto,
  PerformanceRecordCreateDto,
} from '@shared/api.interface';
import { parseIdParam } from '../finance-core/query.util';
import {
  resolveSupportEnhanceUserId,
  type SupportEnhanceUserContextRequest,
} from './support-enhance-shared.util';
import { CreativeMaterialsService } from './creative-materials.service';
import type {
  CreativeMaterialPage,
  MaterialBatchArchiveBody,
  MaterialBatchTagsBody,
} from './creative-materials.service';

interface MaterialRatingBody {
  rating: number;
}

interface MaterialStatusBody {
  status: string;
}

@Controller('api/support-enhance/materials')
export class CreativeMaterialsController {
  constructor(
    private readonly materialsService: CreativeMaterialsService,
  ) {}

  @Get()
  async list(
    @Query() query: MaterialListParams,
  ): Promise<CreativeMaterialPage> {
    return this.materialsService.list(query);
  }

  @Get('stats')
  async stats(): Promise<MaterialStats> {
    return this.materialsService.getStats();
  }

  @Get('ranking')
  async ranking(
    @Query('sortBy') sortBy?: string,
    @Query('limit') limit?: string,
  ): Promise<MaterialRankItem[]> {
    return this.materialsService.getRanking(sortBy, limit);
  }

  @Get('recommendations')
  async recommendations(
    @Query('limit') limit?: string,
  ): Promise<MaterialRecommendItem[]> {
    return this.materialsService.getRecommendations(limit);
  }

  @Get('compare')
  async compare(@Query('ids') ids?: string): Promise<CreativeMaterial[]> {
    return this.materialsService.compare(ids);
  }

  @Get(':id')
  async detail(@Param('id') id: string): Promise<CreativeMaterial> {
    return this.materialsService.getById(parseIdParam(id));
  }

  @NeedLogin()
  @Post()
  async create(
    @Req() req: SupportEnhanceUserContextRequest,
    @Body() dto: MaterialCreateDto,
  ): Promise<CreativeMaterial> {
    return this.materialsService.create(dto, resolveSupportEnhanceUserId(req));
  }

  @NeedLogin()
  @Patch(':id')
  async update(
    @Req() req: SupportEnhanceUserContextRequest,
    @Param('id') id: string,
    @Body() dto: MaterialUpdateDto,
  ): Promise<CreativeMaterial> {
    return this.materialsService.update(
      parseIdParam(id),
      dto,
      resolveSupportEnhanceUserId(req),
    );
  }

  @NeedLogin()
  @Delete(':id')
  async remove(
    @Req() req: SupportEnhanceUserContextRequest,
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    return this.materialsService.remove(
      parseIdParam(id),
      resolveSupportEnhanceUserId(req),
    );
  }

  @NeedLogin()
  @Post(':id/rating')
  async updateRating(
    @Req() req: SupportEnhanceUserContextRequest,
    @Param('id') id: string,
    @Body() body: MaterialRatingBody,
  ): Promise<{ updated: boolean }> {
    return this.materialsService.updateRating(
      parseIdParam(id),
      body?.rating,
      resolveSupportEnhanceUserId(req),
    );
  }

  @NeedLogin()
  @Patch(':id/status')
  async updateStatus(
    @Req() req: SupportEnhanceUserContextRequest,
    @Param('id') id: string,
    @Body() body: MaterialStatusBody,
  ): Promise<{ updated: boolean }> {
    return this.materialsService.updateStatus(
      parseIdParam(id),
      body?.status ?? '',
      resolveSupportEnhanceUserId(req),
    );
  }

  @NeedLogin()
  @Post('batch-tags')
  async batchTags(
    @Req() req: SupportEnhanceUserContextRequest,
    @Body() body: MaterialBatchTagsBody,
  ): Promise<{ updated: number }> {
    return this.materialsService.batchTags(
      body,
      resolveSupportEnhanceUserId(req),
    );
  }

  @NeedLogin()
  @Post('batch-archive')
  async batchArchive(
    @Req() req: SupportEnhanceUserContextRequest,
    @Body() body: MaterialBatchArchiveBody,
  ): Promise<{ updated: number }> {
    return this.materialsService.batchArchive(
      body,
      resolveSupportEnhanceUserId(req),
    );
  }

  @Get(':id/records')
  async records(
    @Param('id') id: string,
  ): Promise<MaterialPerformanceRecord[]> {
    return this.materialsService.listRecords(parseIdParam(id));
  }

  @NeedLogin()
  @Post(':id/records')
  async createRecord(
    @Req() req: SupportEnhanceUserContextRequest,
    @Param('id') id: string,
    @Body() dto: PerformanceRecordCreateDto,
  ): Promise<MaterialPerformanceRecord> {
    return this.materialsService.createRecord(
      parseIdParam(id),
      dto,
      resolveSupportEnhanceUserId(req),
    );
  }

  @Get(':id/performance')
  async performance(
    @Param('id') id: string,
  ): Promise<MaterialPerformancePoint[]> {
    return this.materialsService.getPerformance(parseIdParam(id));
  }
}
