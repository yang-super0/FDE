import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Download, Plus, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Table, type TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import { ReportCard, SectionHeader } from '@client/src/components/blueprint';
import { ColumnSettingsButton } from '@client/src/components/column-settings-button';
import { useColumnSettings } from '@client/src/hooks/useColumnSettings';
import { Button } from '@client/src/components/ui/button';
import type {
  FinanceIncome, FinanceIncomeListParams,
} from '@shared/api.interface';
import {
  confirmFinanceIncome, deleteFinanceIncome, fetchFinanceIncomes,
  fetchFinanceIncomeSummary, type FinanceIncomeSummaryItem,
} from '@client/src/api/finance-enhance/expenses';
import { AdsConfirmDialog } from '@client/src/pages/AdsBusiness/AdsConfirmDialog';
import { AdsDatePickerButton } from '@client/src/pages/AdsBusiness/AdsDatePickerButton';
import { exportRowsToExcel } from '@client/src/pages/AdsBusiness/ads-excel';
import { FINANCE_FILTER_ALL, formatFinanceAmount } from '../finance-constants';
import { IncomeFormDialog } from './IncomesDialogs';
import {
  ActionLink, FilterSelect, FinanceEnhanceStatusBadge, reportError,
} from './expenses-shared';

const PAGE_SIZE: number = 10;

const INCOME_TYPE_OPTIONS: string[] = ['服务费', '返点差', '利息', '其他'];
const INCOME_STATUS_OPTIONS: string[] = ['待确认', '已确认'];

const INCOME_STATUS_BADGE: Record<string, string> = {
  待确认: 'bg-[#FFF7ED] text-[#F97316]',
  已确认: 'bg-[#ECFDF5] text-[#10B981]',
};

export function IncomesTab() {
  const [incomeType, setIncomeType] = useState<string>(FINANCE_FILTER_ALL);
  const [status, setStatus] = useState<string>(FINANCE_FILTER_ALL);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [page, setPage] = useState<number>(1);
  const [items, setItems] = useState<FinanceIncome[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [summaryItems, setSummaryItems] = useState<FinanceIncomeSummaryItem[]>([]);
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [confirmingItem, setConfirmingItem] = useState<FinanceIncome | null>(null);
  const [deletingItem, setDeletingItem] = useState<FinanceIncome | null>(null);

  const dateFrom: string | undefined = startDate ? dayjs(startDate).format('YYYY-MM-DD') : undefined;
  const dateTo: string | undefined = endDate ? dayjs(endDate).format('YYYY-MM-DD') : undefined;

  const filterParams = useMemo(
    (): FinanceIncomeListParams => ({
      incomeType: incomeType === FINANCE_FILTER_ALL ? undefined : incomeType,
      status: status === FINANCE_FILTER_ALL ? undefined : status,
      dateFrom,
      dateTo,
    }),
    [incomeType, status, dateFrom, dateTo],
  );

  const loadSummary = useCallback(async () => {
    try {
      const result = await fetchFinanceIncomeSummary({ dateFrom, dateTo });
      setSummaryItems(result.items);
    } catch (error: unknown) {
      reportError('加载收入汇总失败', error);
    }
  }, [dateFrom, dateTo]);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchFinanceIncomes({ ...filterParams, page, pageSize: PAGE_SIZE });
      setItems(result.items);
      setTotal(result.total);
    } catch (error: unknown) {
      reportError('加载收入列表失败', error);
    } finally {
      setLoading(false);
    }
  }, [filterParams, page]);

  useEffect(() => {
    void loadList();
    void loadSummary();
  }, [loadList, loadSummary]);

  const refresh = useCallback((): void => {
    void loadList();
    void loadSummary();
  }, [loadList, loadSummary]);

  const handleReset = (): void => {
    setIncomeType(FINANCE_FILTER_ALL);
    setStatus(FINANCE_FILTER_ALL);
    setStartDate(undefined);
    setEndDate(undefined);
    setPage(1);
  };

  const handleConfirm = async (): Promise<void> => {
    if (!confirmingItem) return;
    try {
      await confirmFinanceIncome(confirmingItem.id);
      toast.success('收入已确认');
      setConfirmingItem(null);
      refresh();
    } catch (error: unknown) {
      reportError('确认收入失败', error);
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!deletingItem) return;
    try {
      await deleteFinanceIncome(deletingItem.id);
      toast.success('收入已删除');
      setDeletingItem(null);
      refresh();
    } catch (error: unknown) {
      reportError('删除收入失败', error);
    }
  };

  const handleExport = async (): Promise<void> => {
    try {
      const rows: Record<string, string>[] = items.map((item: FinanceIncome) => ({
        收入单号: item.incomeNo,
        收入类型: item.incomeType,
        客户名称: item.customerName,
        金额: String(item.amount),
        收入日期: item.incomeDate,
        关联订单号: item.relatedOrderNo,
        状态: item.status,
        经办人: item.operator,
        备注: item.remark,
        创建时间: dayjs(item.createdAt).format('YYYY-MM-DD HH:mm'),
      }));
      const count: number = await exportRowsToExcel(rows, Object.keys(rows[0] ?? { 收入单号: '' }), '收入管理', '收入管理');
      toast.success(`已导出 ${count} 条收入记录`);
    } catch (error: unknown) {
      reportError('导出失败', error);
    }
  };

  const columns = useMemo((): TableColumnsType<FinanceIncome> => [
    {
      title: '收入单号',
      dataIndex: 'incomeNo',
      width: 150,
      fixed: 'left',
      render: (value: string) => <span className="font-bold text-primary">{value}</span>,
    },
    { title: '收入类型', dataIndex: 'incomeType', width: 100 },
    { title: '客户名称', dataIndex: 'customerName', width: 140, ellipsis: true },
    {
      title: '金额',
      dataIndex: 'amount',
      width: 130,
      align: 'right',
      render: (value: number) => <span className="font-mono">{formatFinanceAmount(value)}</span>,
    },
    { title: '收入日期', dataIndex: 'incomeDate', width: 110 },
    { title: '关联订单号', dataIndex: 'relatedOrderNo', width: 130, ellipsis: true },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (value: string) => <FinanceEnhanceStatusBadge status={value} map={INCOME_STATUS_BADGE} />,
    },
    { title: '经办人', dataIndex: 'operator', width: 100 },
    { title: '备注', dataIndex: 'remark', width: 120, ellipsis: true },
    {
      title: '操作',
      key: 'actions',
      width: 140,
      fixed: 'right',
      render: (_: unknown, record: FinanceIncome) => (
        <div className="flex flex-wrap items-center gap-1">
          {record.status === '待确认' ? (
            <ActionLink onClick={() => setConfirmingItem(record)}>确认</ActionLink>
          ) : null}
          {record.status !== '已确认' ? (
            <ActionLink danger onClick={() => setDeletingItem(record)}>删除</ActionLink>
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

  return (
    <ReportCard>
      <SectionHeader no="05" label="INCOMES" subtitle="收入管理 / 确认 / 类型汇总 / 导出" />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {summaryItems.length === 0 ? (
          <div className="col-span-full border border-border p-3 text-xs text-muted-foreground">
            暂无收入汇总数据
          </div>
        ) : null}
        {summaryItems.map((item: FinanceIncomeSummaryItem) => (
          <div key={item.incomeType} className="border border-border p-3" data-ai-section-type="card-stat">
            <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
              {item.incomeType}
            </div>
            <div className="mt-1 font-mono text-lg font-bold text-primary">
              {formatFinanceAmount(item.totalAmount)}
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">{item.count} 笔</div>
          </div>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <FilterSelect
          value={incomeType}
          placeholder="收入类型"
          allLabel="全部类型"
          options={INCOME_TYPE_OPTIONS}
          onChange={(value: string) => {
            setIncomeType(value);
            setPage(1);
          }}
        />
        <FilterSelect
          value={status}
          placeholder="状态"
          allLabel="全部状态"
          options={INCOME_STATUS_OPTIONS}
          onChange={(value: string) => {
            setStatus(value);
            setPage(1);
          }}
        />
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">收入日期</span>
          <AdsDatePickerButton value={startDate} placeholder="开始日期"
            onChange={(date: Date | undefined) => {
              setStartDate(date);
              setPage(1);
            }} />
          <span className="text-xs text-muted-foreground">至</span>
          <AdsDatePickerButton value={endDate} placeholder="结束日期"
            onChange={(date: Date | undefined) => {
              setEndDate(date);
              setPage(1);
            }} />
        </div>
        <Button variant="ghost" size="sm" className="rounded-none" onClick={handleReset}>
          <RotateCcw className="h-3.5 w-3.5" />
          重置
        </Button>
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button data-ai-section-type="button" onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" />
          新建收入
        </Button>
        <Button variant="outline" className="rounded-none" onClick={() => void handleExport()}>
          <Download className="h-4 w-4" />
          导出Excel
        </Button>
        <ColumnSettingsButton
          columnMetas={columnMetas} hiddenIds={hiddenIds}
          onToggle={toggleColumn} onReset={resetColumns} onSetAll={setAllColumns}
        />
      </div>
      <Table<FinanceIncome>
        columns={visibleColumns}
        dataSource={items}
        loading={loading}
        rowKey="id"
        scroll={{ x: 1300, y: 500 }}
        pagination={{
          current: page,
          pageSize: PAGE_SIZE,
          total,
          onChange: (nextPage: number) => setPage(nextPage),
        }}
      />

      <IncomeFormDialog open={formOpen} onSaved={refresh} onOpenChange={setFormOpen} />

      <AdsConfirmDialog
        open={confirmingItem !== null}
        title="确认收入？"
        description={`即将确认收入「${confirmingItem?.incomeNo ?? ''}」，确认后不可撤销且不可删除。`}
        confirmText="确认"
        onOpenChange={(open: boolean) => {
          if (!open) setConfirmingItem(null);
        }}
        onConfirm={() => void handleConfirm()}
      />

      <AdsConfirmDialog
        open={deletingItem !== null}
        title="确认删除？"
        description={`即将删除收入「${deletingItem?.incomeNo ?? ''}」，删除后不可恢复。`}
        confirmText="确认删除"
        destructive
        onOpenChange={(open: boolean) => {
          if (!open) setDeletingItem(null);
        }}
        onConfirm={() => void handleDelete()}
      />
    </ReportCard>
  );
}
