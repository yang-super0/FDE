import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type Key } from 'react';
import dayjs from 'dayjs';
import { Download, Pencil, Plus, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Table } from '@lark-apaas/client-toolkit/antd-table';
import type { TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import { ReportCard, SectionHeader } from '@client/src/components/blueprint';
import { ColumnSettingsButton } from '@client/src/components/column-settings-button';
import { useColumnSettings } from '@client/src/hooks/useColumnSettings';
import { useFieldPermissions } from '@client/src/hooks/useFieldPermissions';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@client/src/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@client/src/components/ui/select';
import type { FinanceCost, FinanceCostStats, FinanceCostSummaryItem, FinanceCostTrendItem } from '@shared/api.interface';
import { calculateFinanceCosts, deleteFinanceCostCore, fetchFinanceCost, fetchFinanceCosts, fetchFinanceCostStats, transferFinanceCosts } from '@client/src/api/finance-core';
import { AdsConfirmDialog } from '@client/src/pages/AdsBusiness/AdsConfirmDialog';
import { exportRowsToExcel } from '@client/src/pages/AdsBusiness/ads-excel';
import { FinanceCoreTabs } from './FinanceCoreTabs';
import { COST_TYPE_OPTIONS, FINANCE_FILTER_ALL, FinanceStatusBadge, formatFinanceAmount, toFinanceErrorText, toFinanceNumber } from './finance-constants';
import { FinanceCostFormDialog } from './FinanceCostFormDialog';

const PAGE_SIZE: number = 10;
const COST_STATUS_OPTIONS: string[] = ['待核算', '已核算', '已结转'];
const EXPORT_HEADERS: string[] = ['成本单号', '成本类型', '成本分类', '金额', '关联账户', '关联客户', '归属周期', '状态', '成本日期', '备注'];

const renderMoney = (value: number | string | null): string =>
  value == null ? '-' : typeof value === 'string' ? value : formatFinanceAmount(value);

export default function FinanceCostsPage() {
  /* 筛选（文本防抖） */
  const [draftCostNo, setDraftCostNo] = useState<string>('');
  const [draftAccount, setDraftAccount] = useState<string>('');
  const [draftCustomer, setDraftCustomer] = useState<string>('');
  const [costNo, setCostNo] = useState<string>('');
  const [relatedAccount, setRelatedAccount] = useState<string>('');
  const [relatedCustomer, setRelatedCustomer] = useState<string>('');
  const [costTypeFilter, setCostTypeFilter] = useState<string>(FINANCE_FILTER_ALL);
  const [statusFilter, setStatusFilter] = useState<string>(FINANCE_FILTER_ALL);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [items, setItems] = useState<FinanceCost[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedKeys, setSelectedKeys] = useState<Key[]>([]);
  const [stats, setStats] = useState<FinanceCostStats | null>(null);
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [editing, setEditing] = useState<FinanceCost | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [detail, setDetail] = useState<FinanceCost | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [calculatingItem, setCalculatingItem] = useState<FinanceCost | null>(null);
  const [transferringItem, setTransferringItem] = useState<FinanceCost | null>(null);
  const [deletingItem, setDeletingItem] = useState<FinanceCost | null>(null);
  const [batchAction, setBatchAction] = useState<'calculate' | 'transfer' | null>(null);
  const { fields: permFields } = useFieldPermissions('财务');

  useEffect(() => {
    const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
      setCostNo(draftCostNo.trim());
      setRelatedAccount(draftAccount.trim());
      setRelatedCustomer(draftCustomer.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [draftCostNo, draftAccount, draftCustomer]);

  const filterParams = useMemo(() => ({
    costNo: costNo || undefined,
    relatedAccount: relatedAccount || undefined,
    relatedCustomer: relatedCustomer || undefined,
    costType: costTypeFilter === FINANCE_FILTER_ALL ? undefined : costTypeFilter,
    status: statusFilter === FINANCE_FILTER_ALL ? undefined : statusFilter,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  }), [costNo, relatedAccount, relatedCustomer, costTypeFilter, statusFilter, startDate, endDate]);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchFinanceCosts({ ...filterParams, page, pageSize: PAGE_SIZE });
      setItems(result.items);
      setTotal(result.total);
    } catch (error: unknown) {
      logger.error(`加载成本列表失败: ${toFinanceErrorText(error)}`);
      toast.error(toFinanceErrorText(error));
    } finally {
      setLoading(false);
    }
  }, [filterParams, page]);

  const loadStats = useCallback(async () => {
    try {
      setStats(await fetchFinanceCostStats({ preset: 'year' }));
    } catch (error: unknown) {
      logger.error(`加载成本统计失败: ${toFinanceErrorText(error)}`);
    }
  }, []);

  useEffect(() => { void loadList(); }, [loadList]);
  useEffect(() => { void loadStats(); }, [loadStats]);

  const refresh = useCallback((): void => {
    setSelectedKeys([]);
    void loadList();
    void loadStats();
  }, [loadList, loadStats]);

  useEffect(() => {
    if (detailId === null) {
      setDetail(null);
      return;
    }
    let cancelled: boolean = false;
    setDetailLoading(true);
    fetchFinanceCost(detailId)
      .then((result: FinanceCost) => {
        if (!cancelled) setDetail(result);
      })
      .catch((error: unknown) => {
        logger.error(`加载成本详情失败: ${toFinanceErrorText(error)}`);
        toast.error(toFinanceErrorText(error));
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [detailId]);

  const openCreate = (): void => { setEditing(null); setFormOpen(true); };
  const openEdit = (item: FinanceCost): void => { setEditing(item); setFormOpen(true); };

  /* 执行操作 + 成功提示 + 刷新；失败统一 toast */
  const runAction = async (action: () => Promise<unknown>, successText: string): Promise<boolean> => {
    try {
      await action();
      toast.success(successText);
      refresh();
      return true;
    } catch (error: unknown) {
      toast.error(toFinanceErrorText(error));
      return false;
    }
  };

  const handleCalculate = async (): Promise<void> => {
    if (!calculatingItem) return;
    if (await runAction(() => calculateFinanceCosts([calculatingItem.id]), '已核算 1 条')) setCalculatingItem(null);
  };

  const handleTransfer = async (): Promise<void> => {
    if (!transferringItem) return;
    if (await runAction(() => transferFinanceCosts([transferringItem.id]), '已结转 1 条')) setTransferringItem(null);
  };

  const handleDelete = async (): Promise<void> => {
    if (!deletingItem) return;
    if (await runAction(() => deleteFinanceCostCore(deletingItem.id), '已删除该成本')) setDeletingItem(null);
  };

  const selectedIds: number[] = useMemo(() => selectedKeys.map((key: Key) => Number(key)), [selectedKeys]);
  const pickSelectedIds = (statusValue: string): number[] =>
    items
      .filter((item: FinanceCost) => item.status === statusValue && selectedIds.includes(item.id))
      .map((item: FinanceCost) => item.id);
  const pendingSelectedIds: number[] = useMemo(() => pickSelectedIds('待核算'), [items, selectedIds]);
  const calculatedSelectedIds: number[] = useMemo(() => pickSelectedIds('已核算'), [items, selectedIds]);

  const handleBatch = async (): Promise<void> => {
    if (!batchAction) return;
    try {
      if (batchAction === 'calculate') {
        const result = await calculateFinanceCosts(pendingSelectedIds);
        toast.success(`已核算 ${result.calculated} 条`);
      } else {
        const result = await transferFinanceCosts(calculatedSelectedIds);
        toast.success(`已结转 ${result.transferred} 条`);
      }
      setBatchAction(null);
      refresh();
    } catch (error: unknown) {
      toast.error(toFinanceErrorText(error));
    }
  };

  const handleReset = (): void => {
    setDraftCostNo('');
    setDraftAccount('');
    setDraftCustomer('');
    setCostNo('');
    setRelatedAccount('');
    setRelatedCustomer('');
    setCostTypeFilter(FINANCE_FILTER_ALL);
    setStatusFilter(FINANCE_FILTER_ALL);
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const handleExport = async (): Promise<void> => {
    try {
      const rows: Record<string, string>[] = items.map((item: FinanceCost) => ({
        成本单号: item.costNo,
        成本类型: item.costType,
        成本分类: item.costCategory,
        金额: String(item.amount),
        关联账户: item.relatedAccount,
        关联客户: item.relatedCustomer,
        归属周期: item.period,
        状态: item.status,
        成本日期: item.costDate,
        备注: item.remark,
      }));
      const count: number = await exportRowsToExcel(rows, EXPORT_HEADERS, '成本管理', '成本管理');
      toast.success(`已导出 ${count} 条成本`);
    } catch (error: unknown) {
      toast.error(toFinanceErrorText(error));
    }
  };

  const columns = useMemo((): TableColumnsType<FinanceCost> => [
    {
      title: '成本单号',
      dataIndex: 'costNo',
      width: 140,
      render: (value: string) => <span className="font-mono text-xs font-bold text-primary">{value}</span>,
    },
    { title: '类型', dataIndex: 'costType', width: 100 },
    { title: '分类', dataIndex: 'costCategory', width: 110, render: (value: string) => value || '-' },
    ...(permFields.get('cost')?.visible !== false
      ? [{
          title: '金额',
          dataIndex: 'amount',
          width: 140,
          align: 'right' as const,
          render: (value: number | string | null) => <span className="font-mono font-bold">{renderMoney(value)}</span>,
        }]
      : []),
    { title: '关联账户', dataIndex: 'relatedAccount', width: 120, render: (value: string) => value || '-' },
    { title: '关联客户', dataIndex: 'relatedCustomer', width: 120, render: (value: string) => value || '-' },
    { title: '周期', dataIndex: 'period', width: 90, render: (value: string) => <span className="font-mono text-xs">{value}</span> },
    { title: '状态', dataIndex: 'status', width: 80, render: (value: string) => <FinanceStatusBadge status={value} /> },
    { title: '成本日期', dataIndex: 'costDate', width: 110 },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 240,
      render: (_: unknown, record: FinanceCost) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => setDetailId(record.id)}>查看</Button>
          {record.status === '待核算' ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => openEdit(record)}>
                <Pencil className="h-3.5 w-3.5" />
                编辑
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setCalculatingItem(record)}>核算</Button>
              <Button variant="ghost" size="sm" onClick={() => setDeletingItem(record)}>删除</Button>
            </>
          ) : null}
          {record.status === '已核算' ? (
            <Button variant="ghost" size="sm" onClick={() => setTransferringItem(record)}>结转</Button>
          ) : null}
        </div>
      ),
    },
  ], [permFields]);
  const {
    visibleColumns, columnMetas, hiddenIds,
    toggleColumn, resetColumns, setAllColumns,
  } = useColumnSettings(columns);

  const trend: FinanceCostTrendItem[] = stats?.trend ?? [];
  const byType: FinanceCostSummaryItem[] = stats?.byType ?? [];
  const maxTrendAmount: number = trend.reduce((max: number, item: FinanceCostTrendItem) => Math.max(max, item.amount), 0);

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-8 px-8 py-8">
      <FinanceCoreTabs active="costs" />
      {/* 统计区 */}
      <ReportCard>
        <SectionHeader no="06" label="COST MANAGEMENT" subtitle="成本管理 / 核算结转 / 趋势分析" />
        <div className="mb-6 flex flex-wrap gap-4" data-ai-section-type="card-stat">
          {byType.map((entry: FinanceCostSummaryItem) => (
            <div key={entry.key} className="min-w-[150px] flex-1 border border-t-[3px] border-t-primary bg-card shadow-md">
              <div className="p-4">
                <div className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground mb-2">{entry.key}</div>
                <div className="font-mono text-lg font-bold tracking-tight text-primary">{formatFinanceAmount(entry.amount)}</div>
                <div className="mt-1 text-xs text-muted-foreground">{entry.count} 笔</div>
              </div>
            </div>
          ))}
          {stats && byType.length === 0 ? (
            <div className="border border-border p-4 text-xs text-muted-foreground">暂无成本数据</div>
          ) : null}
        </div>
        <div className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground mb-3">近 6 个月成本趋势</div>
        {trend.length > 0 ? (
          <>
            <div className="flex items-end gap-6 px-2" style={{ height: 160 }}>
              {trend.map((entry: FinanceCostTrendItem) => (
                <div key={entry.period} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                  <div className="font-mono text-[10px] text-muted-foreground">
                    {entry.amount > 0 ? formatFinanceAmount(entry.amount) : ''}
                  </div>
                  <div
                    className="w-full max-w-[64px] rounded-t-[2px] bg-primary transition-colors hover:bg-primary/80"
                    style={{ height: maxTrendAmount > 0 ? `${Math.max((entry.amount / maxTrendAmount) * 100, 2)}%` : '2%' }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-1.5 flex gap-6 px-2">
              {trend.map((entry: FinanceCostTrendItem) => (
                <div key={entry.period} className="flex-1 text-center font-mono text-[10px] text-muted-foreground">
                  {entry.period}
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="border border-border p-4 text-xs text-muted-foreground">暂无趋势数据</div>
        )}
      </ReportCard>
      {/* 成本列表 */}
      <ReportCard>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Input className="w-32 rounded-none" placeholder="成本单号" value={draftCostNo} onChange={(event: ChangeEvent<HTMLInputElement>) => setDraftCostNo(event.target.value)} />
            <Input className="w-32 rounded-none" placeholder="关联账户" value={draftAccount} onChange={(event: ChangeEvent<HTMLInputElement>) => setDraftAccount(event.target.value)} />
            <Input className="w-32 rounded-none" placeholder="关联客户" value={draftCustomer} onChange={(event: ChangeEvent<HTMLInputElement>) => setDraftCustomer(event.target.value)} />
            <Select value={costTypeFilter} onValueChange={(value: string) => { setCostTypeFilter(value); setPage(1); }}>
              <SelectTrigger className="w-32 rounded-none"><SelectValue placeholder="成本类型" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={FINANCE_FILTER_ALL}>全部类型</SelectItem>
                {COST_TYPE_OPTIONS.map((option: string) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(value: string) => { setStatusFilter(value); setPage(1); }}>
              <SelectTrigger className="w-32 rounded-none"><SelectValue placeholder="状态" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={FINANCE_FILTER_ALL}>全部状态</SelectItem>
                {COST_STATUS_OPTIONS.map((option: string) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input className="w-40 rounded-none font-mono" placeholder="开始日期 YYYY-MM-DD" value={startDate} onChange={(event: ChangeEvent<HTMLInputElement>) => { setStartDate(event.target.value); setPage(1); }} />
            <Input className="w-40 rounded-none font-mono" placeholder="结束日期 YYYY-MM-DD" value={endDate} onChange={(event: ChangeEvent<HTMLInputElement>) => { setEndDate(event.target.value); setPage(1); }} />
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="h-3.5 w-3.5" />
              重置
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={pendingSelectedIds.length === 0} onClick={() => setBatchAction('calculate')}>
              批量核算（{pendingSelectedIds.length}）
            </Button>
            <Button variant="outline" size="sm" disabled={calculatedSelectedIds.length === 0} onClick={() => setBatchAction('transfer')}>
              批量结转（{calculatedSelectedIds.length}）
            </Button>
            <Button variant="outline" size="sm" onClick={() => void handleExport()}>
              <Download className="h-3.5 w-3.5" />
              导出
            </Button>
            <Button data-ai-section-type="button" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              新建成本
            </Button>
            <ColumnSettingsButton
              columnMetas={columnMetas} hiddenIds={hiddenIds}
              onToggle={toggleColumn} onReset={resetColumns} onSetAll={setAllColumns}
            />
          </div>
        </div>
        <Table<FinanceCost>
          columns={visibleColumns}
          dataSource={items}
          loading={loading}
          rowKey="id"
          scroll={{ x: 1300, y: 500 }}
          rowSelection={{ selectedRowKeys: selectedKeys, onChange: (keys: Key[]) => setSelectedKeys(keys) }}
          pagination={{ current: page, pageSize: PAGE_SIZE, total, onChange: (nextPage: number) => setPage(nextPage) }}
        />
      </ReportCard>
      {/* 新建/编辑弹窗 */}
      <FinanceCostFormDialog open={formOpen} editing={editing} onClose={() => setFormOpen(false)} onSaved={refresh} />
      {/* 详情弹窗 */}
      <Dialog open={detailId !== null} onOpenChange={(open: boolean) => { if (!open) setDetailId(null); }}>
        <DialogContent className="rounded-none sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">成本详情</DialogTitle>
            <DialogDescription>{detail ? `成本单号：${detail.costNo}` : '加载中...'}</DialogDescription>
          </DialogHeader>
          {detail ? (
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {[
                ['成本类型', detail.costType], ['成本分类', detail.costCategory || '-'],
                ['金额', formatFinanceAmount(toFinanceNumber(detail.amount))], ['关联账户', detail.relatedAccount || '-'],
                ['关联客户', detail.relatedCustomer || '-'], ['成本日期', detail.costDate],
                ['归属周期', detail.period], ['状态', detail.status],
                ['核算人', detail.calculatedBy || '-'],
                ['核算时间', detail.calculatedAt ? dayjs(detail.calculatedAt).format('YYYY-MM-DD HH:mm') : '-'],
                ['创建时间', dayjs(detail.createdAt).format('YYYY-MM-DD HH:mm')], ['备注', detail.remark || '-'],
              ].map(([label, value]: string[]) => (
                <div key={label}>
                  <div className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground mb-1">{label}</div>
                  <div className="font-medium break-words">{value}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-xs text-muted-foreground">{detailLoading ? '加载中...' : '暂无数据'}</div>
          )}
        </DialogContent>
      </Dialog>
      {/* 核算 / 结转 / 删除 / 批量确认 */}
      <AdsConfirmDialog open={calculatingItem !== null} title="确认核算？" confirmText="核算"
        description={`核算后成本「${calculatingItem?.costNo ?? ''}」将进入已核算状态。`}
        onOpenChange={(open: boolean) => { if (!open) setCalculatingItem(null); }} onConfirm={() => void handleCalculate()} />
      <AdsConfirmDialog open={transferringItem !== null} title="确认结转？" confirmText="结转"
        description={`结转后成本「${transferringItem?.costNo ?? ''}」将进入已结转状态，不可再修改。`}
        onOpenChange={(open: boolean) => { if (!open) setTransferringItem(null); }} onConfirm={() => void handleTransfer()} />
      <AdsConfirmDialog open={deletingItem !== null} title="确认删除？" confirmText="删除" destructive
        description={`删除后成本「${deletingItem?.costNo ?? ''}」将无法恢复。`}
        onOpenChange={(open: boolean) => { if (!open) setDeletingItem(null); }} onConfirm={() => void handleDelete()} />
      <AdsConfirmDialog open={batchAction !== null} confirmText="确认"
        title={batchAction === 'calculate' ? '确认批量核算？' : '确认批量结转？'}
        description={batchAction === 'calculate'
          ? `将对选中的 ${pendingSelectedIds.length} 条待核算成本执行核算。`
          : `将对选中的 ${calculatedSelectedIds.length} 条已核算成本执行结转。`}
        onOpenChange={(open: boolean) => { if (!open) setBatchAction(null); }} onConfirm={() => void handleBatch()} />
    </div>
  );
}
