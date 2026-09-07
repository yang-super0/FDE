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
  AdminEnhanceListResponse,
  AdminEnhanceShipDto,
  AdminPurchaseOrder,
  CreateAdminPurchaseOrderDto,
  UpdateAdminPurchaseOrderDto,
} from '@shared/api.interface';
import { parseIdParam } from '../finance-core/query.util';
import { AdminPurchaseOrdersService } from './admin-purchase-orders.service';

@Controller('api/admin-enhance/purchase-orders')
export class AdminPurchaseOrdersController {
  constructor(private readonly ordersService: AdminPurchaseOrdersService) {}

  @Get()
  async list(
    @Query('supplierName') supplierName?: string,
    @Query('status') status?: string,
    @Query('keyword') keyword?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<AdminEnhanceListResponse<AdminPurchaseOrder>> {
    return this.ordersService.list({
      supplierName,
      status,
      keyword,
      page,
      pageSize,
    });
  }

  @NeedLogin()
  @Post()
  async create(
    @Body() dto: CreateAdminPurchaseOrderDto,
  ): Promise<AdminPurchaseOrder> {
    return this.ordersService.create(dto);
  }

  @NeedLogin()
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAdminPurchaseOrderDto,
  ): Promise<AdminPurchaseOrder> {
    return this.ordersService.update(parseIdParam(id), dto);
  }

  @NeedLogin()
  @Post(':id/ship')
  async ship(
    @Param('id') id: string,
    @Body() dto: AdminEnhanceShipDto,
  ): Promise<AdminPurchaseOrder> {
    return this.ordersService.ship(parseIdParam(id), dto);
  }

  @NeedLogin()
  @Post(':id/cancel')
  async cancel(@Param('id') id: string): Promise<AdminPurchaseOrder> {
    return this.ordersService.cancel(parseIdParam(id));
  }

  @NeedLogin()
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.ordersService.remove(parseIdParam(id));
  }

  @NeedLogin()
  @Post('batch-delete')
  async batchRemove(
    @Body() dto: AdminEnhanceBatchIdsDto,
  ): Promise<{ deleted: number }> {
    return this.ordersService.batchRemove(dto?.ids);
  }
}
