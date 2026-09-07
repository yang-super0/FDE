import type { TicketStatus } from '@shared/api.interface';
import type { StatusTone } from '@client/src/components/blueprint';

export const TICKET_CATEGORIES: string[] = [
  '系统使用',
  '数据问题',
  '权限申请',
  '其他',
];

export const TICKET_STATUS_META: Record<
  TicketStatus,
  { label: string; tone: StatusTone }
> = {
  pending: { label: '待处理', tone: 'warning' },
  processing: { label: '处理中', tone: 'info' },
  resolved: { label: '已解决', tone: 'success' },
};

export const TICKET_STATUS_FILTERS: Array<{
  value: '' | TicketStatus;
  label: string;
}> = [
  { value: '', label: '全部' },
  { value: 'pending', label: '待处理' },
  { value: 'processing', label: '处理中' },
  { value: 'resolved', label: '已解决' },
];
