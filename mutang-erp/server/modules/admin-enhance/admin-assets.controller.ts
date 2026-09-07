import {
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
  AdminAsset,
  AdminEnhanceAssetStats,
  AdminEnhanceBatchIdsDto,
  AdminEnhanceListResponse,
  CreateAdminAssetDto,
  UpdateAdminAssetDto,
} from '@shared/api.interface';
import { parseIdList, parseIdParam } from '../finance-core/query.util';
import { AdminAssetsService } from './admin-assets.service';

@Controller('api/admin-enhance/assets')
export class AdminAssetsController {
  constructor(private readonly assetsService: AdminAssetsService) {}

  @Get()
  async list(
    @Query('assetType') assetType?: string,
    @Query('department') department?: string,
    @Query('status') status?: string,
    @Query('keyword') keyword?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<AdminEnhanceListResponse<AdminAsset>> {
    return this.assetsService.list({
      assetType,
      department,
      status,
      keyword,
      page,
      pageSize,
    });
  }

  @Get('stats')
  async stats(): Promise<AdminEnhanceAssetStats> {
    return this.assetsService.stats();
  }

  @NeedLogin()
  @Post()
  async create(@Body() dto: CreateAdminAssetDto): Promise<AdminAsset> {
    return this.assetsService.create(dto);
  }

  @NeedLogin()
  @Post('batch-delete')
  async batchDelete(
    @Body() body: AdminEnhanceBatchIdsDto,
  ): Promise<{ deleted: number }> {
    return {
      deleted: await this.assetsService.batchRemove(parseIdList(body?.ids)),
    };
  }

  @NeedLogin()
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAdminAssetDto,
  ): Promise<AdminAsset> {
    return this.assetsService.update(parseIdParam(id), dto);
  }

  @NeedLogin()
  @Post(':id/inventory-check')
  async inventoryCheck(@Param('id') id: string): Promise<AdminAsset> {
    return this.assetsService.inventoryCheck(parseIdParam(id));
  }

  @NeedLogin()
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.assetsService.remove(parseIdParam(id));
  }
}
