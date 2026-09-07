import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import type {
  CreateHrInvitationBody,
  HrBatchStatusBody,
  HrInvitation,
  HrInvitationListParams,
  HrInvitationPage,
  UpdateHrInvitationBody,
} from '@shared/api.interface';
import {
  HrInvitationsService,
  type HrInvitationStatusBody,
} from './hr-invitations.service';

const parseHrInvitationIdParam = (raw: string): number => {
  const parsed: number = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new BadRequestException('无效的邀约 ID');
  }
  return parsed;
};

@Controller('api/hr-enhance/invitations')
export class HrInvitationsController {
  constructor(private readonly invitationsService: HrInvitationsService) {}

  @Get()
  async list(
    @Query() query: HrInvitationListParams,
  ): Promise<HrInvitationPage> {
    return this.invitationsService.list(query);
  }

  @NeedLogin()
  @Post()
  async create(@Body() dto: CreateHrInvitationBody): Promise<HrInvitation> {
    return this.invitationsService.create(dto);
  }

  @NeedLogin()
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateHrInvitationBody,
  ): Promise<HrInvitation> {
    return this.invitationsService.update(
      parseHrInvitationIdParam(id),
      dto,
    );
  }

  @NeedLogin()
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.invitationsService.remove(parseHrInvitationIdParam(id));
  }

  @NeedLogin()
  @Post(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: HrInvitationStatusBody,
  ): Promise<HrInvitation> {
    return this.invitationsService.updateStatus(
      parseHrInvitationIdParam(id),
      body,
    );
  }

  @NeedLogin()
  @Post('batch-status')
  async batchStatus(
    @Body() body: HrBatchStatusBody,
  ): Promise<{ updated: number }> {
    return this.invitationsService.batchStatus(body);
  }
}
