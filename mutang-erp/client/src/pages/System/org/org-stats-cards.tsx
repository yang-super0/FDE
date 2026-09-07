import type { OrgStats } from '@shared/api.interface';
import { ReportCard } from '@client/src/components/blueprint';

interface OrgStatsCardsProps {
  stats: OrgStats | null;
  flatCount: number;
  enabledCount: number;
}

interface OrgStatCardDef {
  label: string;
  value: number;
}

export const OrgStatsCards: React.FC<OrgStatsCardsProps> = ({
  stats,
  flatCount,
  enabledCount,
}) => {
  const statCards: OrgStatCardDef[] = [
    { label: '部门数', value: stats?.departmentCount ?? flatCount },
    { label: '岗位数', value: stats?.positionCount ?? 0 },
    { label: '员工数', value: stats?.employeeCount ?? 0 },
    { label: '启用部门数', value: enabledCount },
  ];
  return (
    <div
      data-ai-section-type="card-stat"
      className="grid grid-cols-2 gap-4 md:grid-cols-4"
    >
      {statCards.map((card: OrgStatCardDef) => (
        <ReportCard key={card.label} className="p-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
            {card.label}
          </div>
          <div className="mt-2 font-mono text-2xl font-black tabular-nums">
            {card.value}
          </div>
        </ReportCard>
      ))}
    </div>
  );
};
