import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import type { FinanceMonthlyTrendItem } from '@shared/api.interface';
import { CHART_BLUE_PALETTE } from '@client/src/components/blueprint';

interface FinanceTrendChartProps {
  items: FinanceMonthlyTrendItem[];
}

const FinanceTrendChart = ({ items }: FinanceTrendChartProps) => {
  const option: EChartsOption = {
    color: [CHART_BLUE_PALETTE[0], CHART_BLUE_PALETTE[1]],
    tooltip: { trigger: 'axis' },
    legend: { bottom: 0 },
    grid: { left: '3%', right: '4%', bottom: '20%', containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: true,
      data: items.map((item: FinanceMonthlyTrendItem) => item.month),
    },
    yAxis: { type: 'value' },
    series: [
      {
        name: '收入',
        type: 'bar',
        barMaxWidth: 28,
        itemStyle: { borderRadius: [2, 2, 0, 0] },
        data: items.map((item: FinanceMonthlyTrendItem) => item.income),
      },
      {
        name: '支出',
        type: 'bar',
        barMaxWidth: 28,
        itemStyle: { borderRadius: [2, 2, 0, 0] },
        data: items.map((item: FinanceMonthlyTrendItem) => item.expense),
      },
    ],
  };

  return <ReactECharts option={option} theme="ud" className="h-[320px] w-full" />;
};

export { FinanceTrendChart };
