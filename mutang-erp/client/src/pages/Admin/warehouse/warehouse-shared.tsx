import { toast } from 'sonner';
import dayjs from 'dayjs';
import { CalendarIcon } from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Button } from '@client/src/components/ui/button';
import { Calendar } from '@client/src/components/ui/calendar';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@client/src/components/ui/popover';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@client/src/components/ui/select';
import { ADMIN_FILTER_ALL, toAdminErrorText } from '../admin-enhance-constants';

/* ============ 常量 ============ */

export const WAREHOUSE_PAGE_SIZE: number = 10;
export const WAREHOUSE_EXPORT_LIMIT: number = 100;

/* ============ 错误处理 ============ */

export function reportWarehouseError(context: string, error: unknown): void {
  const text: string = toAdminErrorText(error);
  logger.error(`${context}: ${text}`);
  toast.error(text);
}

/* ============ 表格行操作链接 ============ */

interface WarehouseActionLinkProps {
  danger?: boolean;
  onClick: () => void;
  children: string;
}

export function WarehouseActionLink({
  danger, onClick, children,
}: WarehouseActionLinkProps) {
  return (
    <Button variant="ghost" size="sm" onClick={onClick}
      className={`h-auto rounded-none px-1 text-xs ${danger ? 'text-destructive' : 'text-primary'}`}>
      {children}
    </Button>
  );
}

/* ============ 筛选下拉（含“全部”项） ============ */

interface WarehouseFilterSelectProps {
  value: string;
  placeholder: string;
  options: string[];
  allLabel: string;
  onChange: (value: string) => void;
}

export function WarehouseFilterSelect({
  value, placeholder, options, allLabel, onChange,
}: WarehouseFilterSelectProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-32 rounded-none">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ADMIN_FILTER_ALL}>{allLabel}</SelectItem>
        {options.map((option: string) => (
          <SelectItem key={option} value={option}>{option}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/* ============ 日期选择（Popover + Calendar，禁原生 input[date]） ============ */

interface WarehouseDatePickerProps {
  value: Date | undefined;
  placeholder: string;
  full?: boolean;
  onChange: (value: Date | undefined) => void;
}

export function WarehouseDatePicker({
  value, placeholder, full, onChange,
}: WarehouseDatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline" size="sm"
          className={`h-9 justify-start rounded-none font-normal text-muted-foreground ${full ? 'w-full' : 'w-36'}`}
        >
          <CalendarIcon className="h-3.5 w-3.5" />
          {value ? dayjs(value).format('YYYY-MM-DD') : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto rounded-none p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={(date: Date | undefined) => onChange(date)}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

/* ============ 时间格式化 ============ */

export function formatWarehouseDate(value: string | null): string {
  if (!value) return '—';
  return dayjs(value).format('YYYY-MM-DD');
}

export function formatWarehouseDateTime(value: string | null): string {
  if (!value) return '—';
  return dayjs(value).format('YYYY-MM-DD HH:mm:ss');
}
