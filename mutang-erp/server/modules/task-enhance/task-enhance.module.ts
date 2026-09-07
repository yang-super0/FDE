import { Module } from '@nestjs/common';
import { BatchImportsController } from './batch-imports.controller';
import { BatchImportsService } from './batch-imports.service';
import { BatchExportsController } from './batch-exports.controller';
import { BatchExportsService } from './batch-exports.service';
import { MyTodosController } from './my-todos.controller';
import { MyTodosService } from './my-todos.service';
import { CollaborationTasksController } from './collaboration-tasks.controller';
import { CollaborationTasksService } from './collaboration-tasks.service';
import { TaskCommentsService } from './task-comments.service';

@Module({
  controllers: [
    BatchImportsController,
    BatchExportsController,
    MyTodosController,
    CollaborationTasksController,
  ],
  providers: [
    BatchImportsService,
    BatchExportsService,
    MyTodosService,
    CollaborationTasksService,
    TaskCommentsService,
  ],
})
export class TaskEnhanceModule {}
