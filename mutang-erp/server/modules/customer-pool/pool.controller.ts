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
import { PoolService } from './pool.service';
import type {
  CreatePoolLeadRequest,
  PoolAnalytics,
  PoolAssignRequest,
  PoolLeadListResult,
  UpdatePoolLeadRequest,
} from '@shared/api.interface';

interface UserContextRequest {
  userContext: { userId: string };
}

interface BatchCreatePoolBody {
  items: CreatePoolLeadRequest[];
}

interface BatchClaimBody {
  ids: string[];
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
export class PoolController {
  constructor(private readonly poolService: PoolService) {}

  @Get('pool/analytics')
  async analytics(): Promise<PoolAnalytics> {
    return this.poolService.analytics();
  }

  @Get('pool')
  async list(
    @Query('subjectName') subjectName?: string,
    @Query('leadLevel') leadLevel?: string,
    @Query('industry1') industry1?: string,
    @Query('industry2') industry2?: string,
    @Query('status') status?: string,
    @Query('createdBy') createdBy?: string,
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<PoolLeadListResult> {
    return this.poolService.findAll({
      subjectName,
      leadLevel,
      industry1,
      industry2,
      status,
      createdBy,
      startTime,
      endTime,
      page: parsePage(page),
      pageSize: parsePageSize(pageSize),
    });
  }

  @NeedLogin()
  @Post('pool/batch')
  async batchCreate(
    @Req() req: UserContextRequest,
    @Body() body: BatchCreatePoolBody,
  ): Promise<{ created: number }> {
    const items: CreatePoolLeadRequest[] = body?.items ?? [];
    if (items.length === 0) {
      throw new BadRequestException('批量导入内容不能为空');
    }
    if (items.length > MAX_BATCH_SIZE) {
      throw new BadRequestException(`单次批量导入不能超过 ${MAX_BATCH_SIZE} 条`);
    }
    const invalid: boolean = items.some(
      (item: CreatePoolLeadRequest) => !item?.subjectName?.trim(),
    );
    if (invalid) {
      throw new BadRequestException('存在主体名称为空的记录');
    }
    return this.poolService.batchCreate(items, req.userContext.userId);
  }

  @NeedLogin()
  @Post('pool/claim')
  async batchClaim(
    @Req() req: UserContextRequest,
    @Body() body: BatchClaimBody,
  ): Promise<{ claimed: number }> {
    const ids: string[] = body?.ids ?? [];
    if (ids.length === 0) {
      throw new BadRequestException('请选择要领取的客资');
    }
    return this.poolService.batchClaim(ids, req.userContext.userId);
  }

  @NeedLogin()
  @Post('pool/assign')
  async assign(@Body() dto: PoolAssignRequest): Promise<{ assigned: number }> {
    if (!dto?.ids || dto.ids.length === 0) {
      throw new BadRequestException('请选择要分配的客资');
    }
    if (!dto.assignee?.trim()) {
      throw new BadRequestException('请选择分配对象');
    }
    return this.poolService.assign(dto);
  }

  @NeedLogin()
  @Post('pool/auto-assign')
  async autoAssign(): Promise<{ assigned: number }> {
    return this.poolService.autoAssign();
  }

  @NeedLogin()
  @Post('pool')
  async create(
    @Req() req: UserContextRequest,
    @Body() dto: CreatePoolLeadRequest,
  ): Promise<{ id: string }> {
    if (!dto?.subjectName?.trim()) {
      throw new BadRequestException('主体名称不能为空');
    }
    return this.poolService.create(dto, req.userContext.userId);
  }

  @NeedLogin()
  @Put('pool/:id')
  async update(
    @Req() req: UserContextRequest,
    @Param('id') id: string,
    @Body() dto: UpdatePoolLeadRequest,
  ): Promise<{ success: boolean }> {
    return this.poolService.update(id, dto, req.userContext.userId);
  }

  @NeedLogin()
  @Delete('pool/:id')
  async remove(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.poolService.remove(id);
  }

  @NeedLogin()
  @Post('pool/:id/claim')
  async claim(
    @Req() req: UserContextRequest,
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    return this.poolService.claim(id, req.userContext.userId);
  }

  @NeedLogin()
  @Post('pool/:id/invalidate')
  async invalidate(
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    return this.poolService.invalidate(id);
  }

  @NeedLogin()
  @Post('pool/:id/restore')
  async restore(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.poolService.restore(id);
  }
}
