import { useCallback, useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { UserDisplay } from '@client/src/components/business-ui/user-display';
import { ReportCard, SectionHeader } from '@client/src/components/blueprint';
import { Button } from '@client/src/components/ui/button';
import { Skeleton } from '@client/src/components/ui/skeleton';
import type { PoolAnalytics } from '@shared/api.interface';
import { fetchPoolAnalytics } from '@client/src/api/customer-pool';
import { PoolTabs } from './PoolTabs';
import { StatCard, toErrorText } from './constants';

const BLUE_DARK: string = '#0033A0';
const BLUE_MID: string = '#5B8DEF';
const BLUE_BAR: string = '#2B5FC7';
const BLUE_LIGHT: string = '#C3D8FA';

/* 后端可能返回 0-1 比例或百分数，统一转为百分数展示 */
function toPercent(rate: number): number {
  return rate > 1 ? Math.round(rate * 10) / 10 : Math.round(rate * 1000) / 10;
}

export default function PoolAnalyticsPage() {
  const [data, setData] = useState<PoolAnalytics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [failed, setFailed] = useState<boolean>(false);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const result: PoolAnalytics = await fetchPoolAnalytics();
      setData(result);
    } catch (error: unknown) {
      logger.error(`加载转化分析失败: ${toErrorText(error)}`);
      toast.error('加载转化分析失败');
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const trendOption: EChartsOption = {
    tooltip: { trigger: 'axis' },
    legend: { bottom: 0 },
    grid: { left: '3%', right: '4%', bottom: '20%', containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: data?.monthlyTrend.map((item) => item.month) ?? [],
    },
    yAxis: { type: 'value', axisLabel: { formatter: (value: number) => `${value}%` } },
    series: [
      {
        name: '领取率',
        type: 'line',
        smooth: true,
        itemStyle: { color: BLUE_DARK },
        data: data?.monthlyTrend.map((item) => toPercent(item.claimRate)) ?? [],
      },
      {
        name: '转化率',
        type: 'line',
        smooth: true,
        itemStyle: { color: BLUE_MID },
        data: data?.monthlyTrend.map((item) => toPercent(item.convertRate)) ?? [],
      },
    ],
  };

  const cycleOption: EChartsOption = {
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '8%', containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: true,
      data: data?.cycleDistribution.map((item) => item.range) ?? [],
    },
    yAxis: { type: 'value' },
    series: [
      {
        name: '转化数量',
        type: 'bar',
        barMaxWidth: 40,
        itemStyle: { color: BLUE_BAR, borderRadius: [2, 2, 0, 0] },
        emphasis: { itemStyle: { color: BLUE_LIGHT } },
        data: data?.cycleDistribution.map((item) => item.count) ?? [],
      },
    ],
  };

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-8 px-8 py-8">
      <PoolTabs />

      <section>
        <SectionHeader
          no="01"
          label="ANALYTICS OVERVIEW"
          subtitle="公海转化核心指标"
        />
        {loading ? (
          <div className="grid grid-cols-2 gap-8 md:grid-cols-3 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_: unknown, index: number) => (
              <Skeleton key={index} className="h-28 rounded-none" />
            ))}
          </div>
        ) : failed || !data ? (
          <ReportCard>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-muted-foreground">
                转化分析数据加载失败
              </span>
              <Button size="sm" variant="outline" onClick={() => void load()}>
                重试
              </Button>
            </div>
          </ReportCard>
        ) : (
          <div
            className="grid grid-cols-2 gap-8 md:grid-cols-3 xl:grid-cols-6"
            data-ai-section-type="card-stat"
          >
            <StatCard label="公海总数" value={String(data.summary.total)} />
            <StatCard label="已领取" value={String(data.summary.claimed)} />
            <StatCard label="已转化" value={String(data.summary.converted)} />
            <StatCard
              label="领取率"
              value={String(toPercent(data.summary.claimRate))}
              suffix="%"
              highlight
            />
            <StatCard
              label="转化率"
              value={String(toPercent(data.summary.convertRate))}
              suffix="%"
              highlight
            />
            <StatCard
              label="平均转化周期"
              value={String(Math.round(data.summary.avgCycleDays * 10) / 10)}
              suffix="天"
            />
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 gap-8 xl:grid-cols-2">
        <ReportCard>
          <SectionHeader
            no="02"
            label="MONTHLY TREND"
            subtitle="领取率与转化率月度趋势"
          />
          {loading ? (
            <Skeleton className="h-[300px] w-full rounded-none" />
          ) : data && data.monthlyTrend.length > 0 ? (
            <ReactECharts
              option={trendOption}
              theme="ud"
              className="h-[300px] w-full"
            />
          ) : (
            <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
              暂无趋势数据
            </div>
          )}
        </ReportCard>
        <ReportCard>
          <SectionHeader
            no="03"
            label="CYCLE DISTRIBUTION"
            subtitle="转化周期分布"
          />
          {loading ? (
            <Skeleton className="h-[300px] w-full rounded-none" />
          ) : data && data.cycleDistribution.length > 0 ? (
            <ReactECharts
              option={cycleOption}
              theme="ud"
              className="h-[300px] w-full"
            />
          ) : (
            <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
              暂无分布数据
            </div>
          )}
        </ReportCard>
      </section>

      <section>
        <SectionHeader
          no="04"
          label="PERSON COMPARISON"
          subtitle="个人转化对比"
        />
        <ReportCard>
          {loading ? (
            <Skeleton className="h-40 w-full rounded-none" />
          ) : data && data.personComparison.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">
                  <th className="py-3">人员</th>
                  <th className="py-3 text-right">领取数</th>
                  <th className="py-3 text-right">转化数</th>
                  <th className="py-3 text-right">转化率</th>
                </tr>
              </thead>
              <tbody>
                {data.personComparison.map((item) => (
                  <tr
                    key={item.assignee}
                    className="border-b border-border transition-colors hover:bg-accent"
                  >
                    <td className="py-3">
                      {item.assignee ? (
                        <UserDisplay value={[item.assignee]} size="small" />
                      ) : (
                        <span className="text-muted-foreground">未分配</span>
                      )}
                    </td>
                    <td className="py-3 text-right font-mono">
                      {item.claimed}
                    </td>
                    <td className="py-3 text-right font-mono">
                      {item.converted}
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-primary">
                      {toPercent(item.convertRate)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              暂无人员对比数据
            </div>
          )}
        </ReportCard>
      </section>
    </div>
  );
}
