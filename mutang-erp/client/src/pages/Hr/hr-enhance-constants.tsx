import type { ReactNode } from 'react';
import { cn } from '@client/src/lib/utils';
import { extractErrorMessage } from '@client/src/utils/extract-error-message';

export const HR_FILTER_ALL: string = 'all';

/* ============ 招聘类选项 ============ */

export const HR_GENDER_OPTIONS: string[] = ['男', '女'];

export const HR_EDUCATION_OPTIONS: string[] = [
  '大专及以下',
  '本科',
  '硕士',
  '博士',
];

export const HR_RESUME_SOURCE_OPTIONS: string[] = [
  '招聘网站',
  '内部推荐',
  '猎头',
  '其他',
];

export const HR_RESUME_STATUS_OPTIONS: string[] = [
  '新简历',
  '已筛选',
  '已邀约',
  '已面试',
  '已录用',
  '已淘汰',
];

export const HR_INVITATION_STATUS_OPTIONS: string[] = [
  '待确认',
  '已确认',
  '已完成',
  '已取消',
  '未到场',
];

export const HR_INTERVIEW_TYPE_OPTIONS: string[] = ['电话', '视频', '现场'];

export const HR_INTERVIEW_ROUND_OPTIONS: string[] = [
  '一面',
  '二面',
  '三面',
  '终面',
];

export const HR_INTERVIEW_RESULT_OPTIONS: string[] = ['通过', '待定', '不通过'];

export const HR_OFFER_STATUS_OPTIONS: string[] = [
  '未发offer',
  '已发offer',
  '已接受',
  '已拒绝',
];

export const HR_CHECKIN_TYPE_OPTIONS: string[] = ['面试签到', '入职签到'];

export const HR_CHECKIN_STATUS_OPTIONS: string[] = [
  '已签到',
  '未签到',
  '迟到',
];

export const HR_PLAN_PRIORITY_OPTIONS: string[] = ['高', '中', '低'];

export const HR_PLAN_STATUS_OPTIONS: string[] = [
  '规划中',
  '招聘中',
  '已完成',
  '已取消',
];

/* ============ 员工 / 薪酬绩效 / 考勤选项 ============ */

export const HR_EMPLOYEE_STATUS_OPTIONS: string[] = [
  '试用期',
  '正式',
  '调岗中',
  '离职中',
  '已离职',
];

export const HR_SALARY_STATUS_OPTIONS: string[] = [
  '待核算',
  '已核算',
  '已发放',
  '已确认',
];

export const HR_PERF_PERIOD_OPTIONS: string[] = ['月度', '季度', '年度'];

export const HR_PERF_MODE_OPTIONS: string[] = ['KPI', 'OKR'];

export const HR_PERF_GRADE_OPTIONS: string[] = ['S', 'A', 'B', 'C', 'D'];

export const HR_PERF_STATUS_OPTIONS: string[] = [
  '目标设定',
  '自评中',
  '上级评中',
  '已确认',
  '已申诉',
];

export const HR_ATTENDANCE_STATUS_OPTIONS: string[] = [
  '正常',
  '迟到',
  '早退',
  '缺勤',
  '请假',
  '加班',
];

export const HR_LEAVE_TYPE_OPTIONS: string[] = [
  '事假',
  '病假',
  '年假',
  '婚假',
  '产假',
  '其他',
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

const HR_STATUS_CLASS: Record<string, string> = {
  新简历: SLATE,
  已筛选: BLUE,
  已邀约: PURPLE,
  已面试: PURPLE,
  已录用: GREEN,
  已淘汰: RED,
  待确认: ORANGE,
  已确认: BLUE,
  已完成: GREEN,
  已取消: RED,
  未到场: RED,
  通过: GREEN,
  待定: ORANGE,
  不通过: RED,
  未发offer: SLATE,
  已发offer: BLUE,
  已接受: GREEN,
  已拒绝: RED,
  已签到: GREEN,
  未签到: SLATE,
  迟到: RED,
  规划中: SLATE,
  招聘中: PURPLE,
  试用期: ORANGE,
  正式: BLUE,
  调岗中: PURPLE,
  离职中: ORANGE,
  已离职: SLATE,
  待核算: ORANGE,
  已核算: BLUE,
  已发放: GREEN,
  目标设定: SLATE,
  自评中: PURPLE,
  上级评中: PURPLE,
  已申诉: RED,
  正常: GREEN,
  早退: ORANGE,
  缺勤: RED,
  请假: BLUE,
  加班: PURPLE,
};

export function HrStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(BADGE_BASE, HR_STATUS_CLASS[status] ?? SLATE)}
    >
      {status}
    </span>
  );
}

/* ============ 金额格式化：¥ + 千分位 + 两位小数 ============ */

export function formatHrAmount(value: string | number): string {
  const num: number = Number(value ?? 0);
  return `¥ ${num.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/* ============ 表单字段容器（弹窗表单统一布局） ============ */

export function HrFormField({
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

export function toHrErrorText(error: unknown): string {
  return extractErrorMessage(error);
}
