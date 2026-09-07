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
import { SystemService } from './system.service';
import type {
  AuthedRequest,
  CreateSystemUserDto,
  UpdateSystemUserDto,
  UpdateSystemUserStatusDto,
} from './dto/system.dto';
import type { PageResult, SystemUser } from '@shared/api.interface';

@Controller('api/system-users')
export class SystemUserController {
  constructor(private readonly systemService: SystemService) {}

  @Get()
  async list(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<PageResult<SystemUser>> {
    return this.systemService.listSystemUsers(
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 20,
    );
  }

  @NeedLogin()
  @Post()
  async create(
    @Req() req: AuthedRequest,
    @Body() dto: CreateSystemUserDto,
  ): Promise<{ id: string }> {
    return this.systemService.createSystemUser(dto, req.userContext.userId);
  }

  @NeedLogin()
  @Patch(':id')
  async update(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateSystemUserDto,
  ): Promise<{ success: boolean }> {
    return this.systemService.updateSystemUser(
      id,
      dto,
      req.userContext.userId,
    );
  }

  @NeedLogin()
  @Delete(':id')
  async remove(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    return this.systemService.deleteSystemUser(id, req.userContext.userId);
  }

  @NeedLogin()
  @Patch(':id/status')
  async updateStatus(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateSystemUserStatusDto,
  ): Promise<{ success: boolean }> {
    return this.systemService.updateSystemUserStatus(
      id,
      dto.status,
      req.userContext.userId,
    );
  }
}
