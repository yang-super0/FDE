import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  DashboardDistributions,
  DashboardSummary,
} from '@shared/dashboard';

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const response = await axiosForBackend.get<DashboardSummary>(
    '/api/dashboard/summary',
  );
  return response.data;
}

export async function getDashboardDistributions(): Promise<DashboardDistributions> {
  const response = await axiosForBackend.get<DashboardDistributions>(
    '/api/dashboard/distribution',
  );
  return response.data;
}
