import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import type {
  CurrentUserRole,
  RolePermissionItem,
  RolePermissionSaveDto,
  SystemRole,
  SystemRoleCreateDto,
  SystemRoleListParams,
  SystemRoleUpdateDto,
  RoleCopyDto,
  TaskEnhanceListResponse,
} from '@shared/api.interface';
import { parseIdParam } from '../finance-core/query.util';
import { SystemRolesService } from './system-roles.service';
import {
  resolveSystemEnhanceUserId,
  type SystemEnhanceUserContextRequest,
} from './system-enhance-shared.util';

/** 角色权限管理接口 */
@Controller('api/system-enhance/roles')
export class SystemRolesController {
  constructor(private readonly rolesService: SystemRolesService) {}

  @Get()
  async list(
    @Query('roleName') roleName?: string,
    @Query('roleCode') roleCode?: string,
    @Query('status') status?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<TaskEnhanceListResponse<SystemRole>> {
    const params: SystemRoleListParams = {
      roleName,
      roleCode,
      status,
      dateFrom,
      dateTo,
      sortBy,
      sortOrder,
      page,
      pageSize,
    };
    return this.rolesService.list(params);
  }

  /** 当前登录用户的生效角色与菜单权限（需在 :id 路由前注册） */
  @NeedLogin()
  @Get('current')
  async current(
    @Req() req: SystemEnhanceUserContextRequest,
  ): Promise<CurrentUserRole> {
    return this.rolesService.current(resolveSystemEnhanceUserId(req));
  }

  @NeedLogin()
  @Post()
  async create(
    @Body() dto: SystemRoleCreateDto,
    @Req() req: SystemEnhanceUserContextRequest,
  ): Promise<SystemRole> {
    return this.rolesService.create(dto, resolveSystemEnhanceUserId(req));
  }

  @Get(':id/permissions')
  async listPermissions(
    @Param('id') id: string,
  ): Promise<RolePermissionItem[]> {
    return this.rolesService.listPermissions(parseIdParam(id));
  }

  @NeedLogin()
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: SystemRoleUpdateDto,
    @Req() req: SystemEnhanceUserContextRequest,
  ): Promise<SystemRole> {
    return this.rolesService.update(
      parseIdParam(id),
      dto,
      resolveSystemEnhanceUserId(req),
    );
  }

  @NeedLogin()
  @Put(':id/permissions')
  async savePermissions(
    @Param('id') id: string,
    @Body() dto: RolePermissionSaveDto,
    @Req() req: SystemEnhanceUserContextRequest,
  ): Promise<{ count: number }> {
    return this.rolesService.savePermissions(
      parseIdParam(id),
      dto,
      resolveSystemEnhanceUserId(req),
    );
  }

  @NeedLogin()
  @Post(':id/copy')
  async copy(
    @Param('id') id: string,
    @Body() dto: RoleCopyDto,
    @Req() req: SystemEnhanceUserContextRequest,
  ): Promise<SystemRole> {
    return this.rolesService.copy(
      parseIdParam(id),
      dto,
      resolveSystemEnhanceUserId(req),
    );
  }

  @NeedLogin()
  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
    @Req() req: SystemEnhanceUserContextRequest,
  ): Promise<SystemRole> {
    return this.rolesService.updateStatus(
      parseIdParam(id),
      body?.status ?? '',
      resolveSystemEnhanceUserId(req),
    );
  }

  @NeedLogin()
  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @Req() req: SystemEnhanceUserContextRequest,
  ): Promise<{ success: boolean }> {
    return this.rolesService.remove(
      parseIdParam(id),
      resolveSystemEnhanceUserId(req),
    );
  }
}
