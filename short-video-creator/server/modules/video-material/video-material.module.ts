import { Module } from '@nestjs/common';
import { CapabilityModule } from '@lark-apaas/nestjs-capability';
import { BitableModule } from '../bitable/bitable.module';
import { StoryboardGenerationService } from './storyboard-generation.service';
import { SyncStateService } from './sync-state.service';
import { VideoMaterialAutomation } from './video-material.automation';
import { VideoMaterialController } from './video-material.controller';
import { VideoMaterialReaderService } from './video-material-reader.service';
import { VideoMaterialService } from './video-material.service';

@Module({
  imports: [CapabilityModule, BitableModule],
  controllers: [VideoMaterialController],
  providers: [
    VideoMaterialService,
    VideoMaterialReaderService,
    StoryboardGenerationService,
    SyncStateService,
    VideoMaterialAutomation,
  ],
})
export class VideoMaterialModule {}
