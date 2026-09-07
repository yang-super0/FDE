import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  FinanceReportRangeParams,
  FinanceReportTotals,
} from '@shared/api.interface';
import { fetchFinanceReportTotals } from '@client/src/api/finance-core';
import { ReportCard, SectionHeader } from '@client/src/components/blueprint';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import { Skeleton } from '@client/src/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import { cn } from '@client/src/lib/utils';
import { FinanceCoreTabs } from './FinanceCoreTabs';
import { formatFinanceAmount } from './finance-constants';
import { ProfitReport } from './ProfitReport';
import {
  CostAnalysisPanel,
  IncomeExpensePanel,
  ReceivablePayableTable,
} from './AnalysisReports';

type ReportType = 'receivablePayable' | 'profit' | 'incomeExpense' | 'costAnalysis';
type PresetValue = 'month' | 'lastMonth' | 'quarter' | 'year' | 'custom';

interface ReportTabDef {
  value: ReportType;
  label: string;
}

interface PresetOptionDef {
  value: PresetValue;
  label: string;
}

interface MetricDef {
  key: keyof FinanceReportTotals;
  label: string;
  accent: string;
  isRate?: boolean;
}

const REPORT_TABS: ReportTabDef[] = [
  { value: 'receivablePayable', label: '应收应付' },
  { value: 'profit', label: '利润表' },
  { value: 'incomeExpense', label: '收支汇总' },
  { value: 'costAnalysis', label: '成本分析' },
];

const PRESET_OPTIONS: PresetOptionDef[] = [
  { value: 'month', label: '本月' },
  { value: 'lastMonth', label: '上月' },
  { value: 'quarter', label: '本季度' },
  { value: 'year', label: '本年' },
  { value: 'custom', label: '自定义' },
];

const METRICS: MetricDef[] = [
  { key: 'totalIncome', label: '总收入', accent: 'text-primary' },
  { key: 'totalCost', label: '总成本', accent: 'text-[hsl(38_92%_50%)]' },
  { key: 'totalProfit', label: '总利润', accent: 'text-[hsl(160_84%_39%)]' },
  { key: 'profitRate', label: '利润率', accent: 'text-primary', isRate: true },
  { key: 'receivable', label: '应收账款', accent: 'text-foreground' },
  { key: 'payable', label: '应付账款', accent: 'text-foreground' },
];

const DATE_PATTERN: RegExp = /^\d{4}-\d{2}-\d{2}$/;

const isValidDate = (value: string): boolean =>
  DATE_PATTERN.test(value) && !Number.isNaN(new Date(value).getTime());

const FinanceReportsPage = () => {
  const [reportType, setReportType] = useState<ReportType>('receivablePayable');
  const [preset, setPreset] = useState<PresetValue>('month');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [totals, setTotals] = useState<FinanceReportTotals | null>(null);
  const [totalsLoading, setTotalsLoading] = useState<boolean>(true);

  const customValid: boolean =
    isValidDate(startDate) &&
    isValidDate(endDate) &&
    startDate <= endDate;

  const range: FinanceReportRangeParams | null = useMemo(() => {
    if (preset === 'custom') {
      if (!customValid) return null;
      return { startDate, endDate };
    }
    return { preset };
  }, [preset, customValid, startDate, endDate]);

  useEffect(() => {
    if (!range) {
      setTotals(null);
      setTotalsLoading(false);
      return undefined;
    }
    let cancelled: boolean = false;
    setTotalsLoading(true);
    fetchFinanceReportTotals(range)
      .then((data: FinanceReportTotals) => {
        if (!cancelled) setTotals(data);
      })
      .catch((error: unknown) => {
        logger.error('获取财务报表汇总失败', error);
        if (!cancelled) setTotals(null);
      })
      .finally(() => {
        if (!cancelled) setTotalsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range]);

  const handlePresetChange = (value: string): void => {
    setPreset(value as PresetValue);
  };

  const handleStartChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setStartDate(event.target.value);
  };

  const handleEndChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setEndDate(event.target.value);
  };

  const renderMetricValue = (metric: MetricDef): string => {
    if (!totals) return '--';
    const value: number = totals[metric.key];
    if (metric.isRate) return `${Number(value).toFixed(2)}%`;
    return formatFinanceAmount(value);
  };

  return (
    <div className="space-y-6">
      <FinanceCoreTabs active="reports" />

      <div>
        <SectionHeader
          no="07"
          label="财务报表"
          subtitle="应收应付 / 利润表 / 收支汇总 / 成本分析，支持按时间范围统计与导出"
        />

        <ReportCard className="mb-6 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap gap-2">
              {REPORT_TABS.map((tab: ReportTabDef) => (
                <Button
                  key={tab.value}
                  size="sm"
                  variant={reportType === tab.value ? 'default' : 'outline'}
                  className="rounded-none"
                  onClick={(): void => setReportType(tab.value)}
                >
                  {tab.label}
                </Button>
              ))}
            </div>
            <div className="h-6 w-px bg-border" />
            <Select value={preset} onValueChange={handlePresetChange}>
              <SelectTrigger className="w-[130px] rounded-none">
                <SelectValue placeholder="选择时间" />
              </SelectTrigger>
              <SelectContent>
                {PRESET_OPTIONS.map((option: PresetOptionDef) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {preset === 'custom' ? (
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  value={startDate}
                  onChange={handleStartChange}
                  placeholder="开始日期 YYYY-MM-DD"
                  className="w-[170px] rounded-none font-mono"
                />
                <span className="text-xs text-muted-foreground">至</span>
                <Input
                  value={endDate}
                  onChange={handleEndChange}
                  placeholder="结束日期 YYYY-MM-DD"
                  className="w-[170px] rounded-none font-mono"
                />
              </div>
            ) : null}
          </div>
          {preset === 'custom' && !customValid ? (
            <div className="mt-2 text-xs text-[hsl(0_84%_60%)]">
              请输入有效的日期范围（格式 YYYY-MM-DD），且开始日期不能晚于结束日期
            </div>
          ) : null}
        </ReportCard>

        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          {METRICS.map((metric: MetricDef) => (
            <ReportCard key={metric.key} className="p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">
                {metric.label}
              </div>
              <div className={cn('mt-2 font-mono text-xl font-bold', metric.accent)}>
                {totalsLoading ? (
                  <Skeleton className="h-7 w-full" />
                ) : (
                  renderMetricValue(metric)
                )}
              </div>
            </ReportCard>
          ))}
        </div>

        {range ? (
          <>
            {reportType === 'receivablePayable' ? (
              <ReceivablePayableTable range={range} />
            ) : null}
            {reportType === 'profit' ? <ProfitReport range={range} /> : null}
            {reportType === 'incomeExpense' ? (
              <IncomeExpensePanel range={range} />
            ) : null}
            {reportType === 'costAnalysis' ? (
              <CostAnalysisPanel range={range} />
            ) : null}
          </>
        ) : (
          <ReportCard>
            <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
              请选择有效的时间范围后查看报表
            </div>
          </ReportCard>
        )}
      </div>
    </div>
  );
};

export { FinanceReportsPage };
