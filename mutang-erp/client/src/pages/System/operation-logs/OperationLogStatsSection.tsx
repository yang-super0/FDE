import type { OperationLogStats } from '@shared/api.interface';
import { SectionHeader } from '@client/src/components/blueprint';

export interface OperationLogStatsData {
  stats: OperationLogStats | null;
  highRiskCount: number;
  todayCount: number;
  archivedCount: number;
}

/* ============ 统计指标卡：零圆角 + 3px 主色顶边线 ============ */

const StatCard = ({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) => (
  <div
    data-ai-section-type="card-stat"
    className="rounded-none border border-border border-t-[3px] border-t-primary bg-card px-4 py-3 shadow-md"
  >
    <div className="text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground">
      {label}
    </div>
    <div
      className={`mt-1 font-mono text-2xl font-bold ${
        emphasis ? 'text-[#EF4444]' : 'text-foreground'
      }`}
    >
      {value}
    </div>
  </div>
);

/* ============ Top N 文本条形统计 ============ */

const TopBars = ({
  title,
  items,
  maxCount,
}: {
  title: string;
  items: { name: string; count: number }[];
  maxCount: number;
}) => (
  <div className="flex-1 space-y-2">
    <div className="text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground">
      {title}
    </div>
    {items.length === 0 ? (
      <p className="text-sm text-muted-foreground">暂无数据</p>
    ) : (
      items.map((item: { name: string; count: number }) => {
        const percent: number =
          maxCount > 0 ? Math.round((item.count / maxCount) * 100) : 0;
        return (
          <div key={item.name} className="flex items-center gap-2 text-xs">
            <span className="w-16 shrink-0 truncate text-right text-muted-foreground">
              {item.name}
            </span>
            <div className="h-3 flex-1 rounded-[2px] bg-accent">
              <div
                className="h-3 rounded-[2px] bg-[#0033A0]"
                style={{ width: `${Math.max(percent, 2)}%` }}
              />
            </div>
            <span className="w-10 shrink-0 font-mono font-bold">
              {item.count}
            </span>
          </div>
        );
      })
    )}
  </div>
);

export const OperationLogStatsSection = ({
  data,
}: {
  data: OperationLogStatsData;
}) => {
  const stats: OperationLogStats | null = data.stats;
  const byModule: { name: string; count: number }[] =
    stats?.byModule.slice(0, 5) ?? [];
  const byOperation: { name: string; count: number }[] =
    stats?.byOperation.slice(0, 5) ?? [];
  const moduleMax: number = Math.max(
    0,
    ...byModule.map((item: { count: number }) => item.count),
  );
  const operationMax: number = Math.max(
    0,
    ...byOperation.map((item: { count: number }) => item.count),
  );

  return (
    <div className="rounded-none border border-border border-t-[3px] border-t-primary bg-card p-6 shadow-md">
      <SectionHeader
        no="01"
        label="OPERATION OVERVIEW"
        subtitle="操作日志统计 · 风险与趋势概览"
      />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="TOTAL / 总操作数" value={String(stats?.totalCount ?? 0)} />
        <StatCard
          label="HIGH RISK / 高风险数"
          value={String(data.highRiskCount)}
          emphasis={data.highRiskCount > 0}
        />
        <StatCard label="TODAY / 今日操作" value={String(data.todayCount)} />
        <StatCard label="ARCHIVED / 归档数" value={String(data.archivedCount)} />
      </div>
      <div className="flex flex-col gap-8 lg:flex-row">
        <TopBars title="TOP MODULES / 模块 TOP 5" items={byModule} maxCount={moduleMax} />
        <TopBars
          title="TOP OPERATIONS / 操作类型 TOP 5"
          items={byOperation}
          maxCount={operationMax}
        />
      </div>
    </div>
  );
};
