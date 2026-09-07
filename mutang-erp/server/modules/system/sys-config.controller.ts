import { Body, Controller, Get, Put, Req } from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import { SystemService } from './system.service';
import type {
  AuthedRequest,
  UpdateSystemConfigsDto,
} from './dto/system.dto';
import type { SysConfig } from '@shared/api.interface';

@Controller('api/system-configs')
export class SysConfigController {
  constructor(private readonly systemService: SystemService) {}

  @Get()
  async list(): Promise<{ items: SysConfig[] }> {
    return this.systemService.listConfigs();
  }

  @NeedLogin()
  @Put()
  async update(
    @Req() req: AuthedRequest,
    @Body() dto: UpdateSystemConfigsDto,
  ): Promise<{ success: boolean }> {
    return this.systemService.updateConfigs(
      dto.configs,
      req.userContext.userId,
    );
  }
}
