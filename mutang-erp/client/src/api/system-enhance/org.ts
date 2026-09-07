import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  OrgDepartment,
  OrgDepartmentCreateDto,
  OrgDepartmentTreeNode,
  OrgDepartmentUpdateDto,
  OrgPosition,
  OrgPositionCreateDto,
  OrgPositionUpdateDto,
  OrgSortDto,
  OrgStats,
} from '@shared/api.interface';

const BASE: string = '/api/system-enhance/org';

export interface OrgPositionListParams {
  deptId?: number;
  status?: string;
}

async function getJson<T>(url: string): Promise<T> {
  const response = await axiosForBackend({ url, method: 'GET' });
  return response.data as T;
}

async function postJson<T>(url: string, body?: unknown): Promise<T> {
  const response = await axiosForBackend({
    url,
    method: 'POST',
    data: body ?? {},
  });
  return response.data as T;
}

async function patchJson<T>(url: string, body?: unknown): Promise<T> {
  const response = await axiosForBackend({ url, method: 'PATCH', data: body ?? {} });
  return response.data as T;
}

async function deleteJson<T>(url: string): Promise<T> {
  const response = await axiosForBackend({ url, method: 'DELETE' });
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
  return search.toString() ? `?${search.toString()}` : '';
};

/* ============ 部门 ============ */

export async function listOrgDepartmentTree(): Promise<OrgDepartmentTreeNode[]> {
  return getJson<OrgDepartmentTreeNode[]>(`${BASE}/departments`);
}

export async function listOrgDepartmentsFlat(): Promise<OrgDepartment[]> {
  return getJson<OrgDepartment[]>(`${BASE}/departments/flat`);
}

export async function createOrgDepartment(
  body: OrgDepartmentCreateDto,
): Promise<{ id: number }> {
  return postJson<{ id: number }>(`${BASE}/departments`, body);
}

export async function updateOrgDepartment(
  id: number,
  body: OrgDepartmentUpdateDto,
): Promise<{ id: number }> {
  return patchJson<{ id: number }>(`${BASE}/departments/${id}`, body);
}

export async function deleteOrgDepartment(
  id: number,
): Promise<{ success: boolean }> {
  return deleteJson<{ success: boolean }>(`${BASE}/departments/${id}`);
}

export async function sortOrgDepartments(
  body: OrgSortDto,
): Promise<{ updated: number }> {
  return postJson<{ updated: number }>(`${BASE}/departments/sort`, body);
}

/* ============ 岗位 ============ */

export async function listOrgPositions(
  params: OrgPositionListParams,
): Promise<OrgPosition[]> {
  return getJson<OrgPosition[]>(`${BASE}/positions${buildQuery(params)}`);
}

export async function createOrgPosition(
  body: OrgPositionCreateDto,
): Promise<{ id: number }> {
  return postJson<{ id: number }>(`${BASE}/positions`, body);
}

export async function updateOrgPosition(
  id: number,
  body: OrgPositionUpdateDto,
): Promise<{ id: number }> {
  return patchJson<{ id: number }>(`${BASE}/positions/${id}`, body);
}

export async function deleteOrgPosition(
  id: number,
): Promise<{ success: boolean }> {
  return deleteJson<{ success: boolean }>(`${BASE}/positions/${id}`);
}

/* ============ 统计 ============ */

export async function getOrgStats(): Promise<OrgStats> {
  return getJson<OrgStats>(`${BASE}/stats`);
}
