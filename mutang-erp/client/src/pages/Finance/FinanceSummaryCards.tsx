import type { ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import type { FinanceSummary } from '@shared/api.interface';
import { ReportCard } from '@client/src/components/blueprint';
import { Badge } from '@client/src/components/ui/badge';
import { Skeleton } from '@client/src/components/ui/skeleton';
import { cn } from '@client/src/lib/utils';

interface FinanceSummaryCardsProps {
  summary: FinanceSummary | null;
  loading: boolean;
}

interface RatioBadgeProps {
  ratio: number;
  positiveIsGood: boolean;
}

export const formatAmount = (value: number): string =>
  value.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const RatioBadge = ({ ratio, positiveIsGood }: RatioBadgeProps) => {
  if (ratio === 0) {
    return (
      <Badge
        variant="outline"
        className="rounded-none gap-1 font-mono text-[10px] font-medium"
      >
        <Minus className="h-3 w-3" />
        环比持平
      </Badge>
    );
  }
  const isUp: boolean = ratio > 0;
  const isGood: boolean = positiveIsGood ? isUp : !isUp;
  const percentText: string = `${Math.abs(ratio * 100).toFixed(1)}%`;
  return (
    <Badge
      className={cn(
        'rounded-none gap-1 border-transparent font-mono text-[10px] font-medium',
        isGood
          ? 'bg-[hsl(160_63%_96%)] text-[hsl(160_84%_39%)]'
          : 'bg-[hsl(0_93%_94%)] text-[hsl(0_84%_60%)]',
      )}
    >
      {isUp ? (
        <ArrowUpRight className="h-3 w-3" />
      ) : (
        <ArrowDownRight className="h-3 w-3" />
      )}
      环比 {isUp ? '+' : '-'}
      {percentText}
    </Badge>
  );
};

interface StatCardProps {
  label: string;
  labelEn: string;
  value: number;
  valueClassName?: string;
  badge?: ReactNode;
}

const StatCard = ({ label, labelEn, value, valueClassName, badge }: StatCardProps) => (
  <ReportCard>
    <div className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground mb-3">
      {label}
      <span className="ml-2 font-bold text-muted-foreground/70">{labelEn}</span>
    </div>
    <div className={cn('font-mono text-3xl font-bold tracking-tight', valueClassName)}>
      ¥ {formatAmount(value)}
    </div>
    {badge ? <div className="mt-4">{badge}</div> : null}
  </ReportCard>
);

const FinanceSummaryCards = ({ summary, loading }: FinanceSummaryCardsProps) => {
  if (loading || !summary) {
    return (
      <div className="grid gap-6 md:grid-cols-3" data-ai-section-type="card-stat">
        {[0, 1, 2].map((item: number) => (
          <ReportCard key={item}>
            <Skeleton className="rounded-none h-3 w-24 mb-4" />
            <Skeleton className="rounded-none h-8 w-40 mb-4" />
            <Skeleton className="rounded-none h-5 w-24" />
          </ReportCard>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-3" data-ai-section-type="card-stat">
      <StatCard
        label="本月总收入"
        labelEn="TOTAL INCOME"
        value={summary.income}
        valueClassName="text-primary"
        badge={<RatioBadge ratio={summary.incomeRatio} positiveIsGood />}
      />
      <StatCard
        label="本月总支出"
        labelEn="TOTAL EXPENSE"
        value={summary.expense}
        badge={<RatioBadge ratio={summary.expenseRatio} positiveIsGood={false} />}
      />
      <StatCard
        label="净利润"
        labelEn="NET PROFIT"
        value={summary.profit}
        valueClassName={
          summary.profit < 0 ? 'text-[hsl(0_84%_60%)]' : 'text-foreground'
        }
        badge={
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
            收入 − 支出
          </span>
        }
      />
    </div>
  );
};

export { FinanceSummaryCards };
