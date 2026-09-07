import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type Key } from 'react';
import dayjs from 'dayjs';
import { Download, Plus, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Table, type TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import { ReportCard, SectionHeader } from '@client/src/components/blueprint';
import { ColumnSettingsButton } from '@client/src/components/column-settings-button';
import { useColumnSettings } from '@client/src/hooks/useColumnSettings';
import { useFieldPermissions } from '@client/src/hooks/useFieldPermissions';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@client/src/components/ui/select';
import type { FinanceReceipt, FinanceReceiptListParams } from '@shared/api.interface';
import {
  confirmFinanceReceipts, deleteFinanceReceiptCore, fetchFinanceReceipts,
} from '@client/src/api/finance-core';
import { AdsConfirmDialog } from '@client/src/pages/AdsBusiness/AdsConfirmDialog';
import { AdsDatePickerButton } from '@client/src/pages/AdsBusiness/AdsDatePickerButton';
import { exportRowsToExcel } from '@client/src/pages/AdsBusiness/ads-excel';
import { FinanceCoreTabs } from './FinanceCoreTabs';
import { ReceiptDetailDialog, ReceiptFormDialog, ReceiptWriteOffDialog } from './FinanceReceiptDialogs';
import {
  FINANCE_FILTER_ALL, FinanceStatusBadge, formatFinanceAmount, RECEIPT_METHOD_OPTIONS,
  RECEIPT_STATUS_OPTIONS, RECEIPT_TYPE_OPTIONS, toFinanceErrorText,
} from './finance-constants';

const PAGE_SIZE: number = 10;

const reportError = (context: string, error: unknown): void => {
  logger.error(`${context}: ${toFinanceErrorText(error)}`);
  toast.error(toFinanceErrorText(error));
};

const renderMoney = (value: number | string | null): string =>
  value == null ? '-' : typeof value === 'string' ? value : formatFinanceAmount(value);

function FilterSelect({ value, placeholder, options, allLabel, onChange }: {
  value: string; placeholder: string; options: string[]; allLabel: string; onChange: (value: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-32 rounded-none"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        <SelectItem value={FINANCE_FILTER_ALL}>{allLabel}</SelectItem>
        {options.map((option: string) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function ActionLink({ danger, onClick, children }: {
  danger?: boolean; onClick: () => void; children: string;
}) {
  return (
    <Button variant="ghost" size="sm" onClick={onClick}
      className={`h-auto px-1 text-xs ${danger ? 'text-destructive' : 'text-primary'}`}>
      {children}
    </Button>
  );
}

export default function FinanceReceiptsPage() {
  /* 筛选（文本防抖） */
  const [draftNo, setDraftNo] = useState<string>('');
  const [draftCustomer, setDraftCustomer] = useState<string>('');
  const [draftGroup, setDraftGroup] = useState<string>('');
  const [receiptNo, setReceiptNo] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [groupName, setGroupName] = useState<string>('');
  const [receiptType, setReceiptType] = useState<string>(FINANCE_FILTER_ALL);
  const [status, setStatus] = useState<string>(FINANCE_FILTER_ALL);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [page, setPage] = useState<number>(1);
  const [items, setItems] = useState<FinanceReceipt[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedKeys, setSelectedKeys] = useState<Key[]>([]);
  /* 弹窗状态 */
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [editing, setEditing] = useState<FinanceReceipt | null>(null);
  const [detailItem, setDetailItem] = useState<FinanceReceipt | null>(null);
  const [deletingItem, setDeletingItem] = useState<FinanceReceipt | null>(null);
  const [confirmingIds, setConfirmingIds] = useState<number[]>([]);
  const [writeOffIds, setWriteOffIds] = useState<number[]>([]);
  const { fields: permFields } = useFieldPermissions('财务');

  const filterTexts: Array<{ placeholder: string; width: string; value: string; set: (value: string) => void }> = [
    { placeholder: '收款单号', width: 'w-32', value: draftNo, set: setDraftNo },
    { placeholder: '客户名称', width: 'w-36', value: draftCustomer, set: setDraftCustomer },
    { placeholder: '集团名称', width: 'w-32', value: draftGroup, set: setDraftGroup },
  ];

  useEffect(() => {
    const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
      setReceiptNo(draftNo.trim());
      setCustomerName(draftCustomer.trim());
      setGroupName(draftGroup.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [draftNo, draftCustomer, draftGroup]);

  const filterParams = useMemo(
    (): FinanceReceiptListParams => ({
      receiptNo: receiptNo || undefined,
      customerName: customerName || undefined,
      groupName: groupName || undefined,
      receiptType: receiptType === FINANCE_FILTER_ALL ? undefined : receiptType,
      status: status === FINANCE_FILTER_ALL ? undefined : status,
      startDate: startDate ? dayjs(startDate).format('YYYY-MM-DD') : undefined,
      endDate: endDate ? dayjs(endDate).format('YYYY-MM-DD') : undefined,
    }),
    [receiptNo, customerName, groupName, receiptType, status, startDate, endDate],
  );

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchFinanceReceipts({ ...filterParams, page, pageSize: PAGE_SIZE });
      setItems(result.items);
      setTotal(result.total);
    } catch (error: unknown) {
      reportError('加载收款列表失败', error);
    } finally {
      setLoading(false);
    }
  }, [filterParams, page]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const refresh = useCallback((): void => {
    setSelectedKeys([]);
    void loadList();
  }, [loadList]);

  const handleReset = (): void => {
    setDraftNo('');
    setDraftCustomer('');
    setDraftGroup('');
    setReceiptNo('');
    setCustomerName('');
    setGroupName('');
    setReceiptType(FINANCE_FILTER_ALL);
    setStatus(FINANCE_FILTER_ALL);
    setStartDate(undefined);
    setEndDate(undefined);
    setPage(1);
  };

  const openCreate = (): void => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (item: FinanceReceipt): void => {
    setEditing(item);
    setFormOpen(true);
  };

  const handleConfirm = async (): Promise<void> => {
    try {
      const result = await confirmFinanceReceipts(confirmingIds);
      toast.success(result.message);
      setConfirmingIds([]);
      refresh();
    } catch (error: unknown) {
      reportError('确认收款失败', error);
    }
  };

  const collectSelectedIds = (statuses: string[]): number[] =>
    items
      .filter((item: FinanceReceipt) => selectedKeys.includes(item.id) && statuses.includes(item.status))
      .map((item: FinanceReceipt) => item.id);

  const handleBatchConfirm = (): void => {
    const pendingIds: number[] = collectSelectedIds(['待确认']);
    if (pendingIds.length === 0) {
      toast.error('所选记录中没有待确认的收款单');
      return;
    }
    setConfirmingIds(pendingIds);
  };

  const handleDelete = async (): Promise<void> => {
    if (!deletingItem) return;
    try {
      await deleteFinanceReceiptCore(deletingItem.id);
      toast.success('收款单已删除');
      setDeletingItem(null);
      refresh();
    } catch (error: unknown) {
      reportError('删除收款单失败', error);
    }
  };

  const handleBatchWriteOff = (): void => {
    const writableIds: number[] = collectSelectedIds(['待确认', '已确认']);
    if (writableIds.length === 0) {
      toast.error('所选记录中没有可核销的收款单');
      return;
    }
    setWriteOffIds(writableIds);
  };

  const handleExport = async (): Promise<void> => {
    try {
      const rows: Record<string, string>[] = items.map((item: FinanceReceipt) => ({
        收款单号: item.receiptNo,
        客户名称: item.customerName,
        集团名称: item.groupName,
        金额: String(item.amount),
        收款类型: item.receiptType,
        收款方式: item.paymentMethod,
        收款账户: item.accountName,
        状态: item.status,
        收款日期: item.receiptDate,
        备注: item.remark,
      }));
      const count: number = await exportRowsToExcel(rows, Object.keys(rows[0] ?? { 收款单号: '' }), '收款管理', '收款管理');
      toast.success(`已导出 ${count} 条收款记录`);
    } catch (error: unknown) {
      reportError('导出失败', error);
    }
  };

  const columns = useMemo((): TableColumnsType<FinanceReceipt> => [
    {
      title: '收款单号',
      dataIndex: 'receiptNo',
      width: 160,
      fixed: 'left',
      render: (value: string) => <span className="font-bold text-primary">{value}</span>,
    },
    { title: '客户名称', dataIndex: 'customerName', width: 140 },
    { title: '集团名称', dataIndex: 'groupName', width: 140 },
    ...(permFields.get('receipt_amount')?.visible !== false
      ? [{
          title: '金额',
          dataIndex: 'amount',
          width: 140,
          align: 'right' as const,
          render: (value: number | string | null) => (
            <span className="font-mono">{renderMoney(value)}</span>
          ),
        }]
      : []),
    { title: '收款类型', dataIndex: 'receiptType', width: 100 },
    { title: '收款方式', dataIndex: 'paymentMethod', width: 100 },
    { title: '收款账户', dataIndex: 'accountName', width: 140 },
    { title: '状态', dataIndex: 'status', width: 90, render: (value: string) => <FinanceStatusBadge status={value} /> },
    { title: '收款日期', dataIndex: 'receiptDate', width: 110 },
    {
      title: '操作',
      key: 'actions',
      width: 210,
      fixed: 'right',
      render: (_: unknown, record: FinanceReceipt) => (
        <div className="flex flex-wrap items-center gap-1">
          <ActionLink onClick={() => setDetailItem(record)}>查看</ActionLink>
          {record.status === '待确认' ? (
            <>
              <ActionLink onClick={() => openEdit(record)}>编辑</ActionLink>
              <ActionLink onClick={() => setConfirmingIds([record.id])}>确认</ActionLink>
              <ActionLink danger onClick={() => setDeletingItem(record)}>删除</ActionLink>
            </>
          ) : null}
          {record.status === '待确认' || record.status === '已确认' ? (
            <ActionLink onClick={() => setWriteOffIds([record.id])}>核销</ActionLink>
          ) : null}
        </div>
      ),
    },
  ], [permFields]);

  const {
    visibleColumns, columnMetas, hiddenIds,
    toggleColumn, resetColumns, setAllColumns,
  } = useColumnSettings(columns);

  const hasSelection: boolean = selectedKeys.length > 0;

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-8 px-8 py-8">
      <FinanceCoreTabs active="receipts" />
      <ReportCard>
        <SectionHeader no="03" label="RECEIPTS" subtitle="收款管理 / 确认核销 / 导出" />
        {/* 筛选区 */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          {filterTexts.map((field: { placeholder: string; width: string; value: string; set: (value: string) => void }) => (
            <Input
              key={field.placeholder}
              className={`${field.width} rounded-none`}
              placeholder={field.placeholder}
              value={field.value}
              onChange={(event: ChangeEvent<HTMLInputElement>) => field.set(event.target.value)}
            />
          ))}
          <FilterSelect
            value={receiptType}
            placeholder="收款类型"
            allLabel="全部类型"
            options={RECEIPT_TYPE_OPTIONS}
            onChange={(value: string) => {
              setReceiptType(value);
              setPage(1);
            }}
          />
          <FilterSelect
            value={status}
            placeholder="状态"
            allLabel="全部状态"
            options={RECEIPT_STATUS_OPTIONS}
            onChange={(value: string) => {
              setStatus(value);
              setPage(1);
            }}
          />
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">收款日期</span>
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
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button data-ai-section-type="button" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              新建收款
            </Button>
            <Button variant="outline" disabled={!hasSelection} onClick={handleBatchConfirm}>批量确认</Button>
            <Button variant="outline" disabled={!hasSelection} onClick={handleBatchWriteOff}>批量核销</Button>
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
        {/* 表格 */}
        <Table<FinanceReceipt>
          columns={visibleColumns}
          dataSource={items}
          loading={loading}
          rowKey="id"
          scroll={{ x: 1400, y: 500 }}
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
      <ReceiptFormDialog
        open={formOpen}
        editing={editing}
        onSaved={refresh}
        onOpenChange={setFormOpen}
      />

      {/* 详情弹窗 */}
      <ReceiptDetailDialog
        open={detailItem !== null}
        receipt={detailItem}
        onOpenChange={(open: boolean) => {
          if (!open) setDetailItem(null);
        }}
      />

      {/* 核销弹窗 */}
      <ReceiptWriteOffDialog
        open={writeOffIds.length > 0}
        receiptIds={writeOffIds}
        onDone={refresh}
        onOpenChange={(open: boolean) => {
          if (!open) setWriteOffIds([]);
        }}
      />

      {/* 确认弹窗（行内 + 批量） */}
      <AdsConfirmDialog
        open={confirmingIds.length > 0}
        title="确认收款？"
        description={`即将确认 ${confirmingIds.length} 条收款记录，确认后不可撤销。`}
        confirmText="确认"
        onOpenChange={(open: boolean) => {
          if (!open) setConfirmingIds([]);
        }}
        onConfirm={() => void handleConfirm()}
      />

      {/* 删除二次确认 */}
      <AdsConfirmDialog
        open={deletingItem !== null}
        title="确认删除？"
        description={`即将删除收款单「${deletingItem?.receiptNo ?? ''}」，删除后不可恢复。`}
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
