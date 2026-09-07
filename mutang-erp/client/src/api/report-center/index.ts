import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  CustomReportCreateInput,
  CustomReportListParams,
  CustomReportListResponse,
  CustomReportRecord,
  CustomReportShareInput,
  CustomReportUpdateInput,
  DrilldownConfigResponse,
  DrilldownExecuteInput,
  DrilldownExecuteResult,
  DrilldownListParams,
  DrilldownListResponse,
  ReportRunParams,
  ReportRunResult,
  ReportTemplateApplyInput,
  ReportTemplateCreateInput,
  ReportTemplateListParams,
  ReportTemplateListResponse,
  ReportTemplateRatingInput,
  ReportTemplateRatingResponse,
  ReportTemplateRecord,
  ReportTemplateUpdateInput,
  ScheduledPreviewResponse,
  ScheduledReportCreateInput,
  ScheduledReportListParams,
  ScheduledReportListResponse,
  ScheduledReportRecord,
  ScheduledReportRunResponse,
  ScheduledReportUpdateInput,
  ScheduledRunLog,
} from '@shared/api.interface';

const REPORTS_URL = '/api/report-center/reports';
const TEMPLATES_URL = '/api/report-center/templates';
const SCHEDULES_URL = '/api/report-center/schedules';
const DRILLDOWNS_URL = '/api/report-center/drilldowns';

interface BatchDeleteResponse {
  success: boolean;
  deleted: number;
}

/* ============ 自定义报表 ============ */

export async function fetchCustomReports(
  params: CustomReportListParams,
): Promise<CustomReportListResponse> {
  const res = await axiosForBackend.get<CustomReportListResponse>(
    REPORTS_URL,
    { params },
  );
  return res.data;
}

export async function createCustomReport(
  input: CustomReportCreateInput,
): Promise<CustomReportRecord> {
  const res = await axiosForBackend.post<CustomReportRecord>(
    REPORTS_URL,
    input,
  );
  return res.data;
}

export async function getCustomReport(
  id: number,
): Promise<CustomReportRecord> {
  const res = await axiosForBackend.get<CustomReportRecord>(
    `${REPORTS_URL}/${id}`,
  );
  return res.data;
}

export async function updateCustomReport(
  id: number,
  input: CustomReportUpdateInput,
): Promise<CustomReportRecord> {
  const res = await axiosForBackend.patch<CustomReportRecord>(
    `${REPORTS_URL}/${id}`,
    input,
  );
  return res.data;
}

export async function deleteCustomReport(
  id: number,
): Promise<{ success: boolean }> {
  const res = await axiosForBackend.delete<{ success: boolean }>(
    `${REPORTS_URL}/${id}`,
  );
  return res.data;
}

export async function copyCustomReport(
  id: number,
): Promise<CustomReportRecord> {
  const res = await axiosForBackend.post<CustomReportRecord>(
    `${REPORTS_URL}/${id}/copy`,
  );
  return res.data;
}

export async function shareCustomReport(
  id: number,
  input: CustomReportShareInput,
): Promise<CustomReportRecord> {
  const res = await axiosForBackend.patch<CustomReportRecord>(
    `${REPORTS_URL}/${id}/share`,
    input,
  );
  return res.data;
}

export async function saveReportAsTemplate(
  id: number,
  input: ReportTemplateCreateInput,
): Promise<ReportTemplateRecord> {
  const res = await axiosForBackend.post<ReportTemplateRecord>(
    `${REPORTS_URL}/${id}/save-as-template`,
    input,
  );
  return res.data;
}

export async function runCustomReport(
  id: number,
  params?: ReportRunParams,
): Promise<ReportRunResult> {
  const res = await axiosForBackend.post<ReportRunResult>(
    `${REPORTS_URL}/${id}/run`,
    params ?? {},
  );
  return res.data;
}

export async function batchDeleteCustomReports(
  ids: number[],
): Promise<BatchDeleteResponse> {
  const res = await axiosForBackend.post<BatchDeleteResponse>(
    `${REPORTS_URL}/batch-delete`,
    { ids },
  );
  return res.data;
}

/* ============ 报表模板 ============ */

export async function fetchReportTemplates(
  params: ReportTemplateListParams,
): Promise<ReportTemplateListResponse> {
  const res = await axiosForBackend.get<ReportTemplateListResponse>(
    TEMPLATES_URL,
    { params },
  );
  return res.data;
}

export async function createReportTemplate(
  input: ReportTemplateCreateInput,
): Promise<ReportTemplateRecord> {
  const res = await axiosForBackend.post<ReportTemplateRecord>(
    TEMPLATES_URL,
    input,
  );
  return res.data;
}

export async function getReportTemplate(
  id: number,
): Promise<ReportTemplateRecord> {
  const res = await axiosForBackend.get<ReportTemplateRecord>(
    `${TEMPLATES_URL}/${id}`,
  );
  return res.data;
}

export async function updateReportTemplate(
  id: number,
  input: ReportTemplateUpdateInput,
): Promise<ReportTemplateRecord> {
  const res = await axiosForBackend.patch<ReportTemplateRecord>(
    `${TEMPLATES_URL}/${id}`,
    input,
  );
  return res.data;
}

export async function deleteReportTemplate(
  id: number,
): Promise<{ success: boolean }> {
  const res = await axiosForBackend.delete<{ success: boolean }>(
    `${TEMPLATES_URL}/${id}`,
  );
  return res.data;
}

export async function applyReportTemplate(
  id: number,
  input: ReportTemplateApplyInput,
): Promise<CustomReportRecord> {
  const res = await axiosForBackend.post<CustomReportRecord>(
    `${TEMPLATES_URL}/${id}/apply`,
    input,
  );
  return res.data;
}

export async function rateReportTemplate(
  id: number,
  input: ReportTemplateRatingInput,
): Promise<ReportTemplateRatingResponse> {
  const res = await axiosForBackend.patch<ReportTemplateRatingResponse>(
    `${TEMPLATES_URL}/${id}/rating`,
    input,
  );
  return res.data;
}

export async function batchDeleteReportTemplates(
  ids: number[],
): Promise<BatchDeleteResponse> {
  const res = await axiosForBackend.post<BatchDeleteResponse>(
    `${TEMPLATES_URL}/batch-delete`,
    { ids },
  );
  return res.data;
}

/* ============ 定时推送 ============ */

export async function fetchSchedules(
  params: ScheduledReportListParams,
): Promise<ScheduledReportListResponse> {
  const res = await axiosForBackend.get<ScheduledReportListResponse>(
    SCHEDULES_URL,
    { params },
  );
  return res.data;
}

export async function createSchedule(
  input: ScheduledReportCreateInput,
): Promise<ScheduledReportRecord> {
  const res = await axiosForBackend.post<ScheduledReportRecord>(
    SCHEDULES_URL,
    input,
  );
  return res.data;
}

export async function getSchedule(
  id: number,
): Promise<ScheduledReportRecord> {
  const res = await axiosForBackend.get<ScheduledReportRecord>(
    `${SCHEDULES_URL}/${id}`,
  );
  return res.data;
}

export async function updateSchedule(
  id: number,
  input: ScheduledReportUpdateInput,
): Promise<ScheduledReportRecord> {
  const res = await axiosForBackend.patch<ScheduledReportRecord>(
    `${SCHEDULES_URL}/${id}`,
    input,
  );
  return res.data;
}

export async function deleteSchedule(
  id: number,
): Promise<{ success: boolean }> {
  const res = await axiosForBackend.delete<{ success: boolean }>(
    `${SCHEDULES_URL}/${id}`,
  );
  return res.data;
}

export async function updateScheduleStatus(
  id: number,
  status: string,
): Promise<ScheduledReportRecord> {
  const res = await axiosForBackend.patch<ScheduledReportRecord>(
    `${SCHEDULES_URL}/${id}/status`,
    { status },
  );
  return res.data;
}

export async function runSchedule(
  id: number,
): Promise<ScheduledReportRunResponse> {
  const res = await axiosForBackend.post<ScheduledReportRunResponse>(
    `${SCHEDULES_URL}/${id}/run`,
  );
  return res.data;
}

export async function previewSchedule(
  id: number,
): Promise<ScheduledPreviewResponse> {
  const res = await axiosForBackend.get<ScheduledPreviewResponse>(
    `${SCHEDULES_URL}/${id}/preview`,
  );
  return res.data;
}

export async function fetchScheduleRunLogs(): Promise<ScheduledRunLog[]> {
  const res = await axiosForBackend.get<ScheduledRunLog[]>(
    `${SCHEDULES_URL}/runs/logs`,
  );
  return res.data;
}

/* ============ 数据下钻 ============ */

export async function fetchDrilldowns(
  params: DrilldownListParams,
): Promise<DrilldownListResponse> {
  const res = await axiosForBackend.get<DrilldownListResponse>(
    DRILLDOWNS_URL,
    { params },
  );
  return res.data;
}

export async function executeDrilldown(
  input: DrilldownExecuteInput,
): Promise<DrilldownExecuteResult> {
  const res = await axiosForBackend.post<DrilldownExecuteResult>(
    `${DRILLDOWNS_URL}/execute`,
    input,
  );
  return res.data;
}

export async function fetchDrilldownConfig(): Promise<DrilldownConfigResponse> {
  const res = await axiosForBackend.get<DrilldownConfigResponse>(
    `${DRILLDOWNS_URL}/config`,
  );
  return res.data;
}
