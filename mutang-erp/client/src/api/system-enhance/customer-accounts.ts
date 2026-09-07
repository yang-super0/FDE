import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  CustomerAccount,
  CustomerAccountCreateDto,
  CustomerAccountListParams,
  CustomerAccountUpdateDto,
  LoginLog,
  TaskEnhanceListResponse,
} from '@shared/api.interface';

const BASE: string = '/api/system-enhance/customer-accounts';

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
  const response = await axiosForBackend({
    url,
    method: 'PATCH',
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

/* ============ 客户账户 ============ */

export async function listCustomerAccounts(
  params: CustomerAccountListParams,
): Promise<TaskEnhanceListResponse<CustomerAccount>> {
  return getJson<TaskEnhanceListResponse<CustomerAccount>>(
    `${BASE}${buildQuery(params)}`,
  );
}

export async function createCustomerAccount(
  body: CustomerAccountCreateDto,
): Promise<{ id: number }> {
  return postJson<{ id: number }>(`${BASE}`, body);
}

export async function updateCustomerAccount(
  id: number,
  body: CustomerAccountUpdateDto,
): Promise<{ id: number }> {
  return patchJson<{ id: number }>(`${BASE}/${id}`, body);
}

export async function resetCustomerAccountPassword(
  id: number,
): Promise<{ password: string }> {
  return postJson<{ password: string }>(`${BASE}/${id}/reset-password`);
}

export async function unlockCustomerAccount(
  id: number,
): Promise<{ id: number }> {
  return patchJson<{ id: number }>(`${BASE}/${id}/unlock`);
}

export async function listCustomerAccountLoginLogs(
  id: number,
): Promise<LoginLog[]> {
  return getJson<LoginLog[]>(`${BASE}/${id}/login-logs`);
}

export async function deleteCustomerAccount(
  id: number,
): Promise<{ success: boolean }> {
  return deleteJson<{ success: boolean }>(`${BASE}/${id}`);
}
