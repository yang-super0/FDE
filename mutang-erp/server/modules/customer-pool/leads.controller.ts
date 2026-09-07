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
import { LeadsService } from './leads.service';
import type {
  AbandonLeadRequest,
  AddFollowUpRequest,
  ConvertLeadRequest,
  CreateLeadRequest,
  LeadDetail,
  LeadListResult,
  UpdateLeadRequest,
} from '@shared/api.interface';

interface UserContextRequest {
  userContext: { userId: string };
}

interface BatchCreateLeadBody {
  items: CreateLeadRequest[];
}

interface LeadsAssignBody {
  ids: string[];
  owner: string;
}

const DEFAULT_PAGE_SIZE: number = 20;
const MAX_PAGE_SIZE: number = 100;
const MAX_BATCH_SIZE: number = 500;

const parsePage = (value?: string): number => {
  const parsed: number = value ? parseInt(value, 10) : 1;
  return Number.isNaN(parsed) || parsed < 1 ? 1 : parsed;
};

const parsePageSize = (value?: string): number => {
  const parsed: number = value ? parseInt(value, 10) : DEFAULT_PAGE_SIZE;
  if (Number.isNaN(parsed) || parsed < 1) {
    return DEFAULT_PAGE_SIZE;
  }
  return Math.min(parsed, MAX_PAGE_SIZE);
};

@Controller('api/customer-pool')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get('leads')
  async list(
    @Query('leadName') leadName?: string,
    @Query('contactPerson') contactPerson?: string,
    @Query('industry') industry?: string,
    @Query('source') source?: string,
    @Query('status') status?: string,
    @Query('owner') owner?: string,
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<LeadListResult> {
    return this.leadsService.findAll({
      leadName,
      contactPerson,
      industry,
      source,
      status,
      owner,
      startTime,
      endTime,
      page: parsePage(page),
      pageSize: parsePageSize(pageSize),
    });
  }

  @NeedLogin()
  @Post('leads/batch')
  async batchCreate(
    @Req() req: UserContextRequest,
    @Body() body: BatchCreateLeadBody,
  ): Promise<{ created: number }> {
    const items: CreateLeadRequest[] = body?.items ?? [];
    if (items.length === 0) {
      throw new BadRequestException('批量导入内容不能为空');
    }
    if (items.length > MAX_BATCH_SIZE) {
      throw new BadRequestException(`单次批量导入不能超过 ${MAX_BATCH_SIZE} 条`);
    }
    const invalid: boolean = items.some(
      (item: CreateLeadRequest) => !item?.leadName?.trim(),
    );
    if (invalid) {
      throw new BadRequestException('存在线索名称为空的记录');
    }
    return this.leadsService.batchCreate(items, req.userContext.userId);
  }

  @NeedLogin()
  @Post('leads/assign')
  async assign(
    @Req() req: UserContextRequest,
    @Body() body: LeadsAssignBody,
  ): Promise<{ assigned: number }> {
    const ids: string[] = body?.ids ?? [];
    if (ids.length === 0) {
      throw new BadRequestException('请选择要分配的线索');
    }
    if (!body.owner?.trim()) {
      throw new BadRequestException('请选择线索负责人');
    }
    return this.leadsService.assign(ids, body.owner.trim(), req.userContext.userId);
  }

  @NeedLogin()
  @Post('leads')
  async create(
    @Req() req: UserContextRequest,
    @Body() dto: CreateLeadRequest,
  ): Promise<{ id: string }> {
    if (!dto?.leadName?.trim()) {
      throw new BadRequestException('线索名称不能为空');
    }
    return this.leadsService.create(dto, req.userContext.userId);
  }

  @Get('leads/:id')
  async detail(@Param('id') id: string): Promise<LeadDetail> {
    return this.leadsService.detail(id);
  }

  @NeedLogin()
  @Put('leads/:id')
  async update(
    @Req() req: UserContextRequest,
    @Param('id') id: string,
    @Body() dto: UpdateLeadRequest,
  ): Promise<{ success: boolean }> {
    return this.leadsService.update(id, dto, req.userContext.userId);
  }

  @NeedLogin()
  @Delete('leads/:id')
  async remove(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.leadsService.remove(id);
  }

  @NeedLogin()
  @Post('leads/:id/follow-up')
  async addFollowUp(
    @Req() req: UserContextRequest,
    @Param('id') id: string,
    @Body() dto: AddFollowUpRequest,
  ): Promise<{ success: boolean }> {
    if (!dto?.followUpType?.trim()) {
      throw new BadRequestException('跟进方式不能为空');
    }
    if (!dto.content?.trim()) {
      throw new BadRequestException('跟进内容不能为空');
    }
    return this.leadsService.addFollowUp(id, dto, req.userContext.userId);
  }

  @NeedLogin()
  @Post('leads/:id/convert')
  async convert(
    @Req() req: UserContextRequest,
    @Param('id') id: string,
    @Body() dto: ConvertLeadRequest,
  ): Promise<{ customerId: string }> {
    if (!dto?.customerName?.trim()) {
      throw new BadRequestException('客户名称不能为空');
    }
    return this.leadsService.convert(id, dto, req.userContext.userId);
  }

  @NeedLogin()
  @Post('leads/:id/abandon')
  async abandon(
    @Req() req: UserContextRequest,
    @Param('id') id: string,
    @Body() dto: AbandonLeadRequest,
  ): Promise<{ success: boolean }> {
    if (!dto?.reason?.trim()) {
      throw new BadRequestException('放弃原因不能为空');
    }
    return this.leadsService.abandon(id, dto, req.userContext.userId);
  }
}
