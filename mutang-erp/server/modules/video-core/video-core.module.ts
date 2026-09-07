import { Module } from '@nestjs/common';

import { VideoOrdersController } from './controllers/video-orders.controller';
import { VideoProjectsController } from './controllers/video-projects.controller';
import { VideoActorsController } from './controllers/actors.controller';
import { VideoVendorsController } from './controllers/vendors.controller';
import { VideoOutsourcingProjectsController } from './controllers/outsourcing-projects.controller';
import { VideoCommissionsController } from './controllers/video-commissions.controller';
import { VideoShootingExpensesController } from './controllers/shooting-expenses.controller';
import { VideoVenueExpensesController } from './controllers/venue-expenses.controller';
import { VideoSamplesController } from './controllers/samples.controller';

import { VideoOrdersService } from './services/video-orders.service';
import { VideoProjectsService } from './services/video-projects.service';
import { VideoActorsService } from './services/actors.service';
import { VideoVendorsService } from './services/vendors.service';
import { VideoOutsourcingProjectsService } from './services/outsourcing-projects.service';
import { VideoCommissionsService } from './services/video-commissions.service';
import { VideoShootingExpensesService } from './services/shooting-expenses.service';
import { VideoVenueExpensesService } from './services/venue-expenses.service';
import { VideoSamplesService } from './services/samples.service';

@Module({
  controllers: [
    VideoOrdersController,
    VideoProjectsController,
    VideoActorsController,
    VideoVendorsController,
    VideoOutsourcingProjectsController,
    VideoCommissionsController,
    VideoShootingExpensesController,
    VideoVenueExpensesController,
    VideoSamplesController,
  ],
  providers: [
    VideoOrdersService,
    VideoProjectsService,
    VideoActorsService,
    VideoVendorsService,
    VideoOutsourcingProjectsService,
    VideoCommissionsService,
    VideoShootingExpensesService,
    VideoVenueExpensesService,
    VideoSamplesService,
  ],
})
export class VideoCoreModule {}
