import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  OperationLogListParams,
  OperationLogListResponse,
} from '@shared/api.interface';

export async function listOperationLogs(
  params: OperationLogListParams,
): Promise<OperationLogListResponse> {
  const res = await axiosForBackend.get<OperationLogListResponse>(
    '/api/operation-logs',
    { params },
  );
  return res.data;
}
