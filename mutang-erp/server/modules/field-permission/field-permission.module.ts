import { Module } from '@nestjs/common';
import { FieldPermissionController } from './field-permission.controller';
import { FieldPermissionService } from './field-permission.service';

@Module({
  controllers: [FieldPermissionController],
  providers: [FieldPermissionService],
  exports: [FieldPermissionService],
})
export class FieldPermissionModule {}
