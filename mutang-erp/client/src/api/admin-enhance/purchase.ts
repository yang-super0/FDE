import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  AdminEnhanceApproveDto,
  AdminEnhanceBatchIdsDto,
  AdminEnhanceListParams,
  AdminEnhanceListResponse,
  AdminEnhanceReceiveDto,
  AdminEnhanceShipDto,
  AdminPurchaseDetail,
  AdminPurchaseOrder,
  AdminPurchaseRequest,
  CreateAdminPurchaseDetailDto,
  CreateAdminPurchaseOrderDto,
  CreateAdminPurchaseRequestDto,
  UpdateAdminPurchaseDetailDto,
  UpdateAdminPurchaseOrderDto,
  UpdateAdminPurchaseRequestDto,
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
  const query: string = search.toString();
  return query ? `?${query}` : '';
};

/* ============ 采购申请 ============ */

export async function fetchPurchaseRequests(
  params: AdminEnhanceListParams,
): Promise<AdminEnhanceListResponse<AdminPurchaseRequest>> {
  return getJson<AdminEnhanceListResponse<AdminPurchaseRequest>>(
    `${BASE}/purchase-requests${buildQuery(params)}`,
  );
}

export async function createPurchaseRequest(
  body: CreateAdminPurchaseRequestDto,
): Promise<AdminPurchaseRequest> {
  return postJson<AdminPurchaseRequest>(`${BASE}/purchase-requests`, body);
}

export async function updatePurchaseRequest(
  id: number,
  body: UpdateAdminPurchaseRequestDto,
): Promise<AdminPurchaseRequest> {
  return patchJson<AdminPurchaseRequest>(`${BASE}/purchase-requests/${id}`, body);
}

export async function approvePurchaseRequest(
  id: number,
  body: AdminEnhanceApproveDto,
): Promise<AdminPurchaseRequest> {
  return postJson<AdminPurchaseRequest>(`${BASE}/purchase-requests/${id}/approve`, body);
}

export async function cancelPurchaseRequest(
  id: number,
): Promise<AdminPurchaseRequest> {
  return postJson<AdminPurchaseRequest>(`${BASE}/purchase-requests/${id}/cancel`);
}

export async function deletePurchaseRequest(
  id: number,
): Promise<{ success: boolean }> {
  return deleteJson<{ success: boolean }>(`${BASE}/purchase-requests/${id}`);
}

export async function batchDeletePurchaseRequests(
  body: AdminEnhanceBatchIdsDto,
): Promise<{ deleted: number }> {
  return postJson<{ deleted: number }>(`${BASE}/purchase-requests/batch-delete`, body);
}

/* ============ 采购订单 ============ */

export async function fetchPurchaseOrders(
  params: AdminEnhanceListParams,
): Promise<AdminEnhanceListResponse<AdminPurchaseOrder>> {
  return getJson<AdminEnhanceListResponse<AdminPurchaseOrder>>(
    `${BASE}/purchase-orders${buildQuery(params)}`,
  );
}

export async function createPurchaseOrder(
  body: CreateAdminPurchaseOrderDto,
): Promise<AdminPurchaseOrder> {
  return postJson<AdminPurchaseOrder>(`${BASE}/purchase-orders`, body);
}

export async function updatePurchaseOrder(
  id: number,
  body: UpdateAdminPurchaseOrderDto,
): Promise<AdminPurchaseOrder> {
  return patchJson<AdminPurchaseOrder>(`${BASE}/purchase-orders/${id}`, body);
}

export async function shipPurchaseOrder(
  id: number,
  body: AdminEnhanceShipDto,
): Promise<AdminPurchaseOrder> {
  return postJson<AdminPurchaseOrder>(`${BASE}/purchase-orders/${id}/ship`, body);
}

export async function cancelPurchaseOrder(
  id: number,
): Promise<AdminPurchaseOrder> {
  return postJson<AdminPurchaseOrder>(`${BASE}/purchase-orders/${id}/cancel`);
}

export async function deletePurchaseOrder(
  id: number,
): Promise<{ success: boolean }> {
  return deleteJson<{ success: boolean }>(`${BASE}/purchase-orders/${id}`);
}

export async function batchDeletePurchaseOrders(
  body: AdminEnhanceBatchIdsDto,
): Promise<{ deleted: number }> {
  return postJson<{ deleted: number }>(`${BASE}/purchase-orders/batch-delete`, body);
}

/* ============ 采购明细 ============ */

export async function fetchPurchaseDetails(
  params: AdminEnhanceListParams,
): Promise<AdminEnhanceListResponse<AdminPurchaseDetail>> {
  return getJson<AdminEnhanceListResponse<AdminPurchaseDetail>>(
    `${BASE}/purchase-details${buildQuery(params)}`,
  );
}

export async function createPurchaseDetail(
  body: CreateAdminPurchaseDetailDto,
): Promise<AdminPurchaseDetail> {
  return postJson<AdminPurchaseDetail>(`${BASE}/purchase-details`, body);
}

export async function updatePurchaseDetail(
  id: number,
  body: UpdateAdminPurchaseDetailDto,
): Promise<AdminPurchaseDetail> {
  return patchJson<AdminPurchaseDetail>(`${BASE}/purchase-details/${id}`, body);
}

export async function receivePurchaseDetail(
  id: number,
  body: AdminEnhanceReceiveDto,
): Promise<AdminPurchaseDetail> {
  return postJson<AdminPurchaseDetail>(`${BASE}/purchase-details/${id}/receive`, body);
}

export async function deletePurchaseDetail(
  id: number,
): Promise<{ success: boolean }> {
  return deleteJson<{ success: boolean }>(`${BASE}/purchase-details/${id}`);
}

export async function batchDeletePurchaseDetails(
  body: AdminEnhanceBatchIdsDto,
): Promise<{ deleted: number }> {
  return postJson<{ deleted: number }>(`${BASE}/purchase-details/batch-delete`, body);
}
