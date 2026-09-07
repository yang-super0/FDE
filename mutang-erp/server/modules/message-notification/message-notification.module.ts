import { Module } from '@nestjs/common';
import { MessageNotificationController } from './message-notification.controller';
import { MessageNotificationService } from './message-notification.service';

@Module({
  controllers: [MessageNotificationController],
  providers: [MessageNotificationService],
  exports: [MessageNotificationService],
})
export class MessageNotificationModule {}
