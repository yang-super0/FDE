import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import type { ReportRunResult, ReportRunRow } from '@shared/api.interface';
import { RC_CHART_PALETTE } from '../report-center-constants';

type ReportChartKind = 'line' | 'bar' | 'pie' | 'combo' | 'table';

interface ReportChartProps {
  result: ReportRunResult;
}

function detectChartKind(chartType: string): ReportChartKind {
  const text: string = chartType.toLowerCase();
  if (text.includes('pie') || chartType.includes('饼')) return 'pie';
  if (text.includes('combo') || chartType.includes('组合') || chartType.includes('混合')) {
    return 'combo';
  }
  if (text.includes('table') || chartType.includes('表格')) return 'table';
  if (text.includes('bar') || chartType.includes('柱')) return 'bar';
  return 'line';
}

function toCategory(row: ReportRunRow, dimension: string | undefined): string {
  if (!dimension) return row.key;
  return row.dims[dimension] || row.key;
}

function buildPieOption(result: ReportRunResult): EChartsOption {
  const firstDim: string | undefined = result.dimensions[0];
  const metric: string = result.metrics[0] ?? '';
  return {
    color: RC_CHART_PALETTE,
    tooltip: { trigger: 'item' },
    legend: { bottom: 0 },
    series: [
      {
        name: metric || '占比',
        type: 'pie',
        radius: '62%',
        center: ['50%', '46%'],
        data: result.rows.slice(0, 5).map((row: ReportRunRow) => ({
          name: toCategory(row, firstDim),
          value: row.values[metric] ?? 0,
        })),
        label: { show: false },
        emphasis: { label: { show: false } },
      },
    ],
  };
}

function buildAxisOption(
  result: ReportRunResult,
  kind: ReportChartKind,
): EChartsOption {
  const firstDim: string | undefined = result.dimensions[0];
  const categories: string[] = result.rows.map((row: ReportRunRow) =>
    toCategory(row, firstDim),
  );
  const series: EChartsOption['series'] = [];

  if (kind === 'combo') {
    const barMetric: string = result.metrics[0] ?? '';
    const lineMetric: string = result.metrics[1] ?? result.metrics[0] ?? '';
    series.push({
      name: barMetric || '指标1',
      type: 'bar',
      barMaxWidth: 28,
      data: result.rows.map((row: ReportRunRow) => row.values[barMetric] ?? 0),
    });
    series.push({
      name: lineMetric || '指标2',
      type: 'line',
      smooth: true,
      data: result.rows.map((row: ReportRunRow) => row.values[lineMetric] ?? 0),
    });
  } else {
    result.metrics.slice(0, 5).forEach((metric: string) => {
      series.push({
        name: metric,
        type: kind === 'bar' ? 'bar' : 'line',
        smooth: true,
        barMaxWidth: 28,
        data: result.rows.map((row: ReportRunRow) => row.values[metric] ?? 0),
      });
    });
  }

  return {
    color: RC_CHART_PALETTE,
    tooltip: { trigger: 'axis' },
    legend: { bottom: 0 },
    grid: { left: '3%', right: '4%', bottom: '14%', containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: kind !== 'line',
      data: categories,
    },
    yAxis: { type: 'value' },
    series,
  };
}

export const ReportChart: React.FC<ReportChartProps> = ({ result }) => {
  const kind: ReportChartKind = detectChartKind(result.chartType);
  if (kind === 'table') return null;
  if (result.rows.length === 0) {
    return (
      <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
        暂无数据
      </div>
    );
  }
  const option: EChartsOption =
    kind === 'pie' ? buildPieOption(result) : buildAxisOption(result, kind);
  return <ReactECharts option={option} theme="ud" className="h-[320px] w-full" />;
};
