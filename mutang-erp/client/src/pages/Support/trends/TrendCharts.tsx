import type { ReactElement } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import type {
  IndustryTrendComparisonItem,
  IndustryTrendPoint,
} from '@shared/api.interface';
import { ReportCard } from '@client/src/components/blueprint';

const TREND_BLUE_1 = '#0033A0';
const TREND_BLUE_2 = '#0047CC';
const TREND_BLUE_4 = '#4D94FF';

function chartBlock(
  title: string,
  option: EChartsOption,
  loading: boolean,
  empty: boolean,
): ReactElement {
  return (
    <ReportCard>
      <div className="text-[11px] font-black uppercase tracking-[0.15em] text-muted-foreground mb-4">
        {title}
      </div>
      {loading ? (
        <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
          加载中...
        </div>
      ) : empty ? (
        <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
          暂无数据
        </div>
      ) : (
        <ReactECharts option={option} theme="ud" className="h-[300px] w-full" />
      )}
    </ReportCard>
  );
}

interface TrendChartProps {
  points: IndustryTrendPoint[];
  loading: boolean;
}

export const TrendConsumptionChart = ({
  points,
  loading,
}: TrendChartProps) => {
  const option: EChartsOption = {
    color: [TREND_BLUE_1],
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '12%', containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: points.map((p: IndustryTrendPoint) => p.statDate),
    },
    yAxis: { type: 'value' },
    series: [
      {
        name: '总消耗',
        type: 'line',
        smooth: true,
        symbolSize: 6,
        itemStyle: { color: TREND_BLUE_1 },
        lineStyle: { color: TREND_BLUE_1, width: 2 },
        areaStyle: { color: TREND_BLUE_1, opacity: 0.12 },
        data: points.map((p: IndustryTrendPoint) => p.totalConsumption),
      },
    ],
  };
  return chartBlock(
    'CONSUMPTION TREND · 行业消耗趋势',
    option,
    loading,
    points.length === 0,
  );
};

export const TrendCostChangeChart = ({
  points,
  loading,
}: TrendChartProps) => {
  const option: EChartsOption = {
    color: [TREND_BLUE_1, TREND_BLUE_4],
    tooltip: { trigger: 'axis' },
    legend: { type: 'scroll', bottom: 0 },
    grid: { left: '3%', right: '4%', bottom: '20%', containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: points.map((p: IndustryTrendPoint) => p.statDate),
    },
    yAxis: { type: 'value' },
    series: [
      {
        name: '平均CPC',
        type: 'line',
        smooth: true,
        symbolSize: 6,
        itemStyle: { color: TREND_BLUE_1 },
        data: points.map((p: IndustryTrendPoint) => p.avgCpc),
      },
      {
        name: '平均CPM',
        type: 'line',
        smooth: true,
        symbolSize: 6,
        itemStyle: { color: TREND_BLUE_4 },
        data: points.map((p: IndustryTrendPoint) => p.avgCpm),
      },
    ],
  };
  return chartBlock(
    'COST CHANGE · CPC / CPM 变化对比',
    option,
    loading,
    points.length === 0,
  );
};

export const TrendConversionChart = ({
  points,
  loading,
}: TrendChartProps) => {
  const option: EChartsOption = {
    color: [TREND_BLUE_2],
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '12%', containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: points.map((p: IndustryTrendPoint) => p.statDate),
    },
    yAxis: { type: 'value' },
    series: [
      {
        name: '平均转化率',
        type: 'line',
        smooth: true,
        symbolSize: 6,
        itemStyle: { color: TREND_BLUE_2 },
        lineStyle: { color: TREND_BLUE_2, width: 2 },
        data: points.map((p: IndustryTrendPoint) => p.avgConversionRate),
      },
    ],
  };
  return chartBlock(
    'CONVERSION RATE · 转化率变化趋势',
    option,
    loading,
    points.length === 0,
  );
};

interface TrendComparisonChartProps {
  title: string;
  items: IndustryTrendComparisonItem[];
  loading: boolean;
  groupKey: 'industry' | 'platform';
  color: string;
}

export const TrendComparisonChart = ({
  title,
  items,
  loading,
  groupKey,
  color,
}: TrendComparisonChartProps) => {
  const option: EChartsOption = {
    color: [color],
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '12%', containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: true,
      data: items.map((item: IndustryTrendComparisonItem) => item[groupKey]),
    },
    yAxis: { type: 'value' },
    series: [
      {
        name: '总消耗',
        type: 'bar',
        barMaxWidth: 28,
        itemStyle: { color },
        data: items.map(
          (item: IndustryTrendComparisonItem) => item.totalConsumption,
        ),
      },
    ],
  };
  return chartBlock(title, option, loading, items.length === 0);
};

export const TrendIndustryComparisonChart = ({
  items,
  loading,
}: {
  items: IndustryTrendComparisonItem[];
  loading: boolean;
}) => (
  <TrendComparisonChart
    title="INDUSTRY SPEND · 行业总消耗对比"
    items={items}
    loading={loading}
    groupKey="industry"
    color={TREND_BLUE_1}
  />
);

export const TrendPlatformComparisonChart = ({
  items,
  loading,
}: {
  items: IndustryTrendComparisonItem[];
  loading: boolean;
}) => (
  <TrendComparisonChart
    title="PLATFORM SPEND · 平台总消耗对比"
    items={items}
    loading={loading}
    groupKey="platform"
    color={TREND_BLUE_2}
  />
);
