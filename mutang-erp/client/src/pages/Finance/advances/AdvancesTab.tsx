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
import type { FinanceAdvance, FinanceAdvanceListParams } from '@shared/api.interface';
import {
  badDebtFinanceAdvance, deleteFinanceAdvance, fetchFinanceAdvances,
} from '@client/src/api/finance-enhance/advances';
import { AdsConfirmDialog } from '@client/src/pages/AdsBusiness/AdsConfirmDialog';
import { exportRowsToExcel } from '@client/src/pages/AdsBusiness/ads-excel';
import { FINANCE_FILTER_ALL, formatFinanceAmount } from '../finance-constants';
import { AdvanceFormDialog, AdvanceReturnDialog } from './AdvancesDialogs';
import {
  ActionLink, FilterSelect, FinanceEnhanceStatusBadge, reportError,
} from './advances-shared';

const PAGE_SIZE: number = 10;

export const ADVANCE_STATUS_OPTIONS: string[] = ['未收回', '部分收回', '已收回', '已坏账'];

const ADVANCE_STATUS_BADGE: Record<string, string> = {
  未收回: 'bg-[#FFF7ED] text-[#F97316]',
  部分收回: 'bg-[#EFF6FF] text-[#0033A0]',
  已收回: 'bg-[#ECFDF5] text-[#10B981]',
  已坏账: 'bg-[#FEF2F2] text-[#EF4444]',
};

export function AdvancesTab() {
  const [draftCustomer, setDraftCustomer] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [status, setStatus] = useState<string>(FINANCE_FILTER_ALL);
  const [page, setPage] = useState<number>(1);
  const [items, setItems] = useState<FinanceAdvance[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [returningItem, setReturningItem] = useState<FinanceAdvance | null>(null);
  const [badDebtItem, setBadDebtItem] = useState<FinanceAdvance | null>(null);
  const [deletingItem, setDeletingItem] = useState<FinanceAdvance | null>(null);

  useEffect(() => {
    const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
      setCustomerName(draftCustomer.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [draftCustomer]);

  const filterParams = useMemo(
    (): FinanceAdvanceListParams => ({
      customerName: customerName || undefined,
      status: status === FINANCE_FILTER_ALL ? undefined : status,
    }),
    [customerName, status],
  );

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchFinanceAdvances({ ...filterParams, page, pageSize: PAGE_SIZE });
      setItems(result.items);
      setTotal(result.total);
    } catch (error: unknown) {
      reportError('加载垫款列表失败', error);
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

  const handleBadDebt = async (): Promise<void> => {
    if (!badDebtItem) return;
    try {
      await badDebtFinanceAdvance(badDebtItem.id);
      toast.success('坏账登记成功');
      setBadDebtItem(null);
      refresh();
    } catch (error: unknown) {
      reportError('坏账登记失败', error);
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!deletingItem) return;
    try {
      await deleteFinanceAdvance(deletingItem.id);
      toast.success('垫款已删除');
      setDeletingItem(null);
      refresh();
    } catch (error: unknown) {
      reportError('删除垫款失败', error);
    }
  };

  const handleExport = async (): Promise<void> => {
    try {
      const rows: Record<string, string>[] = items.map((item: FinanceAdvance) => ({
        垫款单号: item.advanceNo,
        客户名称: item.customerName,
        垫款金额: String(item.amount),
        已收回金额: String(item.returnedAmount),
        垫款事由: item.reason,
        预计归还日期: item.expectedReturnDate ?? '',
        状态: item.status,
        经办人: item.operator,
        备注: item.remark,
        创建时间: dayjs(item.createdAt).format('YYYY-MM-DD HH:mm'),
      }));
      const count: number = await exportRowsToExcel(rows, Object.keys(rows[0] ?? { 垫款单号: '' }), '垫款管理', '垫款管理');
      toast.success(`已导出 ${count} 条垫款记录`);
    } catch (error: unknown) {
      reportError('导出失败', error);
    }
  };

  const columns = useMemo((): TableColumnsType<FinanceAdvance> => [
    {
      title: '垫款单号',
      dataIndex: 'advanceNo',
      width: 150,
      fixed: 'left',
      render: (value: string) => <span className="font-bold text-primary">{value}</span>,
    },
    { title: '客户名称', dataIndex: 'customerName', width: 140 },
    {
      title: '垫款金额',
      dataIndex: 'amount',
      width: 130,
      align: 'right',
      render: (value: number) => <span className="font-mono">{formatFinanceAmount(value)}</span>,
    },
    {
      title: '已收回',
      dataIndex: 'returnedAmount',
      width: 130,
      align: 'right',
      render: (value: number) => <span className="font-mono">{formatFinanceAmount(value)}</span>,
    },
    { title: '垫款事由', dataIndex: 'reason', width: 160, ellipsis: true },
    { title: '预计归还日期', dataIndex: 'expectedReturnDate', width: 120 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (value: string) => <FinanceEnhanceStatusBadge status={value} map={ADVANCE_STATUS_BADGE} />,
    },
    { title: '经办人', dataIndex: 'operator', width: 100 },
    { title: '备注', dataIndex: 'remark', width: 120, ellipsis: true },
    {
      title: '操作',
      key: 'actions',
      width: 220,
      fixed: 'right',
      render: (_: unknown, record: FinanceAdvance) => (
        <div className="flex flex-wrap items-center gap-1">
          {record.status === '未收回' || record.status === '部分收回' ? (
            <>
              <ActionLink onClick={() => setReturningItem(record)}>收回登记</ActionLink>
              <ActionLink danger onClick={() => setBadDebtItem(record)}>坏账登记</ActionLink>
            </>
          ) : null}
          <ActionLink danger onClick={() => setDeletingItem(record)}>删除</ActionLink>
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
      <SectionHeader no="04" label="ADVANCES" subtitle="垫款管理 / 收回登记 / 坏账登记 / 导出" />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          className="w-36 rounded-none"
          placeholder="客户名称"
          value={draftCustomer}
          onChange={(event: ChangeEvent<HTMLInputElement>) => setDraftCustomer(event.target.value)}
        />
        <FilterSelect
          value={status}
          placeholder="状态"
          allLabel="全部状态"
          options={ADVANCE_STATUS_OPTIONS}
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
          新建垫款
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
      <Table<FinanceAdvance>
        columns={visibleColumns}
        dataSource={items}
        loading={loading}
        rowKey="id"
        scroll={{ x: 1400, y: 500 }}
        pagination={{
          current: page,
          pageSize: PAGE_SIZE,
          total,
          onChange: (nextPage: number) => setPage(nextPage),
        }}
      />

      <AdvanceFormDialog open={formOpen} onSaved={refresh} onOpenChange={setFormOpen} />

      <AdvanceReturnDialog
        open={returningItem !== null}
        advance={returningItem}
        onDone={refresh}
        onOpenChange={(open: boolean) => {
          if (!open) setReturningItem(null);
        }}
      />

      <AdsConfirmDialog
        open={badDebtItem !== null}
        title="坏账登记？"
        description={`即将把垫款「${badDebtItem?.advanceNo ?? ''}」登记为坏账，登记后不可再收回，请确认。`}
        confirmText="确认登记"
        destructive
        onOpenChange={(open: boolean) => {
          if (!open) setBadDebtItem(null);
        }}
        onConfirm={() => void handleBadDebt()}
      />

      <AdsConfirmDialog
        open={deletingItem !== null}
        title="确认删除？"
        description={`即将删除垫款「${deletingItem?.advanceNo ?? ''}」，删除后不可恢复。`}
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
