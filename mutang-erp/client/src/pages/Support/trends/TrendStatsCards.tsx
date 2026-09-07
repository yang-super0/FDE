import type { IndustryTrendStats } from '@shared/api.interface';
import { ReportCard } from '@client/src/components/blueprint';
import { formatSeAmount, formatSeNumber } from '../support-enhance-constants';

interface TrendStatsCardsProps {
  stats: IndustryTrendStats | null;
  loading: boolean;
}

const ALERT_RED_CLASS = 'bg-[#FEF2F2] text-[#EF4444]';
const ALERT_ORANGE_CLASS = 'bg-[#FFF7ED] text-[#F97316]';

function alertClass(alertType: string): string {
  return alertType.includes('高') ? ALERT_RED_CLASS : ALERT_ORANGE_CLASS;
}

const TrendStatsCards = ({ stats, loading }: TrendStatsCardsProps) => {
  if (loading) {
    return (
      <ReportCard>
        <div className="py-8 text-center text-sm text-muted-foreground">
          统计加载中...
        </div>
      </ReportCard>
    );
  }
  if (!stats) {
    return (
      <ReportCard>
        <div className="py-8 text-center text-sm text-muted-foreground">
          暂无统计数据
        </div>
      </ReportCard>
    );
  }
  return (
    <div className="space-y-6">
      <div
        data-ai-section-type="card-stat"
        className="grid grid-cols-2 gap-6 md:grid-cols-3 xl:grid-cols-6"
      >
        <ReportCard>
          <div className="text-[11px] font-black uppercase tracking-[0.15em] text-muted-foreground mb-3">
            RECORDS · 记录数
          </div>
          <div className="text-2xl font-black font-mono text-[#0033A0]">
            {formatSeNumber(stats.totalRecords, 0)}
          </div>
        </ReportCard>
        <ReportCard>
          <div className="text-[11px] font-black uppercase tracking-[0.15em] text-muted-foreground mb-3">
            INDUSTRIES · 行业数
          </div>
          <div className="text-2xl font-black font-mono text-[#0033A0]">
            {formatSeNumber(stats.industryCount, 0)}
          </div>
        </ReportCard>
        <ReportCard>
          <div className="text-[11px] font-black uppercase tracking-[0.15em] text-muted-foreground mb-3">
            TOTAL SPEND · 总消耗
          </div>
          <div className="text-2xl font-black font-mono text-[#0033A0]">
            {formatSeAmount(stats.totalConsumption)}
          </div>
        </ReportCard>
        <ReportCard>
          <div className="text-[11px] font-black uppercase tracking-[0.15em] text-muted-foreground mb-3">
            AVG CPC · 平均CPC
          </div>
          <div className="text-2xl font-black font-mono text-[#0047CC]">
            {formatSeAmount(stats.avgCpc)}
          </div>
        </ReportCard>
        <ReportCard>
          <div className="text-[11px] font-black uppercase tracking-[0.15em] text-muted-foreground mb-3">
            AVG CPM · 平均CPM
          </div>
          <div className="text-2xl font-black font-mono text-[#0047CC]">
            {formatSeAmount(stats.avgCpm)}
          </div>
        </ReportCard>
        <ReportCard>
          <div className="text-[11px] font-black uppercase tracking-[0.15em] text-muted-foreground mb-3">
            CONV RATE · 平均转化率
          </div>
          <div className="text-2xl font-black font-mono text-[#4D94FF]">
            {formatSeNumber(stats.avgConversionRate)}%
          </div>
        </ReportCard>
      </div>
      <ReportCard>
        <div className="text-[11px] font-black uppercase tracking-[0.15em] text-muted-foreground mb-4">
          ALERTS · 行业预警
        </div>
        {stats.alerts.length === 0 ? (
          <div className="py-4 text-center text-sm text-muted-foreground">
            暂无预警
          </div>
        ) : (
          <ul className="space-y-2">
            {stats.alerts.map(
              (alert: IndustryTrendStats['alerts'][number], idx: number) => (
                <li
                  key={`${idx}-${alert.industry}-${alert.alertType}`}
                  className="flex flex-wrap items-center gap-3 border-b border-border pb-2 text-sm last:border-b-0 last:pb-0"
                >
                  <span
                    className={`inline-flex items-center rounded-[2px] px-2 py-0.5 text-[10px] font-bold ${alertClass(alert.alertType)}`}
                  >
                    {alert.alertType}
                  </span>
                  <span className="font-bold text-primary">{alert.industry}</span>
                  <span className="text-foreground">{alert.message}</span>
                  <span className="ml-auto font-mono text-xs text-muted-foreground">
                    {alert.statDate}
                  </span>
                </li>
              ),
            )}
          </ul>
        )}
      </ReportCard>
    </div>
  );
};

export { TrendStatsCards };
