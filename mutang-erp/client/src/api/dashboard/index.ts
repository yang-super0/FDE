import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  ActivityItem,
  BusinessShareItem,
  DashboardSummary,
  RevenueTrendItem,
  TodoItem,
} from '@shared/api.interface';

export async function getSummary(): Promise<DashboardSummary> {
  try {
    const response = await axiosForBackend.get<DashboardSummary>(
      '/api/dashboard/summary',
    );
    return response.data;
  } catch (error) {
    logger.error('获取看板汇总失败', error);
    throw error;
  }
}

export async function getRevenueTrend(): Promise<{
  items: RevenueTrendItem[];
}> {
  try {
    const response = await axiosForBackend.get<{
      items: RevenueTrendItem[];
    }>('/api/dashboard/revenue-trend');
    return response.data;
  } catch (error) {
    logger.error('获取营收趋势失败', error);
    throw error;
  }
}

export async function getBusinessShare(): Promise<{
  items: BusinessShareItem[];
}> {
  try {
    const response = await axiosForBackend.get<{
      items: BusinessShareItem[];
    }>('/api/dashboard/business-share');
    return response.data;
  } catch (error) {
    logger.error('获取业务线占比失败', error);
    throw error;
  }
}

export async function getTodos(): Promise<{ items: TodoItem[] }> {
  try {
    const response = await axiosForBackend.get<{ items: TodoItem[] }>(
      '/api/dashboard/todos',
    );
    return response.data;
  } catch (error) {
    logger.error('获取待办任务失败', error);
    throw error;
  }
}

export async function getActivities(): Promise<{ items: ActivityItem[] }> {
  try {
    const response = await axiosForBackend.get<{ items: ActivityItem[] }>(
      '/api/dashboard/activities',
    );
    return response.data;
  } catch (error) {
    logger.error('获取最新动态失败', error);
    throw error;
  }
}
