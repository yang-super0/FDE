import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  AdminEnhanceApproveDto,
  AdminEnhanceBatchIdsDto,
  AdminEnhanceCheckSubmitDto,
  AdminEnhanceListParams,
  AdminEnhanceListResponse,
  AdminInbound,
  AdminInventoryCheck,
  AdminRequisition,
  AdminReturnRecord,
  CreateAdminInboundDto,
  CreateAdminInventoryCheckDto,
  CreateAdminRequisitionDto,
  CreateAdminReturnRecordDto,
  InventoryCheckDetailListResponse,
  UpdateAdminInboundDto,
  UpdateAdminInventoryCheckDto,
  UpdateAdminRequisitionDto,
  UpdateAdminReturnRecordDto,
} from '@shared/api.interface';

const BASE: string = '/api/admin-enhance';

async function getJson<T>(url: string): Promise<T> {
  const response = await axiosForBackend({ url, method: 'GET' });
  return response.data as T;
}

async function postJson<T>(url: string, body?: unknown): Promise<T> {
  const response = await axiosForBackend({ url, method: 'POST', data: body ?? {} });
  return response.data as T;
}

async function patchJson<T>(url: string, body: unknown): Promise<T> {
  const response = await axiosForBackend({ url, method: 'PATCH', data: body });
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

const postBatchIds = <T>(url: string, ids: number[]): Promise<T> =>
  postJson<T>(url, { ids } satisfies AdminEnhanceBatchIdsDto);

/* ============ 入库管理 ============ */

export async function fetchInbounds(
  params: AdminEnhanceListParams,
): Promise<AdminEnhanceListResponse<AdminInbound>> {
  return getJson<AdminEnhanceListResponse<AdminInbound>>(
    `${BASE}/inbounds${buildQuery(params)}`,
  );
}

export async function createInbound(
  body: CreateAdminInboundDto,
): Promise<AdminInbound> {
  return postJson<AdminInbound>(`${BASE}/inbounds`, body);
}

export async function updateInbound(
  id: number,
  body: UpdateAdminInboundDto,
): Promise<AdminInbound> {
  return patchJson<AdminInbound>(`${BASE}/inbounds/${id}`, body);
}

export async function confirmInbound(id: number): Promise<AdminInbound> {
  return postJson<AdminInbound>(`${BASE}/inbounds/${id}/confirm`);
}

export async function cancelInbound(id: number): Promise<AdminInbound> {
  return postJson<AdminInbound>(`${BASE}/inbounds/${id}/cancel`);
}

export async function deleteInbound(
  id: number,
): Promise<{ success: boolean }> {
  return deleteJson<{ success: boolean }>(`${BASE}/inbounds/${id}`);
}

export async function batchDeleteInbounds(
  ids: number[],
): Promise<{ deleted: number }> {
  return postBatchIds<{ deleted: number }>(`${BASE}/inbounds/batch-delete`, ids);
}

/* ============ 领用管理 ============ */

export async function fetchRequisitions(
  params: AdminEnhanceListParams,
): Promise<AdminEnhanceListResponse<AdminRequisition>> {
  return getJson<AdminEnhanceListResponse<AdminRequisition>>(
    `${BASE}/requisitions${buildQuery(params)}`,
  );
}

export async function createRequisition(
  body: CreateAdminRequisitionDto,
): Promise<AdminRequisition> {
  return postJson<AdminRequisition>(`${BASE}/requisitions`, body);
}

export async function updateRequisition(
  id: number,
  body: UpdateAdminRequisitionDto,
): Promise<AdminRequisition> {
  return patchJson<AdminRequisition>(`${BASE}/requisitions/${id}`, body);
}

export async function approveRequisition(
  id: number,
  body: AdminEnhanceApproveDto,
): Promise<AdminRequisition> {
  return postJson<AdminRequisition>(`${BASE}/requisitions/${id}/approve`, body);
}

export async function issueRequisition(id: number): Promise<AdminRequisition> {
  return postJson<AdminRequisition>(`${BASE}/requisitions/${id}/issue`);
}

export async function cancelRequisition(id: number): Promise<AdminRequisition> {
  return postJson<AdminRequisition>(`${BASE}/requisitions/${id}/cancel`);
}

export async function deleteRequisition(
  id: number,
): Promise<{ success: boolean }> {
  return deleteJson<{ success: boolean }>(`${BASE}/requisitions/${id}`);
}

export async function batchDeleteRequisitions(
  ids: number[],
): Promise<{ deleted: number }> {
  return postBatchIds<{ deleted: number }>(`${BASE}/requisitions/batch-delete`, ids);
}

/* ============ 归还管理 ============ */

export async function fetchReturns(
  params: AdminEnhanceListParams,
): Promise<AdminEnhanceListResponse<AdminReturnRecord>> {
  return getJson<AdminEnhanceListResponse<AdminReturnRecord>>(
    `${BASE}/returns${buildQuery(params)}`,
  );
}

export async function createReturn(
  body: CreateAdminReturnRecordDto,
): Promise<AdminReturnRecord> {
  return postJson<AdminReturnRecord>(`${BASE}/returns`, body);
}

export async function updateReturn(
  id: number,
  body: UpdateAdminReturnRecordDto,
): Promise<AdminReturnRecord> {
  return patchJson<AdminReturnRecord>(`${BASE}/returns/${id}`, body);
}

export async function confirmReturn(id: number): Promise<AdminReturnRecord> {
  return postJson<AdminReturnRecord>(`${BASE}/returns/${id}/confirm`);
}

export async function deleteReturn(
  id: number,
): Promise<{ success: boolean }> {
  return deleteJson<{ success: boolean }>(`${BASE}/returns/${id}`);
}

export async function batchDeleteReturns(
  ids: number[],
): Promise<{ deleted: number }> {
  return postBatchIds<{ deleted: number }>(`${BASE}/returns/batch-delete`, ids);
}

/* ============ 盘点管理 ============ */

export async function fetchInventoryChecks(
  params: AdminEnhanceListParams,
): Promise<AdminEnhanceListResponse<AdminInventoryCheck>> {
  return getJson<AdminEnhanceListResponse<AdminInventoryCheck>>(
    `${BASE}/inventory-checks${buildQuery(params)}`,
  );
}

export async function createInventoryCheck(
  body: CreateAdminInventoryCheckDto,
): Promise<AdminInventoryCheck> {
  return postJson<AdminInventoryCheck>(`${BASE}/inventory-checks`, body);
}

export async function updateInventoryCheck(
  id: number,
  body: UpdateAdminInventoryCheckDto,
): Promise<AdminInventoryCheck> {
  return patchJson<AdminInventoryCheck>(`${BASE}/inventory-checks/${id}`, body);
}

export async function fetchCheckDetails(
  id: number,
): Promise<InventoryCheckDetailListResponse> {
  return getJson<InventoryCheckDetailListResponse>(`${BASE}/inventory-checks/${id}/details`);
}

export async function submitCheckDetails(
  id: number,
  body: AdminEnhanceCheckSubmitDto,
): Promise<InventoryCheckDetailListResponse> {
  return postJson<InventoryCheckDetailListResponse>(`${BASE}/inventory-checks/${id}/details`, body);
}

export async function completeInventoryCheck(
  id: number,
): Promise<AdminInventoryCheck> {
  return postJson<AdminInventoryCheck>(`${BASE}/inventory-checks/${id}/complete`);
}

export async function deleteInventoryCheck(
  id: number,
): Promise<{ success: boolean }> {
  return deleteJson<{ success: boolean }>(`${BASE}/inventory-checks/${id}`);
}

export async function batchDeleteInventoryChecks(
  ids: number[],
): Promise<{ deleted: number }> {
  return postBatchIds<{ deleted: number }>(`${BASE}/inventory-checks/batch-delete`, ids);
}
