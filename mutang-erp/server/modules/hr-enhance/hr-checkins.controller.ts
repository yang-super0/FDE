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
  CreateHrCheckinBody,
  HrCheckin,
  HrCheckinListParams,
  HrCheckinPage,
  HrCheckinStats,
  UpdateHrCheckinBody,
} from '@shared/api.interface';
import { parseIdParam } from '../finance-core/query.util';
import {
  HrCheckinsService,
  type HrCheckinCheckinBody,
} from './hr-checkins.service';

interface HrUserRequest {
  userContext: { userId: string };
}

@Controller('api/hr-enhance/checkins')
export class HrCheckinsController {
  constructor(private readonly checkinsService: HrCheckinsService) {}

  @Get('stats')
  async stats(): Promise<HrCheckinStats> {
    return this.checkinsService.getStats();
  }

  @Get()
  async list(
    @Query() query: HrCheckinListParams,
  ): Promise<HrCheckinPage> {
    return this.checkinsService.listCheckins(query);
  }

  @NeedLogin()
  @Post()
  async create(
    @Req() req: HrUserRequest,
    @Body() dto: CreateHrCheckinBody,
  ): Promise<HrCheckin> {
    return this.checkinsService.createCheckin(dto, req.userContext.userId);
  }

  @NeedLogin()
  @Patch(':id')
  async update(
    @Req() req: HrUserRequest,
    @Param('id') id: string,
    @Body() dto: UpdateHrCheckinBody,
  ): Promise<HrCheckin> {
    return this.checkinsService.updateCheckin(
      parseIdParam(id),
      dto,
      req.userContext.userId,
    );
  }

  @NeedLogin()
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.checkinsService.deleteCheckin(parseIdParam(id));
  }

  @NeedLogin()
  @Post(':id/checkin')
  async checkin(
    @Req() req: HrUserRequest,
    @Param('id') id: string,
    @Body() body: HrCheckinCheckinBody,
  ): Promise<HrCheckin> {
    return this.checkinsService.checkin(
      parseIdParam(id),
      body,
      req.userContext.userId,
    );
  }
}
