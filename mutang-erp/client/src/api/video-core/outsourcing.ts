import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  CreateOutsourcingProjectRequest,
  OutsourcingProject,
  OutsourcingProjectListParams,
  OutsourcingProjectListResult,
  OutsourcingProjectStatusRequest,
  SettleOutsourcingRequest,
  VideoCoreProjectListResult,
} from '@shared/api.interface';

const BASE: string = '/api/video-core/outsourcing-projects';
const PROJECTS_URL: string = '/api/video-core/projects';

export interface ApproveOutsourcingRequest {
  approved: boolean;
  rejectReason?: string;
}

async function request<T>(url: string, method: string, body?: unknown): Promise<T> {
  const response = await axiosForBackend({ url, method, data: body });
  return response.data as T;
}

const buildQuery = (params: object): string => {
  const search: URLSearchParams = new URLSearchParams();
  Object.entries(params as Record<string, unknown>).forEach(
    ([key, value]: [string, unknown]) => {
      if (value !== undefined && value !== null && value !== '') {
        search.set(key, String(value));
      }
    },
  );
  const query: string = search.toString();
  return query ? `?${query}` : '';
};

export async function fetchOutsourcingProjects(
  params: OutsourcingProjectListParams,
): Promise<OutsourcingProjectListResult> {
  return request<OutsourcingProjectListResult>(`${BASE}${buildQuery(params)}`, 'GET');
}

export async function createOutsourcingProject(
  body: CreateOutsourcingProjectRequest,
): Promise<{ id: number }> {
  return request<{ id: number }>(`${BASE}`, 'POST', body);
}

export async function fetchOutsourcingProjectById(id: number): Promise<OutsourcingProject> {
  return request<OutsourcingProject>(`${BASE}/${id}`, 'GET');
}

export async function updateOutsourcingProject(
  id: number,
  body: Partial<CreateOutsourcingProjectRequest>,
): Promise<OutsourcingProject> {
  return request<OutsourcingProject>(`${BASE}/${id}`, 'PATCH', body);
}

export async function deleteOutsourcingProject(
  id: number,
): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`${BASE}/${id}`, 'DELETE');
}

export async function approveOutsourcingProject(
  id: number,
  body: ApproveOutsourcingRequest,
): Promise<OutsourcingProject> {
  return request<OutsourcingProject>(`${BASE}/${id}/approve`, 'POST', body);
}

export async function setOutsourcingProjectStatus(
  id: number,
  body: OutsourcingProjectStatusRequest,
): Promise<OutsourcingProject> {
  return request<OutsourcingProject>(`${BASE}/${id}/status`, 'POST', body);
}

export async function settleOutsourcingProject(
  id: number,
  body: SettleOutsourcingRequest,
): Promise<OutsourcingProject> {
  return request<OutsourcingProject>(`${BASE}/${id}/settle`, 'POST', body);
}

/** 内部项目下拉数据（外包项目关联用） */
export async function fetchInternalProjects(): Promise<VideoCoreProjectListResult> {
  return request<VideoCoreProjectListResult>(
    `${PROJECTS_URL}${buildQuery({ page: 1, pageSize: 100 })}`,
    'GET',
  );
}
