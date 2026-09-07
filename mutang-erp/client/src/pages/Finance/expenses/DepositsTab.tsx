import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';
import dayjs from 'dayjs';
import { Download, Plus, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Table, type TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import { ReportCard, SectionHeader } from '@client/src/components/blueprint';
import { ColumnSettingsButton } from '@client/src/components/column-settings-button';
import { useColumnSettings } from '@client/src/hooks/useColumnSettings';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import type { FinanceDeposit, FinanceDepositListParams } from '@shared/api.interface';
import {
  confiscateFinanceDeposit, deleteFinanceDeposit, fetchFinanceDeposits,
} from '@client/src/api/finance-enhance/expenses';
import { AdsConfirmDialog } from '@client/src/pages/AdsBusiness/AdsConfirmDialog';
import { exportRowsToExcel } from '@client/src/pages/AdsBusiness/ads-excel';
import { FINANCE_FILTER_ALL, formatFinanceAmount } from '../finance-constants';
import { DEPOSIT_TYPE_OPTIONS, DepositFormDialog, DepositReturnDialog } from './DepositsDialogs';
import {
  ActionLink, FilterSelect, FinanceEnhanceStatusBadge, reportError,
} from './expenses-shared';

const PAGE_SIZE: number = 10;

const DEPOSIT_STATUS_OPTIONS: string[] = ['已收取', '部分退还', '已退还', '已没收'];

const DEPOSIT_STATUS_BADGE: Record<string, string> = {
  已收取: 'bg-[#FFF7ED] text-[#F97316]',
  部分退还: 'bg-[#EFF6FF] text-[#0033A0]',
  已退还: 'bg-[#ECFDF5] text-[#10B981]',
  已没收: 'bg-[#FEF2F2] text-[#EF4444]',
};

export function DepositsTab() {
  const [draftCustomer, setDraftCustomer] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [depositType, setDepositType] = useState<string>(FINANCE_FILTER_ALL);
  const [status, setStatus] = useState<string>(FINANCE_FILTER_ALL);
  const [page, setPage] = useState<number>(1);
  const [items, setItems] = useState<FinanceDeposit[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [returningItem, setReturningItem] = useState<FinanceDeposit | null>(null);
  const [confiscatingItem, setConfiscatingItem] = useState<FinanceDeposit | null>(null);
  const [deletingItem, setDeletingItem] = useState<FinanceDeposit | null>(null);

  useEffect(() => {
    const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
      setCustomerName(draftCustomer.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [draftCustomer]);

  const filterParams = useMemo(
    (): FinanceDepositListParams => ({
      customerName: customerName || undefined,
      depositType: depositType === FINANCE_FILTER_ALL ? undefined : depositType,
      status: status === FINANCE_FILTER_ALL ? undefined : status,
    }),
    [customerName, depositType, status],
  );

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchFinanceDeposits({ ...filterParams, page, pageSize: PAGE_SIZE });
      setItems(result.items);
      setTotal(result.total);
    } catch (error: unknown) {
      reportError('加载保证金/押金列表失败', error);
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
    setDepositType(FINANCE_FILTER_ALL);
    setStatus(FINANCE_FILTER_ALL);
    setPage(1);
  };

  const handleConfiscate = async (): Promise<void> => {
    if (!confiscatingItem) return;
    try {
      await confiscateFinanceDeposit(confiscatingItem.id);
      toast.success('没收登记成功');
      setConfiscatingItem(null);
      refresh();
    } catch (error: unknown) {
      reportError('没收登记失败', error);
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!deletingItem) return;
    try {
      await deleteFinanceDeposit(deletingItem.id);
      toast.success('保证金/押金已删除');
      setDeletingItem(null);
      refresh();
    } catch (error: unknown) {
      reportError('删除保证金/押金失败', error);
    }
  };

  const handleExport = async (): Promise<void> => {
    try {
      const rows: Record<string, string>[] = items.map((item: FinanceDeposit) => ({
        单据编号: item.depositNo,
        客户名称: item.customerName,
        类型: item.depositType,
        金额: String(item.amount),
        收取日期: item.collectDate,
        收款账户: item.collectAccount,
        已退还金额: String(item.returnedAmount),
        退还日期: item.returnDate ?? '',
        退还账户: item.returnAccount,
        状态: item.status,
        备注: item.remark,
        创建时间: dayjs(item.createdAt).format('YYYY-MM-DD HH:mm'),
      }));
      const count: number = await exportRowsToExcel(rows, Object.keys(rows[0] ?? { 单据编号: '' }), '保证金押金', '保证金押金');
      toast.success(`已导出 ${count} 条保证金/押金记录`);
    } catch (error: unknown) {
      reportError('导出失败', error);
    }
  };

  const columns = useMemo((): TableColumnsType<FinanceDeposit> => [
    {
      title: '单据编号',
      dataIndex: 'depositNo',
      width: 150,
      fixed: 'left',
      render: (value: string) => <span className="font-bold text-primary">{value}</span>,
    },
    { title: '客户名称', dataIndex: 'customerName', width: 140, ellipsis: true },
    { title: '类型', dataIndex: 'depositType', width: 90 },
    {
      title: '金额',
      dataIndex: 'amount',
      width: 130,
      align: 'right',
      render: (value: number) => <span className="font-mono">{formatFinanceAmount(value)}</span>,
    },
    { title: '收取日期', dataIndex: 'collectDate', width: 110 },
    { title: '收款账户', dataIndex: 'collectAccount', width: 130, ellipsis: true },
    {
      title: '已退还',
      dataIndex: 'returnedAmount',
      width: 130,
      align: 'right',
      render: (value: number) => <span className="font-mono">{formatFinanceAmount(value)}</span>,
    },
    { title: '退还日期', dataIndex: 'returnDate', width: 110 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (value: string) => <FinanceEnhanceStatusBadge status={value} map={DEPOSIT_STATUS_BADGE} />,
    },
    { title: '备注', dataIndex: 'remark', width: 120, ellipsis: true },
    {
      title: '操作',
      key: 'actions',
      width: 220,
      fixed: 'right',
      render: (_: unknown, record: FinanceDeposit) => (
        <div className="flex flex-wrap items-center gap-1">
          {record.status === '已收取' || record.status === '部分退还' ? (
            <>
              <ActionLink onClick={() => setReturningItem(record)}>退还登记</ActionLink>
              <ActionLink danger onClick={() => setConfiscatingItem(record)}>没收</ActionLink>
            </>
          ) : null}
          {record.status !== '已退还' && record.status !== '已没收' ? (
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
      <SectionHeader no="05" label="DEPOSITS" subtitle="保证金押金 / 退还登记 / 没收 / 导出" />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          className="w-36 rounded-none"
          placeholder="客户名称"
          value={draftCustomer}
          onChange={(event: ChangeEvent<HTMLInputElement>) => setDraftCustomer(event.target.value)}
        />
        <FilterSelect
          value={depositType}
          placeholder="类型"
          allLabel="全部类型"
          options={DEPOSIT_TYPE_OPTIONS}
          onChange={(value: string) => {
            setDepositType(value);
            setPage(1);
          }}
        />
        <FilterSelect
          value={status}
          placeholder="状态"
          allLabel="全部状态"
          options={DEPOSIT_STATUS_OPTIONS}
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
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button data-ai-section-type="button" onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" />
          新建保证金/押金
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
      <Table<FinanceDeposit>
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

      <DepositFormDialog open={formOpen} onSaved={refresh} onOpenChange={setFormOpen} />

      <DepositReturnDialog
        open={returningItem !== null}
        deposit={returningItem}
        onDone={refresh}
        onOpenChange={(open: boolean) => {
          if (!open) setReturningItem(null);
        }}
      />

      <AdsConfirmDialog
        open={confiscatingItem !== null}
        title="没收登记？"
        description={`即将没收「${confiscatingItem?.depositNo ?? ''}」（${confiscatingItem?.customerName ?? ''}）的保证金/押金，登记后不可退还，请确认。`}
        confirmText="确认没收"
        destructive
        onOpenChange={(open: boolean) => {
          if (!open) setConfiscatingItem(null);
        }}
        onConfirm={() => void handleConfiscate()}
      />

      <AdsConfirmDialog
        open={deletingItem !== null}
        title="确认删除？"
        description={`即将删除保证金/押金「${deletingItem?.depositNo ?? ''}」，删除后不可恢复。`}
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
