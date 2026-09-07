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
  CalculateCommissionsRequest,
  VideoCommissionListResult,
  VideoCommissionStats,
} from '@shared/api.interface';
import { VideoCommissionsService } from '../services/video-commissions.service';
import {
  parseIdList,
  parseIdParam,
  parsePage,
  parsePageSize,
  type UserContextRequest,
} from '@server/modules/finance-core/query.util';

interface BatchIdsBody {
  ids: number[];
}

@Controller('api/video-core/commissions')
export class VideoCommissionsController {
  constructor(private readonly commissionsService: VideoCommissionsService) {}

  @Get()
  async findAll(
    @Query('commissionNo') commissionNo?: string,
    @Query('salesperson') salesperson?: string,
    @Query('projectManager') projectManager?: string,
    @Query('status') status?: string,
    @Query('period') period?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<VideoCommissionListResult> {
    return this.commissionsService.findAll({
      commissionNo,
      salesperson,
      projectManager,
      status,
      period,
      page: parsePage(page),
      pageSize: parsePageSize(pageSize),
    });
  }

  /** 静态路由声明在 :id 动态路由之前 */
  @Get('stats')
  async stats(): Promise<VideoCommissionStats> {
    return this.commissionsService.stats();
  }

  @NeedLogin()
  @Post('calculate')
  async calculate(
    @Req() req: UserContextRequest,
    @Body() body: CalculateCommissionsRequest,
  ): Promise<{ created: number; skipped: number }> {
    return this.commissionsService.calculate(
      body,
      req.userContext.userId,
    );
  }

  @NeedLogin()
  @Post('batch-pay')
  async batchPay(
    @Body() body: BatchIdsBody,
  ): Promise<{ updated: number; skipped: number }> {
    return this.commissionsService.batchPay(parseIdList(body?.ids));
  }

  @NeedLogin()
  @Post(':id/cancel')
  async cancel(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.commissionsService.cancel(parseIdParam(id));
  }

  @NeedLogin()
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.commissionsService.remove(parseIdParam(id));
  }
}
