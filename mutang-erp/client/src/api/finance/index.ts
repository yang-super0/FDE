import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  FinanceMonthlyTrendItem,
  FinanceRecord,
  FinanceRecordType,
  FinanceRelatedType,
  FinanceSummary,
  PageResult,
} from '@shared/api.interface';

export interface FinanceRecordPayload {
  recordType: FinanceRecordType;
  relatedType: FinanceRelatedType;
  relatedId?: string;
  relatedName: string;
  amount: number;
  recordDate: string;
  remark?: string;
}

export interface FinanceListParams {
  month?: string;
  type?: FinanceRecordType;
  page: number;
  pageSize: number;
}

export function getFinanceSummary(month?: string) {
  return axiosForBackend.get<FinanceSummary>('/api/finance-records/summary', {
    params: month ? { month } : {},
  });
}

export function getFinanceRecords(params: FinanceListParams) {
  return axiosForBackend.get<PageResult<FinanceRecord>>(
    '/api/finance-records',
    { params },
  );
}

export function createFinanceRecord(data: FinanceRecordPayload) {
  return axiosForBackend.post<{ id: string }>('/api/finance-records', data);
}

export function updateFinanceRecord(id: string, data: FinanceRecordPayload) {
  return axiosForBackend.put<{ success: boolean }>(
    `/api/finance-records/${id}`,
    data,
  );
}

export function deleteFinanceRecord(id: string) {
  return axiosForBackend.delete<{ success: boolean }>(
    `/api/finance-records/${id}`,
  );
}

export function getFinanceMonthlyTrend() {
  return axiosForBackend.get<{ items: FinanceMonthlyTrendItem[] }>(
    '/api/finance-records/monthly-trend',
  );
}
