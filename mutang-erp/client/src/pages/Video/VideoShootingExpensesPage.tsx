import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type Key } from 'react';
import dayjs from 'dayjs';
import { Download, Plus, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Table, type TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import { ReportCard, SectionHeader } from '@client/src/components/blueprint';
import { ColumnSettingsButton } from '@client/src/components/column-settings-button';
import { useColumnSettings } from '@client/src/hooks/useColumnSettings';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@client/src/components/ui/select';
import type {
  FinanceNamedAmountItem, ShootingExpense, ShootingExpenseListParams,
  ShootingExpenseStats, VideoCoreProject,
} from '@shared/api.interface';
import {
  deleteShootingExpense, fetchShootingExpenses, fetchShootingExpenseStats,
  fetchShootingProjectOptions, reimburseShootingExpense,
} from '@client/src/api/video-core/shooting';
import { AdsConfirmDialog } from '@client/src/pages/AdsBusiness/AdsConfirmDialog';
import { AdsDatePickerButton } from '@client/src/pages/AdsBusiness/AdsDatePickerButton';
import { exportRowsToExcel } from '@client/src/pages/AdsBusiness/ads-excel';
import { VideoCoreTabs } from './VideoCoreTabs';
import {
  ShootingApproveDialog, ShootingDetailDialog, ShootingFormDialog,
} from './VideoShootingDialogs';
import {
  EXPENSE_TYPE_OPTIONS, formatVideoAmount, toVideoErrorText,
  VIDEO_FILTER_ALL, VideoStatusBadge,
} from './video-constants';

const PAGE_SIZE: number = 10;
const SHOOTING_STATUS_OPTIONS: string[] = ['待审批', '审批通过', '已驳回', '已报销'];
const EXPORT_HEADERS: string[] = [
  '费用单号', '关联项目号', '费用类型', '费用分类', '金额', '费用日期',
  '申请人', '状态', '发票状态', '备注',
];
/** 蓝色五级渐变（#0033A0 → #C3D4FA），仅用于占比条 */
const BLUE_LEVELS: string[] = ['#0033A0', '#2B57C4', '#5A82DB', '#8FADEE', '#C3D4FA'];

const reportError = (context: string, error: unknown): void => {
  logger.error(`${context}: ${toVideoErrorText(error)}`);
  toast.error(toVideoErrorText(error));
};

export default function VideoShootingExpensesPage() {
  /* 筛选（文本防抖） */
  const [draftNo, setDraftNo] = useState<string>('');
  const [expenseNo, setExpenseNo] = useState<string>('');
  const [projectIdFilter, setProjectIdFilter] = useState<string>(VIDEO_FILTER_ALL);
  const [expenseTypeFilter, setExpenseTypeFilter] = useState<string>(VIDEO_FILTER_ALL);
  const [statusFilter, setStatusFilter] = useState<string>(VIDEO_FILTER_ALL);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [page, setPage] = useState<number>(1);
  const [items, setItems] = useState<ShootingExpense[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedKeys, setSelectedKeys] = useState<Key[]>([]);
  const [stats, setStats] = useState<ShootingExpenseStats | null>(null);
  const [projects, setProjects] = useState<VideoCoreProject[]>([]);
  /* 弹窗状态 */
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [editing, setEditing] = useState<ShootingExpense | null>(null);
  const [detailItem, setDetailItem] = useState<ShootingExpense | null>(null);
  const [approvingIds, setApprovingIds] = useState<number[]>([]);
  const [reimbursingIds, setReimbursingIds] = useState<number[]>([]);
  const [deletingItem, setDeletingItem] = useState<ShootingExpense | null>(null);

  useEffect(() => {
    const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
      setExpenseNo(draftNo.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [draftNo]);

  const filterParams = useMemo(
    (): ShootingExpenseListParams => ({
      expenseNo: expenseNo || undefined,
      projectId: projectIdFilter === VIDEO_FILTER_ALL ? undefined : Number(projectIdFilter),
      expenseType: expenseTypeFilter === VIDEO_FILTER_ALL ? undefined : expenseTypeFilter,
      status: statusFilter === VIDEO_FILTER_ALL ? undefined : statusFilter,
      startDate: startDate ? dayjs(startDate).format('YYYY-MM-DD') : undefined,
      endDate: endDate ? dayjs(endDate).format('YYYY-MM-DD') : undefined,
    }),
    [expenseNo, projectIdFilter, expenseTypeFilter, statusFilter, startDate, endDate],
  );

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchShootingExpenses({ ...filterParams, page, pageSize: PAGE_SIZE });
      setItems(result.items);
      setTotal(result.total);
    } catch (error: unknown) {
      reportError('加载费用列表失败', error);
    } finally {
      setLoading(false);
    }
  }, [filterParams, page]);

  const loadStats = useCallback(async () => {
    try {
      setStats(await fetchShootingExpenseStats());
    } catch (error: unknown) {
      logger.error(`加载费用统计失败: ${toVideoErrorText(error)}`);
    }
  }, []);

  const loadProjects = useCallback(async () => {
    try {
      setProjects(await fetchShootingProjectOptions());
    } catch (error: unknown) {
      reportError('加载项目列表失败', error);
    }
  }, []);

  useEffect(() => { void loadList(); }, [loadList]);
  useEffect(() => { void loadStats(); }, [loadStats]);
  useEffect(() => { void loadProjects(); }, [loadProjects]);

  const refresh = useCallback((): void => {
    setSelectedKeys([]);
    void loadList();
    void loadStats();
  }, [loadList, loadStats]);

  const handleReset = (): void => {
    setDraftNo('');
    setExpenseNo('');
    setProjectIdFilter(VIDEO_FILTER_ALL);
    setExpenseTypeFilter(VIDEO_FILTER_ALL);
    setStatusFilter(VIDEO_FILTER_ALL);
    setStartDate(undefined);
    setEndDate(undefined);
    setPage(1);
  };

  const openCreate = (): void => { setEditing(null); setFormOpen(true); };
  const openEdit = (item: ShootingExpense): void => { setEditing(item); setFormOpen(true); };

  const handleReimburse = async (): Promise<void> => {
    try {
      await reimburseShootingExpense(reimbursingIds[0]);
      toast.success('费用单已标记报销');
      setReimbursingIds([]);
      refresh();
    } catch (error: unknown) {
      reportError('报销失败', error);
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!deletingItem) return;
    try {
      await deleteShootingExpense(deletingItem.id);
      toast.success('费用单已删除');
      setDeletingItem(null);
      refresh();
    } catch (error: unknown) {
      reportError('删除费用单失败', error);
    }
  };

  const collectPendingIds = (): number[] =>
    items
      .filter((item: ShootingExpense) => selectedKeys.includes(item.id) && item.status === '待审批')
      .map((item: ShootingExpense) => item.id);

  const handleBatchApprove = (): void => {
    const pendingIds: number[] = collectPendingIds();
    if (pendingIds.length === 0) {
      toast.error('所选记录中没有待审批的费用单');
      return;
    }
    setApprovingIds(pendingIds);
  };

  const handleExport = async (): Promise<void> => {
    try {
      const rows: Record<string, string>[] = items.map((item: ShootingExpense) => ({
        费用单号: item.expenseNo,
        关联项目号: item.projectNo,
        费用类型: item.expenseType,
        费用分类: item.expenseCategory,
        金额: String(item.amount),
        费用日期: item.expenseDate,
        申请人: item.applicant,
        状态: item.status,
        发票状态: item.invoiceStatus,
        备注: item.remark,
      }));
      const count: number = await exportRowsToExcel(rows, EXPORT_HEADERS, '拍摄费用', '拍摄费用');
      toast.success(`已导出 ${count} 条费用记录`);
    } catch (error: unknown) {
      reportError('导出失败', error);
    }
  };

  const columns = useMemo((): TableColumnsType<ShootingExpense> => [
    {
      title: '费用单号',
      dataIndex: 'expenseNo',
      width: 150,
      fixed: 'left',
      render: (value: string) => <span className="font-bold text-primary">{value}</span>,
    },
    { title: '关联项目号', dataIndex: 'projectNo', width: 130 },
    { title: '类型', dataIndex: 'expenseType', width: 90 },
    { title: '分类', dataIndex: 'expenseCategory', width: 100 },
    {
      title: '金额', dataIndex: 'amount', width: 120, align: 'right',
      render: (value: number) => <span className="font-mono">{formatVideoAmount(value)}</span>,
    },
    { title: '费用日期', dataIndex: 'expenseDate', width: 110 },
    { title: '申请人', dataIndex: 'applicant', width: 90 },
    {
      title: '状态', dataIndex: 'status', width: 90,
      render: (value: string) => <VideoStatusBadge status={value} />,
    },
    { title: '发票状态', dataIndex: 'invoiceStatus', width: 90 },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      fixed: 'right',
      render: (_: unknown, record: ShootingExpense) => (
        <div className="flex flex-wrap items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => setDetailItem(record)}
            className="h-auto px-1 text-xs text-primary">
            详情
          </Button>
          {record.status === '待审批' || record.status === '已驳回' ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => openEdit(record)}
                className="h-auto px-1 text-xs text-primary">
                编辑
              </Button>
              {record.status === '待审批' ? (
                <Button variant="ghost" size="sm" onClick={() => setApprovingIds([record.id])}
                  className="h-auto px-1 text-xs text-primary">
                  审批
                </Button>
              ) : null}
              <Button variant="ghost" size="sm" onClick={() => setDeletingItem(record)}
                className="h-auto px-1 text-xs text-destructive">
                删除
              </Button>
            </>
          ) : null}
          {record.status === '审批通过' ? (
            <Button variant="ghost" size="sm" onClick={() => setReimbursingIds([record.id])}
              className="h-auto px-1 text-xs text-primary">
              报销
            </Button>
          ) : null}
        </div>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], []);

  const {
    visibleColumns, columnMetas, hiddenIds,
    toggleColumn, resetColumns, setAllColumns,
  } = useColumnSettings(columns);

  const byType: FinanceNamedAmountItem[] = stats?.byType ?? [];
  const maxTypeAmount: number = byType.reduce(
    (max: number, entry: FinanceNamedAmountItem) => Math.max(max, entry.amount), 0,
  );
  const hasSelection: boolean = selectedKeys.length > 0;

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-8 px-8 py-8">
      <VideoCoreTabs active="shooting" />
      {/* 统计区 */}
      <ReportCard>
        <SectionHeader no="02" label="SHOOTING EXPENSES" subtitle="拍摄费用 / 审批报销 / 类型分析" />
        <div className="flex flex-wrap gap-4" data-ai-section-type="card-stat">
          <div className="min-w-[200px] flex-1 border border-t-[3px] border-t-primary bg-card shadow-md">
            <div className="p-4">
              <div className="mb-2 text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">
                本月费用总额
              </div>
              <div className="font-mono text-lg font-bold tracking-tight text-primary">
                {stats ? formatVideoAmount(stats.monthTotal) : '—'}
              </div>
            </div>
          </div>
          <div className="min-w-[320px] flex-[2] border border-t-[3px] border-t-primary bg-card shadow-md">
            <div className="p-4">
              <div className="mb-3 text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">
                按费用类型汇总
              </div>
              {byType.length === 0 ? (
                <div className="text-xs text-muted-foreground">暂无费用数据</div>
              ) : (
                <div className="space-y-2.5">
                  {byType.map((entry: FinanceNamedAmountItem, index: number) => (
                    <div key={entry.name} className="flex items-center gap-3 text-xs">
                      <span className="w-16 shrink-0 font-medium">{entry.name}</span>
                      <div className="h-2 flex-1 bg-accent">
                        <div className="h-full"
                          style={{
                            width: maxTypeAmount > 0
                              ? `${Math.max((entry.amount / maxTypeAmount) * 100, 2)}%` : '2%',
                            backgroundColor: BLUE_LEVELS[index % BLUE_LEVELS.length],
                          }} />
                      </div>
                      <span className="w-24 shrink-0 text-right font-mono text-muted-foreground">
                        {formatVideoAmount(entry.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </ReportCard>
      {/* 列表区 */}
      <ReportCard>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Input className="w-32 rounded-none" placeholder="费用单号" value={draftNo}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setDraftNo(event.target.value)} />
          <Select value={projectIdFilter}
            onValueChange={(value: string) => { setProjectIdFilter(value); setPage(1); }}>
            <SelectTrigger className="w-44 rounded-none"><SelectValue placeholder="关联项目" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={VIDEO_FILTER_ALL}>全部项目</SelectItem>
              {projects.map((project: VideoCoreProject) => (
                <SelectItem key={project.id} value={String(project.id)}>
                  {`${project.projectNo} ${project.projectName}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={expenseTypeFilter}
            onValueChange={(value: string) => { setExpenseTypeFilter(value); setPage(1); }}>
            <SelectTrigger className="w-28 rounded-none"><SelectValue placeholder="费用类型" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={VIDEO_FILTER_ALL}>全部类型</SelectItem>
              {EXPENSE_TYPE_OPTIONS.map((option: string) => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter}
            onValueChange={(value: string) => { setStatusFilter(value); setPage(1); }}>
            <SelectTrigger className="w-28 rounded-none"><SelectValue placeholder="状态" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={VIDEO_FILTER_ALL}>全部状态</SelectItem>
              {SHOOTING_STATUS_OPTIONS.map((option: string) => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">费用日期</span>
            <AdsDatePickerButton value={startDate} placeholder="开始日期"
              onChange={(date: Date | undefined) => { setStartDate(date); setPage(1); }} />
            <span className="text-xs text-muted-foreground">至</span>
            <AdsDatePickerButton value={endDate} placeholder="结束日期"
              onChange={(date: Date | undefined) => { setEndDate(date); setPage(1); }} />
          </div>
          <Button variant="ghost" size="sm" className="rounded-none" onClick={handleReset}>
            <RotateCcw className="h-3.5 w-3.5" />
            重置
          </Button>
        </div>
        {/* 操作区 */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button data-ai-section-type="button" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              新建费用
            </Button>
            <Button variant="outline" disabled={!hasSelection} onClick={handleBatchApprove}>批量审批</Button>
            <Button variant="outline" onClick={() => void handleExport()}>
              <Download className="h-4 w-4" />
              导出Excel
            </Button>
            <ColumnSettingsButton
              columnMetas={columnMetas} hiddenIds={hiddenIds}
              onToggle={toggleColumn} onReset={resetColumns} onSetAll={setAllColumns}
            />
          </div>
          {hasSelection ? (
            <span className="text-xs text-muted-foreground">已选 {selectedKeys.length} 条</span>
          ) : null}
        </div>
        <Table<ShootingExpense>
          columns={visibleColumns}
          dataSource={items}
          loading={loading}
          rowKey="id"
          scroll={{ x: 1270, y: 500 }}
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

      {/* 新建 / 编辑弹窗 */}
      <ShootingFormDialog
        open={formOpen}
        editing={editing}
        projects={projects}
        onSaved={refresh}
        onOpenChange={setFormOpen}
      />

      {/* 详情弹窗 */}
      <ShootingDetailDialog
        open={detailItem !== null}
        expense={detailItem}
        onOpenChange={(open: boolean) => { if (!open) setDetailItem(null); }}
      />

      {/* 审批弹窗（行内 + 批量，通过 / 驳回） */}
      <ShootingApproveDialog
        open={approvingIds.length > 0}
        ids={approvingIds}
        onDone={refresh}
        onOpenChange={(open: boolean) => { if (!open) setApprovingIds([]); }}
      />

      {/* 报销确认 */}
      <AdsConfirmDialog
        open={reimbursingIds.length > 0}
        title="确认报销？"
        description={`即将报销 ${reimbursingIds.length} 条费用单，报销后不可撤销。`}
        confirmText="确认报销"
        onOpenChange={(open: boolean) => { if (!open) setReimbursingIds([]); }}
        onConfirm={() => void handleReimburse()}
      />

      {/* 删除二次确认 */}
      <AdsConfirmDialog
        open={deletingItem !== null}
        title="确认删除？"
        description={`即将删除费用单「${deletingItem?.expenseNo ?? ''}」，删除后不可恢复。`}
        confirmText="确认删除"
        destructive
        onOpenChange={(open: boolean) => { if (!open) setDeletingItem(null); }}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}
