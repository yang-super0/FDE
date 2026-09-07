import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import type {
  CreateOutsourcingProjectRequest,
  OutsourcingProject,
  OutsourcingProjectListResult,
  OutsourcingProjectStatusRequest,
  SettleOutsourcingRequest,
  VideoApproveRequest,
} from '@shared/api.interface';
import { VideoOutsourcingProjectsService } from '../services/outsourcing-projects.service';
import {
  parseIdParam,
  parsePage,
  parsePageSize,
  type UserContextRequest,
} from '@server/modules/finance-core/query.util';

const parseVendorIdParam = (value?: string): number | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const parsed: number = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new BadRequestException('无效的供应商 ID');
  }
  return parsed;
};

@Controller('api/video-core/outsourcing-projects')
export class VideoOutsourcingProjectsController {
  constructor(
    private readonly outsourcingProjectsService: VideoOutsourcingProjectsService,
  ) {}

  @Get()
  async findAll(
    @Query('projectNo') projectNo?: string,
    @Query('projectName') projectName?: string,
    @Query('vendorId') vendorId?: string,
    @Query('status') status?: string,
    @Query('settlementStatus') settlementStatus?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<OutsourcingProjectListResult> {
    return this.outsourcingProjectsService.findAll({
      projectNo,
      projectName,
      vendorId: parseVendorIdParam(vendorId),
      status,
      settlementStatus,
      page: parsePage(page),
      pageSize: parsePageSize(pageSize),
    });
  }

  @NeedLogin()
  @Post()
  async create(
    @Req() req: UserContextRequest,
    @Body() dto: CreateOutsourcingProjectRequest,
  ): Promise<{ id: number }> {
    const created: OutsourcingProject =
      await this.outsourcingProjectsService.create(
        dto,
        req.userContext.userId,
      );
    return { id: created.id };
  }

  @Get(':id')
  async detail(@Param('id') id: string): Promise<OutsourcingProject> {
    return this.outsourcingProjectsService.detail(parseIdParam(id));
  }

  @NeedLogin()
  @Post(':id/approve')
  async approve(
    @Req() req: UserContextRequest,
    @Param('id') id: string,
    @Body() dto: VideoApproveRequest,
  ): Promise<OutsourcingProject> {
    return this.outsourcingProjectsService.approve(
      parseIdParam(id),
      dto,
      req.userContext.userId,
    );
  }

  @NeedLogin()
  @Post(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: OutsourcingProjectStatusRequest,
  ): Promise<OutsourcingProject> {
    return this.outsourcingProjectsService.updateStatus(
      parseIdParam(id),
      dto,
    );
  }

  @NeedLogin()
  @Post(':id/settle')
  async settle(
    @Param('id') id: string,
    @Body() dto: SettleOutsourcingRequest,
  ): Promise<OutsourcingProject> {
    return this.outsourcingProjectsService.settle(parseIdParam(id), dto);
  }

  @NeedLogin()
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.outsourcingProjectsService.remove(parseIdParam(id));
  }
}
