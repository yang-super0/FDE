import { toast } from 'sonner';
import dayjs from 'dayjs';
import { Star } from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Button } from '@client/src/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@client/src/components/ui/select';
import { HR_FILTER_ALL, toHrErrorText } from '../hr-enhance-constants';

/* ============ 常量 ============ */

export const RECRUIT_PAGE_SIZE: number = 10;
export const RECRUIT_EXPORT_LIMIT: number = 100;

/* ============ 错误处理 ============ */

export function reportRecruitError(context: string, error: unknown): void {
  const text: string = toHrErrorText(error);
  logger.error(`${context}: ${text}`);
  toast.error(text);
}

/* ============ 通用小组件 ============ */

interface RecruitActionLinkProps {
  danger?: boolean;
  onClick: () => void;
  children: string;
}

export function RecruitActionLink({
  danger, onClick, children,
}: RecruitActionLinkProps) {
  return (
    <Button variant="ghost" size="sm" onClick={onClick}
      className={`h-auto px-1 text-xs ${danger ? 'text-destructive' : 'text-primary'}`}>
      {children}
    </Button>
  );
}

interface RecruitFilterSelectProps {
  value: string;
  placeholder: string;
  options: string[];
  allLabel: string;
  onChange: (value: string) => void;
}

export function RecruitFilterSelect({
  value, placeholder, options, allLabel, onChange,
}: RecruitFilterSelectProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-32 rounded-none">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={HR_FILTER_ALL}>{allLabel}</SelectItem>
        {options.map((option: string) => (
          <SelectItem key={option} value={option}>{option}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface RecruitStatCardProps {
  label: string;
  value: string;
}

export function RecruitStatCard({ label, value }: RecruitStatCardProps) {
  return (
    <div className="min-w-[120px] flex-1 rounded-none border-t-[3px] border-primary bg-card px-4 py-3 shadow-md">
      <div className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-mono text-xl font-bold text-foreground">
        {value}
      </div>
    </div>
  );
}

/* ============ 评分星级 ============ */

interface RecruitRatingStarsProps {
  value: number;
}

export function RecruitRatingStars({ value }: RecruitRatingStarsProps) {
  return (
    <span className="inline-flex items-center gap-0.5" title={value > 0 ? `评分 ${value}` : '未评分'}>
      {[1, 2, 3, 4, 5].map((star: number) => (
        <Star
          key={star}
          className={`h-3.5 w-3.5 ${star <= value ? 'fill-primary text-primary' : 'text-muted-foreground'}`}
        />
      ))}
      <span className="ml-1 font-mono text-xs text-muted-foreground">
        {value > 0 ? value : '未评分'}
      </span>
    </span>
  );
}

interface RecruitRatingEditorProps {
  value: number;
  onSelect: (rating: number) => void;
}

export function RecruitRatingEditor({
  value, onSelect,
}: RecruitRatingEditorProps) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star: number) => (
        <button
          key={star}
          type="button"
          title={`设为 ${star} 星`}
          onClick={() => onSelect(star)}
          className="rounded-sm p-0.5 transition-colors hover:bg-accent"
        >
          <Star
            className={`h-3.5 w-3.5 ${star <= value ? 'fill-primary text-primary' : 'text-muted-foreground'}`}
          />
        </button>
      ))}
    </span>
  );
}

/* ============ 时间格式化与校验 ============ */

export function formatHrDateTime(value: string | null): string {
  if (!value) return '—';
  return dayjs(value).format('YYYY-MM-DD HH:mm:ss');
}

export function formatHrDate(value: string | null): string {
  if (!value) return '—';
  return dayjs(value).format('YYYY-MM-DD');
}

export function isValidHrDate(value: string): boolean {
  if (value === '') return true;
  return dayjs(value).format('YYYY-MM-DD') === value;
}

export function isValidHrDateTime(value: string): boolean {
  if (value === '') return true;
  return dayjs(value).format('YYYY-MM-DD HH:mm:ss') === value;
}
