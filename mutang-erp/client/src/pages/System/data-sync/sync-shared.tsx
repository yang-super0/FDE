import dayjs from 'dayjs';
import { cn } from '@client/src/lib/utils';

/* ============ 飞书同步：共享常量与徽章（零圆角 + 语义浅底文字色） ============ */

export const SYNC_FILTER_ALL: string = 'all';

const BADGE_BASE: string =
  'inline-flex items-center rounded-[2px] px-2 py-0.5 text-[10px] font-bold';

export const SYNC_LOG_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'success', label: '成功' },
  { value: 'failed', label: '失败' },
  { value: 'retrying', label: '重试中' },
];

export const SYNC_OPERATION_OPTIONS: { value: string; label: string }[] = [
  { value: 'create', label: '新增' },
  { value: 'update', label: '更新' },
  { value: 'delete', label: '删除' },
];

const SYNC_STATUS_BADGE: Record<string, string> = {
  success: 'bg-[#ECFDF5] text-[#10B981]',
  failed: 'bg-[#FEF2F2] text-[#EF4444]',
  retrying: 'bg-[#FFFBEB] text-[#D97706]',
};

const SYNC_STATUS_LABEL: Record<string, string> = {
  success: '成功',
  failed: '失败',
  retrying: '重试中',
};

export function SyncStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        BADGE_BASE,
        SYNC_STATUS_BADGE[status] ?? 'bg-slate-100 text-slate-500',
      )}
    >
      {SYNC_STATUS_LABEL[status] ?? status}
    </span>
  );
}

export function SyncEnabledBadge({ enabled }: { enabled: boolean }) {
  return (
    <span
      className={cn(
        BADGE_BASE,
        enabled ? 'bg-[#ECFDF5] text-[#10B981]' : 'bg-slate-100 text-slate-500',
      )}
    >
      {enabled ? '已启用' : '已禁用'}
    </span>
  );
}

const SYNC_OPERATION_BADGE: Record<string, string> = {
  create: 'bg-[#EFF6FF] text-[#0033A0]',
  update: 'bg-slate-100 text-slate-600',
  delete: 'bg-[#FEF2F2] text-[#EF4444]',
};

const SYNC_OPERATION_LABEL: Record<string, string> = {
  create: '新增',
  update: '更新',
  delete: '删除',
};

export function SyncOperationBadge({ operation }: { operation: string }) {
  return (
    <span
      className={cn(
        BADGE_BASE,
        SYNC_OPERATION_BADGE[operation] ?? 'bg-slate-100 text-slate-500',
      )}
    >
      {SYNC_OPERATION_LABEL[operation] ?? operation}
    </span>
  );
}

export function SyncFieldTypeBadge({ fieldType }: { fieldType: string }) {
  return (
    <span className={cn(BADGE_BASE, 'bg-[#EFF6FF] text-[#0033A0]')}>
      {fieldType}
    </span>
  );
}

export function formatSyncTime(value: string | null): string {
  if (!value) return '—';
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('YYYY-MM-DD HH:mm') : '—';
}

export function SyncStatCard({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="rounded-none border border-border border-t-[3px] border-t-primary bg-card px-4 py-3 shadow-md">
      <div className="text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          'mt-1 font-mono text-2xl font-bold',
          emphasis ? 'text-[#EF4444]' : 'text-foreground',
        )}
      >
        {value}
      </div>
    </div>
  );
}
