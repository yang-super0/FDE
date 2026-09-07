import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import { extractErrorMessage } from '@client/src/utils/extract-error-message';
import type {
  DrilldownConfigResponse,
  DrilldownExecuteInput,
  DrilldownExecuteResult,
  DrilldownListParams,
  DrilldownListResponse,
} from '@shared/api.interface';

const BASE_URL = '/api/report-center/drilldowns';

interface RequestConfig {
  url: string;
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  params?: object;
  data?: unknown;
}

async function request<T>(config: RequestConfig): Promise<T> {
  try {
    const res = await axiosForBackend.request<T>(config);
    return res.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

export async function fetchDrilldownConfig(): Promise<DrilldownConfigResponse> {
  return request<DrilldownConfigResponse>({
    url: `${BASE_URL}/config`,
    method: 'GET',
  });
}

export async function executeDrilldown(
  input: DrilldownExecuteInput,
): Promise<DrilldownExecuteResult> {
  return request<DrilldownExecuteResult>({
    url: `${BASE_URL}/execute`,
    method: 'POST',
    data: input,
  });
}

export async function fetchDrilldowns(
  params: DrilldownListParams,
): Promise<DrilldownListResponse> {
  return request<DrilldownListResponse>({
    url: BASE_URL,
    method: 'GET',
    params,
  });
}
