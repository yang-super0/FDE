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
  MyTodo,
  MyTodoBatchActionDto,
  MyTodoCreateDto,
  MyTodoListParams,
  MyTodoSummary,
  TaskEnhanceListResponse,
} from '@shared/api.interface';
import { parseIdParam } from '../finance-core/query.util';
import { MyTodosService } from './my-todos.service';
import {
  resolveTaskEnhanceUserId,
  type TaskEnhanceUserContextRequest,
} from './task-enhance-shared.util';

@Controller('api/task-enhance/my-todos')
export class MyTodosController {
  constructor(private readonly todosService: MyTodosService) {}

  @Get()
  async list(
    @Query('todoType') todoType?: string,
    @Query('sourceModule') sourceModule?: string,
    @Query('priority') priority?: string,
    @Query('status') status?: string,
    @Query('assignee') assignee?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<TaskEnhanceListResponse<MyTodo>> {
    const params: MyTodoListParams = {
      todoType,
      sourceModule,
      priority,
      status,
      assignee,
      sortBy,
      sortOrder,
      page,
      pageSize,
    };
    return this.todosService.list(params);
  }

  @Get('summary')
  async summary(): Promise<MyTodoSummary> {
    return this.todosService.summary();
  }

  @NeedLogin()
  @Post()
  async create(
    @Body() dto: MyTodoCreateDto,
    @Req() req: TaskEnhanceUserContextRequest,
  ): Promise<MyTodo> {
    return this.todosService.create(dto, resolveTaskEnhanceUserId(req));
  }

  @NeedLogin()
  @Post('batch-action')
  async batchAction(
    @Body() dto: MyTodoBatchActionDto,
    @Req() req: TaskEnhanceUserContextRequest,
  ): Promise<{ updated: number }> {
    const updated: number = await this.todosService.batchAction(
      dto,
      resolveTaskEnhanceUserId(req),
    );
    return { updated };
  }

  @NeedLogin()
  @Patch(':id/complete')
  async complete(
    @Param('id') id: string,
    @Req() req: TaskEnhanceUserContextRequest,
  ): Promise<MyTodo> {
    return this.todosService.complete(
      parseIdParam(id),
      resolveTaskEnhanceUserId(req),
    );
  }

  @NeedLogin()
  @Patch(':id/ignore')
  async ignore(
    @Param('id') id: string,
    @Req() req: TaskEnhanceUserContextRequest,
  ): Promise<MyTodo> {
    return this.todosService.ignore(
      parseIdParam(id),
      resolveTaskEnhanceUserId(req),
    );
  }

  @NeedLogin()
  @Patch(':id/reopen')
  async reopen(
    @Param('id') id: string,
    @Req() req: TaskEnhanceUserContextRequest,
  ): Promise<MyTodo> {
    return this.todosService.reopen(
      parseIdParam(id),
      resolveTaskEnhanceUserId(req),
    );
  }

  @NeedLogin()
  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @Req() req: TaskEnhanceUserContextRequest,
  ): Promise<{ success: boolean }> {
    return this.todosService.remove(
      parseIdParam(id),
      resolveTaskEnhanceUserId(req),
    );
  }
}
