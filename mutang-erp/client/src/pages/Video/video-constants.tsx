import type { ReactNode } from 'react';
import { cn } from '@client/src/lib/utils';
import { extractErrorMessage } from '@client/src/utils/extract-error-message';

export const VIDEO_FILTER_ALL: string = 'all';

/* ============ 选项 ============ */

export const VIDEO_TYPE_OPTIONS: string[] = [
  '产品展示',
  '品牌宣传',
  '剧情短片',
  '口播种草',
  '其他',
];

export const ACTOR_TYPE_OPTIONS: string[] = [
  '专业演员',
  '达人',
  'KOL',
  '素人',
];

export const VENDOR_TYPE_OPTIONS: string[] = [
  '拍摄团队',
  '后期制作',
  '动画特效',
  '配音配乐',
  '其他',
];

export const COOPERATION_LEVEL_OPTIONS: string[] = [
  '战略',
  '核心',
  '普通',
  '备用',
];

export const SETTLEMENT_METHOD_OPTIONS: string[] = ['月结', '项目结', '预付'];

export const EXPENSE_TYPE_OPTIONS: string[] = [
  '人员费用',
  '设备租赁',
  '交通差旅',
  '餐饮住宿',
  '道具服装',
  '其他',
];

export const VENUE_TYPE_OPTIONS: string[] = ['影棚', '外景', '实景', '其他'];

export const INVOICE_STATUS_OPTIONS: string[] = [
  '无发票',
  '有发票',
  '已开票',
];

export const ORDER_STATUS_OPTIONS: string[] = [
  '待审核',
  '已通过',
  '已驳回',
  '制作中',
  '已交付',
  '已完成',
];

export const PROJECT_STATUS_OPTIONS: string[] = [
  '筹备中',
  '拍摄中',
  '后期中',
  '待审核',
  '已交付',
  '已完成',
];

export const COMMISSION_STATUS_OPTIONS: string[] = [
  '待计算',
  '已计算',
  '待发放',
  '已发放',
  '已取消',
];

/* ============ 状态徽章：零圆角 + 语义浅底文字色 ============ */

const BADGE_BASE: string =
  'inline-flex items-center rounded-[2px] px-2 py-0.5 text-[10px] font-bold';

const VIDEO_STATUS_CLASS: Record<string, string> = {
  待审核: 'bg-[#FFF7ED] text-[#F97316]',
  待审批: 'bg-[#FFF7ED] text-[#F97316]',
  已通过: 'bg-[#EFF6FF] text-[#0033A0]',
  审批通过: 'bg-[#EFF6FF] text-[#0033A0]',
  已审批: 'bg-[#EFF6FF] text-[#0033A0]',
  已驳回: 'bg-[#FEF2F2] text-[#EF4444]',
  审批驳回: 'bg-[#FEF2F2] text-[#EF4444]',
  制作中: 'bg-[#EFF6FF] text-[#0033A0]',
  拍摄中: 'bg-[#EFF6FF] text-[#0033A0]',
  后期中: 'bg-[#F5F3FF] text-[#8B5CF6]',
  筹备中: 'bg-slate-100 text-slate-500',
  进行中: 'bg-[#EFF6FF] text-[#0033A0]',
  已交付: 'bg-[#ECFDF5] text-[#10B981]',
  已完成: 'bg-[#ECFDF5] text-[#10B981]',
  已结算: 'bg-[#ECFDF5] text-[#10B981]',
  已报销: 'bg-[#ECFDF5] text-[#10B981]',
  已发放: 'bg-[#ECFDF5] text-[#10B981]',
  待计算: 'bg-[#FFF7ED] text-[#F97316]',
  已计算: 'bg-[#EFF6FF] text-[#0033A0]',
  待发放: 'bg-[#FFF7ED] text-[#F97316]',
  已取消: 'bg-slate-100 text-slate-500',
  未结算: 'bg-[#FFF7ED] text-[#F97316]',
  部分结算: 'bg-[#FFF7ED] text-[#F97316]',
  可用: 'bg-[#ECFDF5] text-[#10B981]',
  忙碌: 'bg-[#FFF7ED] text-[#F97316]',
  停用: 'bg-slate-100 text-slate-500',
  合作中: 'bg-[#ECFDF5] text-[#10B981]',
  已停用: 'bg-slate-100 text-slate-500',
  未退还: 'bg-[#FFF7ED] text-[#F97316]',
  已退还: 'bg-[#ECFDF5] text-[#10B981]',
  已扣除: 'bg-[#FEF2F2] text-[#EF4444]',
  待邮寄: 'bg-[#FFF7ED] text-[#F97316]',
  已邮寄: 'bg-[#EFF6FF] text-[#0033A0]',
  已接收: 'bg-[#F5F3FF] text-[#8B5CF6]',
  已归还: 'bg-[#ECFDF5] text-[#10B981]',
  已丢失: 'bg-[#FEF2F2] text-[#EF4444]',
  已消耗: 'bg-[#FEF2F2] text-[#EF4444]',
  已使用: 'bg-[#F5F3FF] text-[#8B5CF6]',
};

export function VideoStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        BADGE_BASE,
        VIDEO_STATUS_CLASS[status] ?? 'bg-slate-100 text-slate-500',
      )}
    >
      {status}
    </span>
  );
}

/* ============ 金额格式化：¥ + 千分位 + 两位小数 ============ */

export function formatVideoAmount(value: number): string {
  return `¥ ${value.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/* ============ 表单字段容器（弹窗表单统一布局） ============ */

export function VideoFormField({
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

export function toVideoErrorText(error: unknown): string {
  return extractErrorMessage(error);
}
