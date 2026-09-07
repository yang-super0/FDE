import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  CalculateCommissionsRequest,
  VideoCommissionListParams,
  VideoCommissionListResult,
  VideoCommissionStats,
  VideoOrder,
  VideoOrderListResult,
} from '@shared/api.interface';

const BASE: string = '/api/video-core/commissions';
const ORDERS_URL: string = '/api/video-core/orders';

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

export async function fetchVideoCommissions(
  params: VideoCommissionListParams,
): Promise<VideoCommissionListResult> {
  return getJson<VideoCommissionListResult>(`${BASE}${buildQuery(params)}`);
}

export async function fetchVideoCommissionStats(): Promise<VideoCommissionStats> {
  return getJson<VideoCommissionStats>(`${BASE}/stats`);
}

export async function calculateVideoCommissions(
  body: CalculateCommissionsRequest,
): Promise<{ created: number; skipped: number }> {
  return postJson<{ created: number; skipped: number }>(
    `${BASE}/calculate`,
    body,
  );
}

export async function batchPayVideoCommissions(
  ids: number[],
): Promise<{ updated: number; skipped: number }> {
  return postJson<{ updated: number; skipped: number }>(`${BASE}/batch-pay`, {
    ids,
  });
}

export async function cancelVideoCommission(
  id: number,
): Promise<{ success: boolean }> {
  return postJson<{ success: boolean }>(`${BASE}/${id}/cancel`);
}

export async function deleteVideoCommission(
  id: number,
): Promise<{ success: boolean }> {
  return deleteJson<{ success: boolean }>(`${BASE}/${id}`);
}

/** 提成计算的数据源：已完成订单（最多 100 条） */
export async function fetchCompletedVideoOrders(): Promise<VideoOrder[]> {
  const result = await getJson<VideoOrderListResult>(
    `${ORDERS_URL}${buildQuery({
      status: '已完成',
      page: 1,
      pageSize: 100,
    })}`,
  );
  return result.items;
}
