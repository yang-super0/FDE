import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import {
  Table,
  type TableColumnsType,
} from '@lark-apaas/client-toolkit/antd-table';
import type {
  Task,
  TaskDisplayStatus,
  TaskPriority,
  TaskStatus,
  TaskSummary,
} from '@shared/api.interface';
import {
  ReportCard,
  SectionHeader,
  StatusBadge,
  type StatusTone,
} from '@client/src/components/blueprint';
import { TaskSummaryCard } from './TaskSummaryCard';
import { Button } from '@client/src/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import { UserDisplay } from '@client/src/components/business-ui/user-display';
import { UserSelect } from '@client/src/components/business-ui/user-select';
import {
  getTaskSummary,
  listTasks,
  updateTaskStatus,
  type TaskListParams,
} from '@client/src/api/tasks';
import { TaskCreateDialog } from './TaskCreateDialog';

type StatusFilter = TaskDisplayStatus | 'all';

const STATUS_META: Record<TaskDisplayStatus, { label: string; tone: StatusTone }> = {
  todo: { label: '待处理', tone: 'neutral' },
  doing: { label: '进行中', tone: 'info' },
  done: { label: '已完成', tone: 'success' },
  overdue: { label: '已逾期', tone: 'danger' },
};

const PRIORITY_META: Record<TaskPriority, { label: string; className: string }> = {
  high: { label: '高', className: 'bg-[#0033A0] text-white' },
  medium: { label: '中', className: 'bg-[#0066FF] text-white' },
  low: { label: '低', className: 'bg-[#CCE0FF] text-[#0033A0]' },
};

const STATUS_TRANSITIONS: TaskStatus[] = ['todo', 'doing', 'done'];

const STATUS_FILTER_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: '全部状态' },
  { value: 'todo', label: '待处理' },
  { value: 'doing', label: '进行中' },
  { value: 'done', label: '已完成' },
  { value: 'overdue', label: '已逾期' },
];

const isStatusFilter = (value: string): value is StatusFilter =>
  ['all', 'todo', 'doing', 'done', 'overdue'].includes(value);

const BasicTasksPanel = () => {
  const [summary, setSummary] = useState<TaskSummary | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState<boolean>(false);

  const fetchSummary = useCallback(async () => {
    try {
      const result: TaskSummary = await getTaskSummary();
      setSummary(result);
    } catch (error) {
      logger.error('获取任务汇总失败', String(error));
      toast.error('获取任务汇总失败');
    }
  }, []);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params: TaskListParams = { page, pageSize };
      if (assigneeFilter) params.assigneeId = assigneeFilter;
      if (statusFilter !== 'all') params.status = statusFilter;
      const result = await listTasks(params);
      setTasks(result.items);
      setTotal(result.total);
    } catch (error) {
      logger.error('获取任务列表失败', String(error));
      toast.error('获取任务列表失败');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, assigneeFilter]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  useEffect(() => {
    void fetchSummary();
  }, [fetchSummary]);

  const refreshAll = useCallback(() => {
    void fetchList();
    void fetchSummary();
  }, [fetchList, fetchSummary]);

  const handleStatusChange = useCallback(
    async (record: Task, status: TaskStatus) => {
      try {
        await updateTaskStatus(record.id, status);
        toast.success('任务状态已更新');
        refreshAll();
      } catch (error) {
        logger.error('更新任务状态失败', String(error));
        toast.error('状态更新失败，请重试');
      }
    },
    [refreshAll],
  );

  const handleAssigneeFilterChange = useCallback((value: string | null) => {
    setAssigneeFilter(value);
    setPage(1);
  }, []);

  const handleStatusFilterChange = useCallback((value: string) => {
    if (isStatusFilter(value)) {
      setStatusFilter(value);
      setPage(1);
    }
  }, []);

  const columns: TableColumnsType<Task> = useMemo(
    () => [
      {
        title: '任务标题',
        dataIndex: 'title',
        fixed: 'left',
        width: 240,
        render: (title: string) => (
          <span className="font-bold text-primary">{title}</span>
        ),
      },
      {
        title: '负责人',
        dataIndex: 'assigneeId',
        width: 150,
        render: (assigneeId: string) =>
          assigneeId ? (
            <UserDisplay value={[assigneeId]} size="small" />
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        title: '优先级',
        dataIndex: 'priority',
        width: 90,
        render: (priority: TaskPriority) => (
          <span
            className={`inline-flex items-center rounded-[2px] px-2 py-0.5 text-[10px] font-bold ${PRIORITY_META[priority].className}`}
          >
            {PRIORITY_META[priority].label}
          </span>
        ),
      },
      {
        title: '状态',
        dataIndex: 'status',
        width: 100,
        render: (status: TaskDisplayStatus) => (
          <StatusBadge tone={STATUS_META[status].tone}>
            {STATUS_META[status].label}
          </StatusBadge>
        ),
      },
      {
        title: '截止日期',
        dataIndex: 'deadline',
        width: 140,
        render: (deadline: string, record: Task) => {
          if (!deadline) {
            return <span className="text-muted-foreground">—</span>;
          }
          return (
            <span
              className={
                record.status === 'overdue'
                  ? 'font-mono font-bold text-[#EF4444]'
                  : 'font-mono'
              }
            >
              {dayjs(deadline).format('YYYY-MM-DD')}
            </span>
          );
        },
      },
      {
        title: '状态变更',
        key: 'statusChange',
        fixed: 'right',
        width: 150,
        render: (_: unknown, record: Task) => (
          <Select
            value={
              record.status === 'todo' ||
              record.status === 'doing' ||
              record.status === 'done'
                ? record.status
                : ''
            }
            onValueChange={(value: string) => {
              const target: TaskStatus | undefined = STATUS_TRANSITIONS.find(
                (item: TaskStatus) => item === value,
              );
              if (target) void handleStatusChange(record, target);
            }}
          >
            <SelectTrigger className="h-8 w-[120px] rounded-none">
              <SelectValue placeholder="变更状态" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_TRANSITIONS.filter(
                (item: TaskStatus) => item !== record.status,
              ).map((item: TaskStatus) => (
                <SelectItem key={item} value={item}>
                  {STATUS_META[item].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ),
      },
    ],
    [handleStatusChange],
  );

  const overdueCount: number = summary?.overdueCount ?? 0;

  return (
    <div className="space-y-8">
      <TaskSummaryCard overdueCount={overdueCount} />

      <ReportCard>
        <SectionHeader
          no="02"
          label="TASK LIST"
          subtitle="任务协作与状态跟踪 · 按创建时间倒序"
        />
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="w-[220px]">
              <UserSelect
                value={assigneeFilter}
                onChange={handleAssigneeFilterChange}
                placeholder="按负责人筛选"
              />
            </div>
            <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
              <SelectTrigger className="w-[160px] rounded-none">
                <SelectValue placeholder="全部状态" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTER_OPTIONS.map(
                  (option: { value: StatusFilter; label: string }) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>
          <Button
            className="rounded-none"
            data-ai-section-type="button"
            onClick={() => setCreateOpen(true)}
          >
            新建任务
          </Button>
        </div>
        <Table
          columns={columns}
          dataSource={tasks}
          loading={loading}
          rowKey="id"
          scroll={{ x: 900, y: 500 }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: false,
            onChange: (nextPage: number, nextPageSize: number) => {
              setPage(nextPage);
              setPageSize(nextPageSize);
            },
          }}
        />
      </ReportCard>

      <TaskCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={refreshAll}
      />
    </div>
  );
};

export default BasicTasksPanel;
