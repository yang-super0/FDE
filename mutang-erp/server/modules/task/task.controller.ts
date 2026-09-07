import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import { OperationLogService } from '../operation-log/operation-log.service';
import { CreateTaskDto, UpdateTaskStatusDto } from './task.dto';
import { TaskService } from './task.service';
import type {
  PageResult,
  Task,
  TaskDisplayStatus,
  TaskStatus,
  TaskSummary,
} from '@shared/api.interface';

interface UserContextRequest {
  userContext: { userId: string };
}

const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: '待处理',
  doing: '进行中',
  done: '已完成',
};

const isTaskDisplayStatus = (value: string): value is TaskDisplayStatus =>
  ['todo', 'doing', 'done', 'overdue'].includes(value);

@Controller('api/tasks')
export class TaskController {
  constructor(
    private readonly taskService: TaskService,
    private readonly operationLogService: OperationLogService,
  ) {}

  @Get('summary')
  async summary(): Promise<TaskSummary> {
    return this.taskService.summary();
  }

  @Get()
  async list(
    @Query('assigneeId') assigneeId?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<PageResult<Task>> {
    let statusFilter: TaskDisplayStatus | undefined;
    if (status) {
      if (!isTaskDisplayStatus(status)) {
        throw new BadRequestException('无效的状态筛选');
      }
      statusFilter = status;
    }
    return this.taskService.findAll({
      assigneeId,
      status: statusFilter,
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 20,
    });
  }

  @NeedLogin()
  @Post()
  async create(
    @Req() req: UserContextRequest,
    @Body() dto: CreateTaskDto,
  ): Promise<{ id: string }> {
    if (!dto.title || !dto.title.trim()) {
      throw new BadRequestException('任务标题不能为空');
    }
    if (!['high', 'medium', 'low'].includes(dto.priority)) {
      throw new BadRequestException('无效的任务优先级');
    }
    const operatorId: string = req.userContext.userId;
    const assigneeId: string = dto.assigneeId || operatorId;
    const result = await this.taskService.create({
      title: dto.title.trim(),
      description: dto.description ?? '',
      assigneeId,
      priority: dto.priority,
      deadline: dto.deadline,
    });
    await this.operationLogService.record({
      module: '任务中心',
      actionType: 'create',
      target: dto.title.trim(),
      operatorId,
    });
    return result;
  }

  @NeedLogin()
  @Patch(':id/status')
  async updateStatus(
    @Req() req: UserContextRequest,
    @Param('id') id: string,
    @Body() dto: UpdateTaskStatusDto,
  ): Promise<{ success: boolean }> {
    if (!['todo', 'doing', 'done'].includes(dto.status)) {
      throw new BadRequestException('无效的任务状态');
    }
    const operatorId: string = req.userContext.userId;
    const updated = await this.taskService.updateStatus(id, dto.status);
    await this.operationLogService.record({
      module: '任务中心',
      actionType: 'status_change',
      target: `${updated.title} → ${STATUS_LABEL[dto.status]}`,
      operatorId,
    });
    return { success: true };
  }
}
