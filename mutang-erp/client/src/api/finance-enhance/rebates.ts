import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import { fetchFinanceAccounts } from '@client/src/api/finance-core';
import type {
  CreateFinanceConsumptionRequest,
  CreateFinanceDeductionRequest,
  CreateFinanceRebateRequest,
  DeductionApproveRequest,
  FinanceAccountListResult,
  FinanceConsumptionListParams,
  FinanceConsumptionListResult,
  FinanceDeductionListParams,
  FinanceDeductionListResult,
  FinancePortListResult,
  FinanceRebateListParams,
  FinanceRebateListResult,
} from '@shared/api.interface';

const BASE: string = '/api/finance-enhance';

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

/* ============ 请求体类型（shared 未定义的更新/操作体） ============ */

export interface UpdateFinanceRebateBody {
  customerId?: string;
  customerName?: string;
  portId?: number;
  period?: string;
  consumptionBase?: number;
  rebateRate?: number;
  remark?: string;
}

export interface IssueFinanceRebateBody {
  accountId: number;
}

export interface ApproveFinanceDeductionBody extends DeductionApproveRequest {
  rejectReason?: string;
}

export interface UpdateFinanceConsumptionBody {
  customerId?: string;
  adAccountId?: string;
  portId?: number | null;
  consumptionDate?: string;
  amount?: number;
  platformData?: number;
  systemData?: number;
  remark?: string;
}

/* ============ 后返管理 ============ */

export async function fetchFinanceRebates(
  params: FinanceRebateListParams,
): Promise<FinanceRebateListResult> {
  return getJson<FinanceRebateListResult>(`${BASE}/rebates${buildQuery(params)}`);
}

export async function createFinanceRebate(
  body: CreateFinanceRebateRequest,
): Promise<{ id: number }> {
  return postJson<{ id: number }>(`${BASE}/rebates`, body);
}

export async function updateFinanceRebate(
  id: number,
  body: UpdateFinanceRebateBody,
): Promise<{ success: boolean }> {
  return patchJson<{ success: boolean }>(`${BASE}/rebates/${id}`, body);
}

export async function calculateFinanceRebate(
  id: number,
): Promise<{ success: boolean }> {
  return postJson<{ success: boolean }>(`${BASE}/rebates/${id}/calculate`);
}

export async function issueFinanceRebate(
  id: number,
  accountId: number,
): Promise<{ success: boolean }> {
  return postJson<{ success: boolean }>(`${BASE}/rebates/${id}/issue`, {
    accountId,
  } satisfies IssueFinanceRebateBody);
}

export async function cancelFinanceRebate(
  id: number,
): Promise<{ success: boolean }> {
  return postJson<{ success: boolean }>(`${BASE}/rebates/${id}/cancel`);
}

export async function deleteFinanceRebate(
  id: number,
): Promise<{ success: boolean }> {
  return deleteJson<{ success: boolean }>(`${BASE}/rebates/${id}`);
}

/* ============ 扣减管理 ============ */

export async function fetchFinanceDeductions(
  params: FinanceDeductionListParams,
): Promise<FinanceDeductionListResult> {
  return getJson<FinanceDeductionListResult>(
    `${BASE}/deductions${buildQuery(params)}`,
  );
}

export async function createFinanceDeduction(
  body: CreateFinanceDeductionRequest,
): Promise<{ id: number }> {
  return postJson<{ id: number }>(`${BASE}/deductions`, body);
}

export async function approveFinanceDeduction(
  id: number,
  body: ApproveFinanceDeductionBody,
): Promise<{ success: boolean }> {
  return postJson<{ success: boolean }>(`${BASE}/deductions/${id}/approve`, body);
}

export async function executeFinanceDeduction(
  id: number,
): Promise<{ success: boolean }> {
  return postJson<{ success: boolean }>(`${BASE}/deductions/${id}/execute`);
}

export async function deleteFinanceDeduction(
  id: number,
): Promise<{ success: boolean }> {
  return deleteJson<{ success: boolean }>(`${BASE}/deductions/${id}`);
}

/* ============ 消耗管理 ============ */

export async function fetchFinanceConsumptions(
  params: FinanceConsumptionListParams,
): Promise<FinanceConsumptionListResult> {
  return getJson<FinanceConsumptionListResult>(
    `${BASE}/consumptions${buildQuery(params)}`,
  );
}

export async function createFinanceConsumption(
  body: CreateFinanceConsumptionRequest,
): Promise<{ id: number }> {
  return postJson<{ id: number }>(`${BASE}/consumptions`, body);
}

export async function updateFinanceConsumption(
  id: number,
  body: UpdateFinanceConsumptionBody,
): Promise<{ success: boolean }> {
  return patchJson<{ success: boolean }>(`${BASE}/consumptions/${id}`, body);
}

export async function checkFinanceConsumption(
  id: number,
): Promise<{ success: boolean }> {
  return postJson<{ success: boolean }>(`${BASE}/consumptions/${id}/check`);
}

/* ============ 下拉数据源 ============ */

/** 发放 / 扣减使用的资金账户下拉（复用 finance-core 现成接口） */
export async function fetchRebateAccountOptions(): Promise<FinanceAccountListResult> {
  return fetchFinanceAccounts({ page: 1, pageSize: 100 });
}

/** 端口下拉 */
export async function fetchFinanceEnhancePorts(): Promise<FinancePortListResult> {
  return getJson<FinancePortListResult>(
    `${BASE}/ports${buildQuery({ page: 1, pageSize: 100 })}`,
  );
}
