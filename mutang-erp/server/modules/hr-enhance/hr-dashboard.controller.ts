import { Controller, Get } from '@nestjs/common';
import type { HrDashboardData } from '@shared/api.interface';
import { HrDashboardService } from './hr-dashboard.service';

@Controller('api/hr-enhance/dashboard')
export class HrDashboardController {
  constructor(private readonly dashboardService: HrDashboardService) {}

  @Get()
  async getDashboard(): Promise<HrDashboardData> {
    return this.dashboardService.getDashboard();
  }
}
