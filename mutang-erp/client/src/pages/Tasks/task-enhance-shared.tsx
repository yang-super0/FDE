import type { ReactNode } from 'react';
import dayjs from 'dayjs';
import { cn } from '@client/src/lib/utils';
import { extractErrorMessage } from '@client/src/utils/extract-error-message';

export const TASK_ENHANCE_FILTER_ALL: string = 'all';

/* ============ 选项常量 ============ */

export const TASK_IMPORT_TYPES: string[] = [
  '客户',
  '供应商',
  '商品',
  '订单',
  '财务',
  '员工',
  '其他',
];

export const TASK_EXPORT_TYPES: string[] = [
  '客户',
  '供应商',
  '商品',
  '订单',
  '财务',
  '员工',
  '自定义',
];

export const TASK_TODO_TYPES: string[] = ['审批', '任务', '提醒', '其他'];

export const TASK_TODO_SOURCE_MODULES: string[] = [
  '客户',
  '广告',
  '财务',
  '合同',
  '行政',
  '人资',
  '系统',
];

export const TASK_COLLAB_TYPES: string[] = [
  '日常工作',
  '项目任务',
  '临时任务',
  '其他',
];

export const TASK_PRIORITY_OPTIONS: string[] = ['高', '中', '低'];

/* ============ 状态徽章：零圆角 + 语义浅底文字色 ============ */

const BADGE_BASE: string =
  'inline-flex items-center rounded-[2px] px-2 py-0.5 text-[10px] font-bold';

const ORANGE: string = 'bg-[#FFF7ED] text-[#F97316]';
const BLUE: string = 'bg-[#EFF6FF] text-[#0033A0]';
const GREEN: string = 'bg-[#ECFDF5] text-[#10B981]';
const RED: string = 'bg-[#FEF2F2] text-[#EF4444]';
const PURPLE: string = 'bg-[#F5F3FF] text-[#8B5CF6]';
const SLATE: string = 'bg-slate-100 text-slate-500';

const TASK_STATUS_CLASS: Record<string, string> = {
  待处理: SLATE,
  处理中: PURPLE,
  已完成: GREEN,
  部分失败: ORANGE,
  失败: RED,
  已忽略: SLATE,
  待开始: SLATE,
  进行中: PURPLE,
  已暂停: ORANGE,
  已取消: RED,
};

export function TaskEnhanceStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(BADGE_BASE, TASK_STATUS_CLASS[status] ?? SLATE)}
    >
      {status}
    </span>
  );
}

export function TaskEnhancePriorityBadge({ priority }: { priority: string }) {
  const PRIORITY_CLASS: Record<string, string> = {
    高: 'bg-[#0033A0] text-white',
    中: 'bg-[#0066FF] text-white',
    低: 'bg-[#CCE0FF] text-[#0033A0]',
  };
  return (
    <span className={cn(BADGE_BASE, PRIORITY_CLASS[priority] ?? SLATE)}>
      {priority}
    </span>
  );
}

/* ============ 时间格式化：YYYY-MM-DD HH:mm:ss ============ */

export function formatTaskEnhanceDateTime(
  value: string | null | undefined,
): string {
  if (!value) return '—';
  return dayjs(value).format('YYYY-MM-DD HH:mm:ss');
}

/* ============ 表单字段容器（弹窗表单统一布局） ============ */

export function TaskEnhanceFormField({
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

export function toTaskEnhanceErrorText(error: unknown): string {
  return extractErrorMessage(error);
}

/* ============ 待办关联单据跳转路由 ============ */

const SOURCE_MODULE_ROUTES: Record<string, string> = {
  客户: '/customers',
  广告: '/advertising',
  财务: '/finance',
  合同: '/contracts',
  行政: '/admin',
  人资: '/hr',
  系统: '/system',
};

export function resolveTaskEnhanceSourceRoute(
  sourceModule: string | null | undefined,
): string | null {
  if (!sourceModule) return null;
  return SOURCE_MODULE_ROUTES[sourceModule] ?? null;
}
