import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { Download, Plus, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Table, type TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import { ReportCard, SectionHeader } from '@client/src/components/blueprint';
import { ColumnSettingsButton } from '@client/src/components/column-settings-button';
import { useColumnSettings } from '@client/src/hooks/useColumnSettings';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import type { FinanceDeduction, FinanceDeductionListParams } from '@shared/api.interface';
import {
  deleteFinanceDeduction, executeFinanceDeduction, fetchFinanceDeductions,
} from '@client/src/api/finance-enhance/rebates';
import { AdsConfirmDialog } from '@client/src/pages/AdsBusiness/AdsConfirmDialog';
import { exportRowsToExcel } from '@client/src/pages/AdsBusiness/ads-excel';
import { FINANCE_FILTER_ALL, formatFinanceAmount } from '../finance-constants';
import { DeductionApproveDialog, DeductionFormDialog } from './DeductionDialogs';
import {
  ActionLink, DEDUCTION_STATUS_BADGE, DEDUCTION_STATUS_OPTIONS, FilterSelect, RebateBadge,
  reportRebateError,
} from './shared';

const PAGE_SIZE: number = 10;

export function DeductionsTab() {
  /* 筛选（文本防抖） */
  const [draftCustomer, setDraftCustomer] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [status, setStatus] = useState<string>(FINANCE_FILTER_ALL);
  const [page, setPage] = useState<number>(1);
  const [items, setItems] = useState<FinanceDeduction[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  /* 弹窗状态 */
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [approvingItem, setApprovingItem] = useState<FinanceDeduction | null>(null);
  const [executingItem, setExecutingItem] = useState<FinanceDeduction | null>(null);
  const [deletingItem, setDeletingItem] = useState<FinanceDeduction | null>(null);

  useEffect(() => {
    const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
      setCustomerName(draftCustomer.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [draftCustomer]);

  const filterParams = useMemo(
    (): FinanceDeductionListParams => ({
      customerName: customerName || undefined,
      status: status === FINANCE_FILTER_ALL ? undefined : status,
    }),
    [customerName, status],
  );

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchFinanceDeductions({ ...filterParams, page, pageSize: PAGE_SIZE });
      setItems(result.items);
      setTotal(result.total);
    } catch (error: unknown) {
      reportRebateError('加载扣减列表失败', error);
    } finally {
      setLoading(false);
    }
  }, [filterParams, page]);

  useEffect(() => { void loadList(); }, [loadList]);

  const refresh = useCallback((): void => { void loadList(); }, [loadList]);

  const handleReset = (): void => {
    setDraftCustomer('');
    setCustomerName('');
    setStatus(FINANCE_FILTER_ALL);
    setPage(1);
  };

  const handleExecute = async (): Promise<void> => {
    if (!executingItem) return;
    try {
      await executeFinanceDeduction(executingItem.id);
      toast.success('扣减已执行');
      setExecutingItem(null);
      refresh();
    } catch (error: unknown) {
      reportRebateError('执行扣减失败', error);
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!deletingItem) return;
    try {
      await deleteFinanceDeduction(deletingItem.id);
      toast.success('扣减记录已删除');
      setDeletingItem(null);
      refresh();
    } catch (error: unknown) {
      reportRebateError('删除扣减记录失败', error);
    }
  };

  const handleExport = async (): Promise<void> => {
    try {
      const rows: Record<string, string>[] = items.map((item: FinanceDeduction) => ({
        扣减单号: item.deductionNo,
        客户名称: item.customerName,
        资金账户ID: String(item.accountId),
        扣减金额: String(item.amount),
        扣减类型: item.deductionType,
        扣减原因: item.reason,
        状态: item.status,
        审批人: item.approver,
        审批时间: item.approveTime ?? '',
        执行时间: item.executeTime ?? '',
        创建时间: item.createdAt,
      }));
      const count: number = await exportRowsToExcel(
        rows, Object.keys(rows[0] ?? { 扣减单号: '' }), '扣减管理', '扣减管理',
      );
      toast.success(`已导出 ${count} 条扣减记录`);
    } catch (error: unknown) {
      reportRebateError('导出失败', error);
    }
  };

  const columns = useMemo((): TableColumnsType<FinanceDeduction> => [
    {
      title: '扣减单号', key: 'dct.deductionNo', dataIndex: 'deductionNo', width: 160, fixed: 'left',
      render: (value: string) => <span className="font-bold text-primary">{value}</span>,
    },
    { title: '客户名称', key: 'dct.customerName', dataIndex: 'customerName', width: 130 },
    { title: '资金账户ID', key: 'dct.accountId', dataIndex: 'accountId', width: 110 },
    {
      title: '扣减金额', key: 'dct.amount', dataIndex: 'amount', width: 130, align: 'right',
      render: (value: number) => <span className="font-mono">{formatFinanceAmount(value)}</span>,
    },
    { title: '扣减类型', key: 'dct.deductionType', dataIndex: 'deductionType', width: 100 },
    {
      title: '扣减原因', key: 'dct.reason', dataIndex: 'reason', width: 180,
      render: (value: string) => <span className="break-words">{value}</span>,
    },
    {
      title: '状态', key: 'dct.status', dataIndex: 'status', width: 90,
      render: (value: string) => <RebateBadge status={value} badgeMap={DEDUCTION_STATUS_BADGE} />,
    },
    { title: '审批人', key: 'dct.approver', dataIndex: 'approver', width: 100 },
    {
      title: '审批时间', key: 'dct.approveTime', dataIndex: 'approveTime', width: 160,
      render: (value: string | null) => value ?? '-',
    },
    {
      title: '执行时间', key: 'dct.executeTime', dataIndex: 'executeTime', width: 160,
      render: (value: string | null) => value ?? '-',
    },
    {
      title: '操作', key: 'dct.actions', width: 150, fixed: 'right',
      render: (_: unknown, record: FinanceDeduction) => (
        <div className="flex flex-wrap items-center gap-1">
          {record.status === '待审批' ? (
            <ActionLink onClick={() => setApprovingItem(record)}>审批</ActionLink>
          ) : null}
          {record.status === '已通过' ? (
            <ActionLink onClick={() => setExecutingItem(record)}>执行</ActionLink>
          ) : null}
          {record.status !== '已执行' ? (
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
      <SectionHeader no="03" label="DEDUCTION" subtitle="扣减管理 / 审批执行 / 导出" />
      {/* 筛选区 */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input className="w-36 rounded-none" placeholder="客户名称" value={draftCustomer}
          onChange={(event: ChangeEvent<HTMLInputElement>) => setDraftCustomer(event.target.value)} />
        <FilterSelect value={status} placeholder="状态" allLabel="全部状态"
          options={DEDUCTION_STATUS_OPTIONS}
          onChange={(value: string) => { setStatus(value); setPage(1); }} />
        <Button variant="ghost" size="sm" className="rounded-none" onClick={handleReset}>
          <RotateCcw className="h-3.5 w-3.5" />
          重置
        </Button>
      </div>
      {/* 操作区 */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button data-ai-section-type="button" onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" />
          新建扣减
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
      <Table<FinanceDeduction>
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

      {/* 新建弹窗 */}
      <DeductionFormDialog open={formOpen} onSaved={refresh} onOpenChange={setFormOpen} />

      {/* 审批弹窗 */}
      <DeductionApproveDialog
        open={approvingItem !== null}
        deduction={approvingItem}
        onDone={refresh}
        onOpenChange={(open: boolean) => { if (!open) setApprovingItem(null); }}
      />

      {/* 执行确认 */}
      <AdsConfirmDialog
        open={executingItem !== null}
        title="确认执行？"
        description={`即将执行扣减单「${executingItem?.deductionNo ?? ''}」，执行后将从资金账户扣减相应金额。`}
        confirmText="确认执行"
        onOpenChange={(open: boolean) => { if (!open) setExecutingItem(null); }}
        onConfirm={() => void handleExecute()}
      />

      {/* 删除二次确认 */}
      <AdsConfirmDialog
        open={deletingItem !== null}
        title="确认删除？"
        description={`即将删除扣减记录「${deletingItem?.deductionNo ?? ''}」，删除后不可恢复。`}
        confirmText="确认删除"
        destructive
        onOpenChange={(open: boolean) => { if (!open) setDeletingItem(null); }}
        onConfirm={() => void handleDelete()}
      />
    </ReportCard>
  );
}
