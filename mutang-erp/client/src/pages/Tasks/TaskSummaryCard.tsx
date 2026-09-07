import { ReportCard, SectionHeader, StatusBadge } from '@client/src/components/blueprint';

interface TaskSummaryCardProps {
  overdueCount: number;
}

const TaskSummaryCard = ({ overdueCount }: TaskSummaryCardProps) => {
  return (
    <ReportCard>
      <SectionHeader
        no="01"
        label="TASK OVERVIEW"
        subtitle="任务逾期情况实时汇总"
      />
      <div className="flex flex-wrap items-end gap-8">
        <div>
          <div className="mb-2 text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">
            OVERDUE TASKS · 逾期任务
          </div>
          <div className="flex items-center gap-4">
            <span className="font-mono text-4xl font-black">
              {overdueCount}
            </span>
            {overdueCount > 0 ? (
              <StatusBadge tone="danger" className="px-3 py-1 text-xs">
                需立即处理
              </StatusBadge>
            ) : (
              <StatusBadge tone="success" className="px-3 py-1 text-xs">
                状态良好
              </StatusBadge>
            )}
          </div>
        </div>
      </div>
    </ReportCard>
  );
};

export { TaskSummaryCard };
export type { TaskSummaryCardProps };
