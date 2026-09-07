import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  ConsumptionSummarySyncResult,
  CreateDepartmentTargetRequest,
  CreatePerformanceTaskRequest,
  DashboardTargetSummary,
  DepartmentTarget,
  DepartmentTargetListParams,
  DepartmentTargetListResult,
  PerformanceTask,
  PerformanceTaskListParams,
  PerformanceTaskListResult,
  PerformanceTaskSummary,
  RankListResult,
  RankPortFilter,
  RankQueryParams,
  RankTimeRange,
  UpdateDepartmentTargetRequest,
  UpdatePerformanceTaskRequest,
} from '@shared/api.interface';

const get = async <T>(url: string): Promise<T> => {
  const response = await axiosForBackend({ url, method: 'GET' });
  return response.data as T;
};

const post = async <T>(url: string, body?: unknown): Promise<T> => {
  const response = await axiosForBackend({ url, method: 'POST', data: body });
  return response.data as T;
};

const patch = async <T>(url: string, body?: unknown): Promise<T> => {
  const response = await axiosForBackend({ url, method: 'PATCH', data: body });
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

export const listSalespersonRank = async (
  params: RankQueryParams,
): Promise<RankListResult> =>
  get<RankListResult>(
    `/api/daily-consumption/ranks/salesperson${buildQuery(params)}`,
  );

export const listGroupRank = async (
  params: RankQueryParams,
): Promise<RankListResult> =>
  get<RankListResult>(`/api/daily-consumption/ranks/group${buildQuery(params)}`);

export const listPortRank = async (
  params: RankQueryParams,
): Promise<RankListResult> =>
  get<RankListResult>(`/api/daily-consumption/ranks/port${buildQuery(params)}`);

export const listIndustryRank = async (
  params: RankQueryParams,
): Promise<RankListResult> =>
  get<RankListResult>(
    `/api/daily-consumption/ranks/industry${buildQuery(params)}`,
  );

export const listNewAccountRank = async (
  params: RankQueryParams,
  dimension: string,
): Promise<RankListResult> =>
  get<RankListResult>(
    `/api/daily-consumption/ranks/new-accounts${buildQuery({
      ...params,
      dimension,
    })}`,
  );

export const syncConsumption = async (): Promise<ConsumptionSummarySyncResult> =>
  post<ConsumptionSummarySyncResult>('/api/daily-consumption/sync');

export const listDepartmentTargets = async (
  params: DepartmentTargetListParams,
): Promise<DepartmentTargetListResult> =>
  get<DepartmentTargetListResult>(
    `/api/department-targets${buildQuery(params)}`,
  );

export const getDepartmentTarget = async (id: number): Promise<DepartmentTarget> =>
  get<DepartmentTarget>(`/api/department-targets/${id}`);

export const createDepartmentTarget = async (
  dto: CreateDepartmentTargetRequest,
): Promise<DepartmentTarget> =>
  post<DepartmentTarget>('/api/department-targets', dto);

export const updateDepartmentTarget = async (
  id: number,
  dto: UpdateDepartmentTargetRequest,
): Promise<DepartmentTarget> =>
  patch<DepartmentTarget>(`/api/department-targets/${id}`, dto);

export const deleteDepartmentTarget = async (id: number): Promise<{ id: number }> =>
  del<{ id: number }>(`/api/department-targets/${id}`);

export const recalculateDepartmentTarget = async (
  id: number,
): Promise<DepartmentTarget> =>
  post<DepartmentTarget>(`/api/department-targets/${id}/recalculate`);

export const getDepartmentTargetSummary = async (
  targetType: string,
): Promise<DashboardTargetSummary> =>
  get<DashboardTargetSummary>(
    `/api/department-targets/summary${buildQuery({ targetType })}`,
  );

export const listPerformanceTasks = async (
  params: PerformanceTaskListParams,
): Promise<PerformanceTaskListResult> =>
  get<PerformanceTaskListResult>(`/api/performance-tasks${buildQuery(params)}`);

export const getPerformanceSummary = async (): Promise<PerformanceTaskSummary> =>
  get<PerformanceTaskSummary>('/api/performance-tasks/summary');

export const createPerformanceTask = async (
  dto: CreatePerformanceTaskRequest,
): Promise<PerformanceTask> => post<PerformanceTask>('/api/performance-tasks', dto);

export const updatePerformanceTask = async (
  id: number,
  dto: UpdatePerformanceTaskRequest,
): Promise<PerformanceTask> =>
  patch<PerformanceTask>(`/api/performance-tasks/${id}`, dto);

export const deletePerformanceTask = async (id: number): Promise<{ id: number }> =>
  del<{ id: number }>(`/api/performance-tasks/${id}`);

export const confirmPerformanceTask = async (
  id: number,
  score: number,
): Promise<PerformanceTask> =>
  post<PerformanceTask>(`/api/performance-tasks/${id}/confirm`, { score });

export const rejectPerformanceTask = async (
  id: number,
  confirmRemark: string,
): Promise<PerformanceTask> =>
  post<PerformanceTask>(`/api/performance-tasks/${id}/reject`, {
    confirmRemark,
  });

export type { RankPortFilter, RankTimeRange };
