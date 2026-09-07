import type { ReactNode } from 'react';
import { cn } from '@client/src/lib/utils';
import { extractErrorMessage } from '@client/src/utils/extract-error-message';

export const FINANCE_FILTER_ALL: string = 'all';

/* ============ 选项 ============ */

export const ACCOUNT_TYPE_OPTIONS: string[] = [
  '银行账户',
  '第三方支付',
  '现金',
];

export const RECEIPT_TYPE_OPTIONS: string[] = [
  '广告费',
  '服务费',
  '保证金',
  '押金',
  '其他',
];

export const PAYMENT_METHOD_OPTIONS: string[] = [
  '银行转账',
  '支付宝',
  '微信',
  '现金',
  '其他',
];

export const RECEIPT_METHOD_OPTIONS: string[] = PAYMENT_METHOD_OPTIONS;

export const PAYMENT_TYPE_OPTIONS: string[] = [
  '媒体充值',
  '服务费',
  '外包费',
  '采购费',
  '工资',
  '报销',
  '其他',
];

export const INVOICE_TYPE_OPTIONS: string[] = [
  '增值税专用发票',
  '增值税普通发票',
  '电子发票',
  '其他',
];

export const COST_TYPE_OPTIONS: string[] = [
  '媒体成本',
  '人力成本',
  '外包成本',
  '采购成本',
  '运营成本',
  '其他',
];

export const RECEIPT_STATUS_OPTIONS: string[] = [
  '待确认',
  '已确认',
  '已核销',
  '已取消',
];

export const PAYMENT_STATUS_OPTIONS: string[] = [
  '待审批',
  '审批通过',
  '审批驳回',
  '已付款',
  '已取消',
];

/* ============ 状态徽章：零圆角 + 语义浅底文字色 ============ */

const BADGE_BASE: string =
  'inline-flex items-center rounded-[2px] px-2 py-0.5 text-[10px] font-bold';

export const RECEIPT_STATUS_BADGE: Record<string, string> = {
  待确认: 'bg-[#FFF7ED] text-[#F97316]',
  已确认: 'bg-[#EFF6FF] text-[#0033A0]',
  已核销: 'bg-[#ECFDF5] text-[#10B981]',
  已取消: 'bg-[#FEF2F2] text-[#EF4444]',
};

export const PAYMENT_STATUS_BADGE: Record<string, string> = {
  待审批: 'bg-[#FFF7ED] text-[#F97316]',
  审批通过: 'bg-[#EFF6FF] text-[#0033A0]',
  审批驳回: 'bg-[#FEF2F2] text-[#EF4444]',
  已付款: 'bg-[#ECFDF5] text-[#10B981]',
  已取消: 'bg-slate-100 text-slate-500',
};

export const INVOICE_STATUS_BADGE: Record<string, string> = {
  待开具: 'bg-[#FFF7ED] text-[#F97316]',
  已开具: 'bg-[#EFF6FF] text-[#0033A0]',
  已寄出: 'bg-[#F5F3FF] text-[#8B5CF6]',
  已收讫: 'bg-[#ECFDF5] text-[#10B981]',
  已作废: 'bg-[#FEF2F2] text-[#EF4444]',
};

export const COST_STATUS_BADGE: Record<string, string> = {
  待核算: 'bg-[#FFF7ED] text-[#F97316]',
  已核算: 'bg-[#EFF6FF] text-[#0033A0]',
  已结转: 'bg-[#ECFDF5] text-[#10B981]',
};

export const ACCOUNT_STATUS_BADGE: Record<string, string> = {
  启用: 'bg-[#ECFDF5] text-[#10B981]',
  停用: 'bg-slate-100 text-slate-500',
};

const FINANCE_STATUS_CLASS: Record<string, string> = {
  ...RECEIPT_STATUS_BADGE,
  ...PAYMENT_STATUS_BADGE,
  ...INVOICE_STATUS_BADGE,
  ...COST_STATUS_BADGE,
  ...ACCOUNT_STATUS_BADGE,
};

export function FinanceStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        BADGE_BASE,
        FINANCE_STATUS_CLASS[status] ?? 'bg-slate-100 text-slate-500',
      )}
    >
      {status}
    </span>
  );
}

/* 占比条使用的 primary 系蓝色五级渐变 */
export const BALANCE_BAR_COLORS: string[] = [
  '#0033A0',
  '#2B5FC7',
  '#5B8DEF',
  '#93B4F4',
  '#C3D4FA',
];

/* ============ 金额格式化：¥ + 千分位 + 两位小数 ============ */

/* ============ 数值安全转换：金额字段可能为 number / string / null（字段级权限降级） ============ */

export function toFinanceNumber(
  value: number | string | null | undefined,
): number {
  if (typeof value === 'number') return value;
  if (value === null || value === undefined) return 0;
  const parsed: number = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function formatFinanceAmount(value: number): string {
  return `¥ ${value.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/* ============ 表单字段容器（弹窗表单统一布局） ============ */

export function FinanceFormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="min-w-[200px] flex-1 space-y-1.5">
      <label className="text-sm font-medium">
        {label} {required ? <span className="text-destructive">*</span> : null}
      </label>
      {children}
    </div>
  );
}

/* ============ 错误消息 ============ */

export function toFinanceErrorText(error: unknown): string {
  return extractErrorMessage(error);
}
