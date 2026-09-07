import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import type {
  AdApplicationDetail,
  AdApplicationListResult,
  ApproveApplicationRequest,
  CreateAdApplicationRequest,
  UpdateAdApplicationRequest,
} from '@shared/api.interface';
import { ApplicationsService } from '../services/applications.service';
import {
  parsePage,
  parsePageSize,
  type UserContextRequest,
} from '../query.util';

const MAX_BATCH_ITEMS: number = 500;

interface BatchCreateApplicationsBody {
  items: CreateAdApplicationRequest[];
}

interface BatchIdsBody {
  ids: string[];
}

@Controller('api/ad-business')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Get('applications')
  async findAll(
    @Query('applicationNo') applicationNo?: string,
    @Query('groupName') groupName?: string,
    @Query('subjectName') subjectName?: string,
    @Query('platform') platform?: string,
    @Query('portType') portType?: string,
    @Query('status') status?: string,
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<AdApplicationListResult> {
    return this.applicationsService.findAll({
      applicationNo,
      groupName,
      subjectName,
      platform,
      portType,
      status,
      startTime,
      endTime,
      page: parsePage(page),
      pageSize: parsePageSize(pageSize),
    });
  }

  @NeedLogin()
  @Post('applications')
  async create(
    @Req() req: UserContextRequest,
    @Body() dto: CreateAdApplicationRequest,
  ): Promise<{ id: string }> {
    return this.applicationsService.create(dto, req.userContext.userId);
  }

  @NeedLogin()
  @Post('applications/batch')
  async batchCreate(
    @Req() req: UserContextRequest,
    @Body() body: BatchCreateApplicationsBody,
  ): Promise<{ created: number }> {
    if (!Array.isArray(body?.items) || body.items.length === 0) {
      throw new BadRequestException('请提供要创建的开户申请');
    }
    if (body.items.length > MAX_BATCH_ITEMS) {
      throw new BadRequestException(
        `单次批量最多 ${String(MAX_BATCH_ITEMS)} 条`,
      );
    }
    return this.applicationsService.batchCreate(
      body.items,
      req.userContext.userId,
    );
  }

  @NeedLogin()
  @Post('applications/batch-open')
  async batchOpen(
    @Req() req: UserContextRequest,
    @Body() body: BatchIdsBody,
  ): Promise<{ opened: number }> {
    if (!Array.isArray(body?.ids) || body.ids.length === 0) {
      throw new BadRequestException('请提供要开户的申请 ID');
    }
    if (body.ids.length > MAX_BATCH_ITEMS) {
      throw new BadRequestException(
        `单次批量最多 ${String(MAX_BATCH_ITEMS)} 条`,
      );
    }
    return this.applicationsService.batchOpen(body.ids, req.userContext.userId);
  }

  @Get('applications/:id')
  async detail(@Param('id') id: string): Promise<AdApplicationDetail> {
    return this.applicationsService.detail(id);
  }

  @NeedLogin()
  @Put('applications/:id')
  async update(
    @Req() req: UserContextRequest,
    @Param('id') id: string,
    @Body() dto: UpdateAdApplicationRequest,
  ): Promise<{ success: boolean }> {
    return this.applicationsService.update(id, dto, req.userContext.userId);
  }

  @NeedLogin()
  @Delete('applications/:id')
  async remove(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.applicationsService.remove(id);
  }

  @NeedLogin()
  @Post('applications/:id/approve')
  async approve(
    @Req() req: UserContextRequest,
    @Param('id') id: string,
    @Body() dto: ApproveApplicationRequest,
  ): Promise<{ success: boolean }> {
    return this.applicationsService.approve(id, dto, req.userContext.userId);
  }
}
