import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  MyTodo,
  MyTodoBatchActionDto,
  MyTodoCreateDto,
  MyTodoListParams,
  MyTodoSummary,
} from '@shared/api.interface';

const BASE: string = '/api/task-enhance/my-todos';

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

async function patchJson<T>(url: string, body?: unknown): Promise<T> {
  const response = await axiosForBackend({ url, method: 'PATCH', data: body ?? {} });
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

export interface MyTodoListResponse {
  items: MyTodo[];
  total: number;
  page: number;
  pageSize: number;
}

export async function listMyTodos(
  params: MyTodoListParams,
): Promise<MyTodoListResponse> {
  return getJson<MyTodoListResponse>(`${BASE}${buildQuery(params)}`);
}

export async function getMyTodoSummary(): Promise<MyTodoSummary> {
  return getJson<MyTodoSummary>(`${BASE}/summary`);
}

export async function createMyTodo(body: MyTodoCreateDto): Promise<MyTodo> {
  return postJson<MyTodo>(BASE, body);
}

export async function completeMyTodo(id: number): Promise<MyTodo> {
  return patchJson<MyTodo>(`${BASE}/${id}/complete`);
}

export async function ignoreMyTodo(id: number): Promise<MyTodo> {
  return patchJson<MyTodo>(`${BASE}/${id}/ignore`);
}

export async function reopenMyTodo(id: number): Promise<MyTodo> {
  return patchJson<MyTodo>(`${BASE}/${id}/reopen`);
}

export async function batchActionMyTodos(
  body: MyTodoBatchActionDto,
): Promise<{ updated: number }> {
  return postJson<{ updated: number }>(`${BASE}/batch-action`, body);
}

export async function deleteMyTodo(
  id: number,
): Promise<{ success: boolean }> {
  return deleteJson<{ success: boolean }>(`${BASE}/${id}`);
}
