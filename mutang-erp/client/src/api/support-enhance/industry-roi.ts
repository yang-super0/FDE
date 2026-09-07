import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  IndustryRoiBenchmark,
  IndustryRoiComparisonItem,
  IndustryRoiCorrectDto,
  IndustryRoiCreateDto,
  IndustryRoiImportResult,
  IndustryRoiImportRow,
  IndustryRoiListParams,
  IndustryRoiUpdateDto,
} from '@shared/api.interface';

export interface SeListResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

const BASE_URL = '/api/support-enhance/industry-roi';

export async function listIndustryRoiBenchmarks(
  params: IndustryRoiListParams,
): Promise<SeListResult<IndustryRoiBenchmark>> {
  const res = await axiosForBackend.get<SeListResult<IndustryRoiBenchmark>>(
    BASE_URL,
    { params },
  );
  return res.data;
}

export async function getIndustryRoiBenchmark(
  id: number,
): Promise<IndustryRoiBenchmark> {
  const res = await axiosForBackend.get<IndustryRoiBenchmark>(
    `${BASE_URL}/${id}`,
  );
  return res.data;
}

export async function createIndustryRoiBenchmark(
  dto: IndustryRoiCreateDto,
): Promise<IndustryRoiBenchmark> {
  const res = await axiosForBackend.post<IndustryRoiBenchmark>(
    BASE_URL,
    dto,
  );
  return res.data;
}

export async function updateIndustryRoiBenchmark(
  id: number,
  dto: IndustryRoiUpdateDto,
): Promise<IndustryRoiBenchmark> {
  const res = await axiosForBackend.patch<IndustryRoiBenchmark>(
    `${BASE_URL}/${id}`,
    dto,
  );
  return res.data;
}

export async function correctIndustryRoiBenchmark(
  id: number,
  dto: IndustryRoiCorrectDto,
): Promise<IndustryRoiBenchmark> {
  const res = await axiosForBackend.post<IndustryRoiBenchmark>(
    `${BASE_URL}/${id}/correct`,
    dto,
  );
  return res.data;
}

export async function deleteIndustryRoiBenchmark(
  id: number,
): Promise<{ success: boolean }> {
  const res = await axiosForBackend.delete<{ success: boolean }>(
    `${BASE_URL}/${id}`,
  );
  return res.data;
}

export async function getIndustryRoiVersionHistory(
  id: number,
): Promise<IndustryRoiBenchmark[]> {
  const res = await axiosForBackend.get<IndustryRoiBenchmark[]>(
    `${BASE_URL}/${id}/versions`,
  );
  return res.data;
}

export async function getIndustryRoiIndustryComparison(): Promise<
  IndustryRoiComparisonItem[]
> {
  const res = await axiosForBackend.get<IndustryRoiComparisonItem[]>(
    `${BASE_URL}/comparison/industry`,
  );
  return res.data;
}

export async function getIndustryRoiPlatformComparison(): Promise<
  IndustryRoiComparisonItem[]
> {
  const res = await axiosForBackend.get<IndustryRoiComparisonItem[]>(
    `${BASE_URL}/comparison/platform`,
  );
  return res.data;
}

export async function importIndustryRoiBenchmarks(
  rows: IndustryRoiImportRow[],
): Promise<IndustryRoiImportResult> {
  const res = await axiosForBackend.post<IndustryRoiImportResult>(
    `${BASE_URL}/import`,
    { rows },
  );
  return res.data;
}
