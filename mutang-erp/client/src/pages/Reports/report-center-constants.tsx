import type { ReactNode } from 'react';
import dayjs from 'dayjs';
import { CalendarIcon } from 'lucide-react';
import { Badge } from '@client/src/components/ui/badge';
import { Button } from '@client/src/components/ui/button';
import { Calendar } from '@client/src/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@client/src/components/ui/popover';
import { cn } from '@client/src/lib/utils';

/* ============ 常量 ============ */

export const RC_FILTER_ALL = '__all__';

export const REPORT_TYPES = ['自定义', '模板'];

export const REPORT_DIMENSIONS = ['时间', '部门', '客户', '端口', '行业'];

export const REPORT_METRICS = ['消耗', '收入', '成本', '支出', '利润'];

export const CHART_TYPES = ['折线图', '柱状图', '饼图', '表格', '组合图'];

export const TIME_RANGES = ['今日', '本周', '本月', '本季', '本年', '自定义'];

export const QUICK_TIME_RANGES = ['今日', '本周', '本月', '本季', '本年'];

export const TEMPLATE_CATEGORIES = ['财务', '业务', '人资', '行政', '综合'];

export const FREQUENCIES = ['每日', '每周', '每月', '每季度', '每年'];

export const SCHEDULE_STATUSES = ['启用', '停用'];

export const WEEK_DAY_OPTIONS = [
  { value: '1', label: '周一' },
  { value: '2', label: '周二' },
  { value: '3', label: '周三' },
  { value: '4', label: '周四' },
  { value: '5', label: '周五' },
  { value: '6', label: '周六' },
  { value: '7', label: '周日' },
];

export const SCHEDULE_TARGET_TYPES = ['飞书群', '飞书用户', '邮件'];

export const FILE_FORMATS = ['Excel', 'PDF', '图片'];

export const DRILLDOWN_LEVELS = ['汇总', '分组', '明细', '单据'];

export const RC_CHART_PALETTE = [
  '#0033A0',
  '#1B4FD8',
  '#4A7BE8',
  '#7FA3F0',
  '#B3CCF5',
];

/* ============ 徽章 / 格式化 ============ */

export const ReportTypeBadge = ({ type }: { type: string }) => (
  <Badge
    variant="outline"
    className={
      type === '模板'
        ? 'rounded-[2px] border-primary/40 text-primary'
        : 'rounded-[2px] border-border text-foreground'
    }
  >
    {type}
  </Badge>
);

export const ChartTypeBadge = ({ type }: { type: string }) => (
  <Badge variant="outline" className="rounded-[2px] border-border text-muted-foreground">
    {type}
  </Badge>
);

export const formatDateTime = (iso: string | null): string =>
  iso ? dayjs(iso).format('YYYY-MM-DD HH:mm') : '—';

export const formatAmount = (n: number): string =>
  n.toLocaleString('zh-CN', { maximumFractionDigits: 2 });

export const toRcErrorText = (error: unknown): string => {
  const err = error as { response?: { data?: { message?: string } } };
  return err?.response?.data?.message ?? '操作失败';
};

export const formatRating = (rating: number, count: number): string =>
  count > 0 ? `${rating}(${count})` : '—';

/* ============ 表单字段容器 / 日期选择 ============ */

interface RcFormFieldProps {
  label: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

export const RcFormField = ({
  label,
  required,
  children,
  className,
}: RcFormFieldProps) => (
  <div className={cn('space-y-1.5', className)}>
    <label className="text-xs font-bold text-foreground">
      {label}
      {required ? <span className="text-destructive"> *</span> : null}
    </label>
    {children}
  </div>
);

interface RcDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const RcDatePicker = ({
  value,
  onChange,
  placeholder = '请选择日期',
}: RcDatePickerProps) => (
  <Popover>
    <PopoverTrigger asChild>
      <Button
        type="button"
        variant="outline"
        className={cn(
          'w-full justify-start rounded-none font-normal',
          !value && 'text-muted-foreground',
        )}
      >
        <CalendarIcon className="mr-2 h-4 w-4" />
        {value ? dayjs(value).format('YYYY-MM-DD') : placeholder}
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-auto rounded-none p-0" align="start">
      <Calendar
        mode="single"
        selected={value ? new Date(value) : undefined}
        defaultMonth={value ? new Date(value) : undefined}
        onSelect={(date: Date | undefined) =>
          onChange(date ? dayjs(date).format('YYYY-MM-DD') : '')
        }
      />
    </PopoverContent>
  </Popover>
);
