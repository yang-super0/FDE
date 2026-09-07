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
  AdminEnhanceBatchIdsDto,
  AdminEnhanceListResponse,
  AdminInbound,
  CreateAdminInboundDto,
  UpdateAdminInboundDto,
} from '@shared/api.interface';
import { parseIdParam } from '../finance-core/query.util';
import { AdminInboundsService } from './admin-inbounds.service';

interface AdminUserContextRequest {
  userContext?: { userName?: string };
}

@Controller('api/admin-enhance/inbounds')
export class AdminInboundsController {
  constructor(private readonly inboundsService: AdminInboundsService) {}

  @Get()
  async list(
    @Query('supplierName') supplierName?: string,
    @Query('status') status?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('keyword') keyword?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<AdminEnhanceListResponse<AdminInbound>> {
    return this.inboundsService.list({
      supplierName,
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
  async create(@Body() dto: CreateAdminInboundDto): Promise<AdminInbound> {
    return this.inboundsService.create(dto);
  }

  @NeedLogin()
  @Post('batch-delete')
  async batchDelete(
    @Body() body: AdminEnhanceBatchIdsDto,
  ): Promise<{ deleted: number }> {
    return { deleted: await this.inboundsService.batchDelete(body?.ids) };
  }

  @NeedLogin()
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAdminInboundDto,
  ): Promise<AdminInbound> {
    return this.inboundsService.update(parseIdParam(id), dto);
  }

  @NeedLogin()
  @Post(':id/confirm')
  async confirm(
    @Param('id') id: string,
    @Req() req: AdminUserContextRequest,
  ): Promise<AdminInbound> {
    return this.inboundsService.confirm(
      parseIdParam(id),
      req.userContext?.userName ?? '',
    );
  }

  @NeedLogin()
  @Post(':id/cancel')
  async cancel(@Param('id') id: string): Promise<AdminInbound> {
    return this.inboundsService.cancel(parseIdParam(id));
  }

  @NeedLogin()
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.inboundsService.remove(parseIdParam(id));
  }
}
