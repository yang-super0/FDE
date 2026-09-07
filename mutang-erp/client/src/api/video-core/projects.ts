import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  CreateVideoCoreProjectRequest,
  UpdateVideoCoreProjectRequest,
  VideoCoreDeliverable,
  VideoCoreProject,
  VideoCoreProjectListParams,
  VideoCoreProjectListResult,
  VideoCoreProjectNode,
  VideoCoreProjectStatus,
  VideoCoreProjectStatusRequest,
  VideoOrder,
  VideoOrderListResult,
} from '@shared/api.interface';

const BASE: string = '/api/video-core/projects';

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

async function putJson<T>(url: string, body: unknown): Promise<T> {
  const response = await axiosForBackend({ url, method: 'PUT', data: body });
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

export async function fetchVideoCoreProjects(
  params: VideoCoreProjectListParams,
): Promise<VideoCoreProjectListResult> {
  return getJson<VideoCoreProjectListResult>(
    `${BASE}${buildQuery(params)}`,
  );
}

export async function fetchVideoCoreProject(
  id: number,
): Promise<VideoCoreProject> {
  return getJson<VideoCoreProject>(`${BASE}/${id}`);
}

export async function createVideoCoreProject(
  body: CreateVideoCoreProjectRequest,
): Promise<VideoCoreProject> {
  return postJson<VideoCoreProject>(`${BASE}`, body);
}

export async function updateVideoCoreProject(
  id: number,
  body: UpdateVideoCoreProjectRequest,
): Promise<VideoCoreProject> {
  return patchJson<VideoCoreProject>(`${BASE}/${id}`, body);
}

export async function updateVideoCoreProjectNodes(
  id: number,
  nodes: VideoCoreProjectNode[],
): Promise<VideoCoreProject> {
  return putJson<VideoCoreProject>(`${BASE}/${id}/nodes`, { nodes });
}

export async function updateVideoCoreProjectDeliverables(
  id: number,
  deliverables: VideoCoreDeliverable[],
): Promise<VideoCoreProject> {
  return putJson<VideoCoreProject>(`${BASE}/${id}/deliverables`, {
    deliverables,
  });
}

export async function advanceVideoCoreProjectStatus(
  id: number,
  status: VideoCoreProjectStatus,
): Promise<VideoCoreProject> {
  const body: VideoCoreProjectStatusRequest = { status };
  return postJson<VideoCoreProject>(`${BASE}/${id}/status`, body);
}

export async function deleteVideoCoreProject(
  id: number,
): Promise<{ success: boolean }> {
  return deleteJson<{ success: boolean }>(`${BASE}/${id}`);
}

/** 新建项目弹窗的关联订单下拉数据源：仅已通过订单 */
export async function fetchApprovedVideoOrders(): Promise<VideoOrder[]> {
  const result: VideoOrderListResult = await getJson<VideoOrderListResult>(
    `/api/video-core/orders${buildQuery({
      status: '已通过',
      page: 1,
      pageSize: 100,
    })}`,
  );
  return result.items;
}
