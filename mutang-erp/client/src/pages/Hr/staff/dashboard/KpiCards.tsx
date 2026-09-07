import type { HrDashboardData } from '@shared/api.interface';
import { ReportCard } from '@client/src/components/blueprint';
import { cn } from '@client/src/lib/utils';

interface KpiDef {
  label: string;
  labelEn: string;
  value: number;
  primary?: boolean;
}

const buildKpis = (data: HrDashboardData): KpiDef[] => [
  { label: '总人数', labelEn: 'TOTAL', value: data.totalEmployees, primary: true },
  { label: '在职人数', labelEn: 'ACTIVE', value: data.activeCount },
  { label: '试用期', labelEn: 'PROBATION', value: data.probationCount },
  { label: '正式', labelEn: 'REGULAR', value: data.regularCount },
  { label: '离职中', labelEn: 'LEAVING', value: data.leavingCount },
  { label: '离职人数', labelEn: 'LEFT', value: data.leftCount },
];

export function KpiCards({ data }: { data: HrDashboardData }) {
  const kpis: KpiDef[] = buildKpis(data);
  return (
    <div
      className="grid grid-cols-2 gap-6 md:grid-cols-3 xl:grid-cols-6"
      data-ai-section-type="card-stat"
    >
      {kpis.map((kpi: KpiDef) => (
        <ReportCard key={kpi.label}>
          <div className="mb-3 text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">
            {kpi.label}
            <span className="ml-2 font-bold text-muted-foreground/70">{kpi.labelEn}</span>
          </div>
          <div
            className={cn(
              'font-mono text-3xl font-black tracking-tight',
              kpi.primary && 'text-primary',
            )}
          >
            {kpi.value}
          </div>
          <div className="mt-3 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
            单位：人
          </div>
        </ReportCard>
      ))}
    </div>
  );
}
