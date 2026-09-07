import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  FieldPermissionBatchDto,
  FieldPermissionCatalogResponse,
  FieldPermissionListParams,
  FieldPermissionListResponse,
  FieldPermissionUpsertDto,
  MyFieldPermissionsResponse,
} from '@shared/api.interface';

const BASE: string = '/api/field-permissions';

const buildQuery = (params: FieldPermissionListParams): string => {
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

export async function getFieldPermissions(
  params: FieldPermissionListParams,
): Promise<FieldPermissionListResponse> {
  const response = await axiosForBackend({
    url: `${BASE}${buildQuery(params)}`,
    method: 'GET',
  });
  return response.data as FieldPermissionListResponse;
}

export async function getFieldPermissionCatalog(): Promise<FieldPermissionCatalogResponse> {
  const response = await axiosForBackend({
    url: `${BASE}/catalog`,
    method: 'GET',
  });
  return response.data as FieldPermissionCatalogResponse;
}

export async function getMyFieldPermissions(
  previewRoleCode?: string,
): Promise<MyFieldPermissionsResponse> {
  const query: string = previewRoleCode
    ? `?previewRoleCode=${encodeURIComponent(previewRoleCode)}`
    : '';
  const response = await axiosForBackend({
    url: `${BASE}/my${query}`,
    method: 'GET',
  });
  return response.data as MyFieldPermissionsResponse;
}

export async function upsertFieldPermission(
  dto: FieldPermissionUpsertDto,
): Promise<void> {
  await axiosForBackend({ url: BASE, method: 'POST', data: dto });
}

export async function batchUpsertFieldPermissions(
  dto: FieldPermissionBatchDto,
): Promise<void> {
  await axiosForBackend({ url: `${BASE}/batch`, method: 'POST', data: dto });
}

export async function patchFieldPermission(
  id: number,
  patch: Partial<FieldPermissionUpsertDto>,
): Promise<void> {
  await axiosForBackend({ url: `${BASE}/${id}`, method: 'PATCH', data: patch });
}

export async function deleteFieldPermission(id: number): Promise<void> {
  await axiosForBackend({ url: `${BASE}/${id}`, method: 'DELETE' });
}
