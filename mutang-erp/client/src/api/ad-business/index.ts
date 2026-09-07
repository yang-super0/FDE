import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  AdAccountDetail,
  AdAccountListParams,
  AdAccountListResult,
  AdApplicationDetail,
  AdApplicationListParams,
  AdApplicationListResult,
  AdFiling,
  AdFilingListParams,
  AdFilingListResult,
  AdTransfer,
  AdTransferListParams,
  AdTransferListResult,
  ApproveApplicationRequest,
  ApproveTransferRequest,
  CalculateCommissionRequest,
  CommissionRecord,
  CommissionRecordDetail,
  CommissionRecordListParams,
  CommissionRecordListResult,
  CommissionRule,
  CommissionRuleListParams,
  CommissionRuleListResult,
  CreateAdAccountRequest,
  CreateAdApplicationRequest,
  CreateAdFilingRequest,
  CreateAdTransferRequest,
  CreateCommissionRuleRequest,
  RechargeRequest,
  ReviewFilingRequest,
  UpdateAdAccountRequest,
  UpdateAdApplicationRequest,
  UpdateCommissionRuleRequest,
} from '@shared/api.interface';

const BASE: string = '/api/ad-business';

/* ============ 开户管理（开户申请） ============ */

export async function fetchAdApplications(
  params: AdApplicationListParams,
): Promise<AdApplicationListResult> {
  const res = await axiosForBackend.get<AdApplicationListResult>(
    `${BASE}/applications`,
    { params },
  );
  return res.data;
}

export async function createAdApplication(
  payload: CreateAdApplicationRequest,
): Promise<{ id: string }> {
  const res = await axiosForBackend.post<{ id: string }>(
    `${BASE}/applications`,
    payload,
  );
  return res.data;
}

export async function batchCreateAdApplications(
  items: CreateAdApplicationRequest[],
): Promise<{ created: number }> {
  const res = await axiosForBackend.post<{ created: number }>(
    `${BASE}/applications/batch`,
    { items },
  );
  return res.data;
}

export async function updateAdApplication(
  id: string,
  payload: UpdateAdApplicationRequest,
): Promise<{ success: boolean }> {
  const res = await axiosForBackend.put<{ success: boolean }>(
    `${BASE}/applications/${id}`,
    payload,
  );
  return res.data;
}

export async function deleteAdApplication(
  id: string,
): Promise<{ success: boolean }> {
  const res = await axiosForBackend.delete<{ success: boolean }>(
    `${BASE}/applications/${id}`,
  );
  return res.data;
}

export async function fetchAdApplication(
  id: string,
): Promise<AdApplicationDetail> {
  const res = await axiosForBackend.get<AdApplicationDetail>(
    `${BASE}/applications/${id}`,
  );
  return res.data;
}

export async function approveAdApplication(
  id: string,
  payload: ApproveApplicationRequest,
): Promise<{ success: boolean }> {
  const res = await axiosForBackend.post<{ success: boolean }>(
    `${BASE}/applications/${id}/approve`,
    payload,
  );
  return res.data;
}

export async function batchOpenAdApplications(
  ids: string[],
): Promise<{ opened: number }> {
  const res = await axiosForBackend.post<{ opened: number }>(
    `${BASE}/applications/batch-open`,
    { ids },
  );
  return res.data;
}

/* ============ 广告账户 ============ */

export async function fetchAdAccounts(
  params: AdAccountListParams,
): Promise<AdAccountListResult> {
  const res = await axiosForBackend.get<AdAccountListResult>(
    `${BASE}/accounts`,
    { params },
  );
  return res.data;
}

export async function createAdAccount(
  payload: CreateAdAccountRequest,
): Promise<{ id: string }> {
  const res = await axiosForBackend.post<{ id: string }>(
    `${BASE}/accounts`,
    payload,
  );
  return res.data;
}

export async function batchCreateAdAccounts(
  items: CreateAdAccountRequest[],
): Promise<{ created: number }> {
  const res = await axiosForBackend.post<{ created: number }>(
    `${BASE}/accounts/batch`,
    { items },
  );
  return res.data;
}

export async function updateAdAccount(
  id: string,
  payload: UpdateAdAccountRequest,
): Promise<{ success: boolean }> {
  const res = await axiosForBackend.put<{ success: boolean }>(
    `${BASE}/accounts/${id}`,
    payload,
  );
  return res.data;
}

export async function deleteAdAccount(
  id: string,
): Promise<{ success: boolean }> {
  const res = await axiosForBackend.delete<{ success: boolean }>(
    `${BASE}/accounts/${id}`,
  );
  return res.data;
}

export async function fetchAdAccount(id: string): Promise<AdAccountDetail> {
  const res = await axiosForBackend.get<AdAccountDetail>(
    `${BASE}/accounts/${id}`,
  );
  return res.data;
}

export async function rechargeAdAccount(
  id: string,
  payload: RechargeRequest,
): Promise<{ success: boolean }> {
  const res = await axiosForBackend.post<{ success: boolean }>(
    `${BASE}/accounts/${id}/recharge`,
    payload,
  );
  return res.data;
}

/* ============ 报备管理 ============ */

export async function fetchAdFilings(
  params: AdFilingListParams,
): Promise<AdFilingListResult> {
  const res = await axiosForBackend.get<AdFilingListResult>(
    `${BASE}/filings`,
    { params },
  );
  return res.data;
}

export async function createAdFiling(
  payload: CreateAdFilingRequest,
): Promise<{ id: string }> {
  const res = await axiosForBackend.post<{ id: string }>(
    `${BASE}/filings`,
    payload,
  );
  return res.data;
}

export async function batchCreateAdFilings(
  items: CreateAdFilingRequest[],
): Promise<{ created: number }> {
  const res = await axiosForBackend.post<{ created: number }>(
    `${BASE}/filings/batch`,
    { items },
  );
  return res.data;
}

export async function updateAdFiling(
  id: string,
  payload: Partial<CreateAdFilingRequest>,
): Promise<{ success: boolean }> {
  const res = await axiosForBackend.put<{ success: boolean }>(
    `${BASE}/filings/${id}`,
    payload,
  );
  return res.data;
}

export async function deleteAdFiling(
  id: string,
): Promise<{ success: boolean }> {
  const res = await axiosForBackend.delete<{ success: boolean }>(
    `${BASE}/filings/${id}`,
  );
  return res.data;
}

export async function fetchAdFiling(id: string): Promise<AdFiling> {
  const res = await axiosForBackend.get<AdFiling>(`${BASE}/filings/${id}`);
  return res.data;
}

export async function reviewAdFiling(
  id: string,
  payload: ReviewFilingRequest,
): Promise<{ success: boolean }> {
  const res = await axiosForBackend.post<{ success: boolean }>(
    `${BASE}/filings/${id}/approve`,
    payload,
  );
  return res.data;
}

/* ============ 转户管理 ============ */

export async function fetchAdTransfers(
  params: AdTransferListParams,
): Promise<AdTransferListResult> {
  const res = await axiosForBackend.get<AdTransferListResult>(
    `${BASE}/transfers`,
    { params },
  );
  return res.data;
}

export async function createAdTransfer(
  payload: CreateAdTransferRequest,
): Promise<{ id: string }> {
  const res = await axiosForBackend.post<{ id: string }>(
    `${BASE}/transfers`,
    payload,
  );
  return res.data;
}

export async function deleteAdTransfer(
  id: string,
): Promise<{ success: boolean }> {
  const res = await axiosForBackend.delete<{ success: boolean }>(
    `${BASE}/transfers/${id}`,
  );
  return res.data;
}

export async function fetchAdTransfer(id: string): Promise<AdTransfer> {
  const res = await axiosForBackend.get<AdTransfer>(
    `${BASE}/transfers/${id}`,
  );
  return res.data;
}

export async function approveAdTransfer(
  id: string,
  payload: ApproveTransferRequest,
): Promise<{ success: boolean }> {
  const res = await axiosForBackend.post<{ success: boolean }>(
    `${BASE}/transfers/${id}/approve`,
    payload,
  );
  return res.data;
}

/* ============ 提成规则 ============ */

export async function fetchCommissionRules(
  params: CommissionRuleListParams,
): Promise<CommissionRuleListResult> {
  const res = await axiosForBackend.get<CommissionRuleListResult>(
    `${BASE}/commission-rules`,
    { params },
  );
  return res.data;
}

export async function createCommissionRule(
  payload: CreateCommissionRuleRequest,
): Promise<{ id: string }> {
  const res = await axiosForBackend.post<{ id: string }>(
    `${BASE}/commission-rules`,
    payload,
  );
  return res.data;
}

export async function updateCommissionRule(
  id: string,
  payload: UpdateCommissionRuleRequest,
): Promise<{ success: boolean }> {
  const res = await axiosForBackend.put<{ success: boolean }>(
    `${BASE}/commission-rules/${id}`,
    payload,
  );
  return res.data;
}

export async function deleteCommissionRule(
  id: string,
): Promise<{ success: boolean }> {
  const res = await axiosForBackend.delete<{ success: boolean }>(
    `${BASE}/commission-rules/${id}`,
  );
  return res.data;
}

export async function batchUpdateCommissionRuleStatus(
  ids: string[],
  status: string,
): Promise<{ success: boolean }> {
  const res = await axiosForBackend.post<{ success: boolean }>(
    `${BASE}/commission-rules/batch-status`,
    { ids, status },
  );
  return res.data;
}

/* ============ 提成记录 ============ */

export async function fetchCommissionRecords(
  params: CommissionRecordListParams,
): Promise<CommissionRecordListResult> {
  const res = await axiosForBackend.get<CommissionRecordListResult>(
    `${BASE}/commission-records`,
    { params },
  );
  return res.data;
}

export async function fetchCommissionRecord(
  id: string,
): Promise<CommissionRecordDetail> {
  const res = await axiosForBackend.get<CommissionRecordDetail>(
    `${BASE}/commission-records/${id}`,
  );
  return res.data;
}

export async function calculateCommissions(
  payload: CalculateCommissionRequest,
): Promise<{ created: number }> {
  const res = await axiosForBackend.post<{ created: number }>(
    `${BASE}/commission-records/calculate`,
    payload,
  );
  return res.data;
}

export async function payCommissions(
  ids: string[],
): Promise<{ paid: number }> {
  const res = await axiosForBackend.post<{ paid: number }>(
    `${BASE}/commission-records/pay`,
    { ids },
  );
  return res.data;
}

export async function deleteCommissionRecord(
  id: string,
): Promise<{ success: boolean }> {
  const res = await axiosForBackend.delete<{ success: boolean }>(
    `${BASE}/commission-records/${id}`,
  );
  return res.data;
}

export type { CommissionRecord };
