import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  Actor,
  ActorListParams,
  ActorListResult,
  CreateActorRequest,
  UpdateActorRequest,
} from '@shared/api.interface';

const BASE: string = '/api/video-core/actors';

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

export async function fetchActors(params: ActorListParams): Promise<ActorListResult> {
  return request<ActorListResult>(`${BASE}${buildQuery(params)}`, 'GET');
}

export async function createActor(body: CreateActorRequest): Promise<{ id: number }> {
  return request<{ id: number }>(`${BASE}`, 'POST', body);
}

export async function fetchActorById(id: number): Promise<Actor> {
  return request<Actor>(`${BASE}/${id}`, 'GET');
}

export async function updateActor(id: number, body: UpdateActorRequest): Promise<Actor> {
  return request<Actor>(`${BASE}/${id}`, 'PATCH', body);
}

export async function deleteActor(id: number): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`${BASE}/${id}`, 'DELETE');
}
