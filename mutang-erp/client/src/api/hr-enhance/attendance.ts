import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  CreateHrAttendanceBody,
  HrAttendance,
  HrAttendanceCheckinBody,
  HrAttendanceLeaveApplyBody,
  HrAttendanceListParams,
  HrAttendanceOvertimeBody,
  HrAttendancePage,
  HrAttendanceStats,
  UpdateHrAttendanceBody,
} from '@shared/api.interface';

const BASE: string = '/api/hr-enhance/attendances';

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

/* ============ 请求体类型（shared 未定义的局部请求体） ============ */

export interface HrAttendanceLeaveRejectBody {
  reason: string;
}

export interface HrAttendanceStatsParams {
  month?: string;
  department?: string;
  employeeId?: string;
}

/* ============ 列表 / 增删改 ============ */

export async function fetchHrAttendances(
  params: HrAttendanceListParams,
): Promise<HrAttendancePage> {
  return getJson<HrAttendancePage>(`${BASE}${buildQuery(params)}`);
}

export async function createHrAttendance(
  body: CreateHrAttendanceBody,
): Promise<{ id: number }> {
  return postJson<{ id: number }>(`${BASE}`, body);
}

export async function updateHrAttendance(
  id: number,
  body: UpdateHrAttendanceBody,
): Promise<{ success: boolean }> {
  return patchJson<{ success: boolean }>(`${BASE}/${id}`, body);
}

export async function deleteHrAttendance(
  id: number,
): Promise<{ success: boolean }> {
  return deleteJson<{ success: boolean }>(`${BASE}/${id}`);
}

/* ============ 签到 / 签退 ============ */

export async function checkInHrAttendance(
  id: number,
  body: HrAttendanceCheckinBody,
): Promise<HrAttendance> {
  return postJson<HrAttendance>(`${BASE}/${id}/check-in`, body);
}

export async function checkOutHrAttendance(
  id: number,
  body: HrAttendanceCheckinBody,
): Promise<HrAttendance> {
  return postJson<HrAttendance>(`${BASE}/${id}/check-out`, body);
}

/* ============ 请假：申请 / 审批 / 驳回 ============ */

export async function applyHrAttendanceLeave(
  id: number,
  body: HrAttendanceLeaveApplyBody,
): Promise<HrAttendance> {
  return postJson<HrAttendance>(`${BASE}/${id}/leave-apply`, body);
}

export async function approveHrAttendanceLeave(
  id: number,
): Promise<HrAttendance> {
  return postJson<HrAttendance>(`${BASE}/${id}/leave-approve`);
}

export async function rejectHrAttendanceLeave(
  id: number,
  body: HrAttendanceLeaveRejectBody,
): Promise<HrAttendance> {
  return postJson<HrAttendance>(`${BASE}/${id}/leave-reject`, body);
}

/* ============ 加班登记 / 统计 ============ */

export async function registerHrAttendanceOvertime(
  id: number,
  body: HrAttendanceOvertimeBody,
): Promise<HrAttendance> {
  return postJson<HrAttendance>(`${BASE}/${id}/overtime`, body);
}

export async function fetchHrAttendanceStats(
  params: HrAttendanceStatsParams,
): Promise<HrAttendanceStats> {
  return getJson<HrAttendanceStats>(`${BASE}/stats${buildQuery(params)}`);
}
