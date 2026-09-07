import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  AdCampaign,
  AdCampaignDetail,
  Customer,
  PageResult,
  PerformanceDetailItem,
  PerformanceGranularity,
  PerformanceTrendItem,
} from '@shared/api.interface';

export interface CampaignListParams {
  status?: string;
  platform?: string;
  page: number;
  pageSize: number;
}

export interface CreateCampaignPayload {
  name: string;
  customerId: string;
  platform: string;
  budget: number;
  startDate: string;
  endDate: string;
}

export type CampaignStatusAction = 'paused' | 'running' | 'finished';

export const listCampaigns = async (
  params: CampaignListParams,
): Promise<PageResult<AdCampaign>> => {
  const res = await axiosForBackend.get<PageResult<AdCampaign>>(
    '/api/ad-campaigns',
    { params },
  );
  return res.data;
};

export const createCampaign = async (
  payload: CreateCampaignPayload,
): Promise<{ id: string }> => {
  const res = await axiosForBackend.post<{ id: string }>(
    '/api/ad-campaigns',
    payload,
  );
  return res.data;
};

export const updateCampaignStatus = async (
  id: string,
  status: CampaignStatusAction,
): Promise<{ success: boolean }> => {
  const res = await axiosForBackend.patch<{ success: boolean }>(
    `/api/ad-campaigns/${id}/status`,
    { status },
  );
  return res.data;
};

export const getCampaignDetail = async (
  id: string,
): Promise<AdCampaignDetail> => {
  const res = await axiosForBackend.get<AdCampaignDetail>(
    `/api/ad-campaigns/${id}`,
  );
  return res.data;
};

export const getPerformanceTrend = async (
  id: string,
  granularity: PerformanceGranularity,
): Promise<{ items: PerformanceTrendItem[] }> => {
  const res = await axiosForBackend.get<{ items: PerformanceTrendItem[] }>(
    `/api/ad-campaigns/${id}/performance`,
    { params: { granularity } },
  );
  return res.data;
};

export const getPerformanceDetail = async (
  id: string,
  page: number,
  pageSize: number,
): Promise<PageResult<PerformanceDetailItem>> => {
  const res = await axiosForBackend.get<PageResult<PerformanceDetailItem>>(
    `/api/ad-campaigns/${id}/performance-details`,
    { params: { page, pageSize } },
  );
  return res.data;
};

export const listCustomersForSelect = async (): Promise<
  PageResult<Customer>
> => {
  const res = await axiosForBackend.get<PageResult<Customer>>(
    '/api/customers',
    { params: { page: 1, pageSize: 100 } },
  );
  return res.data;
};
