import { toast } from 'sonner';
import dayjs from 'dayjs';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Button } from '@client/src/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@client/src/components/ui/select';
import { ADMIN_FILTER_ALL, toAdminErrorText } from '../admin-enhance-constants';

/* ============ 常量 ============ */

export const PROCUREMENT_PAGE_SIZE: number = 10;
export const PROCUREMENT_EXPORT_LIMIT: number = 100;

/* ============ 状态流转条件（与后端 service 约束一致） ============ */

export const PR_EDITABLE_STATUSES: string[] = ['待审批'];
export const PR_APPROVABLE_STATUSES: string[] = ['待审批'];
export const PR_CANCELLABLE_STATUSES: string[] = ['待审批', '已通过'];
export const PR_DELETABLE_STATUSES: string[] = ['待审批', '已驳回', '已取消'];

export const PO_EDITABLE_STATUSES: string[] = ['待发货'];
export const PO_SHIPPABLE_STATUSES: string[] = ['待发货'];
export const PO_CANCELLABLE_STATUSES: string[] = ['待发货', '已发货'];
export const PO_DELETABLE_STATUSES: string[] = ['待发货', '已取消'];

export const PD_EDITABLE_STATUSES: string[] = ['待收货'];
export const PD_RECEIVABLE_STATUSES: string[] = ['待收货', '部分收货'];
export const PD_DELETABLE_STATUSES: string[] = ['待收货'];

/* ============ 错误处理 ============ */

export function reportProcurementError(context: string, error: unknown): void {
  const text: string = toAdminErrorText(error);
  logger.error(`${context}: ${text}`);
  toast.error(text);
}

/* ============ 通用小组件 ============ */

interface AdminProcureActionLinkProps {
  danger?: boolean;
  onClick: () => void;
  children: string;
}

export function AdminProcureActionLink({
  danger, onClick, children,
}: AdminProcureActionLinkProps) {
  return (
    <Button variant="ghost" size="sm" onClick={onClick}
      className={`h-auto px-1 text-xs ${danger ? 'text-destructive' : 'text-primary'}`}>
      {children}
    </Button>
  );
}

interface AdminProcureFilterSelectProps {
  value: string;
  placeholder: string;
  options: string[];
  allLabel: string;
  onChange: (value: string) => void;
}

export function AdminProcureFilterSelect({
  value, placeholder, options, allLabel, onChange,
}: AdminProcureFilterSelectProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-32 rounded-none">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ADMIN_FILTER_ALL}>{allLabel}</SelectItem>
        {options.map((option: string) => (
          <SelectItem key={option} value={option}>{option}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/* ============ 时间格式化与校验 ============ */

export function formatProcureDateTime(value: string | null): string {
  if (!value) return '—';
  return dayjs(value).format('YYYY-MM-DD HH:mm:ss');
}

export function isValidProcureDate(value: string): boolean {
  if (value === '') return true;
  return dayjs(value).format('YYYY-MM-DD') === value;
}

export function isPositiveIntText(value: string): boolean {
  return /^\d+$/.test(value) && Number(value) > 0;
}
