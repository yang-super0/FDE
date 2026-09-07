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
  SystemSetting,
  SystemSettingCreateDto,
  SystemSettingListParams,
  SystemSettingUpdateDto,
} from '@shared/api.interface';
import { parseIdParam } from '../finance-core/query.util';
import {
  resolveSystemEnhanceUserId,
  type SystemEnhanceUserContextRequest,
} from './system-enhance-shared.util';
import { SystemSettingsService } from './system-settings.service';

@Controller('api/system-enhance/settings')
export class SystemSettingsController {
  constructor(private readonly settingsService: SystemSettingsService) {}

  @Get()
  async list(
    @Query('category') category?: string,
    @Query('keyword') keyword?: string,
  ): Promise<SystemSetting[]> {
    const params: SystemSettingListParams = { category, keyword };
    return this.settingsService.list(params);
  }

  @Get(':id')
  async detail(@Param('id') id: string): Promise<SystemSetting> {
    return this.settingsService.detail(parseIdParam(id));
  }

  @NeedLogin()
  @Post()
  async create(
    @Body() dto: SystemSettingCreateDto,
    @Req() req: SystemEnhanceUserContextRequest,
  ): Promise<SystemSetting> {
    return this.settingsService.create(dto, resolveSystemEnhanceUserId(req));
  }

  @NeedLogin()
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: SystemSettingUpdateDto,
    @Req() req: SystemEnhanceUserContextRequest,
  ): Promise<SystemSetting> {
    return this.settingsService.update(
      parseIdParam(id),
      dto,
      resolveSystemEnhanceUserId(req),
    );
  }

  @NeedLogin()
  @Post(':id/reset')
  async reset(
    @Param('id') id: string,
    @Req() req: SystemEnhanceUserContextRequest,
  ): Promise<SystemSetting> {
    return this.settingsService.reset(
      parseIdParam(id),
      resolveSystemEnhanceUserId(req),
    );
  }

  @NeedLogin()
  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @Req() req: SystemEnhanceUserContextRequest,
  ): Promise<{ success: boolean }> {
    return this.settingsService.remove(
      parseIdParam(id),
      resolveSystemEnhanceUserId(req),
    );
  }
}
