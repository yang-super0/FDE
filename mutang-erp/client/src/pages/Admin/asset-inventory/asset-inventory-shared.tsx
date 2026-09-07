import { toast } from 'sonner';
import dayjs from 'dayjs';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Button } from '@client/src/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@client/src/components/ui/select';
import type {
  AdminEnhanceAssetStats, AdminEnhanceInventoryStats,
} from '@shared/api.interface';
import {
  ADMIN_FILTER_ALL, formatAdminAmount, toAdminErrorText,
} from '../admin-enhance-constants';

/* ============ 常量 ============ */

export const ASSET_INVENTORY_PAGE_SIZE: number = 10;
export const ASSET_INVENTORY_EXPORT_LIMIT: number = 200;

/* ============ 错误处理 ============ */

export function reportAssetInventoryError(
  context: string,
  error: unknown,
): void {
  const text: string = toAdminErrorText(error);
  logger.error(`${context}: ${text}`);
  toast.error(text);
}

/* ============ 通用小组件 ============ */

interface AdminActionLinkProps {
  danger?: boolean;
  onClick: () => void;
  children: string;
}

export function AdminActionLink({
  danger, onClick, children,
}: AdminActionLinkProps) {
  return (
    <Button variant="ghost" size="sm" onClick={onClick}
      className={`h-auto px-1 text-xs ${danger ? 'text-destructive' : 'text-primary'}`}>
      {children}
    </Button>
  );
}

interface AdminFilterSelectProps {
  value: string;
  placeholder: string;
  options: string[];
  allLabel: string;
  onChange: (value: string) => void;
}

export function AdminFilterSelect({
  value, placeholder, options, allLabel, onChange,
}: AdminFilterSelectProps) {
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

export type AdminStatTone = 'default' | 'warning' | 'danger';

const ADMIN_STAT_TONE_CLASS: Record<AdminStatTone, string> = {
  default: 'text-foreground',
  warning: 'text-[#F97316]',
  danger: 'text-[#EF4444]',
};

interface AdminStatCardProps {
  label: string;
  value: string;
  tone?: AdminStatTone;
}

export function AdminStatCard({
  label, value, tone = 'default',
}: AdminStatCardProps) {
  return (
    <div className="min-w-[108px] flex-1 rounded-none border-t-[3px] border-primary bg-card px-3 py-2.5 shadow-md">
      <div className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">
        {label}
      </div>
      <div className={`mt-1 truncate font-mono text-lg font-bold ${ADMIN_STAT_TONE_CLASS[tone]}`}
        title={value}>
        {value}
      </div>
    </div>
  );
}

/* ============ 格式化 ============ */

export function formatAdminDate(value: string | null): string {
  if (!value) return '—';
  return dayjs(value).format('YYYY-MM-DD');
}

export function formatAdminDepreciation(value: number): string {
  const percent: string = (Number(value ?? 0) * 100).toFixed(1);
  return `${percent.endsWith('.0') ? percent.slice(0, -2) : percent}%`;
}

export function isValidAdminDate(value: string): boolean {
  if (value === '') return true;
  return dayjs(value).format('YYYY-MM-DD') === value;
}

/* ============ 统计带 ============ */

export function AssetsStatsBand({ stats }: { stats: AdminEnhanceAssetStats }) {
  return (
    <div data-ai-section-type="card-stat" className="mb-6 flex flex-wrap gap-3">
      <AdminStatCard label="资产总数" value={String(stats.total)} />
      <AdminStatCard label="在用" value={String(stats.inUse)} />
      <AdminStatCard label="闲置" value={String(stats.idle)} />
      <AdminStatCard label="维修中" value={String(stats.repairing)} />
      <AdminStatCard label="已报废" value={String(stats.scrapped)} />
      <AdminStatCard label="采购总值" value={formatAdminAmount(stats.totalPurchaseValue)} />
      <AdminStatCard label="当前净值" value={formatAdminAmount(stats.totalCurrentValue)} />
    </div>
  );
}

export function InventoryStatsBand({ stats }: { stats: AdminEnhanceInventoryStats }) {
  return (
    <div data-ai-section-type="card-stat" className="mb-6 flex flex-wrap gap-3">
      <AdminStatCard label="物品种类" value={String(stats.totalItems)} />
      <AdminStatCard label="库存总量" value={String(stats.totalQuantity)} />
      <AdminStatCard label="预警物品" value={String(stats.warningCount)} tone="warning" />
      <AdminStatCard label="缺货物品" value={String(stats.shortageCount)} tone="danger" />
    </div>
  );
}
