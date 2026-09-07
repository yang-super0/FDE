import type { ContractApprovalAction } from '@shared/api.interface';

export interface ListContractsQueryDto {
  status?: string;
  expireFrom?: string;
  expireTo?: string;
  page: number;
  pageSize: number;
}

export interface CreateContractDto {
  code: string;
  customerId: string;
  contractType: string;
  amount: number;
  signDate: string;
  expireDate: string;
  content?: string;
}

export interface ApproveContractDto {
  action: ContractApprovalAction;
  comment?: string;
}
