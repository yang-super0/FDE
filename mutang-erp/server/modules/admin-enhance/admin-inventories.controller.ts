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
  AdminEnhanceCheckSubmitDto,
  AdminEnhanceListResponse,
  AdminInventoryCheck,
  CreateAdminInventoryCheckDto,
  InventoryCheckDetailListResponse,
  UpdateAdminInventoryCheckDto,
} from '@shared/api.interface';
import { parseIdParam } from '../finance-core/query.util';
import {
  AdminInventoryChecksService,
} from './admin-inventories.service';

@Controller('api/admin-enhance/inventory-checks')
export class AdminInventoryChecksController {
  constructor(
    private readonly inventoryChecksService: AdminInventoryChecksService,
  ) {}

  @Get()
  async list(
    @Query('department') department?: string,
    @Query('status') status?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('keyword') keyword?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<AdminEnhanceListResponse<AdminInventoryCheck>> {
    return this.inventoryChecksService.list({
      department,
      status,
      dateFrom,
      dateTo,
      keyword,
      page,
      pageSize,
    });
  }

  @NeedLogin()
  @Post()
  async create(
    @Body() dto: CreateAdminInventoryCheckDto,
  ): Promise<AdminInventoryCheck> {
    return this.inventoryChecksService.create(dto);
  }

  @NeedLogin()
  @Post('batch-delete')
  async batchDelete(
    @Body() body: AdminEnhanceBatchIdsDto,
  ): Promise<{ deleted: number }> {
    return { deleted: await this.inventoryChecksService.batchDelete(body?.ids) };
  }

  @NeedLogin()
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAdminInventoryCheckDto,
  ): Promise<AdminInventoryCheck> {
    return this.inventoryChecksService.update(parseIdParam(id), dto);
  }

  @Get(':id/details')
  async getDetails(
    @Param('id') id: string,
  ): Promise<InventoryCheckDetailListResponse> {
    return this.inventoryChecksService.getDetails(parseIdParam(id));
  }

  @NeedLogin()
  @Post(':id/details')
  async submitDetails(
    @Param('id') id: string,
    @Body() dto: AdminEnhanceCheckSubmitDto,
  ): Promise<InventoryCheckDetailListResponse> {
    return this.inventoryChecksService.submitDetails(parseIdParam(id), dto);
  }

  @NeedLogin()
  @Post(':id/complete')
  async complete(
    @Param('id') id: string,
  ): Promise<AdminInventoryCheck> {
    return this.inventoryChecksService.complete(parseIdParam(id));
  }

  @NeedLogin()
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.inventoryChecksService.remove(parseIdParam(id));
  }
}
