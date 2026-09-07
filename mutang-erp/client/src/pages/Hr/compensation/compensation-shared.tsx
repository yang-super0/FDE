import { useEffect, useState, type ChangeEvent, type ReactNode } from 'react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@client/src/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@client/src/components/ui/select';
import { cn } from '@client/src/lib/utils';
import { AdsConfirmDialog } from '@client/src/pages/AdsBusiness/AdsConfirmDialog';
import { exportRowsToExcel } from '@client/src/pages/AdsBusiness/ads-excel';
import type {
  HrPerformance, HrPerformanceListParams, HrPerformancePage,
  HrSalary, HrSalaryListParams, HrSalaryPage,
} from '@shared/api.interface';
import {
  batchCalculateHrSalaries, batchPayHrSalaries,
  fetchHrPerformances, fetchHrSalaries,
} from '@client/src/api/hr-enhance/compensation';
import { HR_FILTER_ALL, formatHrAmount, toHrErrorText } from '../hr-enhance-constants';

/* ============ 常量 ============ */

export const COMP_PAGE_SIZE: number = 10;
export const COMP_EXPORT_LIMIT: number = 100;

/* ============ 错误处理 ============ */

export function reportCompError(context: string, error: unknown): void {
  const text: string = toHrErrorText(error);
  logger.error(`${context}: ${text}`);
  toast.error(text);
}

/* ============ 通用小组件 ============ */

export function CompActionLink({ danger, onClick, children }: {
  danger?: boolean; onClick: () => void; children: string;
}) {
  return (
    <Button variant="ghost" size="sm" onClick={onClick}
      className={`h-auto px-1 text-xs ${danger ? 'text-destructive' : 'text-primary'}`}>
      {children}
    </Button>
  );
}

export function CompFilterSelect({ value, placeholder, options, allLabel, onChange }: {
  value: string; placeholder: string; options: string[]; allLabel: string;
  onChange: (value: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-32 rounded-none"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        <SelectItem value={HR_FILTER_ALL}>{allLabel}</SelectItem>
        {options.map((option: string) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

/* ============ 绩效等级徽章：S/A/B/C/D 蓝色系 ============ */

const COMP_GRADE_BADGE_BASE: string =
  'inline-flex items-center rounded-[2px] px-2 py-0.5 text-[10px] font-bold';

const COMP_GRADE_CLASS: Record<string, string> = {
  S: 'bg-[#0033A0] text-white',
  A: 'bg-[#EFF6FF] text-[#0033A0]',
  B: 'bg-[#DBEAFE] text-[#1D4ED8]',
  C: 'bg-[#FFF7ED] text-[#F97316]',
  D: 'bg-[#FEF2F2] text-[#EF4444]',
};

export function CompGradeBadge({ grade }: { grade: string }) {
  if (!grade) return <span className="text-muted-foreground">—</span>;
  return (
    <span
      className={cn(COMP_GRADE_BADGE_BASE, COMP_GRADE_CLASS[grade] ?? 'bg-slate-100 text-slate-500')}
    >
      {grade}
    </span>
  );
}

/* ============ 批量操作月份弹窗（批量核算 / 批量发放共用） ============ */

interface CompBatchMonthDialogProps {
  open: boolean;
  title: string;
  description: string;
  actionText: string;
  onSubmit: (month: string) => void;
  onOpenChange: (open: boolean) => void;
}

export function CompBatchMonthDialog({
  open, title, description, actionText, onSubmit, onOpenChange,
}: CompBatchMonthDialogProps) {
  const [month, setMonth] = useState<string>('');

  useEffect(() => {
    if (open) setMonth('');
  }, [open]);

  const handleSubmit = (): void => {
    const value: string = month.trim();
    if (!/^\d{4}-\d{2}$/u.test(value)) {
      toast.error('请输入正确的工资月份，格式 YYYY-MM');
      return;
    }
    onSubmit(value);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-none">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            工资月份 <span className="text-destructive">*</span>
          </label>
          <Input
            className="rounded-none"
            placeholder="YYYY-MM"
            value={month}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setMonth(event.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleSubmit}>{actionText}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============ 金额列渲染（font-mono + 千分位两位小数） ============ */

export function renderCompMoney(
  value: string | null,
  strong?: boolean,
): ReactNode {
  const text: string = value == null
    ? '-'
    : value === '****'
      ? '****'
      : formatHrAmount(value);
  return (
    <span className={`font-mono${strong ? ' font-bold text-primary' : ''}`}>
      {text}
    </span>
  );
}

/* ============ 工资批量操作（批量核算 / 批量发放） ============ */

const SALARY_BATCH_TEXT: Record<'calculate' | 'pay', string> = {
  calculate: '批量核算', pay: '批量发放',
};

interface SalaryBatchPending {
  action: 'calculate' | 'pay';
  month: string;
}

export function useSalaryBatchActions(onFinished: () => void): {
  batchNode: ReactNode;
  openBatch: (action: 'calculate' | 'pay') => void;
} {
  const [batch, setBatch] = useState<'calculate' | 'pay' | null>(null);
  const [batchPending, setBatchPending] = useState<SalaryBatchPending | null>(null);

  const handleBatchSubmit = (month: string): void => {
    if (!batch) return;
    setBatchPending({ action: batch, month });
    setBatch(null);
  };

  const handleBatchConfirm = async (): Promise<void> => {
    if (!batchPending) return;
    const { action, month } = batchPending;
    try {
      const result = action === 'calculate'
        ? await batchCalculateHrSalaries({ salaryMonth: month })
        : await batchPayHrSalaries({ salaryMonth: month });
      toast.success(`${SALARY_BATCH_TEXT[action]}完成，共处理 ${result.updated} 条工资记录`);
      setBatchPending(null);
      onFinished();
    } catch (error: unknown) {
      reportCompError(`${SALARY_BATCH_TEXT[action]}失败`, error);
    }
  };

  const batchNode: ReactNode = (
    <>
      <CompBatchMonthDialog
        open={batch !== null}
        title={batch ? SALARY_BATCH_TEXT[batch] : ''}
        description="请输入需要处理的工资月份（YYYY-MM）"
        actionText="下一步"
        onSubmit={handleBatchSubmit}
        onOpenChange={(open: boolean) => {
          if (!open) setBatch(null);
        }}
      />
      <AdsConfirmDialog
        open={batchPending !== null}
        title={batchPending ? `${SALARY_BATCH_TEXT[batchPending.action]}确认` : ''}
        description={batchPending
          ? `即将对 ${batchPending.month} 月的工资记录执行${SALARY_BATCH_TEXT[batchPending.action]}，请确认。`
          : ''}
        confirmText={batchPending ? SALARY_BATCH_TEXT[batchPending.action] : '确认'}
        onOpenChange={(open: boolean) => {
          if (!open) setBatchPending(null);
        }}
        onConfirm={() => void handleBatchConfirm()}
      />
    </>
  );

  return { batchNode, openBatch: setBatch };
}

/* ============ 导出 Excel ============ */

const SALARY_EXPORT_HEADERS: string[] = [
  '工资条号', '员工', '部门', '月份', '基本工资', '绩效工资', '补贴',
  '扣款', '个税', '社保', '实发工资', '状态', '发薪日',
];

export async function exportSalariesExcel(
  params: HrSalaryListParams,
): Promise<number> {
  const result: HrSalaryPage = await fetchHrSalaries({
    ...params, page: '1', pageSize: String(COMP_EXPORT_LIMIT),
  });
  const rows: Record<string, string>[] = result.items.map((item: HrSalary) => ({
    工资条号: item.salaryNo,
    员工: item.employeeName,
    部门: item.department,
    月份: item.salaryMonth,
    基本工资: formatHrAmount(item.baseSalary),
    绩效工资: formatHrAmount(item.performanceSalary),
    补贴: formatHrAmount(item.allowance),
    扣款: formatHrAmount(item.deduction),
    个税: formatHrAmount(item.tax),
    社保: formatHrAmount(item.socialInsurance),
    实发工资: formatHrAmount(item.actualSalary),
    状态: item.status,
    发薪日: item.payDate ?? '',
  }));
  return exportRowsToExcel(rows, SALARY_EXPORT_HEADERS, '工资管理', '工资管理');
}

const PERFORMANCE_EXPORT_HEADERS: string[] = [
  '编号', '员工', '部门', '周期', '模式', '自评分', '上级评分',
  '最终得分', '等级', '状态', '确认日期',
];

export async function exportPerformancesExcel(
  params: HrPerformanceListParams,
): Promise<number> {
  const result: HrPerformancePage = await fetchHrPerformances({
    ...params, page: '1', pageSize: String(COMP_EXPORT_LIMIT),
  });
  const rows: Record<string, string>[] = result.items.map((item: HrPerformance) => ({
    编号: item.performanceNo,
    员工: item.employeeName,
    部门: item.department,
    周期: item.period,
    模式: item.mode,
    自评分: item.selfScore === null ? '' : String(item.selfScore),
    上级评分: item.leaderScore === null ? '' : String(item.leaderScore),
    最终得分: item.finalScore ?? '',
    等级: item.grade,
    状态: item.status,
    确认日期: item.confirmDate ?? '',
  }));
  return exportRowsToExcel(rows, PERFORMANCE_EXPORT_HEADERS, '绩效管理', '绩效管理');
}
