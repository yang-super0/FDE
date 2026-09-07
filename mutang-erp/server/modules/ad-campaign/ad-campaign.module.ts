import { Module } from '@nestjs/common';
import { OperationLogModule } from '@server/modules/operation-log/operation-log.module';
import { AdCampaignController } from './ad-campaign.controller';
import { AdCampaignService } from './ad-campaign.service';

@Module({
  imports: [OperationLogModule],
  controllers: [AdCampaignController],
  providers: [AdCampaignService],
})
export class AdCampaignModule {}
