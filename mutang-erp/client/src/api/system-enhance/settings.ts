import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  SystemSetting,
  SystemSettingCreateDto,
  SystemSettingListParams,
  SystemSettingUpdateDto,
} from '@shared/api.interface';

const BASE: string = '/api/system-enhance/settings';

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

async function patchJson<T>(url: string, body?: unknown): Promise<T> {
  const response = await axiosForBackend({ url, method: 'PATCH', data: body ?? {} });
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
  return search.toString() ? `?${search.toString()}` : '';
};

export async function listSystemSettings(
  params: SystemSettingListParams,
): Promise<SystemSetting[]> {
  return getJson<SystemSetting[]>(`${BASE}${buildQuery(params)}`);
}

export async function getSystemSetting(id: number): Promise<SystemSetting> {
  return getJson<SystemSetting>(`${BASE}/${id}`);
}

export async function createSystemSetting(
  body: SystemSettingCreateDto,
): Promise<SystemSetting> {
  return postJson<SystemSetting>(BASE, body);
}

export async function updateSystemSetting(
  id: number,
  body: SystemSettingUpdateDto,
): Promise<SystemSetting> {
  return patchJson<SystemSetting>(`${BASE}/${id}`, body);
}

export async function resetSystemSetting(id: number): Promise<SystemSetting> {
  return postJson<SystemSetting>(`${BASE}/${id}/reset`);
}

export async function deleteSystemSetting(
  id: number,
): Promise<{ success: boolean }> {
  return deleteJson<{ success: boolean }>(`${BASE}/${id}`);
}
