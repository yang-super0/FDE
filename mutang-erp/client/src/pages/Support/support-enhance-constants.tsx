import type { ReactNode } from 'react';
import { cn } from '@client/src/lib/utils';
import { extractErrorMessage } from '@client/src/utils/extract-error-message';

export const SE_FILTER_ALL: string = 'all';

/* ============ 通用选项 ============ */

export const SE_PLATFORM_OPTIONS: string[] = [
  '巨量千川',
  '抖音',
  '快手',
  '小红书',
  '其他',
];

export const SE_INDUSTRY_OPTIONS: string[] = [
  '美妆个护',
  '食品饮料',
  '教育培训',
  '电商零售',
];

export const SE_ROI_STATUS_OPTIONS: string[] = ['启用', '停用', '已过期'];

export const SE_MATERIAL_TYPE_OPTIONS: string[] = [
  '图片',
  '视频',
  '文案',
  '落地页',
  '其他',
];

export const SE_MATERIAL_STATUS_OPTIONS: string[] = ['启用', '停用', '归档'];

export const SE_MATERIAL_SOURCE_OPTIONS: string[] = [
  '自制',
  '外包',
  '客户提供',
  '平台模板',
];

export const SE_CONFIDENCE_OPTIONS: string[] = ['高', '中', '低'];

export const SE_COMPETITOR_DATA_SOURCE_OPTIONS: string[] = [
  '第三方工具',
  '人工估算',
  '公开信息',
];

export const SE_TREND_DATA_SOURCE_OPTIONS: string[] = [
  '平台公开',
  '第三方监测',
  '行业报告',
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

const SE_STATUS_CLASS: Record<string, string> = {
  启用: GREEN,
  停用: SLATE,
  已过期: ORANGE,
  归档: SLATE,
  高: GREEN,
  中: ORANGE,
  低: RED,
};

export function SeStatusBadge({ status }: { status: string }) {
  return (
    <span className={cn(BADGE_BASE, SE_STATUS_CLASS[status] ?? SLATE)}>
      {status}
    </span>
  );
}

/* ============ 金额格式化：¥ + 千分位 + 两位小数 ============ */

export function formatSeAmount(value: string | number): string {
  const num: number = Number(value ?? 0);
  return `¥ ${num.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/* ============ 数值格式化：千分位 + 指定小数位 ============ */

export function formatSeNumber(
  value: string | number | null | undefined,
  digits: number = 2,
): string {
  const num: number = Number(value ?? 0);
  return num.toLocaleString('zh-CN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/* ============ 表单字段容器（弹窗表单统一布局） ============ */

export function SeFormField({
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

export function toSeErrorText(error: unknown): string {
  return extractErrorMessage(error);
}
