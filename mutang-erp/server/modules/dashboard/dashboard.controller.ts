import { Controller, Get } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import type {
  ActivityItem,
  BusinessShareItem,
  DashboardSummary,
  RevenueTrendItem,
  TodoItem,
} from '@shared/api.interface';

@Controller('api/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  async getSummary(): Promise<DashboardSummary> {
    return this.dashboardService.getSummary();
  }

  @Get('revenue-trend')
  async getRevenueTrend(): Promise<{ items: RevenueTrendItem[] }> {
    return this.dashboardService.getRevenueTrend();
  }

  @Get('business-share')
  async getBusinessShare(): Promise<{ items: BusinessShareItem[] }> {
    return this.dashboardService.getBusinessShare();
  }

  @Get('todos')
  async getTodos(): Promise<{ items: TodoItem[] }> {
    return this.dashboardService.getTodos();
  }

  @Get('activities')
  async getActivities(): Promise<{ items: ActivityItem[] }> {
    return this.dashboardService.getActivities();
  }
}
