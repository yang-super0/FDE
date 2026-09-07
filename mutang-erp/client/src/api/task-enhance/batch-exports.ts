import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  BatchExport,
  BatchExportCreateDto,
  BatchExportFinishDto,
  BatchExportListParams,
  TaskEnhanceListResponse,
} from '@shared/api.interface';

const BASE: string = '/api/task-enhance/batch-exports';

async function getJson<T>(url: string): Promise<T> {
  const response = await axiosForBackend({ url, method: 'GET' });
  return response.data as T;
}

async function postJson<T>(url: string, body?: unknown): Promise<T> {
  const response = await axiosForBackend({
    url,
    method: 'POST',
    data: body ?? {},
  });
  return response.data as T;
}

async function deleteJson<T>(url: string): Promise<T> {
  const response = await axiosForBackend({ url, method: 'DELETE' });
  return response.data as T;
}

const buildQuery = (params: object): string => {
  const search: URLSearchParams = new URLSearchParams();
  Object.entries(params as Record<string, unknown>).forEach(
    ([key, value]: [string, unknown]) => {
      if (value !== undefined && value !== null && value !== '') {
        search.set(key, String(value));
      }
    },
  );
  const query: string = search.toString();
  return query ? `?${query}` : '';
};

/* ============ 批量导出任务 ============ */

export async function listBatchExports(
  params: BatchExportListParams,
): Promise<TaskEnhanceListResponse<BatchExport>> {
  return getJson<TaskEnhanceListResponse<BatchExport>>(
    `${BASE}${buildQuery(params)}`,
  );
}

export async function createBatchExport(
  body: BatchExportCreateDto,
): Promise<BatchExport> {
  return postJson<BatchExport>(`${BASE}`, body);
}

export async function getBatchExport(id: number): Promise<BatchExport> {
  return getJson<BatchExport>(`${BASE}/${id}`);
}

export async function startBatchExport(id: number): Promise<BatchExport> {
  return postJson<BatchExport>(`${BASE}/${id}/start`);
}

export async function finishBatchExport(
  id: number,
  body: BatchExportFinishDto,
): Promise<BatchExport> {
  return postJson<BatchExport>(`${BASE}/${id}/finish`, body);
}

export async function deleteBatchExport(
  id: number,
): Promise<{ success: boolean }> {
  return deleteJson<{ success: boolean }>(`${BASE}/${id}`);
}
