import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  CompetitorComparisonItem,
  CompetitorCreateDto,
  CompetitorListParams,
  CompetitorMonitoring,
  CompetitorMonitoringStats,
  CompetitorRankItem,
  CompetitorTrendPoint,
  CompetitorUpdateDto,
} from '@shared/api.interface';

/* ============ 列表响应结构 ============ */

interface CompetitorListResponse {
  items: CompetitorMonitoring[];
  total: number;
  page: number;
  pageSize: number;
}

const BASE_URL = '/api/support-enhance/competitors';

export async function listCompetitorMonitorings(
  params: CompetitorListParams,
): Promise<CompetitorListResponse> {
  const res = await axiosForBackend.get<CompetitorListResponse>(BASE_URL, {
    params,
  });
  return res.data;
}

export async function getCompetitorMonitoring(
  id: number,
): Promise<CompetitorMonitoring> {
  const res = await axiosForBackend.get<CompetitorMonitoring>(
    `${BASE_URL}/${id}`,
  );
  return res.data;
}

export async function createCompetitorMonitoring(
  dto: CompetitorCreateDto,
): Promise<CompetitorMonitoring> {
  const res = await axiosForBackend.post<CompetitorMonitoring>(BASE_URL, dto);
  return res.data;
}

export async function updateCompetitorMonitoring(
  id: number,
  dto: CompetitorUpdateDto,
): Promise<CompetitorMonitoring> {
  const res = await axiosForBackend.patch<CompetitorMonitoring>(
    `${BASE_URL}/${id}`,
    dto,
  );
  return res.data;
}

export async function deleteCompetitorMonitoring(
  id: number,
): Promise<{ success: boolean }> {
  const res = await axiosForBackend.delete<{ success: boolean }>(
    `${BASE_URL}/${id}`,
  );
  return res.data;
}

export async function getCompetitorComparison(
  names?: string[],
): Promise<CompetitorComparisonItem[]> {
  const res = await axiosForBackend.get<CompetitorComparisonItem[]>(
    `${BASE_URL}/comparison`,
    {
      params:
        names && names.length > 0 ? { names: names.join(',') } : undefined,
    },
  );
  return res.data;
}

export async function getCompetitorTrend(
  name: string,
): Promise<CompetitorTrendPoint[]> {
  const res = await axiosForBackend.get<CompetitorTrendPoint[]>(
    `${BASE_URL}/trend`,
    { params: { name } },
  );
  return res.data;
}

export async function getCompetitorRanking(
  industry?: string,
  sortBy?: string,
): Promise<CompetitorRankItem[]> {
  const res = await axiosForBackend.get<CompetitorRankItem[]>(
    `${BASE_URL}/ranking`,
    {
      params: {
        industry: industry || undefined,
        sortBy: sortBy || undefined,
      },
    },
  );
  return res.data;
}

export async function getCompetitorMonitoringStats(): Promise<CompetitorMonitoringStats> {
  const res = await axiosForBackend.get<CompetitorMonitoringStats>(
    `${BASE_URL}/stats`,
  );
  return res.data;
}
