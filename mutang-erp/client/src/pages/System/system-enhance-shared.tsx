import type { ReactNode } from 'react';
import dayjs from 'dayjs';
import { cn } from '@client/src/lib/utils';
import { extractErrorMessage } from '@client/src/utils/extract-error-message';

export const SYSTEM_ENHANCE_FILTER_ALL: string = 'all';

/* ============ 选项常量 ============ */

export const SYSTEM_SETTING_CATEGORIES: string[] = [
  '公海设置',
  '线索设置',
  '客户设置',
  '预警设置',
  '税点设置',
];

export const ORG_STATUS_OPTIONS: string[] = ['启用', '停用'];

export const SYSTEM_VALUE_TYPES: string[] = [
  'string',
  'number',
  'boolean',
  'json',
];

/* ============ 状态徽章：零圆角 + 语义浅底文字色 ============ */

const BADGE_BASE: string =
  'inline-flex items-center rounded-[2px] px-2 py-0.5 text-[10px] font-bold';

const GREEN: string = 'bg-[#ECFDF5] text-[#10B981]';
const SLATE: string = 'bg-slate-100 text-slate-500';
const BLUE: string = 'bg-[#EFF6FF] text-[#0033A0]';

export function SystemEnhanceStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(BADGE_BASE, status === '启用' ? GREEN : SLATE)}
    >
      {status}
    </span>
  );
}

export function SystemEnhanceSystemFlagBadge({ isSystem }: { isSystem: boolean }) {
  return (
    <span className={cn(BADGE_BASE, isSystem ? BLUE : SLATE)}>
      {isSystem ? '系统内置' : '自定义'}
    </span>
  );
}

/* ============ 时间格式化：YYYY-MM-DD HH:mm:ss ============ */

export function formatSystemEnhanceDateTime(
  value: string | null | undefined,
): string {
  if (!value) return '—';
  return dayjs(value).format('YYYY-MM-DD HH:mm:ss');
}

/* ============ 表单字段容器（弹窗表单统一布局） ============ */

export function SystemEnhanceFormField({
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

export function toSystemEnhanceErrorText(error: unknown): string {
  return extractErrorMessage(error);
}

/* ============ 配置值渲染（按 valueType） ============ */

const isBooleanType = (valueType: string): boolean =>
  valueType === 'boolean' || valueType === 'bool' || valueType === '布尔';

const isNumberType = (valueType: string): boolean =>
  valueType === 'number' || valueType === '数字';

const isJsonType = (valueType: string): boolean =>
  valueType === 'json' || valueType === 'object' || valueType === 'JSON';

export function isSystemEnhanceBooleanType(valueType: string): boolean {
  return isBooleanType(valueType);
}

export function isSystemEnhanceNumberType(valueType: string): boolean {
  return isNumberType(valueType);
}

export function isSystemEnhanceJsonType(valueType: string): boolean {
  return isJsonType(valueType);
}

export function renderSystemSettingValue(
  value: unknown,
  valueType: string,
): string {
  if (isBooleanType(valueType)) {
    return value === true ? '开' : '关';
  }
  if (isJsonType(valueType)) {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  if (value === null || value === undefined) return '—';
  return String(value);
}
