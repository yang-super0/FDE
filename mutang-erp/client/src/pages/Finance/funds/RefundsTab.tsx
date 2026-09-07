import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Download, Plus, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Table, type TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import { ColumnSettingsButton } from '@client/src/components/column-settings-button';
import { useColumnSettings } from '@client/src/hooks/useColumnSettings';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import type { FinanceRefund, FinanceRefundListParams } from '@shared/api.interface';
import {
  deleteFinanceRefund, executeFinanceRefund, fetchFinanceRefunds,
} from '@client/src/api/finance-enhance/funds';
import { AdsConfirmDialog } from '@client/src/pages/AdsBusiness/AdsConfirmDialog';
import { exportRowsToExcel } from '@client/src/pages/AdsBusiness/ads-excel';
import { RefundFormDialog } from './RefundFormDialog';
import { RefundApproveDialog } from './RefundApproveDialog';
import { FINANCE_FILTER_ALL, formatFinanceAmount } from '../finance-constants';
import {
  FUNDS_EXPORT_LIMIT, FUNDS_PAGE_SIZE, FUNDS_REFUND_STATUS_OPTIONS,
  FundsActionLink, FundsFilterSelect, FundsStatusBadge, reportFundsError,
} from './funds-shared';

const EXPORT_HEADERS: string[] = [
  '退款单号', '客户名称', '金额', '退款原因', '状态', '审批人', '审批时间', '退款时间', '创建时间',
];

type RefundAction = 'execute' | 'delete';

const REFUND_ACTION_TEXT: Record<RefundAction, string> = {
  execute: '执行退款', delete: '删除',
};

interface PendingRefundAction {
  item: FinanceRefund;
  action: RefundAction;
}

export function RefundsTab() {
  const [draftCustomer, setDraftCustomer] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [status, setStatus] = useState<string>(FINANCE_FILTER_ALL);
  const [page, setPage] = useState<number>(1);
  const [items, setItems] = useState<FinanceRefund[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [approvingItem, setApprovingItem] = useState<FinanceRefund | null>(null);
  const [pending, setPending] = useState<PendingRefundAction | null>(null);

  useEffect(() => {
    const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
      setCustomerName(draftCustomer.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [draftCustomer]);

  const filterParams = useMemo((): FinanceRefundListParams => ({
    customerName: customerName || undefined,
    status: status === FINANCE_FILTER_ALL ? undefined : status,
  }), [customerName, status]);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchFinanceRefunds({
        ...filterParams, page, pageSize: FUNDS_PAGE_SIZE,
      });
      setItems(result.items);
      setTotal(result.total);
    } catch (error: unknown) {
      reportFundsError('加载退款列表失败', error);
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
    setDraftCustomer('');
    setCustomerName('');
    setStatus(FINANCE_FILTER_ALL);
    setPage(1);
  };

  const handlePending = async (): Promise<void> => {
    if (!pending) return;
    const actionText: string = REFUND_ACTION_TEXT[pending.action];
    try {
      if (pending.action === 'execute') await executeFinanceRefund(pending.item.id);
      else await deleteFinanceRefund(pending.item.id);
      toast.success(pending.action === 'execute' ? '退款已执行' : '退款单已删除');
      setPending(null);
      refresh();
    } catch (error: unknown) {
      reportFundsError(`${actionText}失败`, error);
    }
  };

  const handleExport = async (): Promise<void> => {
    try {
      const result = await fetchFinanceRefunds({
        ...filterParams, page: 1, pageSize: FUNDS_EXPORT_LIMIT,
      });
      const rows: Record<string, string>[] = result.items.map((item: FinanceRefund) => ({
        退款单号: item.refundNo,
        客户名称: item.customerName,
        金额: String(item.amount),
        退款原因: item.reason,
        状态: item.status,
        审批人: item.approver,
        审批时间: item.approveTime ?? '',
        退款时间: item.refundTime ?? '',
        创建时间: item.createdAt,
      }));
      const count: number = await exportRowsToExcel(rows, EXPORT_HEADERS, '退款管理', '退款管理');
      toast.success(`已导出 ${count} 条退款记录`);
    } catch (error: unknown) {
      reportFundsError('导出退款记录失败', error);
    }
  };

  const columns = useMemo((): TableColumnsType<FinanceRefund> => [
    {
      key: 'rf-refundNo', title: '退款单号', dataIndex: 'refundNo', width: 150, fixed: 'left',
      render: (value: string) => <span className="font-bold text-primary">{value}</span>,
    },
    { key: 'rf-customerName', title: '客户名称', dataIndex: 'customerName', width: 140 },
    {
      key: 'rf-amount', title: '金额', dataIndex: 'amount', width: 130, align: 'right',
      render: (value: number) => <span className="font-mono">{formatFinanceAmount(value)}</span>,
    },
    { key: 'rf-reason', title: '退款原因', dataIndex: 'reason', width: 160 },
    {
      key: 'rf-status', title: '状态', dataIndex: 'status', width: 90,
      render: (value: string) => <FundsStatusBadge status={value} />,
    },
    { key: 'rf-approver', title: '审批人', dataIndex: 'approver', width: 100 },
    {
      key: 'rf-approveTime', title: '审批时间', dataIndex: 'approveTime', width: 150,
      render: (value: string | null) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '—'),
    },
    {
      key: 'rf-refundTime', title: '退款时间', dataIndex: 'refundTime', width: 150,
      render: (value: string | null) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '—'),
    },
    {
      key: 'rf-createdAt', title: '创建时间', dataIndex: 'createdAt', width: 150,
      render: (value: string) => dayjs(value).format('YYYY-MM-DD HH:mm'),
    },
    {
      key: 'rf-actions', title: '操作', width: 180, fixed: 'right',
      render: (_: unknown, record: FinanceRefund) => (
        <div className="flex flex-wrap items-center gap-1">
          {record.status === '待审批' ? (
            <FundsActionLink onClick={() => setApprovingItem(record)}>审批</FundsActionLink>
          ) : null}
          {record.status === '已通过' ? (
            <FundsActionLink onClick={() => setPending({ item: record, action: 'execute' })}>
              执行
            </FundsActionLink>
          ) : null}
          <FundsActionLink danger onClick={() => setPending({ item: record, action: 'delete' })}>
            删除
          </FundsActionLink>
        </div>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], []);

  const {
    visibleColumns, columnMetas, hiddenIds,
    toggleColumn, resetColumns, setAllColumns,
  } = useColumnSettings(columns);

  const pendingText: string = pending ? REFUND_ACTION_TEXT[pending.action] : '执行退款';

  return (
    <div>
      {/* 筛选区 */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          className="w-36 rounded-none"
          placeholder="客户名称"
          value={draftCustomer}
          onChange={(event) => setDraftCustomer(event.target.value)}
        />
        <FundsFilterSelect
          value={status}
          placeholder="状态"
          allLabel="全部状态"
          options={FUNDS_REFUND_STATUS_OPTIONS}
          onChange={(value: string) => {
            setStatus(value);
            setPage(1);
          }}
        />
        <Button variant="ghost" size="sm" className="rounded-none" onClick={handleReset}>
          <RotateCcw className="h-3.5 w-3.5" />
          重置
        </Button>
      </div>
      {/* 操作区 */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button data-ai-section-type="button" onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" />
          新建退款
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
      <Table<FinanceRefund>
        columns={visibleColumns}
        dataSource={items}
        loading={loading}
        rowKey="id"
        scroll={{ x: 1500, y: 500 }}
        pagination={{
          current: page,
          pageSize: FUNDS_PAGE_SIZE,
          total,
          onChange: (nextPage: number) => setPage(nextPage),
        }}
      />
      <RefundFormDialog
        open={formOpen}
        onSaved={refresh}
        onOpenChange={setFormOpen}
      />
      <RefundApproveDialog
        open={approvingItem !== null}
        refund={approvingItem}
        onDone={() => {
          setApprovingItem(null);
          refresh();
        }}
        onOpenChange={(open: boolean) => {
          if (!open) setApprovingItem(null);
        }}
      />
      <AdsConfirmDialog
        open={pending !== null}
        title={`${pendingText}？`}
        description={pending
          ? `即将${pendingText}退款单「${pending.item.refundNo}」${pending.action === 'delete' ? '，删除后不可恢复。' : '。'}`
          : ''}
        confirmText={pendingText}
        destructive={pending?.action === 'delete'}
        onOpenChange={(open: boolean) => {
          if (!open) setPending(null);
        }}
        onConfirm={() => void handlePending()}
      />
    </div>
  );
}
