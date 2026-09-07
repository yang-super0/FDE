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
  FieldPermissionCatalogResponse,
  FieldPermissionItem,
  FieldPermissionListResponse,
  MyFieldPermissionsResponse,
} from '@shared/api.interface';
import {
  parseIdParam,
  type UserContextRequest,
} from '../finance-core/query.util';
import {
  FieldPermissionBatchBody,
  FieldPermissionUpsertBody,
  UpdateFieldPermissionBody,
} from './field-permission.dto';
import {
  FieldPermissionService,
  SENSITIVE_FIELD_CATALOG,
} from './field-permission.service';

@Controller('api/field-permissions')
export class FieldPermissionController {
  constructor(
    private readonly fieldPermissionService: FieldPermissionService,
  ) {}

  @Get()
  async list(
    @Query('roleId') roleId?: string,
    @Query('module') module?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<FieldPermissionListResponse> {
    return this.fieldPermissionService.list({ roleId, module, page, pageSize });
  }

  @Get('catalog')
  async catalog(): Promise<FieldPermissionCatalogResponse> {
    return { items: SENSITIVE_FIELD_CATALOG };
  }

  @Get('my')
  async my(
    @Req() req: UserContextRequest,
    @Query('previewRoleCode') previewRoleCode?: string,
  ): Promise<MyFieldPermissionsResponse> {
    return this.fieldPermissionService.my(
      req?.userContext?.userId ?? '',
      previewRoleCode,
    );
  }

  @NeedLogin()
  @Post()
  async create(
    @Req() req: UserContextRequest,
    @Body() body: FieldPermissionUpsertBody,
  ): Promise<FieldPermissionItem> {
    return this.fieldPermissionService.upsert(
      body,
      req.userContext.userId,
    );
  }

  @NeedLogin()
  @Post('batch')
  async batch(
    @Req() req: UserContextRequest,
    @Body() body: FieldPermissionBatchBody,
  ): Promise<number> {
    return this.fieldPermissionService.batchUpsert(
      body,
      req.userContext.userId,
    );
  }

  @NeedLogin()
  @Patch(':id')
  async update(
    @Req() req: UserContextRequest,
    @Param('id') id: string,
    @Body() body: UpdateFieldPermissionBody,
  ): Promise<FieldPermissionItem> {
    return this.fieldPermissionService.update(
      parseIdParam(id),
      body,
      req.userContext.userId,
    );
  }

  @NeedLogin()
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.fieldPermissionService.remove(parseIdParam(id));
  }
}
