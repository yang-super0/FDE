import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  CreateVenueExpenseRequest,
  UpdateVenueExpenseRequest,
  VenueExpense,
  VenueExpenseListParams,
  VenueExpenseListResult,
  VenueExpenseStatusRequest,
  VideoCoreProject,
  VideoCoreProjectListResult,
} from '@shared/api.interface';

const BASE: string = '/api/video-core/venue-expenses';
const PROJECTS_URL: string = '/api/video-core/projects';

export interface ApproveVenueExpenseBody {
  approved: boolean;
  rejectReason?: string;
}

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
  const response = await axiosForBackend({ url, method: 'PATCH', data: body });
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

export async function fetchVenueExpenses(
  params: VenueExpenseListParams,
): Promise<VenueExpenseListResult> {
  return getJson<VenueExpenseListResult>(`${BASE}${buildQuery(params)}`);
}

export async function fetchVenueExpense(
  id: number,
): Promise<VenueExpense> {
  return getJson<VenueExpense>(`${BASE}/${id}`);
}

export async function createVenueExpense(
  body: CreateVenueExpenseRequest,
): Promise<{ id: number }> {
  return postJson<{ id: number }>(`${BASE}`, body);
}

export async function updateVenueExpense(
  id: number,
  body: UpdateVenueExpenseRequest,
): Promise<VenueExpense> {
  return patchJson<VenueExpense>(`${BASE}/${id}`, body);
}

export async function approveVenueExpense(
  id: number,
  body: ApproveVenueExpenseBody,
): Promise<{ success: boolean }> {
  return postJson<{ success: boolean }>(`${BASE}/${id}/approve`, body);
}

export async function setVenueExpenseStatus(
  id: number,
  body: VenueExpenseStatusRequest,
): Promise<{ success: boolean }> {
  return postJson<{ success: boolean }>(`${BASE}/${id}/status`, body);
}

export async function returnVenueDeposit(
  id: number,
): Promise<{ success: boolean }> {
  return postJson<{ success: boolean }>(`${BASE}/${id}/deposit-return`);
}

export async function deductVenueDeposit(
  id: number,
): Promise<{ success: boolean }> {
  return postJson<{ success: boolean }>(`${BASE}/${id}/deposit-deduct`);
}

export async function deleteVenueExpense(
  id: number,
): Promise<{ success: boolean }> {
  return deleteJson<{ success: boolean }>(`${BASE}/${id}`);
}

export async function fetchVenueProjectOptions(): Promise<VideoCoreProject[]> {
  const result: VideoCoreProjectListResult = await getJson<VideoCoreProjectListResult>(
    `${PROJECTS_URL}${buildQuery({ page: 1, pageSize: 100 })}`,
  );
  return result.items;
}
