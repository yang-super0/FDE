import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  CollaborationTask,
  CollaborationTaskBatchUpdateDto,
  CollaborationTaskCreateDto,
  CollaborationTaskListParams,
  CollaborationTaskStats,
  CollaborationTaskUpdateDto,
  TaskComment,
  TaskCommentCreateDto,
} from '@shared/api.interface';

const BASE: string = '/api/task-enhance/collaboration-tasks';

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
  return search.toString() ? `?${search.toString()}` : '';
};

export interface CollaborationTaskListResponse {
  items: CollaborationTask[];
  total: number;
  page: number;
  pageSize: number;
}

export async function listCollaborationTasks(
  params: CollaborationTaskListParams,
): Promise<CollaborationTaskListResponse> {
  return getJson<CollaborationTaskListResponse>(`${BASE}${buildQuery(params)}`);
}

export async function getCollaborationTaskStats(): Promise<CollaborationTaskStats> {
  return getJson<CollaborationTaskStats>(`${BASE}/summary`);
}

export async function createCollaborationTask(
  body: CollaborationTaskCreateDto,
): Promise<CollaborationTask> {
  return postJson<CollaborationTask>(BASE, body);
}

export async function getCollaborationTask(
  id: number,
): Promise<CollaborationTask> {
  return getJson<CollaborationTask>(`${BASE}/${id}`);
}

export async function updateCollaborationTask(
  id: number,
  body: CollaborationTaskUpdateDto,
): Promise<CollaborationTask> {
  return patchJson<CollaborationTask>(`${BASE}/${id}`, body);
}

export async function batchUpdateCollaborationTasks(
  body: CollaborationTaskBatchUpdateDto,
): Promise<{ updated: number }> {
  return postJson<{ updated: number }>(`${BASE}/batch-update`, body);
}

export async function listTaskComments(
  id: number,
): Promise<TaskComment[]> {
  return getJson<TaskComment[]>(`${BASE}/${id}/comments`);
}

export async function createTaskComment(
  id: number,
  body: TaskCommentCreateDto,
): Promise<TaskComment> {
  return postJson<TaskComment>(`${BASE}/${id}/comments`, body);
}

export async function deleteCollaborationTask(
  id: number,
): Promise<{ success: boolean }> {
  return deleteJson<{ success: boolean }>(`${BASE}/${id}`);
}
