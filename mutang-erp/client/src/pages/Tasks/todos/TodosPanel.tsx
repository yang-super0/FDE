import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Key,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Table } from '@lark-apaas/client-toolkit/antd-table';
import { ReportCard, SectionHeader } from '@client/src/components/blueprint';
import { ColumnSettingsButton } from '@client/src/components/column-settings-button';
import { useColumnSettings } from '@client/src/hooks/useColumnSettings';
import { Button } from '@client/src/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import type { MyTodo, MyTodoListParams, MyTodoSummary } from '@shared/api.interface';
import {
  batchActionMyTodos,
  completeMyTodo,
  deleteMyTodo,
  getMyTodoSummary,
  ignoreMyTodo,
  listMyTodos,
  reopenMyTodo,
} from '@client/src/api/task-enhance/my-todos';
import { AdsConfirmDialog } from '@client/src/pages/AdsBusiness/AdsConfirmDialog';
import { exportRowsToExcel } from '@client/src/pages/AdsBusiness/ads-excel';
import {
  TASK_ENHANCE_FILTER_ALL,
  TASK_PRIORITY_OPTIONS,
  TASK_TODO_SOURCE_MODULES,
  TASK_TODO_TYPES,
  formatTaskEnhanceDateTime,
  resolveTaskEnhanceSourceRoute,
  toTaskEnhanceErrorText,
} from '../task-enhance-shared';
import { TODO_STATUS_OPTIONS, buildTodoColumns } from './todo-columns';
import { TodoFormDialog } from './TodoFormDialog';

const PAGE_SIZE: number = 20;

interface TodoStatCardDef {
  label: string;
  value: number;
  danger?: boolean;
}

export default function TodosPanel() {
  const navigate = useNavigate();

  const [todoType, setTodoType] = useState<string>(TASK_ENHANCE_FILTER_ALL);
  const [sourceModule, setSourceModule] = useState<string>(TASK_ENHANCE_FILTER_ALL);
  const [priority, setPriority] = useState<string>(TASK_ENHANCE_FILTER_ALL);
  const [status, setStatus] = useState<string>(TASK_ENHANCE_FILTER_ALL);
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<string>('desc');
  const [page, setPage] = useState<number>(1);

  const [items, setItems] = useState<MyTodo[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedKeys, setSelectedKeys] = useState<Key[]>([]);
  const [summary, setSummary] = useState<MyTodoSummary | null>(null);

  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [batchAction, setBatchAction] = useState<string | null>(null);
  const [deletingItem, setDeletingItem] = useState<MyTodo | null>(null);

  const filterParams = useMemo(
    () => ({
      todoType: todoType === TASK_ENHANCE_FILTER_ALL ? undefined : todoType,
      sourceModule:
        sourceModule === TASK_ENHANCE_FILTER_ALL ? undefined : sourceModule,
      priority: priority === TASK_ENHANCE_FILTER_ALL ? undefined : priority,
      status: status === TASK_ENHANCE_FILTER_ALL ? undefined : status,
      sortBy,
      sortOrder,
    }),
    [todoType, sourceModule, priority, status, sortBy, sortOrder],
  );

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const params: MyTodoListParams = {
        ...filterParams,
        page: String(page),
        pageSize: String(PAGE_SIZE),
      };
      const result = await listMyTodos(params);
      setItems(result.items);
      setTotal(result.total);
    } catch (error: unknown) {
      logger.error(`加载待办列表失败: ${toTaskEnhanceErrorText(error)}`);
      toast.error(`加载待办列表失败：${toTaskEnhanceErrorText(error)}`);
    } finally {
      setLoading(false);
    }
  }, [filterParams, page]);

  const loadSummary = useCallback(async () => {
    try {
      const result = await getMyTodoSummary();
      setSummary(result);
    } catch (error: unknown) {
      logger.error(`加载待办统计失败: ${toTaskEnhanceErrorText(error)}`);
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const refresh = useCallback((): void => {
    setSelectedKeys([]);
    void loadList();
    void loadSummary();
  }, [loadList, loadSummary]);

  const handleStatusAction = async (
    item: MyTodo,
    action: () => Promise<unknown>,
    successText: string,
  ): Promise<void> => {
    try {
      await action();
      toast.success(successText);
      refresh();
    } catch (error: unknown) {
      logger.error(`待办操作失败: ${toTaskEnhanceErrorText(error)}`);
      toast.error(`操作失败：${toTaskEnhanceErrorText(error)}`);
    }
  };

  const handleGoHandle = useCallback(
    (item: MyTodo): void => {
      const route: string | null = resolveTaskEnhanceSourceRoute(
        item.sourceModule,
      );
      if (route) {
        navigate(route);
        return;
      }
      toast.info('该来源模块暂无可跳转的页面');
    },
    [navigate],
  );

  const handleBatchAction = async (): Promise<void> => {
    if (!batchAction || selectedKeys.length === 0) return;
    try {
      const ids: number[] = selectedKeys.map((key: Key) => Number(key));
      const result = await batchActionMyTodos({ ids, action: batchAction });
      toast.success(`已批量${batchAction} ${result.updated} 条待办`);
      setBatchAction(null);
      refresh();
    } catch (error: unknown) {
      logger.error(`批量操作失败: ${toTaskEnhanceErrorText(error)}`);
      toast.error(`批量操作失败：${toTaskEnhanceErrorText(error)}`);
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!deletingItem) return;
    try {
      await deleteMyTodo(deletingItem.id);
      toast.success('已删除该待办');
      setDeletingItem(null);
      refresh();
    } catch (error: unknown) {
      logger.error(`删除待办失败: ${toTaskEnhanceErrorText(error)}`);
      toast.error(`删除失败：${toTaskEnhanceErrorText(error)}`);
    }
  };

  const handleExport = async (): Promise<void> => {
    try {
      const params: MyTodoListParams = {
        ...filterParams,
        page: '1',
        pageSize: '1000',
      };
      const result = await listMyTodos(params);
      const rows: Record<string, string>[] = result.items.map(
        (item: MyTodo) => ({
          编号: item.todoNo,
          标题: item.title,
          类型: item.todoType,
          来源模块: item.sourceModule,
          来源单据号: item.sourceNo ?? '',
          优先级: item.priority,
          状态: item.status,
          处理人: item.assignee ?? '',
          截止日期: item.dueDate ?? '',
          创建时间: formatTaskEnhanceDateTime(item.createdAt),
          备注: item.remark ?? '',
        }),
      );
      const count: number = await exportRowsToExcel(
        rows,
        ['编号', '标题', '类型', '来源模块', '来源单据号', '优先级', '状态', '处理人', '截止日期', '创建时间', '备注'],
        '我的待办',
        '我的待办',
      );
      toast.success(`已导出 ${count} 条待办`);
    } catch (error: unknown) {
      logger.error(`导出待办失败: ${toTaskEnhanceErrorText(error)}`);
      toast.error(`导出失败：${toTaskEnhanceErrorText(error)}`);
    }
  };

  const columns = useMemo(
    () =>
      buildTodoColumns({
        onGoHandle: handleGoHandle,
        onComplete: (item: MyTodo) =>
          void handleStatusAction(
            item,
            () => completeMyTodo(item.id),
            '已标记完成',
          ),
        onIgnore: (item: MyTodo) =>
          void handleStatusAction(item, () => ignoreMyTodo(item.id), '已忽略该待办'),
        onReopen: (item: MyTodo) =>
          void handleStatusAction(item, () => reopenMyTodo(item.id), '已重新打开该待办'),
        onDelete: (item: MyTodo) => setDeletingItem(item),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [handleGoHandle],
  );

  const {
    visibleColumns,
    columnMetas,
    hiddenIds,
    toggleColumn,
    resetColumns,
    setAllColumns,
  } = useColumnSettings(columns);

  const statCards: TodoStatCardDef[] = [
    { label: '待处理数', value: summary?.pendingCount ?? 0 },
    { label: '今日到期', value: summary?.dueTodayCount ?? 0 },
    { label: '已逾期', value: summary?.overdueCount ?? 0, danger: true },
    { label: '高优先级', value: summary?.highPriorityCount ?? 0 },
  ];

  const hasSelection: boolean = selectedKeys.length > 0;

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
      {/* 统计卡 */}
      <div
        data-ai-section-type="card-stat"
        className="grid grid-cols-2 gap-4 md:grid-cols-4"
      >
        {statCards.map((card: TodoStatCardDef) => (
          <ReportCard key={card.label} className="p-4">
            <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
              {card.label}
            </div>
            <div
              className={`mt-2 font-mono text-3xl font-black ${
                card.danger ? 'text-destructive' : 'text-foreground'
              }`}
            >
              {card.value}
            </div>
          </ReportCard>
        ))}
      </div>

      <ReportCard>
        <SectionHeader
          no="01"
          label="MY TODOS"
          subtitle="我的待办 / 按来源模块与优先级跟踪待处理事项"
        />
        {/* 筛选区 */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          {renderFilterSelect('类型', '全部类型', todoType, TASK_TODO_TYPES, setTodoType, 'w-32')}
          {renderFilterSelect('来源模块', '全部来源', sourceModule, TASK_TODO_SOURCE_MODULES, setSourceModule, 'w-32')}
          {renderFilterSelect('优先级', '全部优先级', priority, TASK_PRIORITY_OPTIONS, setPriority, 'w-32')}
          {renderFilterSelect('状态', '全部状态', status, TODO_STATUS_OPTIONS, setStatus, 'w-32')}
          <Select value={sortBy} onValueChange={(next: string) => setSortBy(next)}>
            <SelectTrigger className="w-32 rounded-none">
              <SelectValue placeholder="排序字段" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt">按创建时间</SelectItem>
              <SelectItem value="dueDate">按截止日期</SelectItem>
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
              onClick={() => setFormOpen(true)}
            >
              <Plus className="h-4 w-4" />
              新建待办
            </Button>
            <Button
              variant="outline"
              disabled={!hasSelection}
              onClick={() => setBatchAction('完成')}
            >
              批量完成
            </Button>
            <Button
              variant="outline"
              disabled={!hasSelection}
              onClick={() => setBatchAction('忽略')}
            >
              批量忽略
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
        <Table<MyTodo>
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

      <TodoFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSaved={refresh}
      />
      <AdsConfirmDialog
        open={batchAction !== null}
        title={`确认批量${batchAction ?? ''}？`}
        description={`即将批量${batchAction ?? ''}已选中的 ${selectedKeys.length} 条待办，操作立即生效。`}
        confirmText={`确认${batchAction ?? ''}`}
        onOpenChange={(open: boolean) => {
          if (!open) setBatchAction(null);
        }}
        onConfirm={() => void handleBatchAction()}
      />
      <AdsConfirmDialog
        open={deletingItem !== null}
        title="确认删除？"
        description={`即将删除待办「${deletingItem?.title ?? ''}」，删除后不可恢复。`}
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
