import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  Announcement,
  Asset,
  AssetStatus,
  AssetSummary,
  PageResult,
} from '@shared/api.interface';

export interface AssetListParams {
  status?: AssetStatus;
  page?: number;
  pageSize?: number;
}

export interface CreateAssetRequest {
  name: string;
  assetNo: string;
  status?: AssetStatus;
}

export interface AnnouncementListParams {
  page?: number;
  pageSize?: number;
}

export interface CreateAnnouncementRequest {
  title: string;
  content: string;
}

export const getAssetSummary = async (): Promise<AssetSummary> => {
  const res = await axiosForBackend.get<AssetSummary>('/api/assets/summary');
  return res.data;
};

export const listAssets = async (
  params: AssetListParams,
): Promise<PageResult<Asset>> => {
  const res = await axiosForBackend.get<PageResult<Asset>>('/api/assets', {
    params,
  });
  return res.data;
};

export const createAsset = async (
  data: CreateAssetRequest,
): Promise<{ id: string }> => {
  const res = await axiosForBackend.post<{ id: string }>('/api/assets', data);
  return res.data;
};

export const claimAsset = async (
  id: string,
): Promise<{ success: boolean }> => {
  const res = await axiosForBackend.post<{ success: boolean }>(
    `/api/assets/${id}/claim`,
  );
  return res.data;
};

export const returnAsset = async (
  id: string,
): Promise<{ success: boolean }> => {
  const res = await axiosForBackend.post<{ success: boolean }>(
    `/api/assets/${id}/return`,
  );
  return res.data;
};

export const listAnnouncements = async (
  params: AnnouncementListParams,
): Promise<PageResult<Announcement>> => {
  const res = await axiosForBackend.get<PageResult<Announcement>>(
    '/api/announcements',
    { params },
  );
  return res.data;
};

export const createAnnouncement = async (
  data: CreateAnnouncementRequest,
): Promise<{ id: string }> => {
  const res = await axiosForBackend.post<{ id: string }>(
    '/api/announcements',
    data,
  );
  return res.data;
};
