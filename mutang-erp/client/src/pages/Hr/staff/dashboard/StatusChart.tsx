import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import type { CallbackDataParams } from 'echarts/types/dist/shared';
import type { HrDashboardData } from '@shared/api.interface';
import { ReportCard } from '@client/src/components/blueprint';

/** AGENTS.md 硬规：图表只用蓝色五级渐变 */
const HR_BAR_COLORS: string[] = ['#0033A0', '#2B5FC7', '#5B8DEF', '#93B4F4', '#C3D4FA'];

export function StatusChart({
  distribution,
}: {
  distribution: HrDashboardData['statusDistribution'];
}) {
  const sorted: HrDashboardData['statusDistribution'][number][] = [...distribution]
    .sort((a, b) => b.count - a.count);
  /** ECharts 横向条形图 category 轴自下而上，反转使人数最多的状态显示在最上方 */
  const reversed: HrDashboardData['statusDistribution'][number][] = [...sorted].reverse();
  const statuses: string[] = reversed.map((item) => item.status);
  const data: { value: number; itemStyle: { color: string } }[] = reversed.map(
    (item, index: number) => ({
      value: item.count,
      itemStyle: { color: HR_BAR_COLORS[index % HR_BAR_COLORS.length] },
    }),
  );

  const option: EChartsOption = {
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '8%', bottom: '20%', containLabel: true },
    xAxis: { type: 'value', minInterval: 1 },
    yAxis: { type: 'category', boundaryGap: true, data: statuses },
    series: [
      {
        type: 'bar',
        data,
        barMaxWidth: 24,
        label: {
          show: true,
          position: 'right',
          formatter: (params: CallbackDataParams) => `${params.value}`,
        },
      },
    ],
  };

  return (
    <ReportCard>
      <div className="mb-4 text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">
        员工状态分布
        <span className="ml-2 font-bold text-muted-foreground/70">STATUS DISTRIBUTION</span>
      </div>
      {statuses.length > 0 ? (
        <ReactECharts option={option} theme="ud" className="h-[300px]" />
      ) : (
        <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
          暂无状态数据
        </div>
      )}
    </ReportCard>
  );
}
