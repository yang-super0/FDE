import type { ReactNode } from 'react';
import type { DashboardSummary } from '@shared/api.interface';
import { ReportCard, StatusBadge } from '@client/src/components/blueprint';
import { useI18n } from '@client/src/i18n';

interface DashboardKpiBandProps {
  summary: DashboardSummary;
}

interface RatioBadgeProps {
  ratio: number;
}

const RatioBadge = ({ ratio }: RatioBadgeProps) => {
  const { t } = useI18n();
  if (ratio === 0) {
    return <StatusBadge tone="neutral">{t('dashboard.kpi.ratioFlat')}</StatusBadge>;
  }
  const pct: string = `${Math.abs(ratio * 100).toFixed(1)}%`;
  if (ratio > 0) {
    return <StatusBadge tone="success">▲ {pct}</StatusBadge>;
  }
  return <StatusBadge tone="danger">▼ {pct}</StatusBadge>;
};

interface KpiCardProps {
  label: string;
  value: ReactNode;
  footer?: ReactNode;
  highlight?: boolean;
}

const KpiCard = ({ label, value, footer, highlight }: KpiCardProps) => {
  return (
    <ReportCard className="p-5">
      <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground mb-3">
        {label}
      </div>
      <div
        className={`font-mono text-3xl font-extrabold tracking-tight ${
          highlight ? 'text-[#EF4444]' : 'text-foreground'
        }`}
      >
        {value}
      </div>
      {footer ? <div className="mt-3">{footer}</div> : null}
    </ReportCard>
  );
};

const DashboardKpiBand = ({ summary }: DashboardKpiBandProps) => {
  const { t, formatCurrency, formatNumber } = useI18n();
  return (
    <div
      className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-6"
      data-ai-section-type="card-stat"
    >
      <KpiCard
        label={t('dashboard.kpi.monthRevenue')}
        value={formatCurrency(summary.monthRevenue)}
        footer={<RatioBadge ratio={summary.monthRevenueRatio} />}
      />
      <KpiCard
        label={t('dashboard.kpi.customerTotal')}
        value={formatNumber(summary.customerTotal)}
        footer={<RatioBadge ratio={summary.customerRatio} />}
      />
      <KpiCard
        label={t('dashboard.kpi.runningCampaigns')}
        value={formatNumber(summary.runningCampaigns)}
        footer={
          <span className="text-[10px] font-bold text-muted-foreground">
            {t('dashboard.kpi.runningCampaignsHint')}
          </span>
        }
      />
      <KpiCard
        label={t('dashboard.kpi.pendingTasks')}
        value={formatNumber(summary.pendingTasks)}
        footer={
          <span className="text-[10px] font-bold text-muted-foreground">
            {t('dashboard.kpi.pendingTasksHint')}
          </span>
        }
      />
      <KpiCard
        label={t('dashboard.kpi.expiringContracts')}
        value={formatNumber(summary.expiringContracts)}
        highlight={summary.expiringContracts > 0}
        footer={
          <span className="text-[10px] font-bold text-muted-foreground">
            {t('dashboard.kpi.expiringContractsHint')}
          </span>
        }
      />
    </div>
  );
};

export { DashboardKpiBand };
export type { DashboardKpiBandProps };
