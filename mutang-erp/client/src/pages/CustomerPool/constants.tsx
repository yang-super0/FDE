import type { ReactNode } from 'react';
import type { LeadStatus, PoolLeadStatus } from '@shared/api.interface';
import { cn } from '@client/src/lib/utils';

export const FILTER_ALL: string = 'all';

export function toErrorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export const POOL_LEVEL_OPTIONS: string[] = ['A级', 'B级', 'C级', 'D级'];

export const INDUSTRY_OPTIONS: string[] = [
  '互联网',
  '零售消费',
  '教育培训',
  '金融服务',
  '智能制造',
  '医疗健康',
  '房地产',
  '其他',
];

export const LEAD_SOURCE_OPTIONS: string[] = [
  '广告投放',
  '官网咨询',
  '电话咨询',
  '转介绍',
  '展会活动',
  '其他',
];

export const FOLLOW_UP_TYPE_OPTIONS: string[] = [
  '电话',
  '微信',
  '面谈',
  '邮件',
  '其他',
];

/* 导入导出列映射（中文表头） */
export const POOL_EXPORT_HEADERS: string[] = [
  '主体名称',
  '客资分层',
  '一级行业',
  '二级行业',
  '联系人',
  '联系电话',
  '分配状态',
  '调入时间',
  '备注',
];

export const LEAD_EXPORT_HEADERS: string[] = [
  '线索名称',
  '联系人',
  '联系电话',
  '行业',
  '来源',
  '状态',
  '下次跟进时间',
  '创建时间',
  '备注',
];

/* 状态徽章：零圆角 + 语义浅底文字色 */
const BADGE_BASE: string =
  'inline-flex items-center rounded-[2px] px-2 py-0.5 text-[10px] font-bold';

const POOL_STATUS_CLASS: Record<PoolLeadStatus, string> = {
  未分配: 'bg-slate-100 text-slate-500',
  已领取: 'bg-[#EFF6FF] text-[#0033A0]',
  已分配: 'bg-[#E6FAF5] text-[#0D9488]',
  已转化: 'bg-[#ECFDF5] text-[#10B981]',
  无效: 'bg-[#FEF2F2] text-[#EF4444]',
};

const LEAD_STATUS_CLASS: Record<LeadStatus, string> = {
  待跟进: 'bg-slate-100 text-slate-500',
  跟进中: 'bg-[#EFF6FF] text-[#0033A0]',
  已转化: 'bg-[#ECFDF5] text-[#10B981]',
  已放弃: 'bg-[#FEF2F2] text-[#EF4444]',
};

export function PoolStatusBadge({ status }: { status: PoolLeadStatus }) {
  return (
    <span className={cn(BADGE_BASE, POOL_STATUS_CLASS[status])}>
      {status}
    </span>
  );
}

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span className={cn(BADGE_BASE, LEAD_STATUS_CLASS[status])}>
      {status}
    </span>
  );
}

export function StatCard({
  label,
  value,
  suffix,
  highlight,
}: {
  label: string;
  value: string;
  suffix?: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-none border border-border border-t-[3px] border-t-primary bg-card p-6 shadow-md">
      <div className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          'mt-2 font-mono text-3xl font-black',
          highlight && 'text-primary',
        )}
      >
        {value}
        {suffix ? (
          <span className="ml-1 text-sm font-bold text-muted-foreground">
            {suffix}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function EmptyText({ children }: { children: ReactNode }) {
  return <span className="text-muted-foreground">{children}</span>;
}
