import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import { extractErrorMessage } from '@client/src/utils/extract-error-message';
import type {
  SyncConfigItem,
  SyncConfigListResponse,
  SyncConfigUpdateDto,
  SyncFullSyncResult,
  SyncLogListParams,
  SyncLogListResponse,
  SyncStatsResponse,
} from '@shared/api.interface';

/* ============ 飞书多维表格同步 API ============ */

const BASE: string = '/api/sync';
const FULL_SYNC_TIMEOUT_MS: number = 300000;

export function toFeishuSyncErrorText(error: unknown): string {
  return extractErrorMessage(error);
}

interface SyncRequestConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT';
  data?: unknown;
  timeout?: number;
}

async function request<T>(config: SyncRequestConfig): Promise<T> {
  const response = await axiosForBackend({
    url: config.url,
    method: config.method,
    data: config.data,
    timeout: config.timeout,
  });
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

export async function listSyncConfigs(): Promise<SyncConfigListResponse> {
  return request<SyncConfigListResponse>({
    url: `${BASE}/configs`,
    method: 'GET',
  });
}

export async function updateSyncConfig(
  id: number,
  dto: SyncConfigUpdateDto,
): Promise<SyncConfigItem> {
  return request<SyncConfigItem>({
    url: `${BASE}/configs/${id}`,
    method: 'PUT',
    data: dto,
  });
}

export async function enableSyncConfig(id: number): Promise<SyncConfigItem> {
  return request<SyncConfigItem>({
    url: `${BASE}/configs/${id}/enable`,
    method: 'POST',
    data: {},
  });
}

export async function disableSyncConfig(id: number): Promise<SyncConfigItem> {
  return request<SyncConfigItem>({
    url: `${BASE}/configs/${id}/disable`,
    method: 'POST',
    data: {},
  });
}

export async function fullSyncTable(
  tableName: string,
): Promise<SyncFullSyncResult> {
  return request<SyncFullSyncResult>({
    url: `${BASE}/full-sync/${encodeURIComponent(tableName)}`,
    method: 'POST',
    data: {},
  });
}

export async function fullSyncAll(): Promise<SyncFullSyncResult[]> {
  return request<SyncFullSyncResult[]>({
    url: `${BASE}/full-sync-all`,
    method: 'POST',
    data: {},
    timeout: FULL_SYNC_TIMEOUT_MS,
  });
}

export async function listSyncLogs(
  params: SyncLogListParams,
): Promise<SyncLogListResponse> {
  return request<SyncLogListResponse>({
    url: `${BASE}/logs${buildQuery(params)}`,
    method: 'GET',
  });
}

export async function getSyncStats(): Promise<SyncStatsResponse> {
  return request<SyncStatsResponse>({
    url: `${BASE}/stats`,
    method: 'GET',
  });
}
