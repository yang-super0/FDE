import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import type {
  AdTransfer,
  AdTransferListResult,
  ApproveTransferRequest,
  CreateAdTransferRequest,
} from '@shared/api.interface';
import { TransfersService } from '../services/transfers.service';
import {
  parsePage,
  parsePageSize,
  type UserContextRequest,
} from '../query.util';

@Controller('api/ad-business')
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  @Get('transfers')
  async findAll(
    @Query('transferNo') transferNo?: string,
    @Query('accountName') accountName?: string,
    @Query('fromSubject') fromSubject?: string,
    @Query('toSubject') toSubject?: string,
    @Query('status') status?: string,
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<AdTransferListResult> {
    return this.transfersService.findAll({
      transferNo,
      accountName,
      fromSubject,
      toSubject,
      status,
      startTime,
      endTime,
      page: parsePage(page),
      pageSize: parsePageSize(pageSize),
    });
  }

  @NeedLogin()
  @Post('transfers')
  async create(
    @Req() req: UserContextRequest,
    @Body() dto: CreateAdTransferRequest,
  ): Promise<{ id: string }> {
    return this.transfersService.create(dto, req.userContext.userId);
  }

  @Get('transfers/:id')
  async detail(@Param('id') id: string): Promise<AdTransfer> {
    return this.transfersService.detail(id);
  }

  @NeedLogin()
  @Delete('transfers/:id')
  async remove(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.transfersService.remove(id);
  }

  @NeedLogin()
  @Post('transfers/:id/approve')
  async approve(
    @Req() req: UserContextRequest,
    @Param('id') id: string,
    @Body() dto: ApproveTransferRequest,
  ): Promise<{ success: boolean }> {
    return this.transfersService.approve(id, dto, req.userContext.userId);
  }
}
