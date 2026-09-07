import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  CreateOutsourcingVendorRequest,
  OutsourcingVendor,
  OutsourcingVendorListParams,
  OutsourcingVendorListResult,
  UpdateOutsourcingVendorRequest,
} from '@shared/api.interface';

const BASE: string = '/api/video-core/vendors';

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

export async function fetchOutsourcingVendors(
  params: OutsourcingVendorListParams,
): Promise<OutsourcingVendorListResult> {
  return request<OutsourcingVendorListResult>(`${BASE}${buildQuery(params)}`, 'GET');
}

export async function createOutsourcingVendor(
  body: CreateOutsourcingVendorRequest,
): Promise<{ id: number }> {
  return request<{ id: number }>(`${BASE}`, 'POST', body);
}

export async function fetchOutsourcingVendorById(id: number): Promise<OutsourcingVendor> {
  return request<OutsourcingVendor>(`${BASE}/${id}`, 'GET');
}

export async function updateOutsourcingVendor(
  id: number,
  body: UpdateOutsourcingVendorRequest,
): Promise<OutsourcingVendor> {
  return request<OutsourcingVendor>(`${BASE}/${id}`, 'PATCH', body);
}

export async function deleteOutsourcingVendor(id: number): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`${BASE}/${id}`, 'DELETE');
}
