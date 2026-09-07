import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import dayjs from 'dayjs';
import { Download, Plus, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Table, type TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import { ReportCard, SectionHeader } from '@client/src/components/blueprint';
import { ColumnSettingsButton } from '@client/src/components/column-settings-button';
import { useColumnSettings } from '@client/src/hooks/useColumnSettings';
import { Button } from '@client/src/components/ui/button';
import type { FinanceConsumption, FinanceConsumptionListParams } from '@shared/api.interface';
import { checkFinanceConsumption, fetchFinanceConsumptions } from '@client/src/api/finance-enhance/rebates';
import { AdsConfirmDialog } from '@client/src/pages/AdsBusiness/AdsConfirmDialog';
import { AdsDatePickerButton } from '@client/src/pages/AdsBusiness/AdsDatePickerButton';
import { exportRowsToExcel } from '@client/src/pages/AdsBusiness/ads-excel';
import { FINANCE_FILTER_ALL, formatFinanceAmount } from '../finance-constants';
import { ConsumptionFormDialog } from './ConsumptionDialogs';
import {
  ActionLink, CONSUMPTION_STATUS_BADGE, CONSUMPTION_STATUS_OPTIONS, FilterSelect, RebateBadge,
  reportRebateError,
} from './shared';

const PAGE_SIZE: number = 10;

export function ConsumptionsTab() {
  /* 筛选 */
  const [status, setStatus] = useState<string>(FINANCE_FILTER_ALL);
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [page, setPage] = useState<number>(1);
  const [items, setItems] = useState<FinanceConsumption[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  /* 弹窗状态 */
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [editing, setEditing] = useState<FinanceConsumption | null>(null);
  const [checkingItem, setCheckingItem] = useState<FinanceConsumption | null>(null);

  const filterParams = useMemo(
    (): FinanceConsumptionListParams => ({
      status: status === FINANCE_FILTER_ALL ? undefined : status,
      consumptionDateFrom: dateFrom ? dayjs(dateFrom).format('YYYY-MM-DD') : undefined,
      consumptionDateTo: dateTo ? dayjs(dateTo).format('YYYY-MM-DD') : undefined,
    }),
    [status, dateFrom, dateTo],
  );

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchFinanceConsumptions({ ...filterParams, page, pageSize: PAGE_SIZE });
      setItems(result.items);
      setTotal(result.total);
    } catch (error: unknown) {
      reportRebateError('加载消耗列表失败', error);
    } finally {
      setLoading(false);
    }
  }, [filterParams, page]);

  useEffect(() => { void loadList(); }, [loadList]);

  const refresh = useCallback((): void => { void loadList(); }, [loadList]);

  const handleReset = (): void => {
    setStatus(FINANCE_FILTER_ALL);
    setDateFrom(undefined);
    setDateTo(undefined);
    setPage(1);
  };

  const openCreate = (): void => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (item: FinanceConsumption): void => {
    setEditing(item);
    setFormOpen(true);
  };

  const handleCheck = async (): Promise<void> => {
    if (!checkingItem) return;
    try {
      await checkFinanceConsumption(checkingItem.id);
      toast.success('消耗记录已核对确认');
      setCheckingItem(null);
      refresh();
    } catch (error: unknown) {
      reportRebateError('核对确认失败', error);
    }
  };

  const handleExport = async (): Promise<void> => {
    try {
      const rows: Record<string, string>[] = items.map((item: FinanceConsumption) => ({
        消耗单号: item.consumptionNo,
        客户ID: item.customerId,
        广告账户ID: item.adAccountId,
        端口ID: item.portId === null ? '' : String(item.portId),
        消耗日期: item.consumptionDate,
        消耗金额: String(item.amount),
        平台数据: String(item.platformData),
        系统数据: String(item.systemData),
        差异: String(item.difference),
        状态: item.status,
        核对人: item.checker,
        核对时间: item.checkTime ?? '',
        备注: item.remark,
      }));
      const count: number = await exportRowsToExcel(
        rows, Object.keys(rows[0] ?? { 消耗单号: '' }), '消耗管理', '消耗管理',
      );
      toast.success(`已导出 ${count} 条消耗记录`);
    } catch (error: unknown) {
      reportRebateError('导出失败', error);
    }
  };

  const renderAmount = (value: number): ReactNode => (
    <span className="font-mono">{formatFinanceAmount(value)}</span>
  );

  const columns = useMemo((): TableColumnsType<FinanceConsumption> => [
    {
      title: '消耗单号', key: 'csm.consumptionNo', dataIndex: 'consumptionNo', width: 160, fixed: 'left',
      render: (value: string) => <span className="font-bold text-primary">{value}</span>,
    },
    { title: '客户ID', key: 'csm.customerId', dataIndex: 'customerId', width: 120 },
    { title: '广告账户ID', key: 'csm.adAccountId', dataIndex: 'adAccountId', width: 130 },
    {
      title: '消耗日期', key: 'csm.consumptionDate', dataIndex: 'consumptionDate', width: 110,
    },
    {
      title: '消耗金额', key: 'csm.amount', dataIndex: 'amount', width: 130, align: 'right',
      render: (value: number) => renderAmount(value),
    },
    {
      title: '平台数据', key: 'csm.platformData', dataIndex: 'platformData', width: 130, align: 'right',
      render: (value: number) => renderAmount(value),
    },
    {
      title: '系统数据', key: 'csm.systemData', dataIndex: 'systemData', width: 130, align: 'right',
      render: (value: number) => renderAmount(value),
    },
    {
      title: '差异', key: 'csm.difference', dataIndex: 'difference', width: 110, align: 'right',
      render: (value: number) => (value !== 0 ? (
        <span className="inline-flex items-center rounded-[2px] bg-[#FFF7ED] px-2 py-0.5 text-[10px] font-bold text-[#F97316]">
          {value > 0 ? `+${value}` : String(value)}
        </span>
      ) : (
        <span className="font-mono">{value}</span>
      )),
    },
    {
      title: '状态', key: 'csm.status', dataIndex: 'status', width: 90,
      render: (value: string) => <RebateBadge status={value} badgeMap={CONSUMPTION_STATUS_BADGE} />,
    },
    { title: '核对人', key: 'csm.checker', dataIndex: 'checker', width: 100 },
    {
      title: '核对时间', key: 'csm.checkTime', dataIndex: 'checkTime', width: 160,
      render: (value: string | null) => value ?? '-',
    },
    {
      title: '操作', key: 'csm.actions', width: 150, fixed: 'right',
      render: (_: unknown, record: FinanceConsumption) => (
        <div className="flex flex-wrap items-center gap-1">
          {record.status !== '已核对' ? (
            <ActionLink onClick={() => openEdit(record)}>编辑</ActionLink>
          ) : null}
          {record.status !== '已核对' ? (
            <ActionLink onClick={() => setCheckingItem(record)}>核对确认</ActionLink>
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
      <SectionHeader no="04" label="CONSUMPTION" subtitle="消耗管理 / 核对确认 / 导出" />
      {/* 筛选区 */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <FilterSelect value={status} placeholder="状态" allLabel="全部状态"
          options={CONSUMPTION_STATUS_OPTIONS}
          onChange={(value: string) => { setStatus(value); setPage(1); }} />
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">消耗日期</span>
          <AdsDatePickerButton value={dateFrom} placeholder="开始日期"
            onChange={(date: Date | undefined) => { setDateFrom(date); setPage(1); }} />
          <span className="text-xs text-muted-foreground">至</span>
          <AdsDatePickerButton value={dateTo} placeholder="结束日期"
            onChange={(date: Date | undefined) => { setDateTo(date); setPage(1); }} />
        </div>
        <Button variant="ghost" size="sm" className="rounded-none" onClick={handleReset}>
          <RotateCcw className="h-3.5 w-3.5" />
          重置
        </Button>
      </div>
      {/* 操作区 */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button data-ai-section-type="button" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          新建消耗
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
      <Table<FinanceConsumption>
        columns={visibleColumns}
        dataSource={items}
        loading={loading}
        rowKey="id"
        scroll={{ x: 1600, y: 500 }}
        pagination={{
          current: page,
          pageSize: PAGE_SIZE,
          total,
          onChange: (nextPage: number) => setPage(nextPage),
        }}
      />

      {/* 新建 / 编辑弹窗 */}
      <ConsumptionFormDialog
        open={formOpen} editing={editing} onSaved={refresh} onOpenChange={setFormOpen}
      />

      {/* 核对确认 */}
      <AdsConfirmDialog
        open={checkingItem !== null}
        title="核对确认？"
        description={`即将核对确认消耗单「${checkingItem?.consumptionNo ?? ''}」，确认后不可再编辑。`}
        confirmText="确认核对"
        onOpenChange={(open: boolean) => { if (!open) setCheckingItem(null); }}
        onConfirm={() => void handleCheck()}
      />
    </ReportCard>
  );
}
