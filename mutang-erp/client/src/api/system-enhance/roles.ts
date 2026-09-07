import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  CurrentUserRole,
  RoleCopyDto,
  RolePermissionItem,
  RolePermissionSaveDto,
  SystemRole,
  SystemRoleCreateDto,
  SystemRoleListParams,
  SystemRoleUpdateDto,
  TaskEnhanceListResponse,
} from '@shared/api.interface';

const BASE: string = '/api/system-enhance/roles';

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

async function putJson<T>(url: string, body?: unknown): Promise<T> {
  const response = await axiosForBackend({
    url,
    method: 'PUT',
    data: body ?? {},
  });
  return response.data as T;
}

async function patchJson<T>(url: string, body?: unknown): Promise<T> {
  const response = await axiosForBackend({
    url,
    method: 'PATCH',
    data: body ?? {},
  });
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
  const query: string = search.toString();
  return query ? `?${query}` : '';
};

/* ============ 角色权限 ============ */

export async function listSystemRoles(
  params: SystemRoleListParams,
): Promise<TaskEnhanceListResponse<SystemRole>> {
  return getJson<TaskEnhanceListResponse<SystemRole>>(
    `${BASE}${buildQuery(params)}`,
  );
}

export async function getRolePermissions(
  id: number,
): Promise<RolePermissionItem[]> {
  return getJson<RolePermissionItem[]>(`${BASE}/${id}/permissions`);
}

export async function saveRolePermissions(
  id: number,
  body: RolePermissionSaveDto,
): Promise<{ count: number }> {
  return putJson<{ count: number }>(`${BASE}/${id}/permissions`, body);
}

export async function createSystemRole(
  body: SystemRoleCreateDto,
): Promise<{ id: number }> {
  return postJson<{ id: number }>(`${BASE}`, body);
}

export async function updateSystemRole(
  id: number,
  body: SystemRoleUpdateDto,
): Promise<{ id: number }> {
  return patchJson<{ id: number }>(`${BASE}/${id}`, body);
}

export async function copySystemRole(
  id: number,
  body: RoleCopyDto,
): Promise<SystemRole> {
  return postJson<SystemRole>(`${BASE}/${id}/copy`, body);
}

export async function updateSystemRoleStatus(
  id: number,
  status: string,
): Promise<{ id: number }> {
  return patchJson<{ id: number }>(`${BASE}/${id}/status`, { status });
}

export async function getCurrentRole(): Promise<CurrentUserRole> {
  return getJson<CurrentUserRole>(`${BASE}/current`);
}

export async function deleteSystemRole(
  id: number,
): Promise<{ success: boolean }> {
  return deleteJson<{ success: boolean }>(`${BASE}/${id}`);
}
