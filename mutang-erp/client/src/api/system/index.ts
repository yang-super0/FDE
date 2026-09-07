import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  PageResult,
  Role,
  SysConfig,
  SystemUser,
  SystemUserStatus,
} from '@shared/api.interface';

export interface RoleListResponse {
  items: Role[];
}

export interface CreateSystemUserRequest {
  memberId: string;
  department: string;
  roleId?: string;
}

export interface UpdateSystemUserPayload {
  department?: string;
  roleId?: string | null;
}

export interface UpdateConfigsRequest {
  configs: { id: string; configValue: string }[];
}

export async function listSystemUsers(
  page: number,
  pageSize: number,
): Promise<PageResult<SystemUser>> {
  const res = await axiosForBackend.get<PageResult<SystemUser>>(
    '/api/system-users',
    { params: { page, pageSize } },
  );
  return res.data;
}

export async function createSystemUser(
  payload: CreateSystemUserRequest,
): Promise<{ id: string }> {
  const res = await axiosForBackend.post<{ id: string }>(
    '/api/system-users',
    payload,
  );
  return res.data;
}

export async function updateSystemUserStatus(
  id: string,
  status: SystemUserStatus,
): Promise<{ success: boolean }> {
  const res = await axiosForBackend.patch<{ success: boolean }>(
    `/api/system-users/${id}/status`,
    { status },
  );
  return res.data;
}

export async function updateSystemUser(
  id: string,
  payload: UpdateSystemUserPayload,
): Promise<{ success: boolean }> {
  const res = await axiosForBackend.patch<{ success: boolean }>(
    `/api/system-users/${id}`,
    payload,
  );
  return res.data;
}

export async function deleteSystemUser(
  id: string,
): Promise<{ success: boolean }> {
  const res = await axiosForBackend.delete<{ success: boolean }>(
    `/api/system-users/${id}`,
  );
  return res.data;
}

export async function listRoles(): Promise<RoleListResponse> {
  const res = await axiosForBackend.get<RoleListResponse>('/api/roles');
  return res.data;
}

export async function listConfigs(): Promise<{ items: SysConfig[] }> {
  const res = await axiosForBackend.get<{ items: SysConfig[] }>(
    '/api/system-configs',
  );
  return res.data;
}

export async function updateConfigs(
  payload: UpdateConfigsRequest,
): Promise<{ success: boolean }> {
  const res = await axiosForBackend.put<{ success: boolean }>(
    '/api/system-configs',
    payload,
  );
  return res.data;
}
