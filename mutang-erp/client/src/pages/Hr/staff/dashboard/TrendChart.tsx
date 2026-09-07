import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import type { HrDashboardData } from '@shared/api.interface';
import { ReportCard } from '@client/src/components/blueprint';

type TrendItem = HrDashboardData['entryLeaveTrend'][number];

const ENTRY_COLOR: string = '#0033A0';
const LEAVE_COLOR: string = '#5B8DEF';

export function TrendChart({ trend }: { trend: HrDashboardData['entryLeaveTrend'] }) {
  const months: string[] = trend.map((item: TrendItem) => item.month);
  const entryData: number[] = trend.map((item: TrendItem) => item.entryCount);
  const leaveData: number[] = trend.map((item: TrendItem) => item.leaveCount);

  const option: EChartsOption = {
    tooltip: { trigger: 'axis' },
    legend: { type: 'scroll', bottom: 0 },
    grid: { left: '3%', right: '4%', bottom: '20%', containLabel: true },
    xAxis: { type: 'category', boundaryGap: true, data: months },
    yAxis: { type: 'value', minInterval: 1 },
    series: [
      {
        name: '入职人数',
        type: 'line',
        data: entryData,
        itemStyle: { color: ENTRY_COLOR },
        lineStyle: { color: ENTRY_COLOR },
      },
      {
        name: '离职人数',
        type: 'line',
        data: leaveData,
        itemStyle: { color: LEAVE_COLOR },
        lineStyle: { color: LEAVE_COLOR },
      },
    ],
  };

  return (
    <ReportCard>
      <div className="mb-4 text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">
        入离职趋势
        <span className="ml-2 font-bold text-muted-foreground/70">ENTRY / LEAVE TREND</span>
      </div>
      <ReactECharts option={option} theme="ud" className="h-[300px]" />
    </ReportCard>
  );
}
