import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type Key } from 'react';
import dayjs from 'dayjs';
import { Calculator, Download, RotateCcw } from 'lucide-react';
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
import type { VideoCommission, VideoCommissionListParams, VideoCommissionStats } from '@shared/api.interface';
import {
  batchPayVideoCommissions, cancelVideoCommission, deleteVideoCommission,
  fetchVideoCommissionStats, fetchVideoCommissions,
} from '@client/src/api/video-core/commissions';
import { AdsConfirmDialog } from '@client/src/pages/AdsBusiness/AdsConfirmDialog';
import { exportRowsToExcel } from '@client/src/pages/AdsBusiness/ads-excel';
import { VideoCoreTabs } from './VideoCoreTabs';
import { CommissionCalculateDialog, CommissionDetailDialog } from './VideoCommissionDialogs';
import {
  COMMISSION_STATUS_OPTIONS, formatVideoAmount, toVideoErrorText, VIDEO_FILTER_ALL, VideoStatusBadge,
} from './video-constants';

const PAGE_SIZE: number = 10;
const EXPORT_HEADERS: string[] = [
  '提成单号', '关联订单号', '关联项目号', '商务', '项目负责人', '订单金额',
  '成本', '利润', '提成比例(%)', '提成金额', '状态', '周期',
];

const STAT_CARDS: Array<{ key: string; label: string; field: keyof VideoCommissionStats }> = [
  { key: 'monthTotal', label: '本月提成总额', field: 'monthTotal' },
  { key: 'paid', label: '已发放', field: 'paid' },
  { key: 'pending', label: '待发放', field: 'pending' },
];

const reportError = (context: string, error: unknown): void => {
  logger.error(`${context}: ${toVideoErrorText(error)}`);
  toast.error(toVideoErrorText(error));
};

export default function VideoCommissionsPage() {
  /* 筛选（文本防抖） */
  const [draftNo, setDraftNo] = useState<string>('');
  const [draftSalesperson, setDraftSalesperson] = useState<string>('');
  const [draftManager, setDraftManager] = useState<string>('');
  const [draftPeriod, setDraftPeriod] = useState<string>('');
  const [commissionNo, setCommissionNo] = useState<string>('');
  const [salesperson, setSalesperson] = useState<string>('');
  const [projectManager, setProjectManager] = useState<string>('');
  const [period, setPeriod] = useState<string>('');
  const [status, setStatus] = useState<string>(VIDEO_FILTER_ALL);
  const [page, setPage] = useState<number>(1);
  const [items, setItems] = useState<VideoCommission[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedKeys, setSelectedKeys] = useState<Key[]>([]);
  const [stats, setStats] = useState<VideoCommissionStats | null>(null);
  /* 弹窗状态 */
  const [calcOpen, setCalcOpen] = useState<boolean>(false);
  const [detailItem, setDetailItem] = useState<VideoCommission | null>(null);
  const [payingIds, setPayingIds] = useState<number[]>([]);
  const [cancellingItem, setCancellingItem] = useState<VideoCommission | null>(null);
  const [deletingItem, setDeletingItem] = useState<VideoCommission | null>(null);

  useEffect(() => {
    const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
      setCommissionNo(draftNo.trim());
      setSalesperson(draftSalesperson.trim());
      setProjectManager(draftManager.trim());
      setPeriod(draftPeriod.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [draftNo, draftSalesperson, draftManager, draftPeriod]);

  const filterParams = useMemo(
    (): VideoCommissionListParams => ({
      commissionNo: commissionNo || undefined,
      salesperson: salesperson || undefined,
      projectManager: projectManager || undefined,
      status: status === VIDEO_FILTER_ALL ? undefined : status,
      period: period || undefined,
    }),
    [commissionNo, salesperson, projectManager, status, period],
  );

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchVideoCommissions({ ...filterParams, page, pageSize: PAGE_SIZE });
      setItems(result.items);
      setTotal(result.total);
    } catch (error: unknown) {
      reportError('加载提成列表失败', error);
    } finally {
      setLoading(false);
    }
  }, [filterParams, page]);

  const loadStats = useCallback(async () => {
    try {
      setStats(await fetchVideoCommissionStats());
    } catch (error: unknown) {
      logger.error(`加载提成统计失败: ${toVideoErrorText(error)}`);
    }
  }, []);

  useEffect(() => { void loadList(); }, [loadList]);
  useEffect(() => { void loadStats(); }, [loadStats]);

  const refresh = useCallback((): void => {
    setSelectedKeys([]);
    void loadList();
    void loadStats();
  }, [loadList, loadStats]);

  const handleReset = (): void => {
    setDraftNo(''); setDraftSalesperson(''); setDraftManager(''); setDraftPeriod('');
    setCommissionNo(''); setSalesperson(''); setProjectManager(''); setPeriod('');
    setStatus(VIDEO_FILTER_ALL);
    setPage(1);
  };

  const handleBatchPay = async (): Promise<void> => {
    try {
      const result = await batchPayVideoCommissions(payingIds);
      toast.success(`已发放 ${result.updated} 条，跳过 ${result.skipped} 条`);
      setPayingIds([]);
      refresh();
    } catch (error: unknown) {
      reportError('发放提成失败', error);
    }
  };

  const handleCancel = async (): Promise<void> => {
    if (!cancellingItem) return;
    try {
      await cancelVideoCommission(cancellingItem.id);
      toast.success('提成单已取消');
      setCancellingItem(null);
      refresh();
    } catch (error: unknown) {
      reportError('取消提成单失败', error);
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!deletingItem) return;
    try {
      await deleteVideoCommission(deletingItem.id);
      toast.success('提成单已删除');
      setDeletingItem(null);
      refresh();
    } catch (error: unknown) {
      reportError('删除提成单失败', error);
    }
  };

  const collectPendingIds = (): number[] =>
    items
      .filter((item: VideoCommission) => selectedKeys.includes(item.id) && item.status === '待发放')
      .map((item: VideoCommission) => item.id);

  const handleBatchPayClick = (): void => {
    const pendingIds: number[] = collectPendingIds();
    if (pendingIds.length === 0) {
      toast.error('所选记录中没有待发放的提成单');
      return;
    }
    setPayingIds(pendingIds);
  };

  const handleExport = async (): Promise<void> => {
    try {
      const rows: Record<string, string>[] = items.map((item: VideoCommission) => ({
        提成单号: item.commissionNo,
        关联订单号: item.orderNo,
        关联项目号: item.projectNo,
        商务: item.salesperson,
        项目负责人: item.projectManager,
        订单金额: String(item.orderAmount),
        成本: String(item.costAmount),
        利润: String(item.profitAmount),
        '提成比例(%)': String(item.commissionRate),
        提成金额: String(item.commissionAmount),
        状态: item.status,
        周期: item.period,
      }));
      const count: number = await exportRowsToExcel(rows, EXPORT_HEADERS, '提成管理', '提成管理');
      toast.success(`已导出 ${count} 条提成记录`);
    } catch (error: unknown) {
      reportError('导出失败', error);
    }
  };

  const columns = useMemo((): TableColumnsType<VideoCommission> => [
    {
      title: '提成单号',
      dataIndex: 'commissionNo',
      width: 150,
      fixed: 'left',
      render: (value: string) => <span className="font-bold text-primary">{value}</span>,
    },
    { title: '关联订单号', dataIndex: 'orderNo', width: 130 },
    { title: '关联项目号', dataIndex: 'projectNo', width: 130 },
    { title: '商务', dataIndex: 'salesperson', width: 90 },
    { title: '项目负责人', dataIndex: 'projectManager', width: 100 },
    {
      title: '订单金额', dataIndex: 'orderAmount', width: 120, align: 'right',
      render: (value: number) => <span className="font-mono">{formatVideoAmount(value)}</span>,
    },
    {
      title: '成本', dataIndex: 'costAmount', width: 110, align: 'right',
      render: (value: number) => <span className="font-mono">{formatVideoAmount(value)}</span>,
    },
    {
      title: '利润', dataIndex: 'profitAmount', width: 110, align: 'right',
      render: (value: number) => <span className="font-mono">{formatVideoAmount(value)}</span>,
    },
    {
      title: '提成比例(%)', dataIndex: 'commissionRate', width: 100, align: 'right',
      render: (value: number) => <span className="font-mono">{value}%</span>,
    },
    {
      title: '提成金额', dataIndex: 'commissionAmount', width: 130, align: 'right',
      render: (value: number) => (
        <span className="font-mono font-bold text-primary">{formatVideoAmount(value)}</span>
      ),
    },
    {
      title: '状态', dataIndex: 'status', width: 90,
      render: (value: string) => <VideoStatusBadge status={value} />,
    },
    { title: '周期', dataIndex: 'period', width: 90 },
    {
      title: '操作',
      key: 'actions',
      width: 170,
      fixed: 'right',
      render: (_: unknown, record: VideoCommission) => (
        <div className="flex flex-wrap items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => setDetailItem(record)}
            className="h-auto px-1 text-xs text-primary">
            详情
          </Button>
          {record.status === '待发放' ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => setPayingIds([record.id])}
                className="h-auto px-1 text-xs text-primary">
                发放
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setCancellingItem(record)}
                className="h-auto px-1 text-xs text-primary">
                取消
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setDeletingItem(record)}
                className="h-auto px-1 text-xs text-destructive">
                删除
              </Button>
            </>
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

  const hasSelection: boolean = selectedKeys.length > 0;

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-8 px-8 py-8">
      <VideoCoreTabs active="commissions" />
      {/* 统计区 */}
      <ReportCard>
        <SectionHeader no="01" label="COMMISSIONS" subtitle="提成管理 / 计算发放 / 导出" />
        <div className="flex flex-wrap gap-4" data-ai-section-type="card-stat">
          {STAT_CARDS.map((card) => (
            <div key={card.key} className="min-w-[180px] flex-1 border border-t-[3px] border-t-primary bg-card shadow-md">
              <div className="p-4">
                <div className="mb-2 text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">
                  {card.label}
                </div>
                <div className="font-mono text-lg font-bold tracking-tight text-primary">
                  {stats ? formatVideoAmount(stats[card.field]) : '—'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </ReportCard>
      {/* 列表区 */}
      <ReportCard>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Input className="w-32 rounded-none" placeholder="提成单号" value={draftNo}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setDraftNo(event.target.value)} />
          <Input className="w-28 rounded-none" placeholder="商务" value={draftSalesperson}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setDraftSalesperson(event.target.value)} />
          <Input className="w-32 rounded-none" placeholder="项目负责人" value={draftManager}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setDraftManager(event.target.value)} />
          <Input className="w-32 rounded-none" placeholder="归属周期（如 2026-09）" value={draftPeriod}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setDraftPeriod(event.target.value)} />
          <Select value={status} onValueChange={(value: string) => { setStatus(value); setPage(1); }}>
            <SelectTrigger className="w-28 rounded-none"><SelectValue placeholder="状态" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={VIDEO_FILTER_ALL}>全部状态</SelectItem>
              {COMMISSION_STATUS_OPTIONS.map((option: string) => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" className="rounded-none" onClick={handleReset}>
            <RotateCcw className="h-3.5 w-3.5" />
            重置
          </Button>
        </div>
        {/* 操作区 */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button data-ai-section-type="button" onClick={() => setCalcOpen(true)}>
              <Calculator className="h-4 w-4" />
              计算提成
            </Button>
            <Button variant="outline" disabled={!hasSelection} onClick={handleBatchPayClick}>批量发放</Button>
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
        <Table<VideoCommission>
          columns={visibleColumns}
          dataSource={items}
          loading={loading}
          rowKey="id"
          scroll={{ x: 1560, y: 500 }}
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

      {/* 计算提成弹窗 */}
      <CommissionCalculateDialog
        open={calcOpen}
        onDone={refresh}
        onOpenChange={setCalcOpen}
      />

      {/* 详情弹窗 */}
      <CommissionDetailDialog
        open={detailItem !== null}
        commission={detailItem}
        onOpenChange={(open: boolean) => { if (!open) setDetailItem(null); }}
      />

      {/* 发放确认（行内 + 批量） */}
      <AdsConfirmDialog
        open={payingIds.length > 0}
        title="确认发放提成？"
        description={`即将发放 ${payingIds.length} 条提成记录，发放后不可撤销。`}
        confirmText="确认发放"
        onOpenChange={(open: boolean) => { if (!open) setPayingIds([]); }}
        onConfirm={() => void handleBatchPay()}
      />

      {/* 取消二次确认 */}
      <AdsConfirmDialog
        open={cancellingItem !== null}
        title="确认取消？"
        description={`即将取消提成单「${cancellingItem?.commissionNo ?? ''}」，取消后不可恢复。`}
        confirmText="确认取消"
        onOpenChange={(open: boolean) => { if (!open) setCancellingItem(null); }}
        onConfirm={() => void handleCancel()}
      />

      {/* 删除二次确认 */}
      <AdsConfirmDialog
        open={deletingItem !== null}
        title="确认删除？"
        description={`即将删除提成单「${deletingItem?.commissionNo ?? ''}」，删除后不可恢复。`}
        confirmText="确认删除"
        destructive
        onOpenChange={(open: boolean) => { if (!open) setDeletingItem(null); }}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}
