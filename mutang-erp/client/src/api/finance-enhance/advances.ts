import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  AdvanceReturnRequest,
  CreateFinanceAdvanceRequest,
  CreateFinanceIncentiveRequest,
  FinanceAdvanceListParams,
  FinanceAdvanceListResult,
  FinanceIncentiveListParams,
  FinanceIncentiveListResult,
  IncentiveIssueRequest,
} from '@shared/api.interface';

const BASE: string = '/api/finance-enhance';

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

export interface IncentiveApproveRequest {
  approved: boolean;
  rejectReason?: string;
}

// ---------- 垫款管理 ----------

export async function fetchFinanceAdvances(
  params: FinanceAdvanceListParams,
): Promise<FinanceAdvanceListResult> {
  return getJson<FinanceAdvanceListResult>(
    `${BASE}/advances${buildQuery(params)}`,
  );
}

export async function createFinanceAdvance(
  body: CreateFinanceAdvanceRequest,
): Promise<{ id: number }> {
  return postJson<{ id: number }>(`${BASE}/advances`, body);
}

export async function returnFinanceAdvance(
  id: number,
  body: AdvanceReturnRequest,
): Promise<{ success: boolean }> {
  return postJson<{ success: boolean }>(`${BASE}/advances/${id}/return`, body);
}

export async function badDebtFinanceAdvance(
  id: number,
): Promise<{ success: boolean }> {
  return postJson<{ success: boolean }>(`${BASE}/advances/${id}/bad-debt`);
}

export async function deleteFinanceAdvance(
  id: number,
): Promise<{ success: boolean }> {
  return deleteJson<{ success: boolean }>(`${BASE}/advances/${id}`);
}

// ---------- 激励管理 ----------

export async function fetchFinanceIncentives(
  params: FinanceIncentiveListParams,
): Promise<FinanceIncentiveListResult> {
  return getJson<FinanceIncentiveListResult>(
    `${BASE}/incentives${buildQuery(params)}`,
  );
}

export async function createFinanceIncentive(
  body: CreateFinanceIncentiveRequest,
): Promise<{ id: number }> {
  return postJson<{ id: number }>(`${BASE}/incentives`, body);
}

export async function approveFinanceIncentive(
  id: number,
  body: IncentiveApproveRequest,
): Promise<{ success: boolean }> {
  return postJson<{ success: boolean }>(
    `${BASE}/incentives/${id}/approve`,
    body,
  );
}

export async function issueFinanceIncentive(
  id: number,
  body: IncentiveIssueRequest,
): Promise<{ success: boolean }> {
  return postJson<{ success: boolean }>(
    `${BASE}/incentives/${id}/issue`,
    body,
  );
}

export async function deleteFinanceIncentive(
  id: number,
): Promise<{ success: boolean }> {
  return deleteJson<{ success: boolean }>(`${BASE}/incentives/${id}`);
}
