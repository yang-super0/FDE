import {
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
  CreateOutsourcingVendorRequest,
  OutsourcingVendor,
  OutsourcingVendorListResult,
  UpdateOutsourcingVendorRequest,
} from '@shared/api.interface';
import { VideoVendorsService } from '../services/vendors.service';
import {
  parseIdParam,
  parsePage,
  parsePageSize,
} from '@server/modules/finance-core/query.util';

@Controller('api/video-core/vendors')
export class VideoVendorsController {
  constructor(private readonly vendorsService: VideoVendorsService) {}

  @Get()
  async findAll(
    @Query('vendorName') vendorName?: string,
    @Query('vendorType') vendorType?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<OutsourcingVendorListResult> {
    return this.vendorsService.findAll({
      vendorName,
      vendorType,
      status,
      page: parsePage(page),
      pageSize: parsePageSize(pageSize),
    });
  }

  @NeedLogin()
  @Post()
  async create(
    @Body() dto: CreateOutsourcingVendorRequest,
  ): Promise<{ id: number }> {
    const created: OutsourcingVendor = await this.vendorsService.create(dto);
    return { id: created.id };
  }

  @Get(':id')
  async detail(@Param('id') id: string): Promise<OutsourcingVendor> {
    return this.vendorsService.detail(parseIdParam(id));
  }

  @NeedLogin()
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateOutsourcingVendorRequest,
  ): Promise<OutsourcingVendor> {
    return this.vendorsService.update(parseIdParam(id), dto);
  }

  @NeedLogin()
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.vendorsService.remove(parseIdParam(id));
  }
}
