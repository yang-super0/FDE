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
  CommissionRuleListResult,
  CreateCommissionRuleRequest,
  UpdateCommissionRuleRequest,
} from '@shared/api.interface';
import { CommissionRulesService } from '../services/commission-rules.service';
import {
  parsePage,
  parsePageSize,
  type UserContextRequest,
} from '../query.util';

const MAX_BATCH_ITEMS: number = 500;

interface BatchStatusBody {
  ids: string[];
  status: string;
}

@Controller('api/ad-business')
export class CommissionRulesController {
  constructor(private readonly rulesService: CommissionRulesService) {}

  @Get('commission-rules')
  async findAll(
    @Query('ruleName') ruleName?: string,
    @Query('ruleType') ruleType?: string,
    @Query('platform') platform?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<CommissionRuleListResult> {
    return this.rulesService.findAll({
      ruleName,
      ruleType,
      platform,
      status,
      page: parsePage(page),
      pageSize: parsePageSize(pageSize),
    });
  }

  @NeedLogin()
  @Post('commission-rules')
  async create(
    @Req() req: UserContextRequest,
    @Body() dto: CreateCommissionRuleRequest,
  ): Promise<{ id: string }> {
    return this.rulesService.create(dto, req.userContext.userId);
  }

  @NeedLogin()
  @Post('commission-rules/batch-status')
  async batchStatus(
    @Body() body: BatchStatusBody,
  ): Promise<{ updated: number }> {
    if (!Array.isArray(body?.ids) || body.ids.length === 0) {
      throw new BadRequestException('请提供要更新的规则 ID');
    }
    if (body.ids.length > MAX_BATCH_ITEMS) {
      throw new BadRequestException(
        `单次批量最多 ${String(MAX_BATCH_ITEMS)} 条`,
      );
    }
    if (!body.status) {
      throw new BadRequestException('请提供目标状态');
    }
    return this.rulesService.batchStatus(body.ids, body.status);
  }

  @NeedLogin()
  @Put('commission-rules/:id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCommissionRuleRequest,
  ): Promise<{ success: boolean }> {
    return this.rulesService.update(id, dto);
  }

  @NeedLogin()
  @Delete('commission-rules/:id')
  async remove(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.rulesService.remove(id);
  }
}
