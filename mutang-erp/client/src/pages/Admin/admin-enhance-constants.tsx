import type { ReactNode } from 'react';
import { cn } from '@client/src/lib/utils';
import { extractErrorMessage } from '@client/src/utils/extract-error-message';

export const ADMIN_FILTER_ALL: string = 'all';

/* ============ 通用选项 ============ */

export const ADMIN_ITEM_TYPE_OPTIONS: string[] = [
  '办公用品',
  '电子设备',
  '耗材',
  '其他',
];

export const ADMIN_ASSET_TYPE_OPTIONS: string[] = [
  '电子设备',
  '办公家具',
  '车辆',
  '其他',
];

export const ADMIN_QUALITY_CHECK_OPTIONS: string[] = ['合格', '不合格', '待检'];

export const ADMIN_RETURN_CONDITION_OPTIONS: string[] = ['完好', '损坏', '丢失'];

/* ============ 各子模块状态选项 ============ */

export const ADMIN_PR_STATUS_OPTIONS: string[] = [
  '待审批',
  '已通过',
  '已驳回',
  '已采购',
  '已取消',
];

export const ADMIN_PO_STATUS_OPTIONS: string[] = [
  '待发货',
  '已发货',
  '已入库',
  '已取消',
];

export const ADMIN_PD_STATUS_OPTIONS: string[] = [
  '待收货',
  '部分收货',
  '已收货',
  '有差异',
];

export const ADMIN_ASSET_STATUS_OPTIONS: string[] = [
  '在用',
  '闲置',
  '维修中',
  '已报废',
  '已盘点',
];

export const ADMIN_INVENTORY_STATUS_OPTIONS: string[] = ['正常', '预警', '缺货'];

export const ADMIN_INBOUND_STATUS_OPTIONS: string[] = [
  '待入库',
  '已入库',
  '已取消',
];

export const ADMIN_REQUISITION_STATUS_OPTIONS: string[] = [
  '待审批',
  '已通过',
  '已驳回',
  '已领用',
  '已归还',
];

export const ADMIN_RETURN_STATUS_OPTIONS: string[] = [
  '待确认',
  '已确认',
  '有损坏',
];

export const ADMIN_CHECK_STATUS_OPTIONS: string[] = [
  '盘点中',
  '已完成',
  '有差异',
];

export const ADMIN_CHECK_DETAIL_STATUS_OPTIONS: string[] = [
  '正常',
  '盘盈',
  '盘亏',
];

/* ============ 状态徽章：零圆角 + 语义浅底文字色 ============ */

const BADGE_BASE: string =
  'inline-flex items-center rounded-[2px] px-2 py-0.5 text-[10px] font-bold';

const ORANGE: string = 'bg-[#FFF7ED] text-[#F97316]';
const BLUE: string = 'bg-[#EFF6FF] text-[#0033A0]';
const GREEN: string = 'bg-[#ECFDF5] text-[#10B981]';
const RED: string = 'bg-[#FEF2F2] text-[#EF4444]';
const PURPLE: string = 'bg-[#F5F3FF] text-[#8B5CF6]';
const SLATE: string = 'bg-slate-100 text-slate-500';

const ADMIN_STATUS_CLASS: Record<string, string> = {
  待审批: ORANGE,
  已通过: GREEN,
  已驳回: RED,
  已采购: BLUE,
  已取消: SLATE,
  待发货: ORANGE,
  已发货: PURPLE,
  已入库: GREEN,
  待收货: ORANGE,
  部分收货: ORANGE,
  已收货: GREEN,
  有差异: RED,
  合格: GREEN,
  不合格: RED,
  待检: SLATE,
  在用: GREEN,
  闲置: SLATE,
  维修中: ORANGE,
  已报废: RED,
  已盘点: BLUE,
  正常: GREEN,
  预警: ORANGE,
  缺货: RED,
  待入库: ORANGE,
  已领用: PURPLE,
  已归还: BLUE,
  完好: GREEN,
  损坏: RED,
  丢失: RED,
  待确认: ORANGE,
  已确认: GREEN,
  有损坏: RED,
  盘点中: ORANGE,
  已完成: GREEN,
  盘盈: PURPLE,
  盘亏: RED,
};

export function AdminStatusBadge({ status }: { status: string }) {
  return (
    <span className={cn(BADGE_BASE, ADMIN_STATUS_CLASS[status] ?? SLATE)}>
      {status}
    </span>
  );
}

/* ============ 金额格式化：¥ + 千分位 + 两位小数 ============ */

export function formatAdminAmount(value: string | number): string {
  const num: number = Number(value ?? 0);
  return `¥ ${num.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/* ============ 表单字段容器（弹窗表单统一布局） ============ */

export function AdminFormField({
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

export function toAdminErrorText(error: unknown): string {
  return extractErrorMessage(error);
}
