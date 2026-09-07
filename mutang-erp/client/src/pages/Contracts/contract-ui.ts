import dayjs from 'dayjs';
import type { ContractStatus } from '@shared/api.interface';
import type { StatusTone } from '@client/src/components/blueprint';

export const CONTRACT_STATUS_LABEL: Record<ContractStatus, string> = {
  pending: '待审批',
  active: '执行中',
  expired: '已到期',
  terminated: '已终止',
};

export const CONTRACT_STATUS_TONE: Record<ContractStatus, StatusTone> = {
  pending: 'info',
  active: 'success',
  expired: 'warning',
  terminated: 'danger',
};

export const CONTRACT_TYPE_OPTIONS: string[] = [
  '广告代理',
  '视频制作',
  '框架协议',
];

export function formatDate(iso: string): string {
  if (!iso) return '-';
  return dayjs(iso).format('YYYY-MM-DD');
}

export function formatDateTime(iso: string): string {
  if (!iso) return '-';
  return dayjs(iso).format('YYYY-MM-DD HH:mm');
}

export function formatAmount(amount: number): string {
  return amount.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
