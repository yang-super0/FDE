import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  BatchIdsApproveRequest,
  CreateVideoOrderRequest,
  UpdateVideoOrderRequest,
  VideoOrder,
  VideoOrderListParams,
  VideoOrderListResult,
  VideoOrderStatusRequest,
} from '@shared/api.interface';

const BASE: string = '/api/video-core/orders';

export interface VideoOrderBatchApproveResult {
  updated: number;
  skipped: number;
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

// ---------- 视频订单 ----------

export async function fetchVideoOrders(
  params: VideoOrderListParams,
): Promise<VideoOrderListResult> {
  return getJson<VideoOrderListResult>(
    `${BASE}${buildQuery(params)}`,
  );
}

export async function fetchVideoOrder(id: number): Promise<VideoOrder> {
  return getJson<VideoOrder>(`${BASE}/${id}`);
}

export async function createVideoOrder(
  body: CreateVideoOrderRequest,
): Promise<{ id: number }> {
  return postJson<{ id: number }>(`${BASE}`, body);
}

export async function updateVideoOrder(
  id: number,
  body: UpdateVideoOrderRequest,
): Promise<VideoOrder> {
  return patchJson<VideoOrder>(`${BASE}/${id}`, body);
}

export async function deleteVideoOrder(
  id: number,
): Promise<{ success: boolean }> {
  return deleteJson<{ success: boolean }>(`${BASE}/${id}`);
}

export async function batchApproveVideoOrders(
  body: BatchIdsApproveRequest,
): Promise<VideoOrderBatchApproveResult> {
  return postJson<VideoOrderBatchApproveResult>(`${BASE}/batch-approve`, body);
}

export async function advanceVideoOrderStatus(
  id: number,
  body: VideoOrderStatusRequest,
): Promise<{ success: boolean }> {
  return postJson<{ success: boolean }>(`${BASE}/${id}/status`, body);
}
