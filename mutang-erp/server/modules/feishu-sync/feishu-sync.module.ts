import { Module } from '@nestjs/common';
import { FeishuBitableService } from './feishu-bitable.service';
import { FieldMappingService } from './field-mapping.service';
import { SyncConfigService } from './sync-config.service';
import { SyncLogService } from './sync-log.service';
import { SyncEventService } from './sync-event.service';
import { SyncService } from './sync.service';
import { SyncController } from './sync.controller';

@Module({
  providers: [
    FeishuBitableService,
    FieldMappingService,
    SyncConfigService,
    SyncLogService,
    SyncEventService,
    SyncService,
  ],
  controllers: [SyncController],
})
export class FeishuSyncModule {}
