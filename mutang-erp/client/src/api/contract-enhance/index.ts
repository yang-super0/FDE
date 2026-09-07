import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  ApplyContractCommissionRequest,
  ApplyContractTemplateResult,
  BatchToggleTemplateStatusRequest,
  ContractCommissionApplication,
  ContractCommissionApplicationListParams,
  ContractCommissionApplicationListResult,
  ContractExpense,
  ContractExpenseDetail,
  ContractExpenseListParams,
  ContractExpenseListResult,
  ContractPaymentRecord,
  ContractReminder,
  CreateContractExpenseRequest,
  CreateContractPaymentRecordRequest,
  CreateContractReminderRequest,
  CreateContractTemplateRequest,
  ContractTemplate,
  ContractTemplateListParams,
  ContractTemplateListResult,
  RejectContractCommissionRequest,
  UpdateContractExpenseRequest,
  UpdateContractTemplateRequest,
} from '@shared/api.interface';

const get = async <T>(url: string): Promise<T> => {
  const response = await axiosForBackend({ url, method: 'GET' });
  return response.data as T;
};

const post = async <T>(url: string, body?: unknown): Promise<T> => {
  const response = await axiosForBackend({ url, method: 'POST', data: body });
  return response.data as T;
};

const put = async <T>(url: string, body?: unknown): Promise<T> => {
  const response = await axiosForBackend({ url, method: 'PUT', data: body });
  return response.data as T;
};

const del = async <T>(url: string): Promise<T> => {
  const response = await axiosForBackend({ url, method: 'DELETE' });
  return response.data as T;
};

const buildQuery = (params: unknown): string => {
  const entries = Object.entries(params as Record<string, unknown>);
  const search = new URLSearchParams();
  entries.forEach(([key, value]: [string, unknown]) => {
    if (value !== undefined && value !== '' && value !== null) {
      search.append(key, String(value));
    }
  });
  const query = search.toString();
  return query ? `?${query}` : '';
};

export const listContractTemplates = async (
  params: ContractTemplateListParams,
): Promise<ContractTemplateListResult> =>
  get(`/api/contract-templates${buildQuery(params)}`);

export const getContractTemplate = async (id: number): Promise<ContractTemplate> =>
  get(`/api/contract-templates/${id}`);

export const createContractTemplate = async (
  body: CreateContractTemplateRequest,
): Promise<ContractTemplate> => post('/api/contract-templates', body);

export const updateContractTemplate = async (
  id: number,
  body: UpdateContractTemplateRequest,
): Promise<ContractTemplate> => put(`/api/contract-templates/${id}`, body);

export const deleteContractTemplate = async (id: number): Promise<void> => {
  await del(`/api/contract-templates/${id}`);
};

export const applyContractTemplate = async (
  id: number,
): Promise<ApplyContractTemplateResult> => post(`/api/contract-templates/${id}/apply`);

export const batchToggleTemplateStatus = async (
  body: BatchToggleTemplateStatusRequest,
): Promise<{ updated: number }> => post('/api/contract-templates/batch-toggle-status', body);

export const listContractExpenses = async (
  params: ContractExpenseListParams,
): Promise<ContractExpenseListResult> =>
  get(`/api/contract-expenses${buildQuery(params)}`);

export const getContractExpense = async (id: number): Promise<ContractExpenseDetail> =>
  get(`/api/contract-expenses/${id}`);

export const createContractExpense = async (
  body: CreateContractExpenseRequest,
): Promise<ContractExpense> => post('/api/contract-expenses', body);

export const updateContractExpense = async (
  id: number,
  body: UpdateContractExpenseRequest,
): Promise<ContractExpense> => put(`/api/contract-expenses/${id}`, body);

export const deleteContractExpense = async (id: number): Promise<void> => {
  await del(`/api/contract-expenses/${id}`);
};

export const listPaymentRecords = async (
  expenseId: number,
): Promise<ContractPaymentRecord[]> => get(`/api/contract-expenses/${expenseId}/payment-records`);

export const createPaymentRecord = async (
  expenseId: number,
  body: CreateContractPaymentRecordRequest,
): Promise<ContractPaymentRecord> =>
  post(`/api/contract-expenses/${expenseId}/payment-records`, body);

export const deletePaymentRecord = async (id: number): Promise<void> => {
  await del(`/api/contract-payment-records/${id}`);
};

export const remindContract = async (
  contractId: string,
  body: CreateContractReminderRequest,
): Promise<ContractReminder> => post(`/api/contracts/${contractId}/remind`, body);

export const listContractReminders = async (
  contractId: string,
): Promise<ContractReminder[]> => get(`/api/contracts/${contractId}/reminders`);

export const applyContractCommission = async (
  contractId: string,
  body: ApplyContractCommissionRequest,
): Promise<ContractCommissionApplication> =>
  post(`/api/contracts/${contractId}/apply-commission`, body);

export const listCommissionApplications = async (
  params: ContractCommissionApplicationListParams,
): Promise<ContractCommissionApplicationListResult> =>
  get(`/api/contract-commission-applications${buildQuery(params)}`);

export const approveCommissionApplication = async (
  id: number,
): Promise<ContractCommissionApplication> =>
  put(`/api/contract-commission-applications/${id}/approve`);

export const rejectCommissionApplication = async (
  id: number,
  body: RejectContractCommissionRequest,
): Promise<ContractCommissionApplication> =>
  put(`/api/contract-commission-applications/${id}/reject`, body);
