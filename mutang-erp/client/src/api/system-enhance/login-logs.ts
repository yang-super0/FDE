import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  LoginLog,
  LoginLogListParams,
  LoginLogRecordResult,
  LoginLogStats,
  TaskEnhanceListResponse,
} from '@shared/api.interface';

const BASE: string = '/api/system-enhance/login-logs';

async function getJson<T>(url: string): Promise<T> {
  const response = await axiosForBackend({ url, method: 'GET' });
  return response.data as T;
}

async function postJson<T>(url: string): Promise<T> {
  const response = await axiosForBackend({ url, method: 'POST', data: {} });
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

/* ============ 登录日志 ============ */

export async function listLoginLogs(
  params: LoginLogListParams,
): Promise<TaskEnhanceListResponse<LoginLog>> {
  return getJson<TaskEnhanceListResponse<LoginLog>>(
    `${BASE}${buildQuery(params)}`,
  );
}

export async function getLoginLogStats(
  params?: LoginLogListParams,
): Promise<LoginLogStats> {
  return getJson<LoginLogStats>(`${BASE}/stats${buildQuery(params ?? {})}`);
}

export async function getLoginLog(id: number): Promise<LoginLog> {
  return getJson<LoginLog>(`${BASE}/${id}`);
}

export async function recordLogin(): Promise<LoginLogRecordResult> {
  return postJson<LoginLogRecordResult>(`${BASE}/record`);
}

export async function deleteLoginLog(
  id: number,
): Promise<{ success: boolean }> {
  return deleteJson<{ success: boolean }>(`${BASE}/${id}`);
}
