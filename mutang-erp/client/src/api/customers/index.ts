import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  Customer,
  CustomerStatus,
  FollowRecord,
  Opportunity,
  OpportunityStage,
  PageResult,
} from '@shared/api.interface';

export interface CustomerListParams {
  keyword?: string;
  industry?: string;
  status?: CustomerStatus;
  page: number;
  pageSize: number;
}

export interface CustomerPayload {
  name: string;
  industry: string;
  contactName: string;
  contactPhone: string;
  source: string;
  status: CustomerStatus;
}

export interface CreateFollowRecordPayload {
  method: string;
  content: string;
  nextFollowAt?: string;
}

export interface CreateOpportunityPayload {
  name: string;
  customerId: string;
  stage: OpportunityStage;
  amount: number;
  expectedCloseAt?: string;
}

export async function fetchCustomers(
  params: CustomerListParams,
): Promise<PageResult<Customer>> {
  const res = await axiosForBackend.get<PageResult<Customer>>(
    '/api/customers',
    { params },
  );
  return res.data;
}

export async function createCustomer(
  payload: CustomerPayload,
): Promise<{ id: string }> {
  const res = await axiosForBackend.post<{ id: string }>(
    '/api/customers',
    payload,
  );
  return res.data;
}

export async function updateCustomer(
  id: string,
  payload: Partial<CustomerPayload>,
): Promise<{ success: true }> {
  const res = await axiosForBackend.put<{ success: true }>(
    `/api/customers/${id}`,
    payload,
  );
  return res.data;
}

export async function fetchCustomer(id: string): Promise<Customer> {
  const res = await axiosForBackend.get<Customer>(`/api/customers/${id}`);
  return res.data;
}

export async function fetchFollowRecords(
  customerId: string,
): Promise<{ items: FollowRecord[] }> {
  const res = await axiosForBackend.get<{ items: FollowRecord[] }>(
    `/api/customers/${customerId}/follow-records`,
  );
  return res.data;
}

export async function createFollowRecord(
  customerId: string,
  payload: CreateFollowRecordPayload,
): Promise<{ id: string }> {
  const res = await axiosForBackend.post<{ id: string }>(
    `/api/customers/${customerId}/follow-records`,
    payload,
  );
  return res.data;
}

export async function fetchOpportunities(
  stage?: OpportunityStage,
): Promise<{ items: Opportunity[] }> {
  const res = await axiosForBackend.get<{ items: Opportunity[] }>(
    '/api/opportunities',
    { params: stage ? { stage } : {} },
  );
  return res.data;
}

export async function createOpportunity(
  payload: CreateOpportunityPayload,
): Promise<{ id: string }> {
  const res = await axiosForBackend.post<{ id: string }>(
    '/api/opportunities',
    payload,
  );
  return res.data;
}

export async function updateOpportunityStage(
  id: string,
  stage: OpportunityStage,
): Promise<{ success: boolean }> {
  const res = await axiosForBackend.patch<{ success: boolean }>(
    `/api/opportunities/${id}/stage`,
    { stage },
  );
  return res.data;
}
