import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  CreateHrPerformanceBody,
  CreateHrSalaryBody,
  HrPerformanceAppealBody,
  HrPerformanceLeaderScoreBody,
  HrPerformanceListParams,
  HrPerformancePage,
  HrPerformanceSelfScoreBody,
  HrSalaryBatchCalculateBody,
  HrSalaryListParams,
  HrSalaryPage,
  HrSalaryPayslip,
  UpdateHrPerformanceBody,
  UpdateHrSalaryBody,
} from '@shared/api.interface';

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

/* ============ 工资管理 ============ */

export async function fetchHrSalaries(
  params: HrSalaryListParams,
): Promise<HrSalaryPage> {
  return getJson<HrSalaryPage>(`${BASE}/salaries${buildQuery(params)}`);
}

export async function createHrSalary(
  body: CreateHrSalaryBody,
): Promise<{ id: number }> {
  return postJson<{ id: number }>(`${BASE}/salaries`, body);
}

export async function updateHrSalary(
  id: number,
  body: UpdateHrSalaryBody,
): Promise<{ success: boolean }> {
  return patchJson<{ success: boolean }>(`${BASE}/salaries/${id}`, body);
}

export async function deleteHrSalary(
  id: number,
): Promise<{ success: boolean }> {
  return deleteJson<{ success: boolean }>(`${BASE}/salaries/${id}`);
}

export async function calculateHrSalary(
  id: number,
): Promise<{ success: boolean }> {
  return postJson<{ success: boolean }>(`${BASE}/salaries/${id}/calculate`);
}

export async function batchCalculateHrSalaries(
  body: HrSalaryBatchCalculateBody,
): Promise<{ updated: number }> {
  return postJson<{ updated: number }>(`${BASE}/salaries/batch-calculate`, body);
}

export async function payHrSalary(
  id: number,
): Promise<{ success: boolean }> {
  return postJson<{ success: boolean }>(`${BASE}/salaries/${id}/pay`);
}

export async function batchPayHrSalaries(
  body: HrSalaryBatchCalculateBody,
): Promise<{ updated: number }> {
  return postJson<{ updated: number }>(`${BASE}/salaries/batch-pay`, body);
}

export async function confirmHrSalary(
  id: number,
): Promise<{ success: boolean }> {
  return postJson<{ success: boolean }>(`${BASE}/salaries/${id}/confirm`);
}

export async function fetchHrSalaryPayslip(
  id: number,
): Promise<HrSalaryPayslip> {
  return getJson<HrSalaryPayslip>(`${BASE}/salaries/${id}/payslip`);
}

/* ============ 绩效管理 ============ */

export async function fetchHrPerformances(
  params: HrPerformanceListParams,
): Promise<HrPerformancePage> {
  return getJson<HrPerformancePage>(`${BASE}/performances${buildQuery(params)}`);
}

export async function createHrPerformance(
  body: CreateHrPerformanceBody,
): Promise<{ id: number }> {
  return postJson<{ id: number }>(`${BASE}/performances`, body);
}

export async function updateHrPerformance(
  id: number,
  body: UpdateHrPerformanceBody,
): Promise<{ success: boolean }> {
  return patchJson<{ success: boolean }>(`${BASE}/performances/${id}`, body);
}

export async function deleteHrPerformance(
  id: number,
): Promise<{ success: boolean }> {
  return deleteJson<{ success: boolean }>(`${BASE}/performances/${id}`);
}

export async function selfScoreHrPerformance(
  id: number,
  body: HrPerformanceSelfScoreBody,
): Promise<{ success: boolean }> {
  return postJson<{ success: boolean }>(`${BASE}/performances/${id}/self-score`, body);
}

export async function leaderScoreHrPerformance(
  id: number,
  body: HrPerformanceLeaderScoreBody,
): Promise<{ success: boolean }> {
  return postJson<{ success: boolean }>(`${BASE}/performances/${id}/leader-score`, body);
}

export async function appealHrPerformance(
  id: number,
  body: HrPerformanceAppealBody,
): Promise<{ success: boolean }> {
  return postJson<{ success: boolean }>(`${BASE}/performances/${id}/appeal`, body);
}
