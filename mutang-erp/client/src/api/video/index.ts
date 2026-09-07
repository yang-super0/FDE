import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  Customer,
  PageResult,
  ReviewComment,
  VideoProject,
  VideoStage,
  VideoStageStat,
} from '@shared/api.interface';

export interface VideoProjectListParams {
  stage?: VideoStage;
  page?: number;
  pageSize?: number;
}

export interface CreateVideoProjectPayload {
  name: string;
  customerId: string;
  videoType: string;
  durationRequirement: string;
  assigneeId?: string;
  deadline: string;
}

export interface UpdateVideoStagePayload {
  stage: VideoStage;
  remark: string;
}

export async function listVideoProjects(
  params: VideoProjectListParams,
): Promise<PageResult<VideoProject>> {
  try {
    const response = await axiosForBackend.get<PageResult<VideoProject>>(
      '/api/video-projects',
      { params },
    );
    return response.data;
  } catch (error) {
    logger.error('获取视频项目列表失败', error);
    throw error;
  }
}

export async function getVideoStageStats(): Promise<{
  items: VideoStageStat[];
}> {
  try {
    const response = await axiosForBackend.get<{
      items: VideoStageStat[];
    }>('/api/video-projects/stage-stats');
    return response.data;
  } catch (error) {
    logger.error('获取视频阶段统计失败', error);
    throw error;
  }
}

export async function createVideoProject(
  payload: CreateVideoProjectPayload,
): Promise<{ id: string }> {
  try {
    const response = await axiosForBackend.post<{ id: string }>(
      '/api/video-projects',
      payload,
    );
    return response.data;
  } catch (error) {
    logger.error('创建视频项目失败', error);
    throw error;
  }
}

export async function getVideoProject(id: string): Promise<VideoProject> {
  try {
    const response = await axiosForBackend.get<VideoProject>(
      `/api/video-projects/${id}`,
    );
    return response.data;
  } catch (error) {
    logger.error('获取视频项目详情失败', error);
    throw error;
  }
}

export async function updateVideoProjectStage(
  id: string,
  payload: UpdateVideoStagePayload,
): Promise<{ success: boolean }> {
  try {
    const response = await axiosForBackend.patch<{ success: boolean }>(
      `/api/video-projects/${id}/stage`,
      payload,
    );
    return response.data;
  } catch (error) {
    logger.error('更新视频项目阶段失败', error);
    throw error;
  }
}

export async function listReviewComments(
  projectId: string,
): Promise<{ items: ReviewComment[] }> {
  try {
    const response = await axiosForBackend.get<{ items: ReviewComment[] }>(
      `/api/video-projects/${projectId}/review-comments`,
    );
    return response.data;
  } catch (error) {
    logger.error('获取审片意见失败', error);
    throw error;
  }
}

export async function addReviewComment(
  projectId: string,
  content: string,
): Promise<{ id: string }> {
  try {
    const response = await axiosForBackend.post<{ id: string }>(
      `/api/video-projects/${projectId}/review-comments`,
      { content },
    );
    return response.data;
  } catch (error) {
    logger.error('添加审片意见失败', error);
    throw error;
  }
}

export async function listCustomersForSelect(): Promise<Customer[]> {
  try {
    const response = await axiosForBackend.get<PageResult<Customer>>(
      '/api/customers',
      { params: { page: 1, pageSize: 100 } },
    );
    return response.data.items ?? [];
  } catch (error) {
    logger.error('获取客户列表失败', error);
    throw error;
  }
}
