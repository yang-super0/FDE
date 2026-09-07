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
  AdminEnhanceApproveDto,
  AdminEnhanceBatchIdsDto,
  AdminEnhanceListResponse,
  AdminRequisition,
  CreateAdminRequisitionDto,
  UpdateAdminRequisitionDto,
} from '@shared/api.interface';
import { parseIdParam } from '../finance-core/query.util';
import { AdminRequisitionsService } from './admin-requisitions.service';

interface AdminUserContextRequest {
  userContext?: { userName?: string };
}

@Controller('api/admin-enhance/requisitions')
export class AdminRequisitionsController {
  constructor(private readonly requisitionsService: AdminRequisitionsService) {}

  @Get()
  async list(
    @Query('department') department?: string,
    @Query('status') status?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('keyword') keyword?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<AdminEnhanceListResponse<AdminRequisition>> {
    return this.requisitionsService.list({
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
    @Body() dto: CreateAdminRequisitionDto,
  ): Promise<AdminRequisition> {
    return this.requisitionsService.create(dto);
  }

  @NeedLogin()
  @Post('batch-delete')
  async batchDelete(
    @Body() body: AdminEnhanceBatchIdsDto,
  ): Promise<{ deleted: number }> {
    return { deleted: await this.requisitionsService.batchDelete(body?.ids) };
  }

  @NeedLogin()
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAdminRequisitionDto,
  ): Promise<AdminRequisition> {
    return this.requisitionsService.update(parseIdParam(id), dto);
  }

  @NeedLogin()
  @Post(':id/approve')
  async approve(
    @Param('id') id: string,
    @Body() dto: AdminEnhanceApproveDto,
    @Req() req: AdminUserContextRequest,
  ): Promise<AdminRequisition> {
    return this.requisitionsService.approve(
      parseIdParam(id),
      dto,
      req.userContext?.userName ?? '',
    );
  }

  @NeedLogin()
  @Post(':id/issue')
  async issue(
    @Param('id') id: string,
    @Req() req: AdminUserContextRequest,
  ): Promise<AdminRequisition> {
    return this.requisitionsService.issue(
      parseIdParam(id),
      req.userContext?.userName ?? '',
    );
  }

  @NeedLogin()
  @Post(':id/cancel')
  async cancel(@Param('id') id: string): Promise<AdminRequisition> {
    return this.requisitionsService.cancel(parseIdParam(id));
  }

  @NeedLogin()
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.requisitionsService.remove(parseIdParam(id));
  }
}
