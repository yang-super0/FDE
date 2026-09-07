import dayjs from 'dayjs';
import { CheckCircle2, EyeOff, RotateCcw, Trash2 } from 'lucide-react';
import type { TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import { Button } from '@client/src/components/ui/button';
import { UserDisplay } from '@client/src/components/business-ui/user-display';
import type { MyTodo } from '@shared/api.interface';
import {
  TaskEnhancePriorityBadge,
  TaskEnhanceStatusBadge,
  formatTaskEnhanceDateTime,
} from '../task-enhance-shared';

export const TODO_STATUS_OPTIONS: string[] = [
  '待处理',
  '处理中',
  '已完成',
  '已忽略',
];

const CLOSED_TODO_STATUSES: string[] = ['已完成', '已忽略'];

export function isTodoOverdue(item: MyTodo): boolean {
  if (!item.dueDate) return false;
  if (CLOSED_TODO_STATUSES.includes(item.status)) return false;
  return dayjs(item.dueDate).isBefore(dayjs(), 'day');
}

interface TodoColumnHandlers {
  onGoHandle: (item: MyTodo) => void;
  onComplete: (item: MyTodo) => void;
  onIgnore: (item: MyTodo) => void;
  onReopen: (item: MyTodo) => void;
  onDelete: (item: MyTodo) => void;
}

export function buildTodoColumns(
  handlers: TodoColumnHandlers,
): TableColumnsType<MyTodo> {
  return [
    {
      title: '编号',
      dataIndex: 'todoNo',
      fixed: 'left',
      width: 130,
      render: (value: string) => (
        <span className="font-mono text-xs font-bold text-primary">{value}</span>
      ),
    },
    {
      title: '标题',
      dataIndex: 'title',
      fixed: 'left',
      width: 200,
      render: (value: string) => (
        <span className="font-bold">{value}</span>
      ),
    },
    { title: '类型', dataIndex: 'todoType', width: 80 },
    { title: '来源模块', dataIndex: 'sourceModule', width: 90 },
    {
      title: '来源单据号',
      dataIndex: 'sourceNo',
      width: 130,
      render: (value: string | null) => (
        <span className="font-mono text-xs">{value ?? '—'}</span>
      ),
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      width: 80,
      render: (value: string) => <TaskEnhancePriorityBadge priority={value} />,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (value: string) => <TaskEnhanceStatusBadge status={value} />,
    },
    {
      title: '处理人',
      dataIndex: 'assignee',
      width: 130,
      render: (value: string | null) =>
        value ? (
          <UserDisplay value={[value]} size="small" />
        ) : (
          <span className="text-xs text-muted-foreground">未分配</span>
        ),
    },
    {
      title: '截止日期',
      dataIndex: 'dueDate',
      width: 110,
      render: (value: string | null, record: MyTodo) => (
        <span
          className={`font-mono text-xs ${
            isTodoOverdue(record) ? 'font-bold text-destructive' : ''
          }`}
        >
          {value ?? '—'}
        </span>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 150,
      render: (value: string) => (
        <span className="font-mono text-xs">
          {formatTaskEnhanceDateTime(value)}
        </span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 280,
      render: (_: unknown, record: MyTodo) => {
        const canComplete: boolean =
          record.status === '待处理' || record.status === '处理中';
        const canIgnore: boolean =
          record.status === '待处理' || record.status === '处理中';
        const canReopen: boolean = CLOSED_TODO_STATUSES.includes(record.status);
        return (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handlers.onGoHandle(record)}
            >
              去处理
            </Button>
            {canComplete ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handlers.onComplete(record)}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                标记完成
              </Button>
            ) : null}
            {canIgnore ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handlers.onIgnore(record)}
              >
                <EyeOff className="h-3.5 w-3.5" />
                忽略
              </Button>
            ) : null}
            {canReopen ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handlers.onReopen(record)}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                重新打开
              </Button>
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={() => handlers.onDelete(record)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              删除
            </Button>
          </div>
        );
      },
    },
  ];
}
