import {
  BadRequestException,
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
  BatchIdsApproveRequest,
  CreateShootingExpenseRequest,
  ShootingExpense,
  ShootingExpenseListResult,
  ShootingExpenseStats,
  UpdateShootingExpenseRequest,
} from '@shared/api.interface';
import { VideoShootingExpensesService } from '../services/shooting-expenses.service';
import {
  parseIdList,
  parseIdParam,
  parsePage,
  parsePageSize,
  type UserContextRequest,
} from '@server/modules/finance-core/query.util';

/** @Query 取到的 projectId 为 string，转 number 并校验 */
const parseProjectId = (value?: string): number | undefined => {
  if (!value) {
    return undefined;
  }
  const parsed: number = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new BadRequestException('项目 ID 无效');
  }
  return parsed;
};

@Controller('api/video-core/shooting-expenses')
export class VideoShootingExpensesController {
  constructor(private readonly expensesService: VideoShootingExpensesService) {}

  @Get()
  async findAll(
    @Query('expenseNo') expenseNo?: string,
    @Query('projectId') projectId?: string,
    @Query('expenseType') expenseType?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<ShootingExpenseListResult> {
    return this.expensesService.findAll({
      expenseNo,
      projectId: parseProjectId(projectId),
      expenseType,
      status,
      startDate,
      endDate,
      page: parsePage(page),
      pageSize: parsePageSize(pageSize),
    });
  }

  /** 静态路由声明在 :id 动态路由之前 */
  @Get('stats')
  async stats(): Promise<ShootingExpenseStats> {
    return this.expensesService.stats();
  }

  @NeedLogin()
  @Post()
  async create(
    @Req() req: UserContextRequest,
    @Body() dto: CreateShootingExpenseRequest,
  ): Promise<{ id: number }> {
    const created: ShootingExpense = await this.expensesService.create(
      dto,
      req.userContext.userId,
    );
    return { id: created.id };
  }

  /** 静态路由声明在 :id 动态路由之前 */
  @NeedLogin()
  @Post('batch-approve')
  async batchApprove(
    @Req() req: UserContextRequest,
    @Body() body: BatchIdsApproveRequest,
  ): Promise<{ updated: number; skipped: number }> {
    return this.expensesService.batchApprove(
      body,
      req.userContext.userId,
    );
  }

  @Get(':id')
  async detail(@Param('id') id: string): Promise<ShootingExpense> {
    return this.expensesService.detail(parseIdParam(id));
  }

  @NeedLogin()
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateShootingExpenseRequest,
  ): Promise<{ success: boolean }> {
    return this.expensesService.update(parseIdParam(id), dto);
  }

  @NeedLogin()
  @Post(':id/reimburse')
  async reimburse(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.expensesService.reimburse(parseIdParam(id));
  }

  @NeedLogin()
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.expensesService.remove(parseIdParam(id));
  }
}
