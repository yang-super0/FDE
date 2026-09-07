import { Module } from '@nestjs/common';
import { MessageNotificationModule } from '../message-notification/message-notification.module';
import { AdminPurchaseRequestsController } from './admin-purchase-requests.controller';
import { AdminPurchaseRequestsService } from './admin-purchase-requests.service';
import { AdminPurchaseOrdersController } from './admin-purchase-orders.controller';
import { AdminPurchaseOrdersService } from './admin-purchase-orders.service';
import { AdminPurchaseDetailsController } from './admin-purchase-details.controller';
import { AdminPurchaseDetailsService } from './admin-purchase-details.service';
import { AdminAssetsController } from './admin-assets.controller';
import { AdminAssetsService } from './admin-assets.service';
import { AdminInventoryController } from './admin-inventory.controller';
import { AdminInventoryService } from './admin-inventory.service';
import { AdminInboundsController } from './admin-inbounds.controller';
import { AdminInboundsService } from './admin-inbounds.service';
import { AdminRequisitionsController } from './admin-requisitions.controller';
import { AdminRequisitionsService } from './admin-requisitions.service';
import { AdminReturnsController } from './admin-returns.controller';
import { AdminReturnsService } from './admin-returns.service';
import { AdminInventoryChecksController } from './admin-inventories.controller';
import { AdminInventoryChecksService } from './admin-inventories.service';

@Module({
  imports: [MessageNotificationModule],
  controllers: [
    AdminPurchaseRequestsController,
    AdminPurchaseOrdersController,
    AdminPurchaseDetailsController,
    AdminAssetsController,
    AdminInventoryController,
    AdminInboundsController,
    AdminRequisitionsController,
    AdminReturnsController,
    AdminInventoryChecksController,
  ],
  providers: [
    AdminPurchaseRequestsService,
    AdminPurchaseOrdersService,
    AdminPurchaseDetailsService,
    AdminAssetsService,
    AdminInventoryService,
    AdminInboundsService,
    AdminRequisitionsService,
    AdminReturnsService,
    AdminInventoryChecksService,
  ],
})
export class AdminEnhanceModule {}
