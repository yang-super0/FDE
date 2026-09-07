import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Button } from '@client/src/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@client/src/components/ui/select';
import { cn } from '@client/src/lib/utils';
import { FINANCE_FILTER_ALL } from '../finance-constants';

/* ============ 错误提示：error.response.data.message ?? 操作失败 ============ */

interface RebateApiErrorData {
  message?: string;
}

export function toRebateErrorText(error: unknown): string {
  const maybe = error as { response?: { data?: RebateApiErrorData } };
  return maybe.response?.data?.message ?? '操作失败';
}

export function reportRebateError(context: string, error: unknown): void {
  logger.error(`${context}: ${toRebateErrorText(error)}`);
  toast.error(toRebateErrorText(error));
}

/* ============ 通用小组件 ============ */

export function ActionLink({ danger, onClick, children }: {
  danger?: boolean; onClick: () => void; children: string;
}): ReactNode {
  return (
    <Button variant="ghost" size="sm" onClick={onClick}
      className={`h-auto px-1 text-xs ${danger ? 'text-destructive' : 'text-primary'}`}>
      {children}
    </Button>
  );
}

export function FilterSelect({ value, placeholder, options, allLabel, onChange }: {
  value: string; placeholder: string; options: string[]; allLabel: string;
  onChange: (value: string) => void;
}): ReactNode {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-32 rounded-none"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        <SelectItem value={FINANCE_FILTER_ALL}>{allLabel}</SelectItem>
        {options.map((option: string) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

/* ============ 状态枚举与徽章 ============ */

export const REBATE_STATUS_OPTIONS: string[] = ['待核算', '已核算', '已发放', '已取消'];
export const DEDUCTION_STATUS_OPTIONS: string[] = ['待审批', '已通过', '已驳回', '已执行'];
export const CONSUMPTION_STATUS_OPTIONS: string[] = ['待核对', '已核对', '有差异'];
export const DEDUCTION_TYPE_OPTIONS: string[] = ['违规扣减', '调账', '其他'];

const BADGE_BASE: string =
  'inline-flex items-center rounded-[2px] px-2 py-0.5 text-[10px] font-bold';

export const REBATE_STATUS_BADGE: Record<string, string> = {
  待核算: 'bg-[#FFF7ED] text-[#F97316]',
  已核算: 'bg-[#EFF6FF] text-[#0033A0]',
  已发放: 'bg-[#ECFDF5] text-[#10B981]',
  已取消: 'bg-[#FEF2F2] text-[#EF4444]',
};

export const DEDUCTION_STATUS_BADGE: Record<string, string> = {
  待审批: 'bg-[#FFF7ED] text-[#F97316]',
  已通过: 'bg-[#EFF6FF] text-[#0033A0]',
  已驳回: 'bg-[#FEF2F2] text-[#EF4444]',
  已执行: 'bg-[#ECFDF5] text-[#10B981]',
};

export const CONSUMPTION_STATUS_BADGE: Record<string, string> = {
  待核对: 'bg-[#FFF7ED] text-[#F97316]',
  已核对: 'bg-[#ECFDF5] text-[#10B981]',
  有差异: 'bg-[#FFF7ED] text-[#F97316]',
};

export function RebateBadge({ status, badgeMap }: {
  status: string; badgeMap: Record<string, string>;
}): ReactNode {
  return (
    <span className={cn(BADGE_BASE, badgeMap[status] ?? 'bg-slate-100 text-slate-500')}>
      {status}
    </span>
  );
}
