import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import type { IndustryRoiComparisonItem } from '@shared/api.interface';
import { ReportCard } from '@client/src/components/blueprint';

const ROI_BLUE_PRIMARY = '#0033A0';
const ROI_BLUE_SECOND = '#0047CC';

interface RoiComparisonChartProps {
  title: string;
  items: IndustryRoiComparisonItem[];
  loading: boolean;
  groupKey: 'industry' | 'platform';
  color: string;
}

function aggregateAvgRoi(
  items: IndustryRoiComparisonItem[],
  key: 'industry' | 'platform',
): { name: string; value: number }[] {
  const buckets = new Map<string, { sum: number; weight: number }>();
  for (const item of items) {
    const name: string = item[key];
    const weight: number = item.benchmarkCount > 0 ? item.benchmarkCount : 1;
    const prev = buckets.get(name) ?? { sum: 0, weight: 0 };
    buckets.set(name, {
      sum: prev.sum + item.avgRoiBenchmark * weight,
      weight: prev.weight + weight,
    });
  }
  return Array.from(buckets.entries()).map(
    ([name, bucket]: [string, { sum: number; weight: number }]) => ({
      name,
      value: bucket.weight > 0 ? Number((bucket.sum / bucket.weight).toFixed(2)) : 0,
    }),
  );
}

const RoiComparisonChart = ({
  title,
  items,
  loading,
  groupKey,
  color,
}: RoiComparisonChartProps) => {
  const aggregated = aggregateAvgRoi(items, groupKey);
  const option: EChartsOption = {
    color: [color],
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '12%', containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: true,
      data: aggregated.map((d) => d.name),
    },
    yAxis: { type: 'value' },
    series: [
      {
        name: '平均ROI基准',
        type: 'bar',
        barMaxWidth: 28,
        itemStyle: { color },
        data: aggregated.map((d) => d.value),
      },
    ],
  };

  return (
    <ReportCard>
      <div className="text-[11px] font-black uppercase tracking-[0.15em] text-muted-foreground mb-4">
        {title}
      </div>
      {loading ? (
        <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
          加载中...
        </div>
      ) : aggregated.length === 0 ? (
        <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
          暂无数据
        </div>
      ) : (
        <ReactECharts option={option} theme="ud" className="h-[300px] w-full" />
      )}
    </ReportCard>
  );
};

export const RoiIndustryComparisonChart = ({
  items,
  loading,
}: {
  items: IndustryRoiComparisonItem[];
  loading: boolean;
}) => (
  <RoiComparisonChart
    title="INDUSTRY ROI · 行业平均ROI基准对比"
    items={items}
    loading={loading}
    groupKey="industry"
    color={ROI_BLUE_PRIMARY}
  />
);

export const RoiPlatformComparisonChart = ({
  items,
  loading,
}: {
  items: IndustryRoiComparisonItem[];
  loading: boolean;
}) => (
  <RoiComparisonChart
    title="PLATFORM ROI · 平台平均ROI基准对比"
    items={items}
    loading={loading}
    groupKey="platform"
    color={ROI_BLUE_SECOND}
  />
);
