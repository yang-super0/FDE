import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  BatchIdsApproveRequest,
  CreateShootingExpenseRequest,
  ShootingExpense,
  ShootingExpenseListParams,
  ShootingExpenseListResult,
  ShootingExpenseStats,
  UpdateShootingExpenseRequest,
  VideoCoreProject,
  VideoCoreProjectListResult,
} from '@shared/api.interface';

const BASE: string = '/api/video-core/shooting-expenses';
const PROJECTS_URL: string = '/api/video-core/projects';

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

async function patchJson<T>(url: string, body: unknown): Promise<T> {
  const response = await axiosForBackend({
    url,
    method: 'PATCH',
    data: body,
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

export interface ShootingBatchApproveResult {
  success?: boolean;
  approved?: number;
  updated?: number;
  skipped?: number;
}

export async function fetchShootingExpenses(
  params: ShootingExpenseListParams,
): Promise<ShootingExpenseListResult> {
  return getJson<ShootingExpenseListResult>(`${BASE}${buildQuery(params)}`);
}

export async function fetchShootingExpenseStats(): Promise<ShootingExpenseStats> {
  return getJson<ShootingExpenseStats>(`${BASE}/stats`);
}

export async function createShootingExpense(
  body: CreateShootingExpenseRequest,
): Promise<{ id: number }> {
  return postJson<{ id: number }>(`${BASE}`, body);
}

export async function fetchShootingExpense(
  id: number,
): Promise<ShootingExpense> {
  return getJson<ShootingExpense>(`${BASE}/${id}`);
}

export async function updateShootingExpense(
  id: number,
  body: UpdateShootingExpenseRequest,
): Promise<ShootingExpense> {
  return patchJson<ShootingExpense>(`${BASE}/${id}`, body);
}

export async function batchApproveShootingExpenses(
  body: BatchIdsApproveRequest,
): Promise<ShootingBatchApproveResult> {
  return postJson<ShootingBatchApproveResult>(`${BASE}/batch-approve`, body);
}

export async function reimburseShootingExpense(
  id: number,
): Promise<{ success: boolean }> {
  return postJson<{ success: boolean }>(`${BASE}/${id}/reimburse`);
}

export async function deleteShootingExpense(
  id: number,
): Promise<{ success: boolean }> {
  return deleteJson<{ success: boolean }>(`${BASE}/${id}`);
}

/** 项目下拉数据源（最多 100 条） */
export async function fetchShootingProjectOptions(): Promise<
  VideoCoreProject[]
> {
  const result = await getJson<VideoCoreProjectListResult>(
    `${PROJECTS_URL}${buildQuery({ page: 1, pageSize: 100 })}`,
  );
  return result.items;
}
