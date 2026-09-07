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
  AdminReturnRecord,
  CreateAdminReturnRecordDto,
  UpdateAdminReturnRecordDto,
} from '@shared/api.interface';
import { parseIdParam } from '../finance-core/query.util';
import { AdminReturnsService } from './admin-returns.service';

interface AdminUserContextRequest {
  userContext?: { userName?: string };
}

@Controller('api/admin-enhance/returns')
export class AdminReturnsController {
  constructor(private readonly returnsService: AdminReturnsService) {}

  @Get()
  async list(
    @Query('status') status?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('keyword') keyword?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<AdminEnhanceListResponse<AdminReturnRecord>> {
    return this.returnsService.list({
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
    @Body() dto: CreateAdminReturnRecordDto,
  ): Promise<AdminReturnRecord> {
    return this.returnsService.create(dto);
  }

  @NeedLogin()
  @Post('batch-delete')
  async batchDelete(
    @Body() body: AdminEnhanceBatchIdsDto,
  ): Promise<{ deleted: number }> {
    return { deleted: await this.returnsService.batchDelete(body?.ids) };
  }

  @NeedLogin()
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAdminReturnRecordDto,
  ): Promise<AdminReturnRecord> {
    return this.returnsService.update(parseIdParam(id), dto);
  }

  @NeedLogin()
  @Post(':id/confirm')
  async confirm(
    @Param('id') id: string,
    @Req() req: AdminUserContextRequest,
  ): Promise<AdminReturnRecord> {
    return this.returnsService.confirm(
      parseIdParam(id),
      req.userContext?.userName ?? '',
    );
  }

  @NeedLogin()
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.returnsService.remove(parseIdParam(id));
  }
}
