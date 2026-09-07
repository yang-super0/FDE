import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  PageResult,
  Task,
  TaskDisplayStatus,
  TaskPriority,
  TaskStatus,
  TaskSummary,
} from '@shared/api.interface';

export interface TaskListParams {
  assigneeId?: string;
  status?: TaskDisplayStatus;
  page: number;
  pageSize: number;
}

export interface CreateTaskRequest {
  title: string;
  description: string;
  assigneeId: string;
  priority: TaskPriority;
  deadline?: string;
}

export async function getTaskSummary(): Promise<TaskSummary> {
  const response = await axiosForBackend.get<TaskSummary>(
    '/api/tasks/summary',
  );
  return response.data;
}

export async function listTasks(
  params: TaskListParams,
): Promise<PageResult<Task>> {
  const response = await axiosForBackend.get<PageResult<Task>>('/api/tasks', {
    params,
  });
  return response.data;
}

export async function createTask(
  data: CreateTaskRequest,
): Promise<{ id: string }> {
  const response = await axiosForBackend.post<{ id: string }>(
    '/api/tasks',
    data,
  );
  return response.data;
}

export async function updateTaskStatus(
  id: string,
  status: TaskStatus,
): Promise<{ success: boolean }> {
  const response = await axiosForBackend.patch<{ success: boolean }>(
    `/api/tasks/${id}/status`,
    { status },
  );
  return response.data;
}
