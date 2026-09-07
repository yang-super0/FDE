import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  ApproveFinancePaymentRequest,
  CreateFinanceAccountRequest,
  CreateFinanceCostRequest,
  CreateFinanceInvoiceRequest,
  CreateFinancePaymentRequest,
  CreateFinanceReceiptRequest,
  FinanceAccount,
  FinanceAccountListParams,
  FinanceAccountListResult,
  FinanceAccountTxn,
  FinanceCost,
  FinanceCostAnalysisReport,
  FinanceCostListParams,
  FinanceCostListResult,
  FinanceCostStats,
  FinanceIncomeExpenseReport,
  FinanceInvoice,
  FinanceInvoiceListParams,
  FinanceInvoiceListResult,
  FinancePayment,
  FinancePaymentListParams,
  FinancePaymentListResult,
  FinanceProfitReport,
  FinanceReceipt,
  FinanceReceiptListParams,
  FinanceReceiptListResult,
  FinanceReceivablePayableReport,
  FinanceReportRangeParams,
  FinanceReportTotals,
  FinanceSettlement,
  FinanceSettlementListParams,
  FinanceSettlementListResult,
  SendFinanceInvoiceRequest,
  UpdateFinanceAccountRequest,
  UpdateFinanceCostRequest,
  UpdateFinanceInvoiceRequest,
  UpdateFinancePaymentRequest,
  UpdateFinanceReceiptRequest,
  WriteOffFinanceReceiptRequest,
} from '@shared/api.interface';

const BASE: string = '/api/finance-core';

export interface PageData<T> {
  items: T[];
  total: number;
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

// ---------- 资金账户 ----------

export async function fetchFinanceAccounts(
  params: FinanceAccountListParams,
): Promise<FinanceAccountListResult> {
  return getJson<FinanceAccountListResult>(
    `${BASE}/accounts${buildQuery(params)}`,
  );
}

export async function createFinanceAccount(
  body: CreateFinanceAccountRequest,
): Promise<{ id: number }> {
  return postJson<{ id: number }>(`${BASE}/accounts`, body);
}

export async function updateFinanceAccount(
  id: number,
  body: UpdateFinanceAccountRequest,
): Promise<FinanceAccount> {
  return patchJson<FinanceAccount>(`${BASE}/accounts/${id}`, body);
}

export async function setFinanceAccountStatus(
  id: number,
  status: string,
): Promise<{ success: boolean }> {
  return postJson<{ success: boolean }>(`${BASE}/accounts/${id}/status`, {
    status,
  });
}

export async function fetchFinanceAccountTxns(
  id: number,
  page: number,
  pageSize: number,
): Promise<PageData<FinanceAccountTxn>> {
  return getJson<PageData<FinanceAccountTxn>>(
    `${BASE}/accounts/${id}/transactions${buildQuery({ page, pageSize })}`,
  );
}

// ---------- 收款 ----------

export async function fetchFinanceReceipts(
  params: FinanceReceiptListParams,
): Promise<FinanceReceiptListResult> {
  return getJson<FinanceReceiptListResult>(
    `${BASE}/receipts${buildQuery(params)}`,
  );
}

export async function fetchFinanceReceipt(
  id: number,
): Promise<FinanceReceipt> {
  return getJson<FinanceReceipt>(`${BASE}/receipts/${id}`);
}

export async function createFinanceReceipt(
  body: CreateFinanceReceiptRequest,
): Promise<{ id: number }> {
  return postJson<{ id: number }>(`${BASE}/receipts`, body);
}

export async function updateFinanceReceipt(
  id: number,
  body: UpdateFinanceReceiptRequest,
): Promise<FinanceReceipt> {
  return patchJson<FinanceReceipt>(`${BASE}/receipts/${id}`, body);
}

export async function deleteFinanceReceiptCore(
  id: number,
): Promise<{ success: boolean }> {
  return deleteJson<{ success: boolean }>(`${BASE}/receipts/${id}`);
}

export async function confirmFinanceReceipts(
  ids: number[],
): Promise<{ confirmed: number; message: string }> {
  return postJson<{ confirmed: number; message: string }>(
    `${BASE}/receipts/confirm`,
    { ids },
  );
}

export async function writeOffFinanceReceipt(
  id: number,
  body: WriteOffFinanceReceiptRequest,
): Promise<{ success: boolean }> {
  return postJson<{ success: boolean }>(
    `${BASE}/receipts/${id}/write-off`,
    body,
  );
}

export async function batchWriteOffFinanceReceipts(
  ids: number[],
  settlementId: number,
): Promise<{ writtenOff: number }> {
  return postJson<{ writtenOff: number }>(
    `${BASE}/receipts/batch-write-off`,
    { ids, settlementId },
  );
}

// ---------- 付款 ----------

export async function fetchFinancePayments(
  params: FinancePaymentListParams,
): Promise<FinancePaymentListResult> {
  return getJson<FinancePaymentListResult>(
    `${BASE}/payments${buildQuery(params)}`,
  );
}

export async function fetchFinancePayment(
  id: number,
): Promise<FinancePayment> {
  return getJson<FinancePayment>(`${BASE}/payments/${id}`);
}

export async function createFinancePayment(
  body: CreateFinancePaymentRequest,
): Promise<{ id: number }> {
  return postJson<{ id: number }>(`${BASE}/payments`, body);
}

export async function updateFinancePayment(
  id: number,
  body: UpdateFinancePaymentRequest,
): Promise<FinancePayment> {
  return patchJson<FinancePayment>(`${BASE}/payments/${id}`, body);
}

export async function deleteFinancePaymentCore(
  id: number,
): Promise<{ success: boolean }> {
  return deleteJson<{ success: boolean }>(`${BASE}/payments/${id}`);
}

export async function approveFinancePayment(
  id: number,
  body: ApproveFinancePaymentRequest,
): Promise<{ success: boolean }> {
  return postJson<{ success: boolean }>(
    `${BASE}/payments/${id}/approve`,
    body,
  );
}

export async function batchApproveFinancePayments(
  ids: number[],
  approved: boolean,
): Promise<{ approved: number }> {
  return postJson<{ approved: number }>(`${BASE}/payments/batch-approve`, {
    ids,
    approved,
  });
}

export async function payFinancePayment(
  id: number,
): Promise<{ success: boolean }> {
  return postJson<{ success: boolean }>(`${BASE}/payments/${id}/pay`);
}

// ---------- 发票 ----------

export async function fetchFinanceInvoices(
  params: FinanceInvoiceListParams,
): Promise<FinanceInvoiceListResult> {
  return getJson<FinanceInvoiceListResult>(
    `${BASE}/invoices${buildQuery(params)}`,
  );
}

export async function fetchFinanceInvoice(
  id: number,
): Promise<FinanceInvoice> {
  return getJson<FinanceInvoice>(`${BASE}/invoices/${id}`);
}

export async function createFinanceInvoice(
  body: CreateFinanceInvoiceRequest,
): Promise<{ id: number }> {
  return postJson<{ id: number }>(`${BASE}/invoices`, body);
}

export async function updateFinanceInvoice(
  id: number,
  body: UpdateFinanceInvoiceRequest,
): Promise<FinanceInvoice> {
  return patchJson<FinanceInvoice>(`${BASE}/invoices/${id}`, body);
}

export async function deleteFinanceInvoiceCore(
  id: number,
): Promise<{ success: boolean }> {
  return deleteJson<{ success: boolean }>(`${BASE}/invoices/${id}`);
}

export async function issueFinanceInvoice(
  id: number,
): Promise<{ success: boolean }> {
  return postJson<{ success: boolean }>(`${BASE}/invoices/${id}/issue`);
}

export async function batchIssueFinanceInvoices(
  ids: number[],
): Promise<{ issued: number }> {
  return postJson<{ issued: number }>(`${BASE}/invoices/batch-issue`, {
    ids,
  });
}

export async function sendFinanceInvoice(
  id: number,
  body: SendFinanceInvoiceRequest,
): Promise<{ success: boolean }> {
  return postJson<{ success: boolean }>(`${BASE}/invoices/${id}/send`, body);
}

export async function batchSendFinanceInvoices(
  ids: number[],
  expressNo: string,
): Promise<{ sent: number }> {
  return postJson<{ sent: number }>(`${BASE}/invoices/batch-send`, {
    ids,
    expressNo,
  });
}

export async function receiveFinanceInvoice(
  id: number,
): Promise<{ success: boolean }> {
  return postJson<{ success: boolean }>(`${BASE}/invoices/${id}/receive`);
}

export async function voidFinanceInvoice(
  id: number,
): Promise<{ success: boolean }> {
  return postJson<{ success: boolean }>(`${BASE}/invoices/${id}/void`);
}

// ---------- 成本 ----------

export async function fetchFinanceCosts(
  params: FinanceCostListParams,
): Promise<FinanceCostListResult> {
  return getJson<FinanceCostListResult>(`${BASE}/costs${buildQuery(params)}`);
}

export async function fetchFinanceCost(id: number): Promise<FinanceCost> {
  return getJson<FinanceCost>(`${BASE}/costs/${id}`);
}

export async function createFinanceCost(
  body: CreateFinanceCostRequest,
): Promise<{ id: number }> {
  return postJson<{ id: number }>(`${BASE}/costs`, body);
}

export async function updateFinanceCost(
  id: number,
  body: UpdateFinanceCostRequest,
): Promise<FinanceCost> {
  return patchJson<FinanceCost>(`${BASE}/costs/${id}`, body);
}

export async function deleteFinanceCostCore(
  id: number,
): Promise<{ success: boolean }> {
  return deleteJson<{ success: boolean }>(`${BASE}/costs/${id}`);
}

export async function calculateFinanceCosts(
  ids: number[],
): Promise<{ calculated: number }> {
  return postJson<{ calculated: number }>(`${BASE}/costs/calculate`, { ids });
}

export async function transferFinanceCosts(
  ids: number[],
): Promise<{ transferred: number }> {
  return postJson<{ transferred: number }>(`${BASE}/costs/transfer`, { ids });
}

export async function fetchFinanceCostStats(
  params: FinanceReportRangeParams,
): Promise<FinanceCostStats> {
  return getJson<FinanceCostStats>(
    `${BASE}/costs/stats${buildQuery(params)}`,
  );
}

// ---------- 结算单 ----------

export async function fetchFinanceSettlements(
  params: FinanceSettlementListParams,
): Promise<FinanceSettlementListResult> {
  return getJson<FinanceSettlementListResult>(
    `${BASE}/settlements${buildQuery(params)}`,
  );
}

// ---------- 报表 ----------

export async function fetchFinanceReportTotals(
  params: FinanceReportRangeParams,
): Promise<FinanceReportTotals> {
  return getJson<FinanceReportTotals>(
    `${BASE}/reports/totals${buildQuery(params)}`,
  );
}

export async function fetchFinanceProfitReport(
  params: FinanceReportRangeParams,
): Promise<FinanceProfitReport> {
  return getJson<FinanceProfitReport>(
    `${BASE}/reports/profit${buildQuery(params)}`,
  );
}

export async function fetchFinanceIncomeExpenseReport(
  params: FinanceReportRangeParams,
): Promise<FinanceIncomeExpenseReport> {
  return getJson<FinanceIncomeExpenseReport>(
    `${BASE}/reports/income-expense${buildQuery(params)}`,
  );
}

export async function fetchFinanceCostAnalysisReport(
  params: FinanceReportRangeParams,
): Promise<FinanceCostAnalysisReport> {
  return getJson<FinanceCostAnalysisReport>(
    `${BASE}/reports/cost-analysis${buildQuery(params)}`,
  );
}

export async function fetchFinanceReceivablePayableReport(
  params: FinanceReportRangeParams,
): Promise<FinanceReceivablePayableReport> {
  return getJson<FinanceReceivablePayableReport>(
    `${BASE}/reports/receivable-payable${buildQuery(params)}`,
  );
}
