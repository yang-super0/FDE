import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import { fetchFinanceAccounts } from '@client/src/api/finance-core';
import type {
  CreateFinanceBankAccountRequest,
  CreateFinanceCoinReturnRequest,
  CreateFinancePortRequest,
  CreateFinanceRechargeRequest,
  CreateFinanceRefundRequest,
  CustomerFinanceDetailListParams,
  CustomerFinanceDetailListResult,
  FinanceAccount,
  FinanceBankAccountListParams,
  FinanceBankAccountListResult,
  FinanceCoinReturnListParams,
  FinanceCoinReturnListResult,
  FinancePortListParams,
  FinancePortListResult,
  FinanceRechargeListParams,
  FinanceRechargeListResult,
  FinanceRefundListParams,
  FinanceRefundListResult,
  RefundApproveRequest,
  UpdateFinanceBankAccountRequest,
  UpdateFinancePortRequest,
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

/* ============ 请求体类型（shared 未定义的局部请求体） ============ */

export interface CreateCustomerAdjustmentRequest {
  customerId: string;
  customerName: string;
  accountId: number;
  transactionType: '调账';
  amount: number;
  remark?: string;
}

export interface SetFinanceBalanceRequest {
  balance: number;
}

export interface FinanceAccountOption {
  id: number;
  accountName: string;
}

/* ============ 资金账户选项（复用 finance-core 账户列表） ============ */

export async function fetchFinanceAccountsOptions(): Promise<FinanceAccountOption[]> {
  const result = await fetchFinanceAccounts({ page: 1, pageSize: 100 });
  return result.items
    .filter((account: FinanceAccount) => account.status === '启用')
    .map((account: FinanceAccount) => ({
      id: account.id,
      accountName: account.accountName,
    }));
}

/* ============ 客户明细 / 调账 ============ */

export async function fetchFinanceCustomerDetails(
  params: CustomerFinanceDetailListParams,
): Promise<CustomerFinanceDetailListResult> {
  return getJson<CustomerFinanceDetailListResult>(
    `${BASE}/customer-details${buildQuery(params)}`,
  );
}

export async function createFinanceCustomerAdjustment(
  body: CreateCustomerAdjustmentRequest,
): Promise<{ id: number }> {
  return postJson<{ id: number }>(`${BASE}/customer-details`, body);
}

/* ============ 充值管理 ============ */

export async function fetchFinanceRecharges(
  params: FinanceRechargeListParams,
): Promise<FinanceRechargeListResult> {
  return getJson<FinanceRechargeListResult>(
    `${BASE}/recharges${buildQuery(params)}`,
  );
}

export async function createFinanceRecharge(
  body: CreateFinanceRechargeRequest,
): Promise<{ id: number }> {
  return postJson<{ id: number }>(`${BASE}/recharges`, body);
}

export async function confirmFinanceRecharge(
  id: number,
): Promise<{ success: boolean }> {
  return postJson<{ success: boolean }>(`${BASE}/recharges/${id}/confirm`);
}

export async function cancelFinanceRecharge(
  id: number,
): Promise<{ success: boolean }> {
  return postJson<{ success: boolean }>(`${BASE}/recharges/${id}/cancel`);
}

export async function deleteFinanceRecharge(
  id: number,
): Promise<{ success: boolean }> {
  return deleteJson<{ success: boolean }>(`${BASE}/recharges/${id}`);
}

/* ============ 退款管理 ============ */

export async function fetchFinanceRefunds(
  params: FinanceRefundListParams,
): Promise<FinanceRefundListResult> {
  return getJson<FinanceRefundListResult>(
    `${BASE}/refunds${buildQuery(params)}`,
  );
}

export async function createFinanceRefund(
  body: CreateFinanceRefundRequest,
): Promise<{ id: number }> {
  return postJson<{ id: number }>(`${BASE}/refunds`, body);
}

export async function approveFinanceRefund(
  id: number,
  body: RefundApproveRequest,
): Promise<{ success: boolean }> {
  return postJson<{ success: boolean }>(`${BASE}/refunds/${id}/approve`, body);
}

export async function executeFinanceRefund(
  id: number,
): Promise<{ success: boolean }> {
  return postJson<{ success: boolean }>(`${BASE}/refunds/${id}/execute`);
}

export async function deleteFinanceRefund(
  id: number,
): Promise<{ success: boolean }> {
  return deleteJson<{ success: boolean }>(`${BASE}/refunds/${id}`);
}

/* ============ 退币管理 ============ */

export async function fetchFinanceCoinReturns(
  params: FinanceCoinReturnListParams,
): Promise<FinanceCoinReturnListResult> {
  return getJson<FinanceCoinReturnListResult>(
    `${BASE}/coin-returns${buildQuery(params)}`,
  );
}

export async function createFinanceCoinReturn(
  body: CreateFinanceCoinReturnRequest,
): Promise<{ id: number }> {
  return postJson<{ id: number }>(`${BASE}/coin-returns`, body);
}

export async function processFinanceCoinReturn(
  id: number,
): Promise<{ success: boolean }> {
  return postJson<{ success: boolean }>(`${BASE}/coin-returns/${id}/process`);
}

export async function finishFinanceCoinReturn(
  id: number,
): Promise<{ success: boolean }> {
  return postJson<{ success: boolean }>(`${BASE}/coin-returns/${id}/finish`);
}

export async function failFinanceCoinReturn(
  id: number,
): Promise<{ success: boolean }> {
  return postJson<{ success: boolean }>(`${BASE}/coin-returns/${id}/fail`);
}

export async function deleteFinanceCoinReturn(
  id: number,
): Promise<{ success: boolean }> {
  return deleteJson<{ success: boolean }>(`${BASE}/coin-returns/${id}`);
}

/* ============ 端口管理 ============ */

export async function fetchFinancePorts(
  params: FinancePortListParams,
): Promise<FinancePortListResult> {
  return getJson<FinancePortListResult>(
    `${BASE}/ports${buildQuery(params)}`,
  );
}

export async function createFinancePort(
  body: CreateFinancePortRequest,
): Promise<{ id: number }> {
  return postJson<{ id: number }>(`${BASE}/ports`, body);
}

export async function updateFinancePort(
  id: number,
  body: UpdateFinancePortRequest,
): Promise<{ success: boolean }> {
  return patchJson<{ success: boolean }>(`${BASE}/ports/${id}`, body);
}

export async function enableFinancePort(
  id: number,
  enabled: boolean,
): Promise<{ success: boolean }> {
  const action: string = enabled ? 'enable' : 'disable';
  return postJson<{ success: boolean }>(`${BASE}/ports/${id}/${action}`);
}

export async function setFinancePortBalance(
  id: number,
  balance: number,
): Promise<{ success: boolean }> {
  return postJson<{ success: boolean }>(`${BASE}/ports/${id}/balance`, { balance });
}

export async function deleteFinancePort(
  id: number,
): Promise<{ success: boolean }> {
  return deleteJson<{ success: boolean }>(`${BASE}/ports/${id}`);
}

/* ============ 银行账户管理 ============ */

export async function fetchFinanceBankAccounts(
  params: FinanceBankAccountListParams,
): Promise<FinanceBankAccountListResult> {
  return getJson<FinanceBankAccountListResult>(
    `${BASE}/bank-accounts${buildQuery(params)}`,
  );
}

export async function createFinanceBankAccount(
  body: CreateFinanceBankAccountRequest,
): Promise<{ id: number }> {
  return postJson<{ id: number }>(`${BASE}/bank-accounts`, body);
}

export async function updateFinanceBankAccount(
  id: number,
  body: UpdateFinanceBankAccountRequest,
): Promise<{ success: boolean }> {
  return patchJson<{ success: boolean }>(`${BASE}/bank-accounts/${id}`, body);
}

export async function enableFinanceBankAccount(
  id: number,
  enabled: boolean,
): Promise<{ success: boolean }> {
  const action: string = enabled ? 'enable' : 'disable';
  return postJson<{ success: boolean }>(`${BASE}/bank-accounts/${id}/${action}`);
}

export async function setFinanceBankAccountBalance(
  id: number,
  balance: number,
): Promise<{ success: boolean }> {
  return postJson<{ success: boolean }>(
    `${BASE}/bank-accounts/${id}/balance`,
    { balance },
  );
}

export async function deleteFinanceBankAccount(
  id: number,
): Promise<{ success: boolean }> {
  return deleteJson<{ success: boolean }>(`${BASE}/bank-accounts/${id}`);
}
