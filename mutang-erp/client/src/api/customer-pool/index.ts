import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  AbandonLeadRequest,
  AddFollowUpRequest,
  ConvertLeadRequest,
  CreateLeadRequest,
  CreatePoolLeadRequest,
  LeadDetail,
  LeadListParams,
  LeadListResult,
  PoolAnalytics,
  PoolAssignRequest,
  PoolLeadListParams,
  PoolLeadListResult,
  UpdateLeadRequest,
  UpdatePoolLeadRequest,
} from '@shared/api.interface';

/* ============ 公海客资 ============ */

export async function fetchPoolLeads(
  params: PoolLeadListParams,
): Promise<PoolLeadListResult> {
  const res = await axiosForBackend.get<PoolLeadListResult>(
    '/api/customer-pool/pool',
    { params },
  );
  return res.data;
}

export async function createPoolLead(
  payload: CreatePoolLeadRequest,
): Promise<{ id: string }> {
  const res = await axiosForBackend.post<{ id: string }>(
    '/api/customer-pool/pool',
    payload,
  );
  return res.data;
}

export async function batchCreatePoolLeads(
  items: CreatePoolLeadRequest[],
): Promise<{ created: number }> {
  const res = await axiosForBackend.post<{ created: number }>(
    '/api/customer-pool/pool/batch',
    { items },
  );
  return res.data;
}

export async function updatePoolLead(
  id: string,
  payload: UpdatePoolLeadRequest,
): Promise<{ success: boolean }> {
  const res = await axiosForBackend.put<{ success: boolean }>(
    `/api/customer-pool/pool/${id}`,
    payload,
  );
  return res.data;
}

export async function deletePoolLead(
  id: string,
): Promise<{ success: boolean }> {
  const res = await axiosForBackend.delete<{ success: boolean }>(
    `/api/customer-pool/pool/${id}`,
  );
  return res.data;
}

export async function claimPoolLead(
  id: string,
): Promise<{ success: boolean }> {
  const res = await axiosForBackend.post<{ success: boolean }>(
    `/api/customer-pool/pool/${id}/claim`,
  );
  return res.data;
}

export async function batchClaimPoolLeads(
  ids: string[],
): Promise<{ claimed: number }> {
  const res = await axiosForBackend.post<{ claimed: number }>(
    '/api/customer-pool/pool/claim',
    { ids },
  );
  return res.data;
}

export async function assignPoolLeads(
  payload: PoolAssignRequest,
): Promise<{ assigned: number }> {
  const res = await axiosForBackend.post<{ assigned: number }>(
    '/api/customer-pool/pool/assign',
    payload,
  );
  return res.data;
}

export async function autoAssignPoolLeads(): Promise<{ assigned: number }> {
  const res = await axiosForBackend.post<{ assigned: number }>(
    '/api/customer-pool/pool/auto-assign',
  );
  return res.data;
}

export async function restorePoolLead(
  id: string,
): Promise<{ success: boolean }> {
  const res = await axiosForBackend.post<{ success: boolean }>(
    `/api/customer-pool/pool/${id}/restore`,
  );
  return res.data;
}

export async function invalidatePoolLead(
  id: string,
): Promise<{ success: boolean }> {
  const res = await axiosForBackend.post<{ success: boolean }>(
    `/api/customer-pool/pool/${id}/invalidate`,
  );
  return res.data;
}

export async function fetchPoolAnalytics(): Promise<PoolAnalytics> {
  const res = await axiosForBackend.get<PoolAnalytics>(
    '/api/customer-pool/pool/analytics',
  );
  return res.data;
}

/* ============ 线索管理 ============ */

export async function fetchLeads(
  params: LeadListParams,
): Promise<LeadListResult> {
  const res = await axiosForBackend.get<LeadListResult>(
    '/api/customer-pool/leads',
    { params },
  );
  return res.data;
}

export async function createLead(
  payload: CreateLeadRequest,
): Promise<{ id: string }> {
  const res = await axiosForBackend.post<{ id: string }>(
    '/api/customer-pool/leads',
    payload,
  );
  return res.data;
}

export async function batchCreateLeads(
  items: CreateLeadRequest[],
): Promise<{ created: number }> {
  const res = await axiosForBackend.post<{ created: number }>(
    '/api/customer-pool/leads/batch',
    { items },
  );
  return res.data;
}

export async function updateLead(
  id: string,
  payload: UpdateLeadRequest,
): Promise<{ success: boolean }> {
  const res = await axiosForBackend.put<{ success: boolean }>(
    `/api/customer-pool/leads/${id}`,
    payload,
  );
  return res.data;
}

export async function deleteLead(id: string): Promise<{ success: boolean }> {
  const res = await axiosForBackend.delete<{ success: boolean }>(
    `/api/customer-pool/leads/${id}`,
  );
  return res.data;
}

export async function assignLeads(
  ids: string[],
  owner: string,
): Promise<{ assigned: number }> {
  const res = await axiosForBackend.post<{ assigned: number }>(
    '/api/customer-pool/leads/assign',
    { ids, owner },
  );
  return res.data;
}

export async function fetchLead(id: string): Promise<LeadDetail> {
  const res = await axiosForBackend.get<LeadDetail>(
    `/api/customer-pool/leads/${id}`,
  );
  return res.data;
}

export async function addLeadFollowUp(
  id: string,
  payload: AddFollowUpRequest,
): Promise<{ success: boolean }> {
  const res = await axiosForBackend.post<{ success: boolean }>(
    `/api/customer-pool/leads/${id}/follow-up`,
    payload,
  );
  return res.data;
}

export async function convertLead(
  id: string,
  payload: ConvertLeadRequest,
): Promise<{ customerId: string }> {
  const res = await axiosForBackend.post<{ customerId: string }>(
    `/api/customer-pool/leads/${id}/convert`,
    payload,
  );
  return res.data;
}

export async function abandonLead(
  id: string,
  payload: AbandonLeadRequest,
): Promise<{ success: boolean }> {
  const res = await axiosForBackend.post<{ success: boolean }>(
    `/api/customer-pool/leads/${id}/abandon`,
    payload,
  );
  return res.data;
}
