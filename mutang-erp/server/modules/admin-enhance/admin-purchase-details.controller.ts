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
  AdminEnhanceReceiveDto,
  AdminPurchaseDetail,
  CreateAdminPurchaseDetailDto,
  UpdateAdminPurchaseDetailDto,
} from '@shared/api.interface';
import { parseIdParam } from '../finance-core/query.util';
import { AdminPurchaseDetailsService } from './admin-purchase-details.service';

@Controller('api/admin-enhance/purchase-details')
export class AdminPurchaseDetailsController {
  constructor(private readonly detailsService: AdminPurchaseDetailsService) {}

  @Get()
  async list(
    @Query('orderId') orderId?: string,
    @Query('status') status?: string,
    @Query('keyword') keyword?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<AdminEnhanceListResponse<AdminPurchaseDetail>> {
    return this.detailsService.list({
      orderId,
      status,
      keyword,
      page,
      pageSize,
    });
  }

  @NeedLogin()
  @Post()
  async create(
    @Body() dto: CreateAdminPurchaseDetailDto,
  ): Promise<AdminPurchaseDetail> {
    return this.detailsService.create(dto);
  }

  @NeedLogin()
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAdminPurchaseDetailDto,
  ): Promise<AdminPurchaseDetail> {
    return this.detailsService.update(parseIdParam(id), dto);
  }

  @NeedLogin()
  @Post(':id/receive')
  async receive(
    @Param('id') id: string,
    @Body() dto: AdminEnhanceReceiveDto,
  ): Promise<AdminPurchaseDetail> {
    return this.detailsService.receive(parseIdParam(id), dto);
  }

  @NeedLogin()
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.detailsService.remove(parseIdParam(id));
  }

  @NeedLogin()
  @Post('batch-delete')
  async batchRemove(
    @Body() dto: AdminEnhanceBatchIdsDto,
  ): Promise<{ deleted: number }> {
    return this.detailsService.batchRemove(dto?.ids);
  }
}
