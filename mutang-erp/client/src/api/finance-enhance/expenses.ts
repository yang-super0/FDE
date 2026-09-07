import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  CreateFinanceExpenseRequest,
  CreateFinanceFeeRequest,
  CreateFinanceDepositRequest,
  CreateFinanceIncomeRequest,
  DepositReturnRequest,
  ExpensePayRequest,
  FeeReimburseRequest,
  FinanceDepositListParams,
  FinanceDepositListResult,
  FinanceExpenseListParams,
  FinanceExpenseListResult,
  FinanceFeeListParams,
  FinanceFeeListResult,
  FinanceIncomeListParams,
  FinanceIncomeListResult,
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

export interface ExpenseApproveRequest {
  approved: boolean;
  rejectReason?: string;
}

export interface FeeApproveRequest {
  approved: boolean;
  rejectReason?: string;
}

export interface UpdateFinanceFeeBody {
  feeType?: string;
  applicant?: string;
  department?: string;
  amount?: number;
  expenseDate?: string;
  invoiceNo?: string;
  attachmentUrl?: string;
  remark?: string;
}

export interface FinanceIncomeSummaryItem {
  incomeType: string;
  totalAmount: number;
  count: number;
}

export interface FinanceIncomeSummaryResult {
  items: FinanceIncomeSummaryItem[];
}

export interface FinanceIncomeSummaryParams {
  dateFrom?: string;
  dateTo?: string;
}

// ---------- 收入管理 ----------

export async function fetchFinanceIncomes(
  params: FinanceIncomeListParams,
): Promise<FinanceIncomeListResult> {
  return getJson<FinanceIncomeListResult>(
    `${BASE}/incomes${buildQuery(params)}`,
  );
}

export async function createFinanceIncome(
  body: CreateFinanceIncomeRequest,
): Promise<{ id: number }> {
  return postJson<{ id: number }>(`${BASE}/incomes`, body);
}

export async function confirmFinanceIncome(
  id: number,
): Promise<{ success: boolean }> {
  return postJson<{ success: boolean }>(`${BASE}/incomes/${id}/confirm`);
}

export async function deleteFinanceIncome(
  id: number,
): Promise<{ success: boolean }> {
  return deleteJson<{ success: boolean }>(`${BASE}/incomes/${id}`);
}

export async function fetchFinanceIncomeSummary(
  params: FinanceIncomeSummaryParams,
): Promise<FinanceIncomeSummaryResult> {
  return getJson<FinanceIncomeSummaryResult>(
    `${BASE}/incomes/summary${buildQuery(params)}`,
  );
}

// ---------- 支出管理 ----------

export async function fetchFinanceExpenses(
  params: FinanceExpenseListParams,
): Promise<FinanceExpenseListResult> {
  return getJson<FinanceExpenseListResult>(
    `${BASE}/expenses${buildQuery(params)}`,
  );
}

export async function createFinanceExpense(
  body: CreateFinanceExpenseRequest,
): Promise<{ id: number }> {
  return postJson<{ id: number }>(`${BASE}/expenses`, body);
}

export async function approveFinanceExpense(
  id: number,
  body: ExpenseApproveRequest,
): Promise<{ success: boolean }> {
  return postJson<{ success: boolean }>(
    `${BASE}/expenses/${id}/approve`,
    body,
  );
}

export async function payFinanceExpense(
  id: number,
  body: ExpensePayRequest,
): Promise<{ success: boolean }> {
  return postJson<{ success: boolean }>(`${BASE}/expenses/${id}/pay`, body);
}

export async function deleteFinanceExpense(
  id: number,
): Promise<{ success: boolean }> {
  return deleteJson<{ success: boolean }>(`${BASE}/expenses/${id}`);
}

// ---------- 费用报销 ----------

export async function fetchFinanceFees(
  params: FinanceFeeListParams,
): Promise<FinanceFeeListResult> {
  return getJson<FinanceFeeListResult>(`${BASE}/fees${buildQuery(params)}`);
}

export async function createFinanceFee(
  body: CreateFinanceFeeRequest,
): Promise<{ id: number }> {
  return postJson<{ id: number }>(`${BASE}/fees`, body);
}

export async function updateFinanceFee(
  id: number,
  body: UpdateFinanceFeeBody,
): Promise<{ id: number }> {
  return patchJson<{ id: number }>(`${BASE}/fees/${id}`, body);
}

export async function submitFinanceFee(
  id: number,
): Promise<{ success: boolean }> {
  return postJson<{ success: boolean }>(`${BASE}/fees/${id}/submit`);
}

export async function approveFinanceFee(
  id: number,
  body: FeeApproveRequest,
): Promise<{ success: boolean }> {
  return postJson<{ success: boolean }>(`${BASE}/fees/${id}/approve`, body);
}

export async function reimburseFinanceFee(
  id: number,
  body: FeeReimburseRequest,
): Promise<{ success: boolean }> {
  return postJson<{ success: boolean }>(`${BASE}/fees/${id}/reimburse`, body);
}

export async function deleteFinanceFee(
  id: number,
): Promise<{ success: boolean }> {
  return deleteJson<{ success: boolean }>(`${BASE}/fees/${id}`);
}

// ---------- 保证金与押金 ----------

export async function fetchFinanceDeposits(
  params: FinanceDepositListParams,
): Promise<FinanceDepositListResult> {
  return getJson<FinanceDepositListResult>(
    `${BASE}/deposits${buildQuery(params)}`,
  );
}

export async function createFinanceDeposit(
  body: CreateFinanceDepositRequest,
): Promise<{ id: number }> {
  return postJson<{ id: number }>(`${BASE}/deposits`, body);
}

export async function returnFinanceDeposit(
  id: number,
  body: DepositReturnRequest,
): Promise<{ success: boolean }> {
  return postJson<{ success: boolean }>(`${BASE}/deposits/${id}/return`, body);
}

export async function confiscateFinanceDeposit(
  id: number,
): Promise<{ success: boolean }> {
  return postJson<{ success: boolean }>(`${BASE}/deposits/${id}/confiscate`);
}

export async function deleteFinanceDeposit(
  id: number,
): Promise<{ success: boolean }> {
  return deleteJson<{ success: boolean }>(`${BASE}/deposits/${id}`);
}
