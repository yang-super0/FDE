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
import type { Request } from 'express';
import type {
  AdminEnhanceApproveDto,
  AdminEnhanceBatchIdsDto,
  AdminEnhanceListResponse,
  AdminPurchaseRequest,
  CreateAdminPurchaseRequestDto,
  UpdateAdminPurchaseRequestDto,
} from '@shared/api.interface';
import { parseIdParam } from '../finance-core/query.util';
import { AdminPurchaseRequestsService } from './admin-purchase-requests.service';

type AdminEnhanceRequest = Request & {
  userContext: { userId: string; userName: string };
};

@Controller('api/admin-enhance/purchase-requests')
export class AdminPurchaseRequestsController {
  constructor(
    private readonly requestsService: AdminPurchaseRequestsService,
  ) {}

  @Get()
  async list(
    @Query('status') status?: string,
    @Query('department') department?: string,
    @Query('itemType') itemType?: string,
    @Query('keyword') keyword?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<AdminEnhanceListResponse<AdminPurchaseRequest>> {
    return this.requestsService.list({
      status,
      department,
      itemType,
      keyword,
      page,
      pageSize,
    });
  }

  @NeedLogin()
  @Post()
  async create(
    @Body() dto: CreateAdminPurchaseRequestDto,
  ): Promise<AdminPurchaseRequest> {
    return this.requestsService.create(dto);
  }

  @NeedLogin()
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAdminPurchaseRequestDto,
  ): Promise<AdminPurchaseRequest> {
    return this.requestsService.update(parseIdParam(id), dto);
  }

  @NeedLogin()
  @Post(':id/approve')
  async approve(
    @Param('id') id: string,
    @Body() dto: AdminEnhanceApproveDto,
    @Req() req: AdminEnhanceRequest,
  ): Promise<AdminPurchaseRequest> {
    return this.requestsService.approve(
      parseIdParam(id),
      dto,
      req.userContext?.userName ?? '',
    );
  }

  @NeedLogin()
  @Post(':id/cancel')
  async cancel(@Param('id') id: string): Promise<AdminPurchaseRequest> {
    return this.requestsService.cancel(parseIdParam(id));
  }

  @NeedLogin()
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.requestsService.remove(parseIdParam(id));
  }

  @NeedLogin()
  @Post('batch-delete')
  async batchRemove(
    @Body() dto: AdminEnhanceBatchIdsDto,
  ): Promise<{ deleted: number }> {
    return this.requestsService.batchRemove(dto?.ids);
  }
}
