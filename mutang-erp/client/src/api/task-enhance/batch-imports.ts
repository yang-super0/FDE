import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  BatchImport,
  BatchImportCreateDto,
  BatchImportFinishDto,
  BatchImportListParams,
  TaskEnhanceListResponse,
} from '@shared/api.interface';

const BASE: string = '/api/task-enhance/batch-imports';

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

/* ============ 批量导入任务 ============ */

export async function listBatchImports(
  params: BatchImportListParams,
): Promise<TaskEnhanceListResponse<BatchImport>> {
  return getJson<TaskEnhanceListResponse<BatchImport>>(
    `${BASE}${buildQuery(params)}`,
  );
}

export async function createBatchImport(
  body: BatchImportCreateDto,
): Promise<BatchImport> {
  return postJson<BatchImport>(`${BASE}`, body);
}

export async function getBatchImport(id: number): Promise<BatchImport> {
  return getJson<BatchImport>(`${BASE}/${id}`);
}

export async function startBatchImport(id: number): Promise<BatchImport> {
  return postJson<BatchImport>(`${BASE}/${id}/start`);
}

export async function finishBatchImport(
  id: number,
  body: BatchImportFinishDto,
): Promise<BatchImport> {
  return postJson<BatchImport>(`${BASE}/${id}/finish`, body);
}

export async function deleteBatchImport(
  id: number,
): Promise<{ success: boolean }> {
  return deleteJson<{ success: boolean }>(`${BASE}/${id}`);
}
