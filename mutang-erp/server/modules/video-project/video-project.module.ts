import { Module } from '@nestjs/common';
import { OperationLogModule } from '@server/modules/operation-log/operation-log.module';
import { VideoProjectController } from './video-project.controller';
import { VideoProjectService } from './video-project.service';

@Module({
  imports: [OperationLogModule],
  controllers: [VideoProjectController],
  providers: [VideoProjectService],
})
export class VideoProjectModule {}
