import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Download, Plus, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Table, type TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import { ColumnSettingsButton } from '@client/src/components/column-settings-button';
import { useColumnSettings } from '@client/src/hooks/useColumnSettings';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import type { FinanceRecharge, FinanceRechargeListParams } from '@shared/api.interface';
import {
  cancelFinanceRecharge, confirmFinanceRecharge, deleteFinanceRecharge,
  fetchFinanceRecharges,
} from '@client/src/api/finance-enhance/funds';
import { AdsConfirmDialog } from '@client/src/pages/AdsBusiness/AdsConfirmDialog';
import { exportRowsToExcel } from '@client/src/pages/AdsBusiness/ads-excel';
import { RechargeFormDialog } from './RechargeFormDialog';
import { FINANCE_FILTER_ALL, formatFinanceAmount } from '../finance-constants';
import {
  FUNDS_EXPORT_LIMIT, FUNDS_PAGE_SIZE, FUNDS_RECHARGE_STATUS_OPTIONS,
  FundsActionLink, FundsFilterSelect, FundsStatusBadge, reportFundsError,
} from './funds-shared';

const EXPORT_HEADERS: string[] = [
  '充值单号', '客户名称', '金额', '付款方式', '广告账户ID', '状态', '确认时间', '操作人', '备注', '创建时间',
];

type RechargeAction = 'confirm' | 'cancel' | 'delete';

const RECHARGE_ACTION_TEXT: Record<RechargeAction, string> = {
  confirm: '确认', cancel: '取消', delete: '删除',
};

interface PendingRechargeAction {
  item: FinanceRecharge;
  action: RechargeAction;
}

export function RechargesTab() {
  const [draftCustomer, setDraftCustomer] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [status, setStatus] = useState<string>(FINANCE_FILTER_ALL);
  const [page, setPage] = useState<number>(1);
  const [items, setItems] = useState<FinanceRecharge[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [pending, setPending] = useState<PendingRechargeAction | null>(null);

  useEffect(() => {
    const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
      setCustomerName(draftCustomer.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [draftCustomer]);

  const filterParams = useMemo((): FinanceRechargeListParams => ({
    customerName: customerName || undefined,
    status: status === FINANCE_FILTER_ALL ? undefined : status,
  }), [customerName, status]);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchFinanceRecharges({
        ...filterParams, page, pageSize: FUNDS_PAGE_SIZE,
      });
      setItems(result.items);
      setTotal(result.total);
    } catch (error: unknown) {
      reportFundsError('加载充值列表失败', error);
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
    const actionText: string = RECHARGE_ACTION_TEXT[pending.action];
    try {
      if (pending.action === 'confirm') await confirmFinanceRecharge(pending.item.id);
      else if (pending.action === 'cancel') await cancelFinanceRecharge(pending.item.id);
      else await deleteFinanceRecharge(pending.item.id);
      toast.success(`充值单已${actionText}`);
      setPending(null);
      refresh();
    } catch (error: unknown) {
      reportFundsError(`${actionText}充值失败`, error);
    }
  };

  const handleExport = async (): Promise<void> => {
    try {
      const result = await fetchFinanceRecharges({
        ...filterParams, page: 1, pageSize: FUNDS_EXPORT_LIMIT,
      });
      const rows: Record<string, string>[] = result.items.map((item: FinanceRecharge) => ({
        充值单号: item.rechargeNo,
        客户名称: item.customerName,
        金额: String(item.amount),
        付款方式: item.paymentMethod,
        广告账户ID: item.adAccountId,
        状态: item.status,
        确认时间: item.confirmTime ?? '',
        操作人: item.operator,
        备注: item.remark,
        创建时间: item.createdAt,
      }));
      const count: number = await exportRowsToExcel(rows, EXPORT_HEADERS, '充值管理', '充值管理');
      toast.success(`已导出 ${count} 条充值记录`);
    } catch (error: unknown) {
      reportFundsError('导出充值记录失败', error);
    }
  };

  const columns = useMemo((): TableColumnsType<FinanceRecharge> => [
    {
      key: 'rc-rechargeNo', title: '充值单号', dataIndex: 'rechargeNo', width: 150, fixed: 'left',
      render: (value: string) => <span className="font-bold text-primary">{value}</span>,
    },
    { key: 'rc-customerName', title: '客户名称', dataIndex: 'customerName', width: 140 },
    {
      key: 'rc-amount', title: '金额', dataIndex: 'amount', width: 130, align: 'right',
      render: (value: number) => <span className="font-mono">{formatFinanceAmount(value)}</span>,
    },
    { key: 'rc-paymentMethod', title: '付款方式', dataIndex: 'paymentMethod', width: 100 },
    { key: 'rc-adAccountId', title: '广告账户ID', dataIndex: 'adAccountId', width: 130 },
    {
      key: 'rc-status', title: '状态', dataIndex: 'status', width: 90,
      render: (value: string) => <FundsStatusBadge status={value} />,
    },
    {
      key: 'rc-confirmTime', title: '确认时间', dataIndex: 'confirmTime', width: 150,
      render: (value: string | null) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '—'),
    },
    { key: 'rc-operator', title: '操作人', dataIndex: 'operator', width: 100 },
    { key: 'rc-remark', title: '备注', dataIndex: 'remark', width: 140 },
    {
      key: 'rc-createdAt', title: '创建时间', dataIndex: 'createdAt', width: 150,
      render: (value: string) => dayjs(value).format('YYYY-MM-DD HH:mm'),
    },
    {
      key: 'rc-actions', title: '操作', width: 190, fixed: 'right',
      render: (_: unknown, record: FinanceRecharge) => (
        <div className="flex flex-wrap items-center gap-1">
          {record.status === '待确认' ? (
            <>
              <FundsActionLink onClick={() => setPending({ item: record, action: 'confirm' })}>
                确认
              </FundsActionLink>
              <FundsActionLink onClick={() => setPending({ item: record, action: 'cancel' })}>
                取消
              </FundsActionLink>
            </>
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

  const pendingText: string = pending ? RECHARGE_ACTION_TEXT[pending.action] : '确认';

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
          options={FUNDS_RECHARGE_STATUS_OPTIONS}
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
          新建充值
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
      <Table<FinanceRecharge>
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
      <RechargeFormDialog
        open={formOpen}
        onSaved={refresh}
        onOpenChange={setFormOpen}
      />
      <AdsConfirmDialog
        open={pending !== null}
        title={`${pendingText}充值？`}
        description={pending
          ? `即将${pendingText}充值单「${pending.item.rechargeNo}」${pending.action === 'delete' ? '，删除后不可恢复。' : '。'}`
          : ''}
        confirmText={pendingText}
        destructive={pending?.action !== 'confirm'}
        onOpenChange={(open: boolean) => {
          if (!open) setPending(null);
        }}
        onConfirm={() => void handlePending()}
      />
    </div>
  );
}
