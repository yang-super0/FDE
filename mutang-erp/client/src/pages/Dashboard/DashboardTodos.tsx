import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  ReportCard,
  StatusBadge,
} from '@client/src/components/blueprint';
import type { StatusTone } from '@client/src/components/blueprint';
import type { TaskPriority, TodoItem } from '@shared/api.interface';
import { useI18n } from '@client/src/i18n';

interface DashboardTodosProps {
  todos: TodoItem[];
}

const PRIORITY_META: Record<
  TaskPriority,
  { label: string; tone: StatusTone }
> = {
  high: { label: '高', tone: 'danger' },
  medium: { label: '中', tone: 'warning' },
  low: { label: '低', tone: 'info' },
};

const DashboardTodos = ({ todos }: DashboardTodosProps) => {
  const { t, tEnum } = useI18n();
  return (
    <ReportCard className="flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="text-[11px] font-black text-primary uppercase tracking-[0.15em]">
          {t('dashboard.todos.title')}
        </div>
        <Link
          to="/tasks"
          className="text-[11px] font-bold text-primary hover:underline"
        >
          {t('common.viewAll')} →
        </Link>
      </div>
      {todos.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          {t('dashboard.todos.empty')}
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {todos.map((todo: TodoItem) => {
            const meta = PRIORITY_META[todo.priority];
            return (
              <li
                key={todo.id}
                className="flex items-center gap-3 py-3 transition-colors hover:bg-accent"
              >
                <StatusBadge tone={meta.tone}>{tEnum(meta.label)}</StatusBadge>
                <span className="flex-1 text-sm font-medium text-foreground truncate">
                  {todo.title}
                </span>
                <span className="font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                  {todo.deadline
                    ? dayjs(todo.deadline).format('YYYY-MM-DD')
                    : t('dashboard.todos.noDeadline')}
                </span>
                <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                  {todo.assigneeName || t('dashboard.todos.unassigned')}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </ReportCard>
  );
};

export { DashboardTodos };
export type { DashboardTodosProps };
