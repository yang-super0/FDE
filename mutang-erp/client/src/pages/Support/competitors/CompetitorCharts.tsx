import { useCallback, useEffect, useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  CompetitorComparisonItem,
  CompetitorRankItem,
  CompetitorTrendPoint,
} from '@shared/api.interface';
import { ReportCard } from '@client/src/components/blueprint';
import { Button } from '@client/src/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import {
  SE_FILTER_ALL,
  SE_INDUSTRY_OPTIONS,
  formatSeNumber,
} from '../support-enhance-constants';
import {
  getCompetitorComparison,
  getCompetitorRanking,
  getCompetitorTrend,
} from '@client/src/api/support-enhance/competitors';

export const SE_BLUE_PALETTE: string[] = [
  '#0033A0',
  '#0047CC',
  '#1A66E0',
  '#4D94FF',
  '#8FC2FF',
];

const CHART_TITLE_STYLE = {
  fontSize: 11,
  fontWeight: 900,
  color: '#94A3B8',
} as const;

const ChartCard = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <ReportCard>
    <div className="text-[11px] font-black uppercase tracking-[0.15em] text-muted-foreground mb-4">
      {label}
    </div>
    {children}
  </ReportCard>
);

/* ============ 竞品对比柱状图（双系列双 Y 轴） ============ */

interface ComparisonChartProps {
  refreshKey: number;
}

const ComparisonChart = ({ refreshKey }: ComparisonChartProps) => {
  const [items, setItems] = useState<CompetitorComparisonItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const data = await getCompetitorComparison();
      setItems(data);
    } catch (error) {
      logger.error('加载竞品对比数据失败', error);
      toast.error('竞品对比数据加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const option: EChartsOption = useMemo(
    () => ({
      color: ['#0033A0', '#4D94FF'],
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { bottom: 0, data: ['预估消耗', '预估ROI'] },
      grid: { left: '3%', right: '4%', top: 40, containLabel: true },
      xAxis: {
        type: 'category',
        data: items.map((i: CompetitorComparisonItem) => i.competitorName),
        axisLabel: { interval: 0, rotate: items.length > 6 ? 30 : 0 },
      },
      yAxis: [
        { type: 'value', name: '消耗(元)' },
        { type: 'value', name: 'ROI' },
      ],
      series: [
        {
          name: '预估消耗',
          type: 'bar',
          itemStyle: { borderRadius: [2, 2, 0, 0] },
          data: items.map((i: CompetitorComparisonItem) => i.estimatedConsumption),
        },
        {
          name: '预估ROI',
          type: 'bar',
          yAxisIndex: 1,
          itemStyle: { borderRadius: [2, 2, 0, 0] },
          data: items.map((i: CompetitorComparisonItem) => i.estimatedRoi),
        },
      ],
    }),
    [items],
  );

  return (
    <ChartCard label="COMPETITOR COMPARISON · 竞品对比">
      {loading ? (
        <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
          加载中...
        </div>
      ) : items.length === 0 ? (
        <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
          暂无对比数据
        </div>
      ) : (
        <ReactECharts option={option} style={{ height: 320 }} notMerge />
      )}
    </ChartCard>
  );
};

/* ============ 竞品趋势图（消耗面积 + ROI 折线，双 Y 轴） ============ */

interface TrendChartProps {
  competitorNames: string[];
}

const TrendChart = ({ competitorNames }: TrendChartProps) => {
  const [name, setName] = useState<string>('');
  const [points, setPoints] = useState<CompetitorTrendPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (competitorNames.length > 0 && !competitorNames.includes(name)) {
      setName(competitorNames[0]);
    }
  }, [competitorNames, name]);

  const load = useCallback(async (target: string): Promise<void> => {
    if (!target) {
      setPoints([]);
      return;
    }
    setLoading(true);
    try {
      const data = await getCompetitorTrend(target);
      setPoints(data);
    } catch (error) {
      logger.error('加载竞品趋势失败', error);
      toast.error('竞品趋势数据加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(name);
  }, [name, load]);

  const option: EChartsOption = useMemo(
    () => ({
      color: ['#0033A0', '#4D94FF'],
      tooltip: { trigger: 'axis' },
      legend: { bottom: 0, data: ['预估消耗', '预估ROI'] },
      grid: { left: '3%', right: '4%', top: 40, containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: points.map((p: CompetitorTrendPoint) => p.monitorDate),
      },
      yAxis: [
        { type: 'value', name: '消耗(元)' },
        { type: 'value', name: 'ROI' },
      ],
      series: [
        {
          name: '预估消耗',
          type: 'line',
          areaStyle: { opacity: 0.15 },
          data: points.map((p: CompetitorTrendPoint) => p.estimatedConsumption),
        },
        {
          name: '预估ROI',
          type: 'line',
          yAxisIndex: 1,
          smooth: true,
          data: points.map((p: CompetitorTrendPoint) => p.estimatedRoi),
        },
      ],
    }),
    [points],
  );

  return (
    <ChartCard label="COMPETITOR TREND · 竞品投放趋势">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-xs text-muted-foreground">竞品：</span>
        <Select value={name} onValueChange={(v: string) => setName(v)}>
          <SelectTrigger className="w-48 rounded-none">
            <SelectValue placeholder="选择竞品" />
          </SelectTrigger>
          <SelectContent className="rounded-none">
            {competitorNames.length === 0 ? (
              <SelectItem value={SE_FILTER_ALL}>暂无竞品</SelectItem>
            ) : (
              competitorNames.map((n: string) => (
                <SelectItem key={n} value={n}>
                  {n}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>
      {loading ? (
        <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
          加载中...
        </div>
      ) : points.length === 0 ? (
        <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
          暂无趋势数据
        </div>
      ) : (
        <ReactECharts option={option} style={{ height: 320 }} notMerge />
      )}
    </ChartCard>
  );
};

/* ============ 行业竞品排行（横向条形 / 柱状切换） ============ */

type RankMetric = 'consumption' | 'roi';

const RankingChart = () => {
  const [industry, setIndustry] = useState<string>(SE_FILTER_ALL);
  const [metric, setMetric] = useState<RankMetric>('consumption');
  const [items, setItems] = useState<CompetitorRankItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const load = useCallback(
    async (targetIndustry: string): Promise<void> => {
      setLoading(true);
      try {
        const data = await getCompetitorRanking(
          targetIndustry === SE_FILTER_ALL ? undefined : targetIndustry,
          metric,
        );
        setItems(data);
      } catch (error) {
        logger.error('加载竞品排行失败', error);
        toast.error('竞品排行数据加载失败');
      } finally {
        setLoading(false);
      }
    },
    [metric],
  );

  useEffect(() => {
    void load(industry);
  }, [industry, load]);

  const option: EChartsOption = useMemo(() => {
    const sorted: CompetitorRankItem[] = [...items];
    if (metric === 'consumption') {
      sorted.sort(
        (a: CompetitorRankItem, b: CompetitorRankItem) =>
          a.estimatedConsumption - b.estimatedConsumption,
      );
      return {
        color: ['#0033A0'],
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        grid: { left: '3%', right: '6%', containLabel: true },
        title: {
          text: `按消耗排序 · TOP ${sorted.length}`,
          left: 0,
          top: 0,
          textStyle: CHART_TITLE_STYLE,
        },
        xAxis: { type: 'value', name: '消耗(元)' },
        yAxis: {
          type: 'category',
          data: sorted.map((i: CompetitorRankItem) => i.competitorName),
        },
        series: [
          {
            name: '预估消耗',
            type: 'bar',
            itemStyle: { borderRadius: [0, 2, 2, 0] },
            data: sorted.map((i: CompetitorRankItem) => i.estimatedConsumption),
          },
        ],
      };
    }
    sorted.sort(
      (a: CompetitorRankItem, b: CompetitorRankItem) => a.estimatedRoi - b.estimatedRoi,
    );
    return {
      color: ['#4D94FF'],
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: '3%', right: '6%', containLabel: true },
      title: {
        text: `按ROI排序 · TOP ${sorted.length}`,
        left: 0,
        top: 0,
        textStyle: CHART_TITLE_STYLE,
      },
      xAxis: { type: 'value', name: 'ROI' },
      yAxis: {
        type: 'category',
        data: sorted.map((i: CompetitorRankItem) => i.competitorName),
      },
      series: [
        {
          name: '预估ROI',
          type: 'bar',
          itemStyle: { borderRadius: [0, 2, 2, 0] },
          data: sorted.map((i: CompetitorRankItem) => i.estimatedRoi),
        },
      ],
    };
  }, [items, metric]);

  return (
    <ChartCard label="INDUSTRY RANKING · 行业竞品排行">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">行业：</span>
        <Select value={industry} onValueChange={(v: string) => setIndustry(v)}>
          <SelectTrigger className="w-36 rounded-none">
            <SelectValue placeholder="选择行业" />
          </SelectTrigger>
          <SelectContent className="rounded-none">
            <SelectItem value={SE_FILTER_ALL}>全部行业</SelectItem>
            {SE_INDUSTRY_OPTIONS.map((opt: string) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="ml-2 text-xs text-muted-foreground">指标：</span>
        <Button
          data-ai-section-type="button"
          size="sm"
          variant={metric === 'consumption' ? 'default' : 'outline'}
          className="rounded-none"
          onClick={() => setMetric('consumption')}
        >
          按消耗
        </Button>
        <Button
          data-ai-section-type="button"
          size="sm"
          variant={metric === 'roi' ? 'default' : 'outline'}
          className="rounded-none"
          onClick={() => setMetric('roi')}
        >
          按ROI
        </Button>
      </div>
      {loading ? (
        <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
          加载中...
        </div>
      ) : items.length === 0 ? (
        <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
          暂无排行数据
        </div>
      ) : (
        <ReactECharts option={option} style={{ height: 320 }} notMerge />
      )}
      <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
        {items
          .slice(0, 5)
          .map((i: CompetitorRankItem) => (
            <span key={i.competitorName}>
              {i.competitorName}：ROI {formatSeNumber(i.estimatedRoi)}
            </span>
          ))}
      </div>
    </ChartCard>
  );
};

export { ComparisonChart, TrendChart, RankingChart };
