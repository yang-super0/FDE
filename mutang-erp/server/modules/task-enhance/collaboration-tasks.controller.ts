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
  CollaborationTask,
  CollaborationTaskBatchUpdateDto,
  CollaborationTaskCreateDto,
  CollaborationTaskListParams,
  CollaborationTaskStats,
  CollaborationTaskUpdateDto,
  TaskComment,
  TaskCommentCreateDto,
  TaskEnhanceListResponse,
} from '@shared/api.interface';
import { parseIdParam } from '../finance-core/query.util';
import { CollaborationTasksService } from './collaboration-tasks.service';
import { TaskCommentsService } from './task-comments.service';
import {
  resolveTaskEnhanceUserId,
  type TaskEnhanceUserContextRequest,
} from './task-enhance-shared.util';

@Controller('api/task-enhance/collaboration-tasks')
export class CollaborationTasksController {
  constructor(
    private readonly tasksService: CollaborationTasksService,
    private readonly commentsService: TaskCommentsService,
  ) {}

  @Get()
  async list(
    @Query('taskType') taskType?: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('assignee') assignee?: string,
    @Query('department') department?: string,
    @Query('keyword') keyword?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<TaskEnhanceListResponse<CollaborationTask>> {
    const params: CollaborationTaskListParams = {
      taskType,
      status,
      priority,
      assignee,
      department,
      keyword,
      sortBy,
      sortOrder,
      page,
      pageSize,
    };
    return this.tasksService.list(params);
  }

  @Get('summary')
  async summary(): Promise<CollaborationTaskStats> {
    return this.tasksService.summary();
  }

  @NeedLogin()
  @Post()
  async create(
    @Body() dto: CollaborationTaskCreateDto,
    @Req() req: TaskEnhanceUserContextRequest,
  ): Promise<CollaborationTask> {
    return this.tasksService.create(dto, resolveTaskEnhanceUserId(req));
  }

  @NeedLogin()
  @Post('batch-update')
  async batchUpdate(
    @Body() dto: CollaborationTaskBatchUpdateDto,
    @Req() req: TaskEnhanceUserContextRequest,
  ): Promise<{ updated: number }> {
    const updated: number = await this.tasksService.batchUpdate(
      dto,
      resolveTaskEnhanceUserId(req),
    );
    return { updated };
  }

  @Get(':id')
  async detail(@Param('id') id: string): Promise<CollaborationTask> {
    return this.tasksService.findById(parseIdParam(id));
  }

  @NeedLogin()
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: CollaborationTaskUpdateDto,
    @Req() req: TaskEnhanceUserContextRequest,
  ): Promise<CollaborationTask> {
    return this.tasksService.update(
      parseIdParam(id),
      dto,
      resolveTaskEnhanceUserId(req),
    );
  }

  @Get(':id/comments')
  async listComments(@Param('id') id: string): Promise<TaskComment[]> {
    return this.commentsService.list(parseIdParam(id));
  }

  @NeedLogin()
  @Post(':id/comments')
  async createComment(
    @Param('id') id: string,
    @Body() dto: TaskCommentCreateDto,
    @Req() req: TaskEnhanceUserContextRequest,
  ): Promise<TaskComment> {
    return this.commentsService.create(
      parseIdParam(id),
      dto,
      resolveTaskEnhanceUserId(req),
    );
  }

  @NeedLogin()
  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @Req() req: TaskEnhanceUserContextRequest,
  ): Promise<{ success: boolean }> {
    return this.tasksService.remove(
      parseIdParam(id),
      resolveTaskEnhanceUserId(req),
    );
  }
}
