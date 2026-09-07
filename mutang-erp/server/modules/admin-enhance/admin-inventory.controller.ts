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
  AdminEnhanceBatchIdsDto,
  AdminEnhanceInventoryStats,
  AdminEnhanceListResponse,
  AdminInventoryItem,
  CreateAdminInventoryItemDto,
  UpdateAdminInventoryItemDto,
} from '@shared/api.interface';
import { parseIdList, parseIdParam } from '../finance-core/query.util';
import { AdminInventoryService } from './admin-inventory.service';

@Controller('api/admin-enhance/inventory')
export class AdminInventoryController {
  constructor(private readonly inventoryService: AdminInventoryService) {}

  @Get()
  async list(
    @Query('itemType') itemType?: string,
    @Query('status') status?: string,
    @Query('location') location?: string,
    @Query('keyword') keyword?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<AdminEnhanceListResponse<AdminInventoryItem>> {
    return this.inventoryService.list({
      itemType,
      status,
      location,
      keyword,
      page,
      pageSize,
    });
  }

  @Get('stats')
  async stats(): Promise<AdminEnhanceInventoryStats> {
    return this.inventoryService.stats();
  }

  @NeedLogin()
  @Post()
  async create(
    @Body() dto: CreateAdminInventoryItemDto,
  ): Promise<AdminInventoryItem> {
    return this.inventoryService.create(dto);
  }

  @NeedLogin()
  @Post('batch-delete')
  async batchDelete(
    @Body() body: AdminEnhanceBatchIdsDto,
  ): Promise<{ deleted: number }> {
    return {
      deleted: await this.inventoryService.batchRemove(
        parseIdList(body?.ids),
      ),
    };
  }

  @NeedLogin()
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAdminInventoryItemDto,
  ): Promise<AdminInventoryItem> {
    return this.inventoryService.update(parseIdParam(id), dto);
  }

  @NeedLogin()
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.inventoryService.remove(parseIdParam(id));
  }
}
