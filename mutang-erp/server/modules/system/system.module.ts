import { Module } from '@nestjs/common';
import { OperationLogModule } from '../operation-log/operation-log.module';
import { SystemService } from './system.service';
import { SystemUserController } from './system-user.controller';
import { RoleController } from './role.controller';
import { SysConfigController } from './sys-config.controller';

@Module({
  imports: [OperationLogModule],
  controllers: [SystemUserController, RoleController, SysConfigController],
  providers: [SystemService],
})
export class SystemModule {}
