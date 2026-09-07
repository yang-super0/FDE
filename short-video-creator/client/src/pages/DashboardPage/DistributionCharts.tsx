import React from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import type { DashboardDistributions, DistributionItem } from '@shared/dashboard';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@client/src/components/ui/card';

interface DistributionChartsProps {
  distributions: DashboardDistributions;
}

// 与 --chart-1 / --chart-2 主题 token 对应的 hex 值（ECharts 仅支持 hex）
const COLOR_CHART_1 = '#284EBD';
const COLOR_CHART_2 = '#3791BE';
const COLOR_MUTED = '#8A97AD';
const COLOR_MUTED_LIGHT = '#C3CBD9';
const COLOR_MUTED_DEEP = '#5B6B84';

const PIE_MAX_CATEGORIES = 5;

const buildBarOption = (items: DistributionItem[]): EChartsOption => ({
  color: [COLOR_CHART_1, COLOR_CHART_2],
  tooltip: { trigger: 'axis' },
  legend: { type: 'scroll', bottom: 0 },
  grid: { left: '3%', right: '4%', bottom: '20%', containLabel: true },
  xAxis: {
    type: 'category',
    boundaryGap: true,
    data: items.map((item: DistributionItem) => item.dimension),
    axisLabel: { interval: 0 },
  },
  yAxis: [
    { type: 'value', name: '数量' },
    { type: 'value', name: '播放量' },
  ],
  series: [
    {
      name: '数量',
      type: 'bar',
      data: items.map((item: DistributionItem) => item.count),
      itemStyle: { borderRadius: [2, 2, 0, 0] },
    },
    {
      name: '播放量',
      type: 'bar',
      yAxisIndex: 1,
      data: items.map((item: DistributionItem) => item.playCount),
      itemStyle: { borderRadius: [2, 2, 0, 0] },
    },
  ],
});

const buildSingleBarOption = (items: DistributionItem[]): EChartsOption => ({
  color: [COLOR_CHART_1],
  tooltip: { trigger: 'axis' },
  grid: { left: '3%', right: '4%', bottom: '8%', containLabel: true },
  xAxis: {
    type: 'category',
    boundaryGap: true,
    data: items.map((item: DistributionItem) => item.dimension),
    axisLabel: { interval: 0 },
  },
  yAxis: { type: 'value', name: '数量' },
  series: [
    {
      name: '数量',
      type: 'bar',
      data: items.map((item: DistributionItem) => item.count),
      itemStyle: { borderRadius: [2, 2, 0, 0] },
    },
  ],
});

const mergePieItems = (
  items: DistributionItem[],
): { name: string; value: number }[] => {
  if (items.length <= PIE_MAX_CATEGORIES) {
    return items.map((item: DistributionItem) => ({
      name: item.dimension,
      value: item.count,
    }));
  }
  const top: DistributionItem[] = items.slice(0, PIE_MAX_CATEGORIES - 1);
  const rest: DistributionItem[] = items.slice(PIE_MAX_CATEGORIES - 1);
  const restTotal: number = rest.reduce(
    (sum: number, item: DistributionItem) => sum + item.count,
    0,
  );
  return [
    ...top.map((item: DistributionItem) => ({
      name: item.dimension,
      value: item.count,
    })),
    { name: '其他', value: restTotal },
  ];
};

const buildPieOption = (items: DistributionItem[]): EChartsOption => ({
  color: [
    COLOR_CHART_1,
    COLOR_CHART_2,
    COLOR_MUTED,
    COLOR_MUTED_LIGHT,
    COLOR_MUTED_DEEP,
  ],
  tooltip: { trigger: 'item' },
  legend: { type: 'scroll', bottom: 0 },
  series: [
    {
      type: 'pie',
      radius: ['40%', '62%'],
      center: ['50%', '45%'],
      data: mergePieItems(items),
      label: { show: false },
      emphasis: { label: { show: false } },
    },
  ],
});

interface ChartCardProps {
  title: string;
  items: DistributionItem[];
  option: EChartsOption;
}

const ChartCard: React.FC<ChartCardProps> = ({
  title,
  items,
  option,
}: ChartCardProps) => {
  return (
    <Card className="rounded-sm shadow-none">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {items.length === 0 ? (
          <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
            暂无数据
          </div>
        ) : (
          <ReactECharts option={option} theme="ud" className="h-[300px] w-full" />
        )}
      </CardContent>
    </Card>
  );
};

const DistributionCharts: React.FC<DistributionChartsProps> = ({
  distributions,
}: DistributionChartsProps) => {
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <ChartCard
        title="目标平台分布"
        items={distributions.byTargetPlatform}
        option={buildBarOption(distributions.byTargetPlatform)}
      />
      <ChartCard
        title="视频类型分布"
        items={distributions.byVideoType}
        option={buildSingleBarOption(distributions.byVideoType)}
      />
      <ChartCard
        title="处理状态分布"
        items={distributions.byProcessStatus}
        option={buildPieOption(distributions.byProcessStatus)}
      />
    </div>
  );
};

export default DistributionCharts;
