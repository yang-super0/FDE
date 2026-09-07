import { Controller, Get } from '@nestjs/common';
import type {
  DashboardDistributions,
  DashboardSummary,
} from '@shared/dashboard';
import { DashboardService } from './dashboard.service';

@Controller('api/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  async getSummary(): Promise<DashboardSummary> {
    return this.dashboardService.getSummary();
  }

  @Get('distribution')
  async getDistributions(): Promise<DashboardDistributions> {
    return this.dashboardService.getDistributions();
  }
}
