import dayjs from 'dayjs';
import { Pencil, Trash2 } from 'lucide-react';
import type { TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import { Button } from '@client/src/components/ui/button';
import { Progress } from '@client/src/components/ui/progress';
import { UserDisplay } from '@client/src/components/business-ui/user-display';
import type { CollaborationTask } from '@shared/api.interface';
import {
  TaskEnhancePriorityBadge,
  TaskEnhanceStatusBadge,
  formatTaskEnhanceDateTime,
} from '../task-enhance-shared';

export const COLLAB_STATUS_OPTIONS: string[] = [
  '待开始',
  '进行中',
  '已完成',
  '已暂停',
  '已取消',
];

export function isCollabOverdue(item: CollaborationTask): boolean {
  if (!item.dueDate) return false;
  if (item.status === '已完成' || item.status === '已取消') return false;
  return dayjs(item.dueDate).isBefore(dayjs(), 'day');
}

interface CollabColumnHandlers {
  onDetail: (item: CollaborationTask) => void;
  onEdit: (item: CollaborationTask) => void;
  onProgress: (item: CollaborationTask) => void;
  onDelete: (item: CollaborationTask) => void;
}

export function buildCollabColumns(
  handlers: CollabColumnHandlers,
): TableColumnsType<CollaborationTask> {
  return [
    {
      title: '编号',
      dataIndex: 'taskNo',
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
    { title: '类型', dataIndex: 'taskType', width: 90 },
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
      title: '负责人',
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
      title: '参与人数',
      dataIndex: 'participants',
      width: 80,
      render: (value: string[] | null) => (
        <span className="font-mono text-xs">{value?.length ?? 0}</span>
      ),
    },
    {
      title: '进度',
      dataIndex: 'progress',
      width: 140,
      render: (value: number, record: CollaborationTask) => (
        <div className="flex items-center gap-2">
          <Progress value={value} className="h-1.5 w-[70px]" />
          <span
            className={`font-mono text-xs font-bold ${
              record.status === '已完成' ? 'text-primary' : ''
            }`}
          >
            {value}%
          </span>
        </div>
      ),
    },
    {
      title: '截止日期',
      dataIndex: 'dueDate',
      width: 110,
      render: (value: string | null, record: CollaborationTask) => (
        <span
          className={`font-mono text-xs ${
            isCollabOverdue(record) ? 'font-bold text-destructive' : ''
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
      width: 230,
      render: (_: unknown, record: CollaborationTask) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handlers.onDetail(record)}
          >
            详情
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handlers.onEdit(record)}
          >
            <Pencil className="h-3.5 w-3.5" />
            编辑
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handlers.onProgress(record)}
          >
            进度更新
          </Button>
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
      ),
    },
  ];
}
