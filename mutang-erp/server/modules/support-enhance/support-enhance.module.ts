import { Module } from '@nestjs/common';
import { IndustryRoiController } from './industry-roi.controller';
import { IndustryRoiService } from './industry-roi.service';
import { CompetitorMonitoringController } from './competitor-monitoring.controller';
import { CompetitorMonitoringService } from './competitor-monitoring.service';
import { IndustryTrendsController } from './industry-trends.controller';
import { IndustryTrendsService } from './industry-trends.service';
import { CreativeMaterialsController } from './creative-materials.controller';
import { CreativeMaterialsService } from './creative-materials.service';

@Module({
  controllers: [
    IndustryRoiController,
    CompetitorMonitoringController,
    IndustryTrendsController,
    CreativeMaterialsController,
  ],
  providers: [
    IndustryRoiService,
    CompetitorMonitoringService,
    IndustryTrendsService,
    CreativeMaterialsService,
  ],
})
export class SupportEnhanceModule {}
