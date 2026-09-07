import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type { SeListResult } from './industry-roi';
import type {
  IndustryTrendComparisonItem,
  IndustryTrendCreateDto,
  IndustryTrendListParams,
  IndustryTrendPoint,
  IndustryTrendRecord,
  IndustryTrendStats,
  IndustryTrendUpdateDto,
} from '@shared/api.interface';

const BASE_URL = '/api/support-enhance/industry-trends';

export async function listIndustryTrendRecords(
  params: IndustryTrendListParams,
): Promise<SeListResult<IndustryTrendRecord>> {
  const res = await axiosForBackend.get<SeListResult<IndustryTrendRecord>>(
    BASE_URL,
    { params },
  );
  return res.data;
}

export async function getIndustryTrendRecord(
  id: number,
): Promise<IndustryTrendRecord> {
  const res = await axiosForBackend.get<IndustryTrendRecord>(
    `${BASE_URL}/${id}`,
  );
  return res.data;
}

export async function createIndustryTrendRecord(
  dto: IndustryTrendCreateDto,
): Promise<IndustryTrendRecord> {
  const res = await axiosForBackend.post<IndustryTrendRecord>(BASE_URL, dto);
  return res.data;
}

export async function updateIndustryTrendRecord(
  id: number,
  dto: IndustryTrendUpdateDto,
): Promise<IndustryTrendRecord> {
  const res = await axiosForBackend.patch<IndustryTrendRecord>(
    `${BASE_URL}/${id}`,
    dto,
  );
  return res.data;
}

export async function deleteIndustryTrendRecord(
  id: number,
): Promise<{ success: boolean }> {
  const res = await axiosForBackend.delete<{ success: boolean }>(
    `${BASE_URL}/${id}`,
  );
  return res.data;
}

export async function getIndustryTrendSeries(
  industry: string,
  platform: string,
  granularity: string,
): Promise<IndustryTrendPoint[]> {
  const res = await axiosForBackend.get<IndustryTrendPoint[]>(
    `${BASE_URL}/series`,
    { params: { industry, platform, granularity } },
  );
  return res.data;
}

export async function getIndustryTrendIndustryComparison(
  platform?: string,
): Promise<IndustryTrendComparisonItem[]> {
  const res = await axiosForBackend.get<IndustryTrendComparisonItem[]>(
    `${BASE_URL}/comparison/industry`,
    { params: platform ? { platform } : {} },
  );
  return res.data;
}

export async function getIndustryTrendPlatformComparison(
  industry?: string,
): Promise<IndustryTrendComparisonItem[]> {
  const res = await axiosForBackend.get<IndustryTrendComparisonItem[]>(
    `${BASE_URL}/comparison/platform`,
    { params: industry ? { industry } : {} },
  );
  return res.data;
}

export async function getIndustryTrendStats(): Promise<IndustryTrendStats> {
  const res = await axiosForBackend.get<IndustryTrendStats>(
    `${BASE_URL}/stats`,
  );
  return res.data;
}
