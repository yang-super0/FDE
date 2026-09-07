import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';

import type {
  MessageNotificationCreateDto,
  MessageNotificationItem,
  MessageNotificationListParams,
  MessageNotificationListResponse,
  MessageNotificationPushStatsResponse,
} from '@shared/api.interface';

const BASE_URL = '/api/message-notifications';

export interface PushLogListParams {
  msgType?: string;
  pushStatus?: string;
  page?: string;
  pageSize?: string;
}

export interface PushLogListResponse {
  items: MessageNotificationItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface UnreadCountResponse {
  unreadCount: number;
}

export interface UpdatedCountResponse {
  updated: number;
}

/** 我的消息列表（含未读数） */
export async function getMyMessages(
  params: MessageNotificationListParams,
): Promise<MessageNotificationListResponse> {
  const res = await axiosForBackend.get<MessageNotificationListResponse>(
    BASE_URL,
    { params },
  );
  return res.data;
}

/** 当前未读消息数 */
export async function getUnreadCount(): Promise<UnreadCountResponse> {
  const res = await axiosForBackend.get<UnreadCountResponse>(
    `${BASE_URL}/unread-count`,
  );
  return res.data;
}

/** 推送日志列表 */
export async function getPushLogs(
  params: PushLogListParams,
): Promise<PushLogListResponse> {
  const res = await axiosForBackend.get<PushLogListResponse>(
    `${BASE_URL}/push-logs`,
    { params },
  );
  return res.data;
}

/** 推送统计 */
export async function getPushStats(): Promise<MessageNotificationPushStatsResponse> {
  const res = await axiosForBackend.get<MessageNotificationPushStatsResponse>(
    `${BASE_URL}/push-stats`,
  );
  return res.data;
}

/** 标记单条已读 */
export async function markRead(id: number): Promise<UpdatedCountResponse> {
  const res = await axiosForBackend.post<UpdatedCountResponse>(
    `${BASE_URL}/${id}/read`,
  );
  return res.data;
}

/** 全部标记已读 */
export async function markAllRead(): Promise<UpdatedCountResponse> {
  const res = await axiosForBackend.post<UpdatedCountResponse>(
    `${BASE_URL}/read-all`,
  );
  return res.data;
}

/** 重试推送 */
export async function retryPush(id: number): Promise<void> {
  await axiosForBackend.post(`${BASE_URL}/${id}/retry-push`);
}

/** 手动发送系统通知（全员） */
export async function createNotification(
  dto: MessageNotificationCreateDto,
): Promise<void> {
  await axiosForBackend.post(BASE_URL, dto);
}

/** 触发预警检查 */
export async function runWarnings(): Promise<{ created: number }> {
  const res = await axiosForBackend.post<{ created: number }>(
    `${BASE_URL}/warnings/run`,
  );
  return res.data;
}
