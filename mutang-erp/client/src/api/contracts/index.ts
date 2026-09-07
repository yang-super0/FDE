import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  Contract,
  ContractApprovalAction,
  ContractDetail,
  ContractStatus,
  ContractSummary,
  Customer,
  PageResult,
} from '@shared/api.interface';

export interface ContractListParams {
  status?: ContractStatus;
  expireFrom?: string;
  expireTo?: string;
  page: number;
  pageSize: number;
}

export interface CreateContractRequest {
  code: string;
  customerId: string;
  contractType: string;
  amount: number;
  signDate: string;
  expireDate: string;
}

export interface ContractApprovalRequest {
  action: ContractApprovalAction;
  comment?: string;
}

export async function getContractSummary(): Promise<ContractSummary> {
  const res = await axiosForBackend.get<ContractSummary>(
    '/api/contracts/summary',
  );
  return res.data;
}

export async function listContracts(
  params: ContractListParams,
): Promise<PageResult<Contract>> {
  const res = await axiosForBackend.get<PageResult<Contract>>(
    '/api/contracts',
    { params },
  );
  return res.data;
}

export async function createContract(
  data: CreateContractRequest,
): Promise<{ id: string }> {
  const res = await axiosForBackend.post<{ id: string }>(
    '/api/contracts',
    data,
  );
  return res.data;
}

export async function approveContract(
  id: string,
  data: ContractApprovalRequest,
): Promise<{ success: boolean }> {
  const res = await axiosForBackend.post<{ success: boolean }>(
    `/api/contracts/${id}/approval`,
    data,
  );
  return res.data;
}

export async function deleteContract(
  id: string,
): Promise<{ success: boolean }> {
  const res = await axiosForBackend.delete<{ success: boolean }>(
    `/api/contracts/${id}`,
  );
  return res.data;
}

export async function getContractDetail(id: string): Promise<ContractDetail> {
  const res = await axiosForBackend.get<ContractDetail>(
    `/api/contracts/${id}`,
  );
  return res.data;
}

export async function listCustomerOptions(): Promise<Customer[]> {
  const res = await axiosForBackend.get<PageResult<Customer>>(
    '/api/customers',
    { params: { page: 1, pageSize: 100 } },
  );
  return res.data.items;
}
