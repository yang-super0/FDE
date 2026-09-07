import { useCallback, useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  PerformanceGranularity,
  PerformanceTrendItem,
} from '@shared/api.interface';
import { Button } from '@client/src/components/ui/button';
import { CHART_BLUE_PALETTE } from '@client/src/components/blueprint';
import { getPerformanceTrend } from '@client/src/api/advertising';

interface AdvertisingTrendChartProps {
  campaignId: string;
}

const GRANULARITY_OPTIONS: {
  value: PerformanceGranularity;
  label: string;
}[] = [
  { value: 'day', label: '日' },
  { value: 'week', label: '周' },
  { value: 'month', label: '月' },
];

const AdvertisingTrendChart = ({
  campaignId,
}: AdvertisingTrendChartProps) => {
  const [granularity, setGranularity] =
    useState<PerformanceGranularity>('day');
  const [items, setItems] = useState<PerformanceTrendItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchTrend = useCallback(
    async (nextGranularity: PerformanceGranularity): Promise<void> => {
      setLoading(true);
      try {
        const result = await getPerformanceTrend(campaignId, nextGranularity);
        setItems(result.items ?? []);
      } catch (error) {
        logger.error('加载投放趋势失败', error);
        toast.error('趋势数据加载失败');
      } finally {
        setLoading(false);
      }
    },
    [campaignId],
  );

  useEffect(() => {
    fetchTrend(granularity);
  }, [fetchTrend, granularity]);

  const option: EChartsOption = {
    color: [...CHART_BLUE_PALETTE],
    tooltip: { trigger: 'axis' },
    legend: { type: 'scroll', bottom: 0 },
    grid: {
      left: '3%',
      right: '4%',
      top: '10%',
      bottom: '20%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: items.map((item: PerformanceTrendItem) => item.period),
    },
    yAxis: { type: 'value' },
    series: [
      {
        name: '曝光',
        type: 'line',
        data: items.map((item: PerformanceTrendItem) => item.impressions),
      },
      {
        name: '点击',
        type: 'line',
        data: items.map((item: PerformanceTrendItem) => item.clicks),
      },
      {
        name: '转化',
        type: 'line',
        data: items.map((item: PerformanceTrendItem) => item.conversions),
      },
      {
        name: '消耗（元）',
        type: 'line',
        data: items.map((item: PerformanceTrendItem) => item.cost),
      },
    ],
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-bold">投放趋势</div>
        <div className="flex gap-1">
          {GRANULARITY_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              size="sm"
              variant={granularity === opt.value ? 'default' : 'outline'}
              onClick={() => setGranularity(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>
      {loading ? (
        <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
          加载中...
        </div>
      ) : items.length === 0 ? (
        <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
          暂无投放数据
        </div>
      ) : (
        <ReactECharts option={option} theme="ud" className="h-[300px]" />
      )}
    </div>
  );
};

export default AdvertisingTrendChart;
