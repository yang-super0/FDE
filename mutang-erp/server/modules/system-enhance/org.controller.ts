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
  OrgDepartment,
  OrgDepartmentCreateDto,
  OrgDepartmentTreeNode,
  OrgDepartmentUpdateDto,
  OrgPosition,
  OrgPositionCreateDto,
  OrgPositionUpdateDto,
  OrgSortDto,
  OrgStats,
} from '@shared/api.interface';
import { parseIdParam } from '../finance-core/query.util';
import {
  resolveSystemEnhanceUserId,
  type SystemEnhanceUserContextRequest,
} from './system-enhance-shared.util';
import { OrgService } from './org.service';

@Controller('api/system-enhance/org')
export class OrgController {
  constructor(private readonly orgService: OrgService) {}

  @Get('departments')
  async listDepartments(): Promise<OrgDepartmentTreeNode[]> {
    return this.orgService.departmentTree();
  }

  @Get('departments/flat')
  async listDepartmentsFlat(): Promise<OrgDepartment[]> {
    return this.orgService.listDepartments();
  }

  @NeedLogin()
  @Post('departments')
  async createDepartment(
    @Body() dto: OrgDepartmentCreateDto,
    @Req() req: SystemEnhanceUserContextRequest,
  ): Promise<OrgDepartment> {
    return this.orgService.createDepartment(
      dto,
      resolveSystemEnhanceUserId(req),
    );
  }

  @NeedLogin()
  @Post('departments/sort')
  async sortDepartments(
    @Body() dto: OrgSortDto,
    @Req() req: SystemEnhanceUserContextRequest,
  ): Promise<{ updated: number }> {
    return this.orgService.sortDepartments(
      dto,
      resolveSystemEnhanceUserId(req),
    );
  }

  @NeedLogin()
  @Patch('departments/:id')
  async updateDepartment(
    @Param('id') id: string,
    @Body() dto: OrgDepartmentUpdateDto,
    @Req() req: SystemEnhanceUserContextRequest,
  ): Promise<OrgDepartment> {
    return this.orgService.updateDepartment(
      parseIdParam(id),
      dto,
      resolveSystemEnhanceUserId(req),
    );
  }

  @NeedLogin()
  @Delete('departments/:id')
  async removeDepartment(
    @Param('id') id: string,
    @Req() req: SystemEnhanceUserContextRequest,
  ): Promise<{ success: boolean }> {
    return this.orgService.removeDepartment(
      parseIdParam(id),
      resolveSystemEnhanceUserId(req),
    );
  }

  @Get('positions')
  async listPositions(
    @Query('deptId') deptId?: string,
    @Query('status') status?: string,
  ): Promise<OrgPosition[]> {
    const params: { deptId?: number; status?: string } = { status };
    if (deptId !== undefined) {
      params.deptId = parseIdParam(deptId);
    }
    return this.orgService.listPositions(params);
  }

  @NeedLogin()
  @Post('positions')
  async createPosition(
    @Body() dto: OrgPositionCreateDto,
    @Req() req: SystemEnhanceUserContextRequest,
  ): Promise<OrgPosition> {
    return this.orgService.createPosition(
      dto,
      resolveSystemEnhanceUserId(req),
    );
  }

  @NeedLogin()
  @Patch('positions/:id')
  async updatePosition(
    @Param('id') id: string,
    @Body() dto: OrgPositionUpdateDto,
    @Req() req: SystemEnhanceUserContextRequest,
  ): Promise<OrgPosition> {
    return this.orgService.updatePosition(
      parseIdParam(id),
      dto,
      resolveSystemEnhanceUserId(req),
    );
  }

  @NeedLogin()
  @Delete('positions/:id')
  async removePosition(
    @Param('id') id: string,
    @Req() req: SystemEnhanceUserContextRequest,
  ): Promise<{ success: boolean }> {
    return this.orgService.removePosition(
      parseIdParam(id),
      resolveSystemEnhanceUserId(req),
    );
  }

  @Get('stats')
  async stats(): Promise<OrgStats> {
    return this.orgService.stats();
  }
}
