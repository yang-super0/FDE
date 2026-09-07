import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import {
  CHART_BLUE_PALETTE,
  ReportCard,
} from '@client/src/components/blueprint';
import type {
  BusinessShareItem,
  RevenueTrendItem,
} from '@shared/api.interface';
import { useI18n } from '@client/src/i18n';

interface DashboardChartsProps {
  trend: RevenueTrendItem[];
  share: BusinessShareItem[];
}

const DashboardCharts = ({ trend, share }: DashboardChartsProps) => {
  const { t } = useI18n();
  const pieData: BusinessShareItem[] = useMemo(() => {
    const sorted: BusinessShareItem[] = [...share].sort(
      (a: BusinessShareItem, b: BusinessShareItem) => b.value - a.value,
    );
    if (sorted.length <= 5) return sorted;
    const top: BusinessShareItem[] = sorted.slice(0, 4);
    const restValue: number = sorted
      .slice(4)
      .reduce((acc: number, item: BusinessShareItem) => acc + item.value, 0);
    return [...top, { name: t('dashboard.charts.others'), value: restValue }];
  }, [share, t]);

  const lineOption: EChartsOption = {
    tooltip: { trigger: 'axis' },
    legend: { bottom: 0 },
    grid: { left: '3%', right: '4%', bottom: '20%', containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: trend.map((item: RevenueTrendItem) => item.month),
    },
    yAxis: { type: 'value' },
    series: [
      {
        name: t('dashboard.charts.revenue'),
        type: 'line',
        smooth: true,
        data: trend.map((item: RevenueTrendItem) => item.revenue),
        itemStyle: { color: CHART_BLUE_PALETTE[0] },
        lineStyle: { color: CHART_BLUE_PALETTE[1] },
        areaStyle: { color: CHART_BLUE_PALETTE[4], opacity: 0.5 },
      },
    ],
  };

  const pieOption: EChartsOption = {
    color: [...CHART_BLUE_PALETTE],
    tooltip: { trigger: 'item' },
    legend: { type: 'scroll', bottom: 0 },
    series: [
      {
        name: t('dashboard.charts.businessShare'),
        type: 'pie',
        radius: ['45%', '68%'],
        center: ['50%', '45%'],
        label: { show: false },
        emphasis: { label: { show: false } },
        data: pieData.map((item: BusinessShareItem) => ({
          name: item.name,
          value: item.value,
        })),
      },
    ],
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
      <ReportCard className="xl:col-span-3">
        <div className="text-[11px] font-black text-primary uppercase tracking-[0.15em] mb-4">
          {t('dashboard.charts.revenueTrend')}
        </div>
        {trend.length > 0 ? (
          <ReactECharts option={lineOption} theme="ud" className="h-[300px]" />
        ) : (
          <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
            {t('dashboard.charts.noRevenueData')}
          </div>
        )}
      </ReportCard>
      <ReportCard className="xl:col-span-2">
        <div className="text-[11px] font-black text-primary uppercase tracking-[0.15em] mb-4">
          {t('dashboard.charts.businessShare')}
        </div>
        {pieData.length > 0 ? (
          <ReactECharts option={pieOption} theme="ud" className="h-[300px]" />
        ) : (
          <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
            {t('dashboard.charts.noContractData')}
          </div>
        )}
      </ReportCard>
    </div>
  );
};

export { DashboardCharts };
export type { DashboardChartsProps };
