import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import { extractErrorMessage } from '@client/src/utils/extract-error-message';
import type {
  ScheduledPreviewResponse,
  ScheduledReportCreateInput,
  ScheduledReportListParams,
  ScheduledReportListResponse,
  ScheduledReportRecord,
  ScheduledReportRunResponse,
  ScheduledReportUpdateInput,
  ScheduledRunLog,
} from '@shared/api.interface';

const BASE_URL = '/api/report-center/schedules';

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

export async function fetchSchedules(
  params: ScheduledReportListParams,
): Promise<ScheduledReportListResponse> {
  return request<ScheduledReportListResponse>({
    url: BASE_URL,
    method: 'GET',
    params,
  });
}

export async function createSchedule(
  input: ScheduledReportCreateInput,
): Promise<ScheduledReportRecord> {
  return request<ScheduledReportRecord>({
    url: BASE_URL,
    method: 'POST',
    data: input,
  });
}

export async function fetchSchedule(
  id: number,
): Promise<ScheduledReportRecord> {
  return request<ScheduledReportRecord>({
    url: `${BASE_URL}/${id}`,
    method: 'GET',
  });
}

export async function updateSchedule(
  id: number,
  input: ScheduledReportUpdateInput,
): Promise<ScheduledReportRecord> {
  return request<ScheduledReportRecord>({
    url: `${BASE_URL}/${id}`,
    method: 'PATCH',
    data: input,
  });
}

export async function deleteSchedule(
  id: number,
): Promise<{ success: boolean }> {
  return request<{ success: boolean }>({
    url: `${BASE_URL}/${id}`,
    method: 'DELETE',
  });
}

export async function toggleScheduleStatus(
  id: number,
  status: string,
): Promise<ScheduledReportRecord> {
  return request<ScheduledReportRecord>({
    url: `${BASE_URL}/${id}/status`,
    method: 'PATCH',
    data: { status },
  });
}

export async function runScheduleNow(
  id: number,
): Promise<ScheduledReportRunResponse> {
  return request<ScheduledReportRunResponse>({
    url: `${BASE_URL}/${id}/run`,
    method: 'POST',
  });
}

export async function fetchScheduleRuns(
  id: number,
): Promise<ScheduledRunLog[]> {
  return request<ScheduledRunLog[]>({
    url: `${BASE_URL}/${id}/runs`,
    method: 'GET',
  });
}

export async function previewSchedule(
  id: number,
): Promise<ScheduledPreviewResponse> {
  return request<ScheduledPreviewResponse>({
    url: `${BASE_URL}/${id}/preview`,
    method: 'GET',
  });
}
