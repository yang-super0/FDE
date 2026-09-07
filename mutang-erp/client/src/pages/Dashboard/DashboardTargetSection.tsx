import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { ReportCard } from '@client/src/components/blueprint';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import type { DashboardTargetSummary } from '@shared/api.interface';
import { getDepartmentTargetSummary } from '@client/src/api/workbench-enhance';
import { useI18n } from '@client/src/i18n';
import { formatRankAmount } from './DashboardRankSection';

const TARGET_TYPE_OPTIONS: string[] = ['月度', '年度'];

const rateBarColor = (rate: number): string =>
  rate >= 100 ? 'bg-[#0B8A6B]' : rate >= 80 ? 'bg-[#D97706]' : 'bg-[#DC2626]';

const rateTextColor = (rate: number): string =>
  rate >= 100 ? 'text-[#0B8A6B]' : rate >= 80 ? 'text-[#D97706]' : 'text-[#DC2626]';

const statusToneClass = (status: string): string =>
  status === '已完成'
    ? 'bg-[hsl(160_63%_96%)] text-[#0B8A6B]'
    : status === '未达标'
      ? 'bg-[hsl(0_93%_94%)] text-[#DC2626]'
      : status === '进行中'
        ? 'bg-[hsl(45_100%_96%)] text-[#D97706]'
        : 'bg-accent text-muted-foreground';

export const DashboardTargetSection = () => {
  const { t, tEnum } = useI18n();
  const [targetType, setTargetType] = useState<string>('月度');
  const [summary, setSummary] = useState<DashboardTargetSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const loadSummary = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const data = await getDepartmentTargetSummary(targetType);
      setSummary(data);
    } catch (error) {
      logger.error('目标汇总加载失败', error);
      toast.error(t('common.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [targetType, t]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const items = summary?.items ?? [];

  return (
    <ReportCard>
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
        <div className="text-sm font-bold">{t('dashboard.targets.title')}</div>
        <Select value={targetType} onValueChange={(value: string): void => setTargetType(value)}>
          <SelectTrigger className="w-[120px] h-8 rounded-none text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-none">
            {TARGET_TYPE_OPTIONS.map((item: string): React.ReactNode => (
              <SelectItem key={item} value={item}>
                {t(
                  item === '月度'
                    ? 'dashboard.targets.monthlyTarget'
                    : 'dashboard.targets.annualTarget',
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {loading ? (
        <div className="py-10 text-center text-xs text-muted-foreground">{t('dashboard.targets.loading')}</div>
      ) : items.length === 0 ? (
        <div className="py-10 text-center text-xs text-muted-foreground">
          {t('dashboard.targets.noData', { type: tEnum(targetType) })}
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item): React.ReactNode => (
            <div key={item.department} className="border-t border-border pt-4 first:border-t-0 first:pt-0">
              <div className="flex items-center justify-between gap-4 pb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-bold truncate">{item.department}</span>
                  <span
                    className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold rounded-none ${statusToneClass(item.status)}`}
                  >
                    {tEnum(item.status)}
                  </span>
                </div>
                <div className="flex items-center gap-4 shrink-0 text-xs font-mono">
                  <span className="text-muted-foreground">
                    {t('dashboard.targets.targetLabel')} {formatRankAmount(item.targetConsumption)}
                  </span>
                  <span className="text-muted-foreground">
                    {t('dashboard.targets.actualLabel')} {formatRankAmount(item.actualConsumption)}
                  </span>
                  <span className={`font-black ${rateTextColor(item.completionRate)}`}>
                    {item.completionRate.toFixed(2)}%
                  </span>
                </div>
              </div>
              <div className="h-2 bg-accent w-full">
                <div
                  className={`h-full ${rateBarColor(item.completionRate)} transition-all`}
                  style={{ width: `${Math.min(item.completionRate, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </ReportCard>
  );
};
