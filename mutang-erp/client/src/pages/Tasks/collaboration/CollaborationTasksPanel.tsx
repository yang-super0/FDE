import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type Key,
} from 'react';
import { Download, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Table } from '@lark-apaas/client-toolkit/antd-table';
import { ReportCard, SectionHeader } from '@client/src/components/blueprint';
import { ColumnSettingsButton } from '@client/src/components/column-settings-button';
import { useColumnSettings } from '@client/src/hooks/useColumnSettings';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import { UserSelect } from '@client/src/components/business-ui/user-select';
import type {
  CollaborationTask,
  CollaborationTaskListParams,
  CollaborationTaskStats,
} from '@shared/api.interface';
import {
  deleteCollaborationTask,
  getCollaborationTaskStats,
  listCollaborationTasks,
} from '@client/src/api/task-enhance/collaboration-tasks';
import { AdsConfirmDialog } from '@client/src/pages/AdsBusiness/AdsConfirmDialog';
import { exportRowsToExcel } from '@client/src/pages/AdsBusiness/ads-excel';
import {
  TASK_COLLAB_TYPES,
  TASK_ENHANCE_FILTER_ALL,
  TASK_PRIORITY_OPTIONS,
  TaskEnhanceStatusBadge,
  formatTaskEnhanceDateTime,
  toTaskEnhanceErrorText,
} from '../task-enhance-shared';
import {
  COLLAB_STATUS_OPTIONS,
  buildCollabColumns,
} from './collaboration-columns';
import { CollabTaskFormDialog } from './CollabTaskFormDialog';
import { CollabTaskDetailDialog } from './CollabTaskDetailDialog';
import { ProgressUpdateDialog } from './ProgressUpdateDialog';
import { CollabBatchUpdateDialog } from './CollabBatchUpdateDialog';

const PAGE_SIZE: number = 20;

export default function CollaborationTasksPanel() {
  const [taskType, setTaskType] = useState<string>(TASK_ENHANCE_FILTER_ALL);
  const [status, setStatus] = useState<string>(TASK_ENHANCE_FILTER_ALL);
  const [priority, setPriority] = useState<string>(TASK_ENHANCE_FILTER_ALL);
  const [assignee, setAssignee] = useState<string | null>(null);
  const [department, setDepartment] = useState<string>('');
  const [draftKeyword, setDraftKeyword] = useState<string>('');
  const [keyword, setKeyword] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<string>('desc');
  const [page, setPage] = useState<number>(1);

  const [items, setItems] = useState<CollaborationTask[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedKeys, setSelectedKeys] = useState<Key[]>([]);
  const [stats, setStats] = useState<CollaborationTaskStats | null>(null);

  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<CollaborationTask | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [progressItem, setProgressItem] = useState<CollaborationTask | null>(null);
  const [deletingItem, setDeletingItem] = useState<CollaborationTask | null>(null);
  const [batchOpen, setBatchOpen] = useState<boolean>(false);

  useEffect(() => {
    const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
      setKeyword(draftKeyword.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [draftKeyword]);

  const filterParams = useMemo(
    () => ({
      taskType: taskType === TASK_ENHANCE_FILTER_ALL ? undefined : taskType,
      status: status === TASK_ENHANCE_FILTER_ALL ? undefined : status,
      priority: priority === TASK_ENHANCE_FILTER_ALL ? undefined : priority,
      assignee: assignee ?? undefined,
      department: department.trim() || undefined,
      keyword: keyword || undefined,
      sortBy,
      sortOrder,
    }),
    [taskType, status, priority, assignee, department, keyword, sortBy, sortOrder],
  );

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const params: CollaborationTaskListParams = {
        ...filterParams,
        page: String(page),
        pageSize: String(PAGE_SIZE),
      };
      const result = await listCollaborationTasks(params);
      setItems(result.items);
      setTotal(result.total);
    } catch (error: unknown) {
      logger.error(`加载协作任务失败: ${toTaskEnhanceErrorText(error)}`);
      toast.error(`加载协作任务失败：${toTaskEnhanceErrorText(error)}`);
    } finally {
      setLoading(false);
    }
  }, [filterParams, page]);

  const loadStats = useCallback(async () => {
    try {
      const result = await getCollaborationTaskStats();
      setStats(result);
    } catch (error: unknown) {
      logger.error(`加载协作任务统计失败: ${toTaskEnhanceErrorText(error)}`);
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const refresh = useCallback((): void => {
    setSelectedKeys([]);
    void loadList();
    void loadStats();
  }, [loadList, loadStats]);

  const handleDelete = async (): Promise<void> => {
    if (!deletingItem) return;
    try {
      await deleteCollaborationTask(deletingItem.id);
      toast.success('已删除该协作任务');
      setDeletingItem(null);
      refresh();
    } catch (error: unknown) {
      logger.error(`删除协作任务失败: ${toTaskEnhanceErrorText(error)}`);
      toast.error(`删除失败：${toTaskEnhanceErrorText(error)}`);
    }
  };

  const handleExport = async (): Promise<void> => {
    try {
      const params: CollaborationTaskListParams = {
        ...filterParams,
        page: '1',
        pageSize: '1000',
      };
      const result = await listCollaborationTasks(params);
      const rows: Record<string, string>[] = result.items.map(
        (item: CollaborationTask) => ({
          编号: item.taskNo,
          标题: item.title,
          类型: item.taskType,
          优先级: item.priority,
          状态: item.status,
          负责人: item.assignee ?? '',
          参与人数: String(item.participants?.length ?? 0),
          部门: item.department ?? '',
          进度: `${item.progress}%`,
          开始日期: item.startDate ?? '',
          截止日期: item.dueDate ?? '',
          创建时间: formatTaskEnhanceDateTime(item.createdAt),
          备注: item.remark ?? '',
        }),
      );
      const count: number = await exportRowsToExcel(
        rows,
        ['编号', '标题', '类型', '优先级', '状态', '负责人', '参与人数', '部门', '进度', '开始日期', '截止日期', '创建时间', '备注'],
        '协作任务',
        '协作任务',
      );
      toast.success(`已导出 ${count} 条协作任务`);
    } catch (error: unknown) {
      logger.error(`导出协作任务失败: ${toTaskEnhanceErrorText(error)}`);
      toast.error(`导出失败：${toTaskEnhanceErrorText(error)}`);
    }
  };

  const columns = useMemo(
    () =>
      buildCollabColumns({
        onDetail: (item: CollaborationTask) => setDetailId(item.id),
        onEdit: (item: CollaborationTask) => {
          setEditingItem(item);
          setFormOpen(true);
        },
        onProgress: (item: CollaborationTask) => setProgressItem(item),
        onDelete: (item: CollaborationTask) => setDeletingItem(item),
      }),
    [],
  );

  const {
    visibleColumns,
    columnMetas,
    hiddenIds,
    toggleColumn,
    resetColumns,
    setAllColumns,
  } = useColumnSettings(columns);

  const highPriorityCount: number =
    stats?.byPriority.find((item) => item.name === '高')?.count ?? 0;

  const hasSelection: boolean = selectedKeys.length > 0;
  const selectedIds: number[] = selectedKeys.map((key: Key) => Number(key));

  const renderFilterSelect = (
    label: string,
    allText: string,
    value: string,
    options: string[],
    onChange: (next: string) => void,
    width: string,
  ): React.ReactNode => (
    <Select
      value={value}
      onValueChange={(next: string) => {
        onChange(next);
        setPage(1);
      }}
    >
      <SelectTrigger className={`${width} rounded-none`}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={TASK_ENHANCE_FILTER_ALL}>{allText}</SelectItem>
        {options.map((option: string) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <div className="space-y-6">
      {/* 统计区 */}
      <div
        data-ai-section-type="card-stat"
        className="flex flex-wrap items-center gap-3"
      >
        <ReportCard className="p-3">
          <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
            任务总数
          </div>
          <div className="mt-1 font-mono text-2xl font-black">
            {stats?.total ?? 0}
          </div>
        </ReportCard>
        {(stats?.byStatus ?? []).map((item) => (
          <div
            key={item.name}
            className="flex items-center gap-1.5 rounded-none border border-border bg-card px-3 py-2 shadow-md"
          >
            <TaskEnhanceStatusBadge status={item.name} />
            <span className="font-mono text-sm font-bold">{item.count}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 rounded-none border border-border bg-card px-3 py-2 shadow-md">
          <span className="text-[10px] font-bold text-muted-foreground">
            高优先级
          </span>
          <span className="font-mono text-sm font-black text-destructive">
            {highPriorityCount}
          </span>
        </div>
      </div>

      <ReportCard>
        <SectionHeader
          no="02"
          label="COLLABORATION TASKS"
          subtitle="协作任务 / 多人协作、进度跟踪与评论互动"
        />
        {/* 筛选区 */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          {renderFilterSelect('任务类型', '全部类型', taskType, TASK_COLLAB_TYPES, setTaskType, 'w-32')}
          {renderFilterSelect('状态', '全部状态', status, COLLAB_STATUS_OPTIONS, setStatus, 'w-32')}
          {renderFilterSelect('优先级', '全部优先级', priority, TASK_PRIORITY_OPTIONS, setPriority, 'w-32')}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">负责人</span>
            <UserSelect
              value={assignee}
              onChange={(next: string | null) => {
                setAssignee(next);
                setPage(1);
              }}
              placeholder="全部负责人"
            />
          </div>
          <Input
            className="w-32 rounded-none"
            placeholder="部门"
            value={department}
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              setDepartment(event.target.value);
              setPage(1);
            }}
          />
          <Input
            className="w-44 rounded-none"
            placeholder="关键词（标题/编号）"
            value={draftKeyword}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setDraftKeyword(event.target.value)
            }
          />
          <Select value={sortBy} onValueChange={(next: string) => setSortBy(next)}>
            <SelectTrigger className="w-32 rounded-none">
              <SelectValue placeholder="排序字段" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt">按创建时间</SelectItem>
              <SelectItem value="dueDate">按截止日期</SelectItem>
              <SelectItem value="progress">按进度</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortOrder} onValueChange={(next: string) => setSortOrder(next)}>
            <SelectTrigger className="w-28 rounded-none">
              <SelectValue placeholder="排序方向" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">降序</SelectItem>
              <SelectItem value="asc">升序</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {/* 操作区 */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              data-ai-section-type="button"
              onClick={() => {
                setEditingItem(null);
                setFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              新建任务
            </Button>
            <Button
              variant="outline"
              disabled={!hasSelection}
              onClick={() => setBatchOpen(true)}
            >
              批量设置
            </Button>
            <Button variant="outline" onClick={() => void handleExport()}>
              <Download className="h-4 w-4" />
              导出Excel
            </Button>
            <ColumnSettingsButton
              columnMetas={columnMetas}
              hiddenIds={hiddenIds}
              onToggle={toggleColumn}
              onReset={resetColumns}
              onSetAll={setAllColumns}
            />
          </div>
          {hasSelection ? (
            <span className="text-xs text-muted-foreground">
              已选 {selectedKeys.length} 条
            </span>
          ) : null}
        </div>
        {/* 表格 */}
        <Table<CollaborationTask>
          columns={visibleColumns}
          dataSource={items}
          loading={loading}
          rowKey="id"
          scroll={{ x: 1500, y: 500 }}
          rowSelection={{
            selectedRowKeys: selectedKeys,
            onChange: (keys: Key[]) => setSelectedKeys(keys),
          }}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total,
            onChange: (nextPage: number) => setPage(nextPage),
          }}
        />
      </ReportCard>

      <CollabTaskFormDialog
        open={formOpen}
        editing={editingItem}
        onOpenChange={setFormOpen}
        onSaved={refresh}
      />
      <CollabTaskDetailDialog
        open={detailId !== null}
        taskId={detailId}
        onOpenChange={(open: boolean) => {
          if (!open) setDetailId(null);
        }}
      />
      <ProgressUpdateDialog
        open={progressItem !== null}
        task={progressItem}
        onOpenChange={(open: boolean) => {
          if (!open) setProgressItem(null);
        }}
        onSaved={refresh}
      />
      <CollabBatchUpdateDialog
        open={batchOpen}
        ids={selectedIds}
        onOpenChange={setBatchOpen}
        onSaved={refresh}
      />
      <AdsConfirmDialog
        open={deletingItem !== null}
        title="确认删除？"
        description={`即将删除协作任务「${deletingItem?.title ?? ''}」。任务处于「进行中」状态时无法删除。`}
        confirmText="确认删除"
        destructive
        onOpenChange={(open: boolean) => {
          if (!open) setDeletingItem(null);
        }}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}
