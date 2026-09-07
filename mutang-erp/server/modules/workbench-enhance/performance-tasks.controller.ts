import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import type { Request } from 'express';
import type {
  ConfirmPerformanceTaskRequest,
  CreatePerformanceTaskRequest,
  PerformanceTask,
  PerformanceTaskListResult,
  PerformanceTaskSummary,
  RejectPerformanceTaskRequest,
  UpdatePerformanceTaskRequest,
} from '@shared/api.interface';
import { PerformanceTasksService } from './performance-tasks.service';

interface RequestWithUserContext extends Request {
  userContext: { userId: string; userName: string };
}

@Controller('api/performance-tasks')
export class PerformanceTasksController {
  constructor(private readonly tasksService: PerformanceTasksService) {}

  private userContext(req: Request): { userId: string; userName: string } {
    return {
      userId: req.userContext.userId,
      userName: req.userContext.userName,
    };
  }

  @Get()
  async findAll(
    @Req() req: Request,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
    @Query('department') department?: string,
    @Query('keyword') keyword?: string,
  ): Promise<PerformanceTaskListResult> {
    return this.tasksService.findAll(
      {
        page: Number(page ?? 1) || 1,
        pageSize: Number(pageSize ?? 10) || 10,
        status: status || undefined,
        department: department || undefined,
        keyword: keyword || undefined,
      },
      this.userContext(req),
    );
  }

  @Get('summary')
  async summary(@Req() req: Request): Promise<PerformanceTaskSummary> {
    return this.tasksService.summary(this.userContext(req));
  }

  @NeedLogin()
  @Post()
  async create(
    @Req() req: Request,
    @Body() dto: CreatePerformanceTaskRequest,
  ): Promise<PerformanceTask> {
    return this.tasksService.create(dto, req.userContext.userId);
  }

  @Get(':id')
  async findOne(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<PerformanceTask> {
    return this.tasksService.findOne(id, this.userContext(req));
  }

  @NeedLogin()
  @Patch(':id')
  async update(
    @Req() req: RequestWithUserContext,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePerformanceTaskRequest,
  ): Promise<PerformanceTask> {
    return this.tasksService.update(
      id,
      dto,
      req.userContext.userId,
      this.userContext(req),
    );
  }

  @NeedLogin()
  @Delete(':id')
  async remove(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ id: number }> {
    return this.tasksService.remove(id, req.userContext.userId, this.userContext(req));
  }

  @NeedLogin()
  @Post(':id/confirm')
  async confirm(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ConfirmPerformanceTaskRequest,
  ): Promise<PerformanceTask> {
    return this.tasksService.confirm(
      id,
      dto,
      req.userContext.userId,
      this.userContext(req),
    );
  }

  @NeedLogin()
  @Post(':id/reject')
  async reject(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejectPerformanceTaskRequest,
  ): Promise<PerformanceTask> {
    return this.tasksService.reject(
      id,
      dto,
      req.userContext.userId,
      this.userContext(req),
    );
  }
}
