import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  OperationLogCreateDto,
  OperationLogEnhance,
  OperationLogEnhanceListParams,
  OperationLogStats,
  TaskEnhanceListResponse,
} from '@shared/api.interface';

const BASE: string = '/api/system-enhance/operation-logs';

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

/* ============ 操作日志 ============ */

export async function listOperationLogs(
  params: OperationLogEnhanceListParams,
): Promise<TaskEnhanceListResponse<OperationLogEnhance>> {
  return getJson<TaskEnhanceListResponse<OperationLogEnhance>>(
    `${BASE}${buildQuery(params)}`,
  );
}

export async function getOperationLogStats(): Promise<OperationLogStats> {
  return getJson<OperationLogStats>(`${BASE}/stats`);
}

export async function getOperationLog(
  id: number,
): Promise<OperationLogEnhance> {
  return getJson<OperationLogEnhance>(`${BASE}/${id}`);
}

export async function createOperationLog(
  body: OperationLogCreateDto,
): Promise<{ id: number }> {
  return postJson<{ id: number }>(`${BASE}`, body);
}

export async function archiveOperationLogs(): Promise<{ archived: number }> {
  return postJson<{ archived: number }>(`${BASE}/archive`);
}

export async function deleteOperationLog(
  id: number,
): Promise<{ success: boolean }> {
  return deleteJson<{ success: boolean }>(`${BASE}/${id}`);
}
