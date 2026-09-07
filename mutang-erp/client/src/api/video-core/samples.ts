import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  BatchMailSamplesRequest,
  CreateSampleRequest,
  MailSampleRequest,
  ReturnSampleRequest,
  Sample,
  SampleListParams,
  SampleListResult,
  SampleMarkRequest,
  UpdateSampleRequest,
  VideoOrder,
  VideoOrderListResult,
} from '@shared/api.interface';
import { fetchVenueProjectOptions } from './venues';

const BASE: string = '/api/video-core/samples';
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

export async function fetchSamples(
  params: SampleListParams,
): Promise<SampleListResult> {
  return getJson<SampleListResult>(`${BASE}${buildQuery(params)}`);
}

export async function fetchSample(id: number): Promise<Sample> {
  return getJson<Sample>(`${BASE}/${id}`);
}

export async function createSample(
  body: CreateSampleRequest,
): Promise<{ id: number }> {
  return postJson<{ id: number }>(`${BASE}`, body);
}

export async function updateSample(
  id: number,
  body: UpdateSampleRequest,
): Promise<Sample> {
  return patchJson<Sample>(`${BASE}/${id}`, body);
}

export async function mailSample(
  id: number,
  body: MailSampleRequest,
): Promise<{ success: boolean }> {
  return postJson<{ success: boolean }>(`${BASE}/${id}/mail`, body);
}

export async function batchMailSamples(
  body: BatchMailSamplesRequest,
): Promise<{ updated: number; skipped: number }> {
  return postJson<{ updated: number; skipped: number }>(
    `${BASE}/batch-mail`,
    body,
  );
}

export async function receiveSample(
  id: number,
): Promise<{ success: boolean }> {
  return postJson<{ success: boolean }>(`${BASE}/${id}/receive`);
}

export async function shootingSample(
  id: number,
): Promise<{ success: boolean }> {
  return postJson<{ success: boolean }>(`${BASE}/${id}/shooting`);
}

export async function returnSample(
  id: number,
  body: ReturnSampleRequest,
): Promise<{ success: boolean }> {
  return postJson<{ success: boolean }>(`${BASE}/${id}/return`, body);
}

export async function markSample(
  id: number,
  body: SampleMarkRequest,
): Promise<{ success: boolean }> {
  return postJson<{ success: boolean }>(`${BASE}/${id}/mark`, body);
}

export async function deleteSample(
  id: number,
): Promise<{ success: boolean }> {
  return deleteJson<{ success: boolean }>(`${BASE}/${id}`);
}

export type SampleProjectOption = Awaited<ReturnType<typeof fetchVenueProjectOptions>>[number];

export async function fetchSampleProjectOptions(): Promise<SampleProjectOption[]> {
  return fetchVenueProjectOptions();
}

export type SampleOrderOption = Awaited<ReturnType<typeof fetchSampleOrderOptions>>[number];

export async function fetchSampleOrderOptions(): Promise<VideoOrder[]> {
  const result: VideoOrderListResult = await getJson<VideoOrderListResult>(
    `${ORDERS_URL}${buildQuery({ page: 1, pageSize: 100 })}`,
  );
  return result.items;
}
