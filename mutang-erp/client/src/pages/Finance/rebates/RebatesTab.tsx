import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { Download, Plus, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Table, type TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import { ReportCard, SectionHeader } from '@client/src/components/blueprint';
import { ColumnSettingsButton } from '@client/src/components/column-settings-button';
import { useColumnSettings } from '@client/src/hooks/useColumnSettings';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import type { FinanceRebate, FinanceRebateListParams } from '@shared/api.interface';
import {
  calculateFinanceRebate, cancelFinanceRebate, deleteFinanceRebate, fetchFinanceRebates,
} from '@client/src/api/finance-enhance/rebates';
import { AdsConfirmDialog } from '@client/src/pages/AdsBusiness/AdsConfirmDialog';
import { exportRowsToExcel } from '@client/src/pages/AdsBusiness/ads-excel';
import { FINANCE_FILTER_ALL, formatFinanceAmount } from '../finance-constants';
import { RebateIssueDialog, RebateFormDialog } from './RebateDialogs';
import {
  ActionLink, FilterSelect, REBATE_STATUS_BADGE, REBATE_STATUS_OPTIONS, RebateBadge,
  reportRebateError,
} from './shared';

const PAGE_SIZE: number = 10;

export function RebatesTab() {
  /* 筛选（文本防抖） */
  const [draftCustomer, setDraftCustomer] = useState<string>('');
  const [draftPeriod, setDraftPeriod] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [period, setPeriod] = useState<string>('');
  const [status, setStatus] = useState<string>(FINANCE_FILTER_ALL);
  const [page, setPage] = useState<number>(1);
  const [items, setItems] = useState<FinanceRebate[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  /* 弹窗状态 */
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [editing, setEditing] = useState<FinanceRebate | null>(null);
  const [deletingItem, setDeletingItem] = useState<FinanceRebate | null>(null);
  const [calculatingItem, setCalculatingItem] = useState<FinanceRebate | null>(null);
  const [cancelingItem, setCancelingItem] = useState<FinanceRebate | null>(null);
  const [issuingItem, setIssuingItem] = useState<FinanceRebate | null>(null);

  useEffect(() => {
    const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
      setCustomerName(draftCustomer.trim());
      setPeriod(draftPeriod.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [draftCustomer, draftPeriod]);

  const filterParams = useMemo(
    (): FinanceRebateListParams => ({
      customerName: customerName || undefined,
      period: period || undefined,
      status: status === FINANCE_FILTER_ALL ? undefined : status,
    }),
    [customerName, period, status],
  );

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchFinanceRebates({ ...filterParams, page, pageSize: PAGE_SIZE });
      setItems(result.items);
      setTotal(result.total);
    } catch (error: unknown) {
      reportRebateError('加载后返列表失败', error);
    } finally {
      setLoading(false);
    }
  }, [filterParams, page]);

  useEffect(() => { void loadList(); }, [loadList]);

  const refresh = useCallback((): void => { void loadList(); }, [loadList]);

  const handleReset = (): void => {
    setDraftCustomer('');
    setDraftPeriod('');
    setCustomerName('');
    setPeriod('');
    setStatus(FINANCE_FILTER_ALL);
    setPage(1);
  };

  const openCreate = (): void => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (item: FinanceRebate): void => {
    setEditing(item);
    setFormOpen(true);
  };

  const handleCalculate = async (): Promise<void> => {
    if (!calculatingItem) return;
    try {
      await calculateFinanceRebate(calculatingItem.id);
      toast.success('后返已核算');
      setCalculatingItem(null);
      refresh();
    } catch (error: unknown) {
      reportRebateError('核算后返失败', error);
    }
  };

  const handleCancel = async (): Promise<void> => {
    if (!cancelingItem) return;
    try {
      await cancelFinanceRebate(cancelingItem.id);
      toast.success('后返已取消');
      setCancelingItem(null);
      refresh();
    } catch (error: unknown) {
      reportRebateError('取消后返失败', error);
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!deletingItem) return;
    try {
      await deleteFinanceRebate(deletingItem.id);
      toast.success('后返记录已删除');
      setDeletingItem(null);
      refresh();
    } catch (error: unknown) {
      reportRebateError('删除后返记录失败', error);
    }
  };

  const handleExport = async (): Promise<void> => {
    try {
      const rows: Record<string, string>[] = items.map((item: FinanceRebate) => ({
        后返单号: item.rebateNo,
        客户名称: item.customerName,
        端口: item.portName,
        期间: item.period,
        消耗基数: String(item.consumptionBase),
        返点比例: `${(item.rebateRate * 100).toFixed(2)}%`,
        返点金额: String(item.rebateAmount),
        状态: item.status,
        核算时间: item.calculateTime ?? '',
        发放时间: item.issueTime ?? '',
        备注: item.remark,
      }));
      const count: number = await exportRowsToExcel(
        rows, Object.keys(rows[0] ?? { 后返单号: '' }), '后返管理', '后返管理',
      );
      toast.success(`已导出 ${count} 条后返记录`);
    } catch (error: unknown) {
      reportRebateError('导出失败', error);
    }
  };

  const columns = useMemo((): TableColumnsType<FinanceRebate> => [
    {
      title: '后返单号', key: 'rbt.rebateNo', dataIndex: 'rebateNo', width: 160, fixed: 'left',
      render: (value: string) => <span className="font-bold text-primary">{value}</span>,
    },
    { title: '客户名称', key: 'rbt.customerName', dataIndex: 'customerName', width: 130 },
    { title: '端口', key: 'rbt.portName', dataIndex: 'portName', width: 120 },
    { title: '期间', key: 'rbt.period', dataIndex: 'period', width: 90 },
    {
      title: '消耗基数', key: 'rbt.consumptionBase', dataIndex: 'consumptionBase',
      width: 130, align: 'right',
      render: (value: number) => <span className="font-mono">{formatFinanceAmount(value)}</span>,
    },
    {
      title: '返点比例', key: 'rbt.rebateRate', dataIndex: 'rebateRate', width: 90, align: 'right',
      render: (value: number) => <span className="font-mono">{`${(value * 100).toFixed(2)}%`}</span>,
    },
    {
      title: '返点金额', key: 'rbt.rebateAmount', dataIndex: 'rebateAmount', width: 130, align: 'right',
      render: (value: number) => <span className="font-mono">{formatFinanceAmount(value)}</span>,
    },
    {
      title: '状态', key: 'rbt.status', dataIndex: 'status', width: 90,
      render: (value: string) => <RebateBadge status={value} badgeMap={REBATE_STATUS_BADGE} />,
    },
    {
      title: '核算时间', key: 'rbt.calculateTime', dataIndex: 'calculateTime', width: 160,
      render: (value: string | null) => value ?? '-',
    },
    {
      title: '发放时间', key: 'rbt.issueTime', dataIndex: 'issueTime', width: 160,
      render: (value: string | null) => value ?? '-',
    },
    {
      title: '操作', key: 'rbt.actions', width: 190, fixed: 'right',
      render: (_: unknown, record: FinanceRebate) => (
        <div className="flex flex-wrap items-center gap-1">
          {record.status === '待核算' ? (
            <ActionLink onClick={() => setCalculatingItem(record)}>核算</ActionLink>
          ) : null}
          {record.status === '已核算' ? (
            <ActionLink onClick={() => setIssuingItem(record)}>发放</ActionLink>
          ) : null}
          {record.status === '待核算' || record.status === '已核算' ? (
            <ActionLink danger onClick={() => setCancelingItem(record)}>取消</ActionLink>
          ) : null}
          {record.status !== '已发放' ? (
            <ActionLink onClick={() => openEdit(record)}>编辑</ActionLink>
          ) : null}
          {record.status !== '已发放' ? (
            <ActionLink danger onClick={() => setDeletingItem(record)}>删除</ActionLink>
          ) : null}
        </div>
      ),
    },
  ], []);

  const {
    visibleColumns, columnMetas, hiddenIds,
    toggleColumn, resetColumns, setAllColumns,
  } = useColumnSettings(columns);

  return (
    <ReportCard>
      <SectionHeader no="02" label="REBATE" subtitle="后返管理 / 核算发放 / 导出" />
      {/* 筛选区 */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input className="w-36 rounded-none" placeholder="客户名称" value={draftCustomer}
          onChange={(event: ChangeEvent<HTMLInputElement>) => setDraftCustomer(event.target.value)} />
        <Input className="w-32 rounded-none" placeholder="期间 如 2026-08" value={draftPeriod}
          onChange={(event: ChangeEvent<HTMLInputElement>) => setDraftPeriod(event.target.value)} />
        <FilterSelect value={status} placeholder="状态" allLabel="全部状态"
          options={REBATE_STATUS_OPTIONS}
          onChange={(value: string) => { setStatus(value); setPage(1); }} />
        <Button variant="ghost" size="sm" className="rounded-none" onClick={handleReset}>
          <RotateCcw className="h-3.5 w-3.5" />
          重置
        </Button>
      </div>
      {/* 操作区 */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button data-ai-section-type="button" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          新建后返
        </Button>
        <Button variant="outline" onClick={() => void handleExport()}>
          <Download className="h-4 w-4" />
          导出Excel
        </Button>
        <ColumnSettingsButton
          columnMetas={columnMetas} hiddenIds={hiddenIds}
          onToggle={toggleColumn} onReset={resetColumns} onSetAll={setAllColumns}
        />
      </div>
      <Table<FinanceRebate>
        columns={visibleColumns}
        dataSource={items}
        loading={loading}
        rowKey="id"
        scroll={{ x: 1500, y: 500 }}
        pagination={{
          current: page,
          pageSize: PAGE_SIZE,
          total,
          onChange: (nextPage: number) => setPage(nextPage),
        }}
      />

      {/* 新建 / 编辑弹窗 */}
      <RebateFormDialog open={formOpen} editing={editing} onSaved={refresh} onOpenChange={setFormOpen} />

      {/* 发放弹窗 */}
      <RebateIssueDialog
        open={issuingItem !== null}
        rebate={issuingItem}
        onDone={refresh}
        onOpenChange={(open: boolean) => { if (!open) setIssuingItem(null); }}
      />

      {/* 核算确认 */}
      <AdsConfirmDialog
        open={calculatingItem !== null}
        title="确认核算？"
        description={`即将核算后返单「${calculatingItem?.rebateNo ?? ''}」，核算后将计算返点金额。`}
        confirmText="确认核算"
        onOpenChange={(open: boolean) => { if (!open) setCalculatingItem(null); }}
        onConfirm={() => void handleCalculate()}
      />

      {/* 取消确认 */}
      <AdsConfirmDialog
        open={cancelingItem !== null}
        title="确认取消？"
        description={`即将取消后返单「${cancelingItem?.rebateNo ?? ''}」，取消后不可恢复。`}
        confirmText="确认取消"
        destructive
        onOpenChange={(open: boolean) => { if (!open) setCancelingItem(null); }}
        onConfirm={() => void handleCancel()}
      />

      {/* 删除二次确认 */}
      <AdsConfirmDialog
        open={deletingItem !== null}
        title="确认删除？"
        description={`即将删除后返记录「${deletingItem?.rebateNo ?? ''}」，删除后不可恢复。`}
        confirmText="确认删除"
        destructive
        onOpenChange={(open: boolean) => { if (!open) setDeletingItem(null); }}
        onConfirm={() => void handleDelete()}
      />
    </ReportCard>
  );
}
