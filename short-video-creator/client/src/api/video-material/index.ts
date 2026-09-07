import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  BitableSelectOptions,
  CreateVideoMaterialResponse,
  DeleteVideoMaterialResponse,
  StartGenerateResponse,
  SyncStatusResponse,
  TopMaterialItem,
  TopOrderBy,
  UpdateVideoMaterialRequest,
  UpdateVideoMaterialResponse,
  VideoMaterialDetail,
  VideoMaterialListParams,
  VideoMaterialListResponse,
  VideoMaterialOptions,
} from '@shared/video-material';

export async function getVideoMaterialList(
  params: VideoMaterialListParams,
): Promise<VideoMaterialListResponse> {
  const response = await axiosForBackend.get<VideoMaterialListResponse>(
    '/api/video-material',
    { params },
  );
  return response.data;
}

export async function getVideoMaterialOptions(): Promise<VideoMaterialOptions> {
  const response = await axiosForBackend.get<VideoMaterialOptions>(
    '/api/video-material/options',
  );
  return response.data;
}

export async function getVideoMaterialDetail(
  id: string,
): Promise<VideoMaterialDetail> {
  const response = await axiosForBackend.get<VideoMaterialDetail>(
    `/api/video-material/${id}`,
  );
  return response.data;
}

export async function createVideoMaterial(
  videoLink: string,
): Promise<CreateVideoMaterialResponse> {
  const response = await axiosForBackend.post<CreateVideoMaterialResponse>(
    '/api/video-material',
    { videoLink },
  );
  return response.data;
}

export async function startVideoMaterialGenerate(
  id: string,
): Promise<StartGenerateResponse> {
  const response = await axiosForBackend.post<StartGenerateResponse>(
    `/api/video-material/${id}/generate`,
  );
  return response.data;
}

export async function getTopVideoMaterials(
  orderBy: TopOrderBy,
  limit: number,
): Promise<TopMaterialItem[]> {
  const response = await axiosForBackend.get<{ items: TopMaterialItem[] }>(
    '/api/video-material/top',
    { params: { orderBy, limit } },
  );
  return response.data.items;
}

export async function updateVideoMaterial(
  id: string,
  request: UpdateVideoMaterialRequest,
): Promise<UpdateVideoMaterialResponse> {
  const response = await axiosForBackend.patch<UpdateVideoMaterialResponse>(
    `/api/video-material/${id}`,
    request,
  );
  return response.data;
}

export async function deleteVideoMaterial(
  id: string,
): Promise<DeleteVideoMaterialResponse> {
  const response = await axiosForBackend.delete<DeleteVideoMaterialResponse>(
    `/api/video-material/${id}`,
  );
  return response.data;
}

export async function getSyncStatus(): Promise<SyncStatusResponse> {
  const response = await axiosForBackend.get<SyncStatusResponse>(
    '/api/video-material/sync-status',
  );
  return response.data;
}

export async function getBitableSelectOptions(): Promise<BitableSelectOptions> {
  const response = await axiosForBackend.get<BitableSelectOptions>(
    '/api/video-material/bitable-options',
  );
  return response.data;
}
