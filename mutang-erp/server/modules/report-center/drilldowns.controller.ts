import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import type {
  DrilldownConfigResponse,
  DrilldownExecuteInput,
  DrilldownExecuteResult,
  DrilldownListParams,
  DrilldownListResponse,
} from '@shared/api.interface';
import { DrilldownsService } from './drilldowns.service';

interface UserContextRequest {
  userContext?: { userId?: string };
}

const resolveUserId = (req: UserContextRequest): string =>
  req.userContext?.userId ?? '';

@Controller('api/report-center/drilldowns')
export class DrilldownsController {
  constructor(private readonly drilldownsService: DrilldownsService) {}

  @Get('config')
  async getConfig(): Promise<DrilldownConfigResponse> {
    return this.drilldownsService.getConfig();
  }

  @NeedLogin()
  @Post('execute')
  async execute(
    @Body() dto: DrilldownExecuteInput,
    @Req() req: UserContextRequest,
  ): Promise<DrilldownExecuteResult> {
    return this.drilldownsService.execute(dto, resolveUserId(req));
  }

  @Get()
  async findAll(
    @Query() params: DrilldownListParams,
  ): Promise<DrilldownListResponse> {
    return this.drilldownsService.findAll(params);
  }
}
