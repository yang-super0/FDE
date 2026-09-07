import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  CreateHrEmployeeBody,
  HrDashboardData,
  HrEmployee,
  HrEmployeeLeaveApplyBody,
  HrEmployeeListParams,
  HrEmployeePage,
  HrEmployeeRegularBody,
  HrEmployeeTransferConfirmBody,
  UpdateHrEmployeeBody,
} from '@shared/api.interface';

/** 调岗申请请求体（shared 未定义的局部请求体） */
export interface HrEmployeeTransferApplyBody {
  reason?: string;
}

const BASE: string = '/api/hr-enhance';

async function getJson<T>(url: string): Promise<T> {
  const response = await axiosForBackend({ url, method: 'GET' });
  return response.data as T;
}

async function postJson<T>(url: string, body?: unknown): Promise<T> {
  const response = await axiosForBackend({ url, method: 'POST', data: body ?? {} });
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

/* ============ 员工档案 ============ */

export async function fetchHrEmployees(
  params: HrEmployeeListParams,
): Promise<HrEmployeePage> {
  return getJson<HrEmployeePage>(`${BASE}/employees${buildQuery(params)}`);
}

export async function fetchHrEmployee(id: number): Promise<HrEmployee> {
  return getJson<HrEmployee>(`${BASE}/employees/${id}`);
}

export async function createHrEmployee(
  body: CreateHrEmployeeBody,
): Promise<HrEmployee> {
  return postJson<HrEmployee>(`${BASE}/employees`, body);
}

export async function updateHrEmployee(
  id: number,
  body: UpdateHrEmployeeBody,
): Promise<HrEmployee> {
  return patchJson<HrEmployee>(`${BASE}/employees/${id}`, body);
}

export async function deleteHrEmployee(
  id: number,
): Promise<{ success: boolean }> {
  return deleteJson<{ success: boolean }>(`${BASE}/employees/${id}`);
}

/* ============ 员工全周期流转 ============ */

export async function regularHrEmployee(
  id: number,
  body: HrEmployeeRegularBody,
): Promise<HrEmployee> {
  return postJson<HrEmployee>(`${BASE}/employees/${id}/regular`, body);
}

export async function transferApplyHrEmployee(
  id: number,
  body: HrEmployeeTransferApplyBody,
): Promise<HrEmployee> {
  return postJson<HrEmployee>(`${BASE}/employees/${id}/transfer-apply`, body);
}

export async function transferConfirmHrEmployee(
  id: number,
  body: HrEmployeeTransferConfirmBody,
): Promise<HrEmployee> {
  return postJson<HrEmployee>(`${BASE}/employees/${id}/transfer-confirm`, body);
}

export async function leaveApplyHrEmployee(
  id: number,
  body: HrEmployeeLeaveApplyBody,
): Promise<HrEmployee> {
  return postJson<HrEmployee>(`${BASE}/employees/${id}/leave-apply`, body);
}

export async function leaveConfirmHrEmployee(
  id: number,
): Promise<HrEmployee> {
  return postJson<HrEmployee>(`${BASE}/employees/${id}/leave-confirm`);
}

/* ============ 人资看板 ============ */

export async function fetchHrDashboard(): Promise<HrDashboardData> {
  return getJson<HrDashboardData>(`${BASE}/dashboard`);
}
