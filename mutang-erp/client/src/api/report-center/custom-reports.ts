import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import { extractErrorMessage } from '@client/src/utils/extract-error-message';
import type {
  CustomReportCreateInput,
  CustomReportListParams,
  CustomReportListResponse,
  CustomReportRecord,
  CustomReportShareInput,
  CustomReportUpdateInput,
  ReportRunParams,
  ReportRunResult,
} from '@shared/api.interface';

const BASE_URL = '/api/report-center/reports';

interface RequestConfig {
  url: string;
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  params?: object;
  data?: unknown;
}

async function request<T>(config: RequestConfig): Promise<T> {
  try {
    const res = await axiosForBackend.request<T>(config);
    return res.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

export async function fetchCustomReports(
  params: CustomReportListParams,
): Promise<CustomReportListResponse> {
  return request<CustomReportListResponse>({
    url: BASE_URL,
    method: 'GET',
    params,
  });
}

export async function createCustomReport(
  input: CustomReportCreateInput,
): Promise<CustomReportRecord> {
  return request<CustomReportRecord>({
    url: BASE_URL,
    method: 'POST',
    data: input,
  });
}

export async function fetchCustomReport(
  id: number,
): Promise<CustomReportRecord> {
  return request<CustomReportRecord>({
    url: `${BASE_URL}/${id}`,
    method: 'GET',
  });
}

export async function updateCustomReport(
  id: number,
  input: CustomReportUpdateInput,
): Promise<CustomReportRecord> {
  return request<CustomReportRecord>({
    url: `${BASE_URL}/${id}`,
    method: 'PATCH',
    data: input,
  });
}

export async function deleteCustomReport(
  id: number,
): Promise<{ success: boolean }> {
  return request<{ success: boolean }>({
    url: `${BASE_URL}/${id}`,
    method: 'DELETE',
  });
}

export async function copyCustomReport(
  id: number,
): Promise<CustomReportRecord> {
  return request<CustomReportRecord>({
    url: `${BASE_URL}/${id}/copy`,
    method: 'POST',
  });
}

export async function shareCustomReport(
  id: number,
  input: CustomReportShareInput,
): Promise<CustomReportRecord> {
  return request<CustomReportRecord>({
    url: `${BASE_URL}/${id}/share`,
    method: 'PATCH',
    data: input,
  });
}

export async function runCustomReport(
  id: number,
  params?: ReportRunParams,
): Promise<ReportRunResult> {
  return request<ReportRunResult>({
    url: `${BASE_URL}/${id}/run`,
    method: 'POST',
    params,
  });
}
