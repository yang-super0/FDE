import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import type {
  AdFiling,
  AdFilingListResult,
  CreateAdFilingRequest,
  ReviewFilingRequest,
} from '@shared/api.interface';
import {
  FilingsService,
  type UpdateAdFilingRequest,
} from '../services/filings.service';
import {
  parsePage,
  parsePageSize,
  type UserContextRequest,
} from '../query.util';

const MAX_BATCH_ITEMS: number = 500;

interface BatchCreateFilingsBody {
  items: CreateAdFilingRequest[];
}

@Controller('api/ad-business')
export class FilingsController {
  constructor(private readonly filingsService: FilingsService) {}

  @Get('filings')
  async findAll(
    @Query('filingNo') filingNo?: string,
    @Query('accountName') accountName?: string,
    @Query('groupName') groupName?: string,
    @Query('subjectName') subjectName?: string,
    @Query('platform') platform?: string,
    @Query('industry') industry?: string,
    @Query('status') status?: string,
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<AdFilingListResult> {
    return this.filingsService.findAll({
      filingNo,
      accountName,
      groupName,
      subjectName,
      platform,
      industry,
      status,
      startTime,
      endTime,
      page: parsePage(page),
      pageSize: parsePageSize(pageSize),
    });
  }

  @NeedLogin()
  @Post('filings')
  async create(
    @Req() req: UserContextRequest,
    @Body() dto: CreateAdFilingRequest,
  ): Promise<{ id: string }> {
    return this.filingsService.create(dto, req.userContext.userId);
  }

  @NeedLogin()
  @Post('filings/batch')
  async batchCreate(
    @Req() req: UserContextRequest,
    @Body() body: BatchCreateFilingsBody,
  ): Promise<{ created: number }> {
    if (!Array.isArray(body?.items) || body.items.length === 0) {
      throw new BadRequestException('请提供要创建的广告报备');
    }
    if (body.items.length > MAX_BATCH_ITEMS) {
      throw new BadRequestException(
        `单次批量最多 ${String(MAX_BATCH_ITEMS)} 条`,
      );
    }
    return this.filingsService.batchCreate(body.items, req.userContext.userId);
  }

  @Get('filings/:id')
  async detail(@Param('id') id: string): Promise<AdFiling> {
    return this.filingsService.detail(id);
  }

  @NeedLogin()
  @Put('filings/:id')
  async update(
    @Req() req: UserContextRequest,
    @Param('id') id: string,
    @Body() dto: UpdateAdFilingRequest,
  ): Promise<{ success: boolean }> {
    return this.filingsService.update(id, dto, req.userContext.userId);
  }

  @NeedLogin()
  @Delete('filings/:id')
  async remove(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.filingsService.remove(id);
  }

  @NeedLogin()
  @Post('filings/:id/approve')
  async approve(
    @Req() req: UserContextRequest,
    @Param('id') id: string,
    @Body() dto: ReviewFilingRequest,
  ): Promise<{ success: boolean }> {
    return this.filingsService.approve(id, dto, req.userContext.userId);
  }
}
