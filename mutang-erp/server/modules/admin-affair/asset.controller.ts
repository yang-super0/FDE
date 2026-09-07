import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import type {
  Asset,
  AssetStatus,
  AssetSummary,
  PageResult,
} from '@shared/api.interface';
import { AdminAffairService } from './admin-affair.service';
import { CreateAssetDto } from './dto/admin-affair.dto';

interface UserContextRequest {
  userContext: { userId: string };
}

const ASSET_STATUSES: AssetStatus[] = ['in_stock', 'in_use', 'repairing'];

@Controller('api/assets')
export class AssetController {
  constructor(private readonly adminAffairService: AdminAffairService) {}

  @Get('summary')
  async getSummary(): Promise<AssetSummary> {
    return this.adminAffairService.getAssetSummary();
  }

  @Get()
  async list(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<PageResult<Asset>> {
    const pageParam: number = Math.max(parseInt(page ?? '1', 10) || 1, 1);
    const pageSizeParam: number = Math.min(
      Math.max(parseInt(pageSize ?? '20', 10) || 20, 1),
      100,
    );
    const statusFilter: AssetStatus | undefined =
      status && ASSET_STATUSES.includes(status as AssetStatus)
        ? (status as AssetStatus)
        : undefined;
    return this.adminAffairService.listAssets({
      status: statusFilter,
      page: pageParam,
      pageSize: pageSizeParam,
    });
  }

  @NeedLogin()
  @Post()
  async create(
    @Req() req: UserContextRequest,
    @Body() dto: CreateAssetDto,
  ): Promise<{ id: string }> {
    if (!dto.name?.trim() || !dto.assetNo?.trim()) {
      throw new BadRequestException('资产名称和编号不能为空');
    }
    return this.adminAffairService.createAsset({
      name: dto.name.trim(),
      assetNo: dto.assetNo.trim(),
      status: dto.status,
      operatorId: req.userContext.userId,
    });
  }

  @NeedLogin()
  @Post(':id/claim')
  async claim(
    @Param('id') id: string,
    @Req() req: UserContextRequest,
  ): Promise<{ success: boolean }> {
    return this.adminAffairService.claimAsset(id, req.userContext.userId);
  }

  @NeedLogin()
  @Post(':id/return')
  async returnAsset(
    @Param('id') id: string,
    @Req() req: UserContextRequest,
  ): Promise<{ success: boolean }> {
    return this.adminAffairService.returnAsset(id, req.userContext.userId);
  }
}
