import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import dayjs from 'dayjs';
import type { Opportunity, OpportunityStage } from '@shared/api.interface';
import { cn } from '@client/src/lib/utils';
import { Skeleton } from '@client/src/components/ui/skeleton';
import { STAGE_COLUMNS } from './constants';

interface OpportunityBoardProps {
  opportunities: Opportunity[];
  loading: boolean;
  onStageChange: (id: string, stage: OpportunityStage) => Promise<void>;
}

interface OpportunityCardProps {
  opportunity: Opportunity;
}

const OpportunityCard = ({ opportunity }: OpportunityCardProps) => (
  <div className="space-y-1 border border-border bg-card p-3 shadow-sm">
    <div className="truncate text-sm font-medium">{opportunity.name}</div>
    <div className="truncate text-xs text-muted-foreground">
      {opportunity.customerName || '未知客户'}
    </div>
    <div className="font-mono text-sm text-primary">
      ¥ {opportunity.amount.toLocaleString('zh-CN')}
    </div>
    {opportunity.expectedCloseAt ? (
      <div className="text-[10px] text-muted-foreground">
        预计成交：{dayjs(opportunity.expectedCloseAt).format('YYYY-MM-DD')}
      </div>
    ) : null}
  </div>
);

interface DraggableCardProps {
  opportunity: Opportunity;
  dimmed: boolean;
}

const DraggableCard = ({ opportunity, dimmed }: DraggableCardProps) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: opportunity.id,
  });
  const style: React.CSSProperties | undefined = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn('cursor-grab touch-none', dimmed && 'opacity-40')}
    >
      <OpportunityCard opportunity={opportunity} />
    </div>
  );
};

interface StageColumnProps {
  stage: OpportunityStage;
  label: string;
  items: Opportunity[];
  activeId: string | null;
}

const StageColumn = ({ stage, label, items, activeId }: StageColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'min-h-[240px] space-y-2 border bg-accent/60 p-3 transition-colors',
        isOver ? 'border-primary bg-accent' : 'border-transparent',
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-black uppercase tracking-[0.15em] text-foreground">
          {label}
        </span>
        <span className="font-mono text-[10px] text-muted-foreground">
          {items.length}
        </span>
      </div>
      {items.length === 0 ? (
        <div className="border border-dashed border-border py-6 text-center text-xs text-muted-foreground">
          暂无商机
        </div>
      ) : (
        items.map((item: Opportunity) => (
          <DraggableCard
            key={item.id}
            opportunity={item}
            dimmed={item.id === activeId}
          />
        ))
      )}
    </div>
  );
};

const OpportunityBoard = ({
  opportunities,
  loading,
  onStageChange,
}: OpportunityBoardProps) => {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );
  const [activeId, setActiveId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {STAGE_COLUMNS.map((column) => (
          <Skeleton key={column.value} className="h-60 rounded-none" />
        ))}
      </div>
    );
  }

  const activeOpportunity: Opportunity | undefined = opportunities.find(
    (item: Opportunity) => item.id === activeId,
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const overId: string | null = event.over ? String(event.over.id) : null;
    if (!overId) return;
    const target: Opportunity | undefined = opportunities.find(
      (item: Opportunity) => item.id === String(event.active.id),
    );
    if (!target || target.stage === overId) return;
    await onStageChange(target.id, overId as OpportunityStage);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={(event: DragEndEvent) => {
        void handleDragEnd(event);
      }}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {STAGE_COLUMNS.map((column) => (
          <StageColumn
            key={column.value}
            stage={column.value}
            label={column.label}
            activeId={activeId}
            items={opportunities.filter(
              (item: Opportunity) => item.stage === column.value,
            )}
          />
        ))}
      </div>
      <DragOverlay>
        {activeOpportunity ? (
          <OpportunityCard opportunity={activeOpportunity} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export { OpportunityBoard };
export type { OpportunityBoardProps };
