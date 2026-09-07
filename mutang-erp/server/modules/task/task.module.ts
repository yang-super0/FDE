import { Module } from '@nestjs/common';
import { MessageNotificationModule } from '../message-notification/message-notification.module';
import { OperationLogModule } from '../operation-log/operation-log.module';
import { TaskController } from './task.controller';
import { TaskService } from './task.service';

@Module({
  imports: [OperationLogModule, MessageNotificationModule],
  controllers: [TaskController],
  providers: [TaskService],
})
export class TaskModule {}
