import { Module } from '@nestjs/common';
import { OperationLogModule } from '../operation-log/operation-log.module';
import { AdminAffairService } from './admin-affair.service';
import { AssetController } from './asset.controller';
import { AnnouncementController } from './announcement.controller';

@Module({
  imports: [OperationLogModule],
  controllers: [AssetController, AnnouncementController],
  providers: [AdminAffairService],
})
export class AdminAffairModule {}
