import { useCallback, useEffect, useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  CreativeMaterial,
  MaterialPerformancePoint,
  MaterialRankItem,
  MaterialRecommendItem,
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
import { cn } from '@client/src/lib/utils';
import {
  SE_FILTER_ALL,
  formatSeNumber,
} from '../support-enhance-constants';
import {
  compareMaterials,
  getMaterialPerformanceSeries,
  getMaterialRanking,
  getMaterialRecommendations,
} from '@client/src/api/support-enhance/materials';

export interface MaterialOption {
  id: number;
  name: string;
}

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

/* ============ 素材排行（横向条形，蓝色渐变） ============ */

type RankSortBy = 'consumption' | 'roi' | 'conversionRate' | 'usageCount';

const RANK_SORT_OPTIONS: { value: RankSortBy; label: string; field: keyof MaterialRankItem }[] = [
  { value: 'consumption', label: '按消耗', field: 'totalConsumption' },
  { value: 'roi', label: '按ROI', field: 'avgRoi' },
  { value: 'conversionRate', label: '按转化率', field: 'avgConversionRate' },
  { value: 'usageCount', label: '按使用次数', field: 'usageCount' },
];

const RankingChart = ({ refreshKey }: { refreshKey: number }) => {
  const [sortBy, setSortBy] = useState<RankSortBy>('consumption');
  const [items, setItems] = useState<MaterialRankItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const load = useCallback(async (targetSort: RankSortBy): Promise<void> => {
    setLoading(true);
    try {
      const data = await getMaterialRanking(targetSort, 10);
      setItems(data);
    } catch (error) {
      logger.error('加载素材排行失败', error);
      toast.error('素材排行加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(sortBy);
  }, [sortBy, load, refreshKey]);

  const field = RANK_SORT_OPTIONS.find(
    (o: { value: RankSortBy; label: string; field: keyof MaterialRankItem }) =>
      o.value === sortBy,
  )?.field ?? 'totalConsumption';

  const option: EChartsOption = useMemo(() => {
    const sorted: MaterialRankItem[] = [...items].sort(
      (a: MaterialRankItem, b: MaterialRankItem) =>
        Number(a[field] ?? 0) - Number(b[field] ?? 0),
    );
    return {
      color: [
        {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 1,
          y2: 0,
          colorStops: [
            { offset: 0, color: '#0033A0' },
            { offset: 1, color: '#8FC2FF' },
          ],
        },
      ],
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: '3%', right: '6%', containLabel: true },
      xAxis: { type: 'value' },
      yAxis: {
        type: 'category',
        data: sorted.map((i: MaterialRankItem) => i.materialName),
      },
      series: [
        {
          name: RANK_SORT_OPTIONS.find(
            (o: { value: RankSortBy }) => o.value === sortBy,
          )?.label ?? '',
          type: 'bar',
          itemStyle: { borderRadius: [0, 2, 2, 0] },
          data: sorted.map((i: MaterialRankItem) => Number(i[field] ?? 0)),
        },
      ],
    };
  }, [items, field, sortBy]);

  return (
    <ChartCard label="MATERIAL RANKING · 素材排行 TOP 10">
      <div className="mb-4 flex flex-wrap gap-2">
        {RANK_SORT_OPTIONS.map((opt: { value: RankSortBy; label: string }) => (
          <Button
            key={opt.value}
            data-ai-section-type="button"
            size="sm"
            variant={sortBy === opt.value ? 'default' : 'outline'}
            className="rounded-none"
            onClick={() => setSortBy(opt.value)}
          >
            {opt.label}
          </Button>
        ))}
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
    </ChartCard>
  );
};

/* ============ 优质素材推荐列表 ============ */

const RecommendList = ({ refreshKey }: { refreshKey: number }) => {
  const [items, setItems] = useState<MaterialRecommendItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const load = async (): Promise<void> => {
      setLoading(true);
      try {
        const data = await getMaterialRecommendations(5);
        setItems(data);
      } catch (error) {
        logger.error('加载素材推荐失败', error);
        toast.error('素材推荐加载失败');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [refreshKey]);

  return (
    <ChartCard label="RECOMMENDED · 优质素材推荐">
      {loading ? (
        <p className="text-sm text-muted-foreground">加载中...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">暂无推荐素材</p>
      ) : (
        <div className="space-y-2">
          {items.map((item: MaterialRecommendItem, idx: number) => (
            <div
              key={item.materialNo}
              className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-border pb-2"
            >
              <span className="font-mono text-xs text-muted-foreground">
                TOP {idx + 1}
              </span>
              <span className="font-bold text-primary">{item.materialName}</span>
              <span className="text-xs text-muted-foreground">{item.materialType}</span>
              <span className="text-sm">{'★'.repeat(Math.max(0, Math.min(5, item.rating)))}</span>
              <span className="font-mono text-sm">
                ROI {formatSeNumber(item.avgRoi)}
              </span>
              <span className="ml-auto rounded-[2px] bg-[#EFF6FF] px-2 py-0.5 text-[10px] font-bold text-[#0033A0]">
                推荐分 {formatSeNumber(item.recommendScore)}
              </span>
            </div>
          ))}
        </div>
      )}
    </ChartCard>
  );
};

/* ============ 素材效果分析图（多线折线，双 Y 轴） ============ */

const PerformanceChart = ({ options }: { options: MaterialOption[] }) => {
  const [materialId, setMaterialId] = useState<string>('');
  const [points, setPoints] = useState<MaterialPerformancePoint[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (options.length > 0 && !options.some((o: MaterialOption) => String(o.id) === materialId)) {
      setMaterialId(String(options[0].id));
    }
  }, [options, materialId]);

  const load = useCallback(async (idText: string): Promise<void> => {
    if (!idText) {
      setPoints([]);
      return;
    }
    setLoading(true);
    try {
      const data = await getMaterialPerformanceSeries(Number(idText));
      setPoints(data);
    } catch (error) {
      logger.error('加载素材效果分析失败', error);
      toast.error('素材效果分析加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(materialId);
  }, [materialId, load]);

  const option: EChartsOption = useMemo(
    () => ({
      color: ['#0033A0', '#0047CC', '#1A66E0', '#4D94FF'],
      tooltip: { trigger: 'axis' },
      legend: { bottom: 0, data: ['消耗', 'ROI', 'CTR', '转化率'] },
      grid: { left: '3%', right: '4%', top: 40, containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: points.map((p: MaterialPerformancePoint) => p.statDate),
      },
      yAxis: [
        { type: 'value', name: '消耗(元)' },
        { type: 'value', name: '比率' },
      ],
      series: [
        {
          name: '消耗',
          type: 'line',
          areaStyle: { opacity: 0.1 },
          data: points.map((p: MaterialPerformancePoint) => p.consumption),
        },
        {
          name: 'ROI',
          type: 'line',
          yAxisIndex: 1,
          data: points.map((p: MaterialPerformancePoint) => p.roi),
        },
        {
          name: 'CTR',
          type: 'line',
          yAxisIndex: 1,
          data: points.map((p: MaterialPerformancePoint) => p.ctr),
        },
        {
          name: '转化率',
          type: 'line',
          yAxisIndex: 1,
          data: points.map((p: MaterialPerformancePoint) => p.conversionRate),
        },
      ],
    }),
    [points],
  );

  return (
    <ChartCard label="PERFORMANCE ANALYSIS · 素材效果分析">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-xs text-muted-foreground">素材：</span>
        <Select value={materialId} onValueChange={(v: string) => setMaterialId(v)}>
          <SelectTrigger className="w-56 rounded-none">
            <SelectValue placeholder="选择素材" />
          </SelectTrigger>
          <SelectContent className="rounded-none">
            {options.length === 0 ? (
              <SelectItem value={SE_FILTER_ALL}>暂无素材</SelectItem>
            ) : (
              options.map((opt: MaterialOption) => (
                <SelectItem key={opt.id} value={String(opt.id)}>
                  {opt.name}
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
          暂无效果数据
        </div>
      ) : (
        <ReactECharts option={option} style={{ height: 320 }} notMerge />
      )}
    </ChartCard>
  );
};

/* ============ 素材对比（多选 ≤4，分组柱状图） ============ */

const CompareChart = ({ options }: { options: MaterialOption[] }) => {
  const [selected, setSelected] = useState<number[]>([]);
  const [materials, setMaterials] = useState<CreativeMaterial[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const toggle = (id: number): void => {
    setSelected((prev: number[]) => {
      if (prev.includes(id)) return prev.filter((x: number) => x !== id);
      if (prev.length >= 4) {
        toast.error('最多选择 4 个素材进行对比');
        return prev;
      }
      return [...prev, id];
    });
  };

  useEffect(() => {
    if (selected.length === 0) {
      setMaterials([]);
      return;
    }
    const load = async (): Promise<void> => {
      setLoading(true);
      try {
        const data = await compareMaterials(selected);
        setMaterials(data);
      } catch (error) {
        logger.error('加载素材对比失败', error);
        toast.error('素材对比加载失败');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [selected]);

  const option: EChartsOption = useMemo(
    () => ({
      color: ['#0033A0', '#1A66E0', '#4D94FF'],
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { bottom: 0, data: ['平均ROI', '平均CTR', '平均转化率'] },
      grid: { left: '3%', right: '4%', top: 40, containLabel: true },
      xAxis: {
        type: 'category',
        axisLabel: { interval: 0 },
        data: materials.map((m: CreativeMaterial) => m.materialName),
      },
      yAxis: { type: 'value' },
      series: [
        {
          name: '平均ROI',
          type: 'bar',
          itemStyle: { borderRadius: [2, 2, 0, 0] },
          data: materials.map((m: CreativeMaterial) => m.avgRoi),
        },
        {
          name: '平均CTR',
          type: 'bar',
          itemStyle: { borderRadius: [2, 2, 0, 0] },
          data: materials.map((m: CreativeMaterial) => m.avgCtr),
        },
        {
          name: '平均转化率',
          type: 'bar',
          itemStyle: { borderRadius: [2, 2, 0, 0] },
          data: materials.map((m: CreativeMaterial) => m.avgConversionRate),
        },
      ],
    }),
    [materials],
  );

  return (
    <ChartCard label="MATERIAL COMPARE · 素材对比">
      <div className="mb-4 flex flex-wrap gap-2">
        {options.slice(0, 12).map((opt: MaterialOption) => (
          <Button
            key={opt.id}
            data-ai-section-type="button"
            size="sm"
            variant={selected.includes(opt.id) ? 'default' : 'outline'}
            className={cn('rounded-none max-w-56 truncate')}
            onClick={() => toggle(opt.id)}
          >
            {opt.name}
          </Button>
        ))}
        {options.length === 0 ? (
          <span className="text-sm text-muted-foreground">暂无可选素材</span>
        ) : null}
      </div>
      {loading ? (
        <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
          加载中...
        </div>
      ) : materials.length === 0 ? (
        <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
          请选择 2-4 个素材进行对比
        </div>
      ) : (
        <ReactECharts option={option} style={{ height: 320 }} notMerge />
      )}
    </ChartCard>
  );
};

export { RankingChart, RecommendList, PerformanceChart, CompareChart };
