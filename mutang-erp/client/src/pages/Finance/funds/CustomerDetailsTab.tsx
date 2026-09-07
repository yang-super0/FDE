import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import dayjs from 'dayjs';
import { Download, Plus, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Table, type TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import { ColumnSettingsButton } from '@client/src/components/column-settings-button';
import { useColumnSettings } from '@client/src/hooks/useColumnSettings';
import { Button } from '@client/src/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@client/src/components/ui/dialog';
import type { CustomerFinanceDetail, CustomerFinanceDetailListParams } from '@shared/api.interface';
import { fetchFinanceCustomerDetails } from '@client/src/api/finance-enhance/funds';
import { AdsDatePickerButton } from '@client/src/pages/AdsBusiness/AdsDatePickerButton';
import { exportRowsToExcel } from '@client/src/pages/AdsBusiness/ads-excel';
import { AdjustmentFormDialog } from './AdjustmentFormDialog';
import { FINANCE_FILTER_ALL, formatFinanceAmount } from '../finance-constants';
import {
  FUNDS_EXPORT_LIMIT, FUNDS_PAGE_SIZE, FUNDS_TRANSACTION_TYPE_OPTIONS,
  FundsActionLink, FundsFilterSelect, FundsStatusBadge, FundsCustomerSelect,
  reportFundsError, useFundCustomerOptions,
} from './funds-shared';

const EXPORT_HEADERS: string[] = [
  '明细编号', '客户名称', '交易类型', '金额', '交易后余额', '关联单号', '备注', '交易时间',
];

export function CustomerDetailsTab() {
  const [customerId, setCustomerId] = useState<string>(FINANCE_FILTER_ALL);
  const [transactionType, setTransactionType] = useState<string>(FINANCE_FILTER_ALL);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [page, setPage] = useState<number>(1);
  const [items, setItems] = useState<CustomerFinanceDetail[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [detailItem, setDetailItem] = useState<CustomerFinanceDetail | null>(null);
  const customers = useFundCustomerOptions();

  const filterParams = useMemo((): CustomerFinanceDetailListParams => ({
    customerId: customerId === FINANCE_FILTER_ALL ? undefined : customerId,
    transactionType: transactionType === FINANCE_FILTER_ALL ? undefined : transactionType,
    startDate: startDate ? dayjs(startDate).format('YYYY-MM-DD') : undefined,
    endDate: endDate ? dayjs(endDate).format('YYYY-MM-DD') : undefined,
  }), [customerId, transactionType, startDate, endDate]);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchFinanceCustomerDetails({
        ...filterParams, page, pageSize: FUNDS_PAGE_SIZE,
      });
      setItems(result.items);
      setTotal(result.total);
    } catch (error: unknown) {
      reportFundsError('加载客户明细失败', error);
    } finally {
      setLoading(false);
    }
  }, [filterParams, page]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const refresh = useCallback((): void => {
    void loadList();
  }, [loadList]);

  const handleReset = (): void => {
    setCustomerId(FINANCE_FILTER_ALL);
    setTransactionType(FINANCE_FILTER_ALL);
    setStartDate(undefined);
    setEndDate(undefined);
    setPage(1);
  };

  const handleExport = async (): Promise<void> => {
    try {
      const result = await fetchFinanceCustomerDetails({
        ...filterParams, page: 1, pageSize: FUNDS_EXPORT_LIMIT,
      });
      const rows: Record<string, string>[] = result.items.map(
        (item: CustomerFinanceDetail) => ({
          明细编号: item.detailNo,
          客户名称: item.customerName,
          交易类型: item.transactionType,
          金额: String(item.amount),
          交易后余额: String(item.balanceAfter),
          关联单号: item.relatedOrderNo,
          备注: item.remark,
          交易时间: item.transactionTime,
        }),
      );
      const count: number = await exportRowsToExcel(rows, EXPORT_HEADERS, '客户明细', '客户明细');
      toast.success(`已导出 ${count} 条客户明细`);
    } catch (error: unknown) {
      reportFundsError('导出客户明细失败', error);
    }
  };

  const columns = useMemo((): TableColumnsType<CustomerFinanceDetail> => [
    {
      key: 'cd-detailNo', title: '明细编号', dataIndex: 'detailNo', width: 150, fixed: 'left',
      render: (value: string) => <span className="font-bold text-primary">{value}</span>,
    },
    { key: 'cd-customerName', title: '客户名称', dataIndex: 'customerName', width: 140 },
    {
      key: 'cd-transactionType', title: '交易类型', dataIndex: 'transactionType', width: 90,
      render: (value: string) => <FundsStatusBadge status={value} />,
    },
    {
      key: 'cd-amount', title: '金额', dataIndex: 'amount', width: 130, align: 'right',
      render: (value: number) => <span className="font-mono">{formatFinanceAmount(value)}</span>,
    },
    {
      key: 'cd-balanceAfter', title: '交易后余额', dataIndex: 'balanceAfter', width: 130,
      align: 'right',
      render: (value: number) => <span className="font-mono">{formatFinanceAmount(value)}</span>,
    },
    { key: 'cd-relatedOrderNo', title: '关联单号', dataIndex: 'relatedOrderNo', width: 150 },
    { key: 'cd-remark', title: '备注', dataIndex: 'remark', width: 140 },
    {
      key: 'cd-transactionTime', title: '交易时间', dataIndex: 'transactionTime', width: 150,
    },
    {
      key: 'cd-actions', title: '操作', width: 80, fixed: 'right',
      render: (_: unknown, record: CustomerFinanceDetail) => (
        <FundsActionLink onClick={() => setDetailItem(record)}>查看</FundsActionLink>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], []);

  const {
    visibleColumns, columnMetas, hiddenIds,
    toggleColumn, resetColumns, setAllColumns,
  } = useColumnSettings(columns);

  return (
    <div>
      {/* 筛选区 */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <FundsCustomerSelect
          value={customerId === FINANCE_FILTER_ALL ? '' : customerId}
          customers={customers}
          placeholder="选择客户"
          onChange={(next: string) => {
            setCustomerId(next || FINANCE_FILTER_ALL);
            setPage(1);
          }}
        />
        <FundsFilterSelect
          value={transactionType}
          placeholder="交易类型"
          allLabel="全部类型"
          options={FUNDS_TRANSACTION_TYPE_OPTIONS}
          onChange={(value: string) => {
            setTransactionType(value);
            setPage(1);
          }}
        />
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">交易日期</span>
          <AdsDatePickerButton
            value={startDate}
            placeholder="开始日期"
            onChange={(date: Date | undefined) => {
              setStartDate(date);
              setPage(1);
            }}
          />
          <span className="text-xs text-muted-foreground">至</span>
          <AdsDatePickerButton
            value={endDate}
            placeholder="结束日期"
            onChange={(date: Date | undefined) => {
              setEndDate(date);
              setPage(1);
            }}
          />
        </div>
        <Button variant="ghost" size="sm" className="rounded-none" onClick={handleReset}>
          <RotateCcw className="h-3.5 w-3.5" />
          重置
        </Button>
      </div>
      {/* 操作区 */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button data-ai-section-type="button" onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" />
          新建调账
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
      {/* 表格 */}
      <Table<CustomerFinanceDetail>
        columns={visibleColumns}
        dataSource={items}
        loading={loading}
        rowKey="id"
        scroll={{ x: 1200, y: 500 }}
        pagination={{
          current: page,
          pageSize: FUNDS_PAGE_SIZE,
          total,
          onChange: (nextPage: number) => setPage(nextPage),
        }}
      />
      <AdjustmentFormDialog
        open={formOpen}
        onSaved={refresh}
        onOpenChange={setFormOpen}
      />
      <Dialog
        open={detailItem !== null}
        onOpenChange={(open: boolean) => {
          if (!open) setDetailItem(null);
        }}
      >
        <DialogContent className="rounded-none">
          <DialogHeader>
            <DialogTitle>明细详情</DialogTitle>
            <DialogDescription>{detailItem?.detailNo ?? ''}</DialogDescription>
          </DialogHeader>
          <div>
            {(detailItem ? ([
              ['明细编号', detailItem.detailNo],
              ['客户名称', detailItem.customerName],
              ['交易类型', detailItem.transactionType],
              ['金额', formatFinanceAmount(detailItem.amount)],
              ['交易后余额', formatFinanceAmount(detailItem.balanceAfter)],
              ['关联单号', detailItem.relatedOrderNo],
              ['备注', detailItem.remark],
              ['交易时间', detailItem.transactionTime],
            ] as Array<[string, ReactNode]>) : []).map(
              ([label, value]: [string, ReactNode]) => (
                <div
                  key={label}
                  className="flex items-start justify-between gap-4 border-b border-border py-2 text-sm"
                >
                  <span className="shrink-0 text-muted-foreground">{label}</span>
                  <span className="break-words text-right font-medium">{value || '—'}</span>
                </div>
              ),
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
