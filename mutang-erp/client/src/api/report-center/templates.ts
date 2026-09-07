import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import { extractErrorMessage } from '@client/src/utils/extract-error-message';
import type {
  CustomReportRecord,
  CustomReportShareInput,
  ReportTemplateApplyInput,
  ReportTemplateCreateInput,
  ReportTemplateListParams,
  ReportTemplateListResponse,
  ReportTemplateRatingInput,
  ReportTemplateRatingResponse,
  ReportTemplateRecord,
  ReportTemplateUpdateInput,
} from '@shared/api.interface';

const BASE_URL = '/api/report-center/templates';

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

export async function fetchReportTemplates(
  params: ReportTemplateListParams,
): Promise<ReportTemplateListResponse> {
  return request<ReportTemplateListResponse>({
    url: BASE_URL,
    method: 'GET',
    params,
  });
}

export async function createReportTemplate(
  input: ReportTemplateCreateInput,
): Promise<ReportTemplateRecord> {
  return request<ReportTemplateRecord>({
    url: BASE_URL,
    method: 'POST',
    data: input,
  });
}

export async function fetchReportTemplate(
  id: number,
): Promise<ReportTemplateRecord> {
  return request<ReportTemplateRecord>({
    url: `${BASE_URL}/${id}`,
    method: 'GET',
  });
}

export async function updateReportTemplate(
  id: number,
  input: ReportTemplateUpdateInput,
): Promise<ReportTemplateRecord> {
  return request<ReportTemplateRecord>({
    url: `${BASE_URL}/${id}`,
    method: 'PATCH',
    data: input,
  });
}

export async function deleteReportTemplate(
  id: number,
): Promise<{ success: boolean }> {
  return request<{ success: boolean }>({
    url: `${BASE_URL}/${id}`,
    method: 'DELETE',
  });
}

export async function applyReportTemplate(
  id: number,
  input: ReportTemplateApplyInput,
): Promise<CustomReportRecord> {
  return request<CustomReportRecord>({
    url: `${BASE_URL}/${id}/apply`,
    method: 'POST',
    data: input,
  });
}

export async function shareReportTemplate(
  id: number,
  input: CustomReportShareInput,
): Promise<ReportTemplateRecord> {
  return request<ReportTemplateRecord>({
    url: `${BASE_URL}/${id}/share`,
    method: 'PATCH',
    data: input,
  });
}

export async function rateReportTemplate(
  id: number,
  input: ReportTemplateRatingInput,
): Promise<ReportTemplateRatingResponse> {
  return request<ReportTemplateRatingResponse>({
    url: `${BASE_URL}/${id}/rating`,
    method: 'POST',
    data: input,
  });
}
