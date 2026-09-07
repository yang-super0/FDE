import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  CreativeMaterial,
  MaterialCreateDto,
  MaterialListParams,
  MaterialPerformancePoint,
  MaterialPerformanceRecord,
  MaterialRankItem,
  MaterialRecommendItem,
  MaterialStats,
  MaterialUpdateDto,
  PerformanceRecordCreateDto,
} from '@shared/api.interface';

/* ============ 列表响应结构 ============ */

interface MaterialListResponse {
  items: CreativeMaterial[];
  total: number;
  page: number;
  pageSize: number;
}

const BASE_URL = '/api/support-enhance/materials';

export async function listCreativeMaterials(
  params: MaterialListParams,
): Promise<MaterialListResponse> {
  const res = await axiosForBackend.get<MaterialListResponse>(BASE_URL, {
    params,
  });
  return res.data;
}

export async function getCreativeMaterial(
  id: number,
): Promise<CreativeMaterial> {
  const res = await axiosForBackend.get<CreativeMaterial>(`${BASE_URL}/${id}`);
  return res.data;
}

export async function createCreativeMaterial(
  dto: MaterialCreateDto,
): Promise<CreativeMaterial> {
  const res = await axiosForBackend.post<CreativeMaterial>(BASE_URL, dto);
  return res.data;
}

export async function updateCreativeMaterial(
  id: number,
  dto: MaterialUpdateDto,
): Promise<CreativeMaterial> {
  const res = await axiosForBackend.patch<CreativeMaterial>(
    `${BASE_URL}/${id}`,
    dto,
  );
  return res.data;
}

export async function deleteCreativeMaterial(
  id: number,
): Promise<{ success: boolean }> {
  const res = await axiosForBackend.delete<{ success: boolean }>(
    `${BASE_URL}/${id}`,
  );
  return res.data;
}

export async function rateCreativeMaterial(
  id: number,
  rating: number,
): Promise<CreativeMaterial> {
  const res = await axiosForBackend.post<CreativeMaterial>(
    `${BASE_URL}/${id}/rating`,
    { rating },
  );
  return res.data;
}

export async function updateCreativeMaterialStatus(
  id: number,
  status: string,
): Promise<CreativeMaterial> {
  const res = await axiosForBackend.patch<CreativeMaterial>(
    `${BASE_URL}/${id}/status`,
    { status },
  );
  return res.data;
}

export async function batchTagCreativeMaterials(
  ids: number[],
  tags: string[],
  mode: 'add' | 'replace',
): Promise<{ updated: number }> {
  const res = await axiosForBackend.post<{ updated: number }>(
    `${BASE_URL}/batch-tags`,
    { ids, tags, mode },
  );
  return res.data;
}

export async function batchArchiveCreativeMaterials(
  ids: number[],
): Promise<{ updated: number }> {
  const res = await axiosForBackend.post<{ updated: number }>(
    `${BASE_URL}/batch-archive`,
    { ids },
  );
  return res.data;
}

export async function listMaterialPerformanceRecords(
  materialId: number,
): Promise<MaterialPerformanceRecord[]> {
  const res = await axiosForBackend.get<MaterialPerformanceRecord[]>(
    `${BASE_URL}/${materialId}/records`,
  );
  return res.data;
}

export async function createMaterialPerformanceRecord(
  materialId: number,
  dto: PerformanceRecordCreateDto,
): Promise<MaterialPerformanceRecord> {
  const res = await axiosForBackend.post<MaterialPerformanceRecord>(
    `${BASE_URL}/${materialId}/records`,
    { ...dto, materialId },
  );
  return res.data;
}

export async function getMaterialPerformanceSeries(
  materialId: number,
): Promise<MaterialPerformancePoint[]> {
  const res = await axiosForBackend.get<MaterialPerformancePoint[]>(
    `${BASE_URL}/${materialId}/performance`,
  );
  return res.data;
}

export async function getMaterialRanking(
  sortBy: string,
  limit: number,
): Promise<MaterialRankItem[]> {
  const res = await axiosForBackend.get<MaterialRankItem[]>(
    `${BASE_URL}/ranking`,
    { params: { sortBy, limit } },
  );
  return res.data;
}

export async function getMaterialRecommendations(
  limit: number,
): Promise<MaterialRecommendItem[]> {
  const res = await axiosForBackend.get<MaterialRecommendItem[]>(
    `${BASE_URL}/recommendations`,
    { params: { limit } },
  );
  return res.data;
}

export async function compareMaterials(
  ids: number[],
): Promise<CreativeMaterial[]> {
  const res = await axiosForBackend.get<CreativeMaterial[]>(
    `${BASE_URL}/compare`,
    { params: { ids: ids.join(',') } },
  );
  return res.data;
}

export async function getMaterialStats(): Promise<MaterialStats> {
  const res = await axiosForBackend.get<MaterialStats>(`${BASE_URL}/stats`);
  return res.data;
}
