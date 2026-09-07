import { Module } from '@nestjs/common';
import { FieldPermissionModule } from '../field-permission/field-permission.module';
import { MessageNotificationModule } from '../message-notification/message-notification.module';
import { OperationLogModule } from '../operation-log/operation-log.module';
import { ContractController } from './contract.controller';
import { ContractService } from './contract.service';

@Module({
  imports: [OperationLogModule, MessageNotificationModule, FieldPermissionModule],
  controllers: [ContractController],
  providers: [ContractService],
})
export class ContractModule {}
