import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import type { Opportunity, OpportunityStage } from '@shared/api.interface';
import { OpportunityService } from './opportunity.service';
import {
  isOpportunityStage,
  requireUuid,
  validateOpportunityPayload,
  type UserContextRequest,
} from './customer.dto';

@Controller('api/opportunities')
export class OpportunityController {
  constructor(private readonly opportunityService: OpportunityService) {}

  @Get()
  async list(
    @Query('stage') stage?: string,
  ): Promise<{ items: Opportunity[] }> {
    if (stage !== undefined && !isOpportunityStage(stage)) {
      throw new BadRequestException('商机阶段无效');
    }
    const validStage: OpportunityStage | undefined = isOpportunityStage(stage)
      ? stage
      : undefined;
    return this.opportunityService.list(validStage);
  }

  @NeedLogin()
  @Post()
  async create(
    @Req() req: UserContextRequest,
    @Body() body: Record<string, unknown>,
  ): Promise<{ id: string }> {
    const payload = validateOpportunityPayload(body);
    return this.opportunityService.create(payload, req.userContext.userId);
  }

  @NeedLogin()
  @Patch(':id/stage')
  async updateStage(
    @Req() req: UserContextRequest,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ): Promise<{ success: boolean }> {
    const opportunityId: string = requireUuid(id, '商机ID');
    if (!isOpportunityStage(body.stage)) {
      throw new BadRequestException('商机阶段无效');
    }
    const stage: OpportunityStage = body.stage;
    return this.opportunityService.updateStage(
      opportunityId,
      stage,
      req.userContext.userId,
    );
  }
}
