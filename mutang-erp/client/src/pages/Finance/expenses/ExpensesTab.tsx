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
import type {
  FinanceExpense, FinanceExpenseListParams,
} from '@shared/api.interface';
import {
  approveFinanceExpense, deleteFinanceExpense, fetchFinanceExpenses,
} from '@client/src/api/finance-enhance/expenses';
import { AdsConfirmDialog } from '@client/src/pages/AdsBusiness/AdsConfirmDialog';
import { exportRowsToExcel } from '@client/src/pages/AdsBusiness/ads-excel';
import { FINANCE_FILTER_ALL, formatFinanceAmount } from '../finance-constants';
import { ExpenseFormDialog, ExpensePayDialog } from './ExpensesDialogs';
import {
  ActionLink, ApproveDialog, FilterSelect, FinanceEnhanceStatusBadge, reportError,
} from './expenses-shared';

const PAGE_SIZE: number = 10;

const EXPENSE_TYPE_OPTIONS: string[] = ['办公费', '差旅费', '招待费', '工资', '社保', '其他'];
const EXPENSE_STATUS_OPTIONS: string[] = ['待审批', '已通过', '已驳回', '已支付'];

const EXPENSE_STATUS_BADGE: Record<string, string> = {
  待审批: 'bg-[#FFF7ED] text-[#F97316]',
  已通过: 'bg-[#EFF6FF] text-[#0033A0]',
  已驳回: 'bg-[#FEF2F2] text-[#EF4444]',
  已支付: 'bg-[#ECFDF5] text-[#10B981]',
};

export function ExpensesTab() {
  const [expenseType, setExpenseType] = useState<string>(FINANCE_FILTER_ALL);
  const [status, setStatus] = useState<string>(FINANCE_FILTER_ALL);
  const [draftApplicant, setDraftApplicant] = useState<string>('');
  const [applicant, setApplicant] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [items, setItems] = useState<FinanceExpense[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [approvingItem, setApprovingItem] = useState<FinanceExpense | null>(null);
  const [payingItem, setPayingItem] = useState<FinanceExpense | null>(null);
  const [deletingItem, setDeletingItem] = useState<FinanceExpense | null>(null);

  useEffect(() => {
    const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
      setApplicant(draftApplicant.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [draftApplicant]);

  const filterParams = useMemo(
    (): FinanceExpenseListParams => ({
      expenseType: expenseType === FINANCE_FILTER_ALL ? undefined : expenseType,
      status: status === FINANCE_FILTER_ALL ? undefined : status,
      applicant: applicant || undefined,
    }),
    [expenseType, status, applicant],
  );

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchFinanceExpenses({ ...filterParams, page, pageSize: PAGE_SIZE });
      setItems(result.items);
      setTotal(result.total);
    } catch (error: unknown) {
      reportError('加载支出列表失败', error);
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
    setExpenseType(FINANCE_FILTER_ALL);
    setStatus(FINANCE_FILTER_ALL);
    setDraftApplicant('');
    setApplicant('');
    setPage(1);
  };

  const handleApprove = async (approved: boolean, rejectReason?: string): Promise<void> => {
    if (!approvingItem) return;
    await approveFinanceExpense(approvingItem.id, { approved, rejectReason });
    toast.success(approved ? '支出已通过' : '支出已驳回');
    setApprovingItem(null);
    refresh();
  };

  const handleDelete = async (): Promise<void> => {
    if (!deletingItem) return;
    try {
      await deleteFinanceExpense(deletingItem.id);
      toast.success('支出已删除');
      setDeletingItem(null);
      refresh();
    } catch (error: unknown) {
      reportError('删除支出失败', error);
    }
  };

  const handleExport = async (): Promise<void> => {
    try {
      const rows: Record<string, string>[] = items.map((item: FinanceExpense) => ({
        支出单号: item.expenseNo,
        支出类型: item.expenseType,
        金额: String(item.amount),
        申请人: item.applicant,
        申请日期: item.applyDate,
        状态: item.status,
        审批人: item.approver,
        审批时间: item.approveTime ?? '',
        支付时间: item.payTime ?? '',
        备注: item.remark,
        创建时间: dayjs(item.createdAt).format('YYYY-MM-DD HH:mm'),
      }));
      const count: number = await exportRowsToExcel(rows, Object.keys(rows[0] ?? { 支出单号: '' }), '支出管理', '支出管理');
      toast.success(`已导出 ${count} 条支出记录`);
    } catch (error: unknown) {
      reportError('导出失败', error);
    }
  };

  const columns = useMemo((): TableColumnsType<FinanceExpense> => [
    {
      title: '支出单号',
      dataIndex: 'expenseNo',
      width: 150,
      fixed: 'left',
      render: (value: string) => <span className="font-bold text-primary">{value}</span>,
    },
    { title: '支出类型', dataIndex: 'expenseType', width: 100 },
    {
      title: '金额',
      dataIndex: 'amount',
      width: 130,
      align: 'right',
      render: (value: number) => <span className="font-mono">{formatFinanceAmount(value)}</span>,
    },
    { title: '申请人', dataIndex: 'applicant', width: 100 },
    { title: '申请日期', dataIndex: 'applyDate', width: 110 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (value: string) => <FinanceEnhanceStatusBadge status={value} map={EXPENSE_STATUS_BADGE} />,
    },
    { title: '审批人', dataIndex: 'approver', width: 100 },
    { title: '审批时间', dataIndex: 'approveTime', width: 150 },
    { title: '支付时间', dataIndex: 'payTime', width: 150 },
    { title: '备注', dataIndex: 'remark', width: 120, ellipsis: true },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      fixed: 'right',
      render: (_: unknown, record: FinanceExpense) => (
        <div className="flex flex-wrap items-center gap-1">
          {record.status === '待审批' ? (
            <ActionLink onClick={() => setApprovingItem(record)}>审批</ActionLink>
          ) : null}
          {record.status === '已通过' ? (
            <ActionLink onClick={() => setPayingItem(record)}>支付</ActionLink>
          ) : null}
          {record.status !== '已支付' ? (
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
      <SectionHeader no="05" label="EXPENSES" subtitle="支出管理 / 审批支付 / 导出" />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <FilterSelect
          value={expenseType}
          placeholder="支出类型"
          allLabel="全部类型"
          options={EXPENSE_TYPE_OPTIONS}
          onChange={(value: string) => {
            setExpenseType(value);
            setPage(1);
          }}
        />
        <FilterSelect
          value={status}
          placeholder="状态"
          allLabel="全部状态"
          options={EXPENSE_STATUS_OPTIONS}
          onChange={(value: string) => {
            setStatus(value);
            setPage(1);
          }}
        />
        <Input
          className="w-32 rounded-none"
          placeholder="申请人"
          value={draftApplicant}
          onChange={(event: ChangeEvent<HTMLInputElement>) => setDraftApplicant(event.target.value)}
        />
        <Button variant="ghost" size="sm" className="rounded-none" onClick={handleReset}>
          <RotateCcw className="h-3.5 w-3.5" />
          重置
        </Button>
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button data-ai-section-type="button" onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" />
          新建支出
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
      <Table<FinanceExpense>
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

      <ExpenseFormDialog open={formOpen} onSaved={refresh} onOpenChange={setFormOpen} />

      <ApproveDialog
        open={approvingItem !== null}
        title="支出审批"
        description={approvingItem
          ? `${approvingItem.expenseNo} · ${approvingItem.expenseType} · ${formatFinanceAmount(approvingItem.amount)}，请选择审批结果`
          : ''}
        onOpenChange={(open: boolean) => {
          if (!open) setApprovingItem(null);
        }}
        onSubmit={(approved: boolean, rejectReason?: string) =>
          handleApprove(approved, rejectReason)}
      />

      <ExpensePayDialog
        open={payingItem !== null}
        expense={payingItem}
        onDone={refresh}
        onOpenChange={(open: boolean) => {
          if (!open) setPayingItem(null);
        }}
      />

      <AdsConfirmDialog
        open={deletingItem !== null}
        title="确认删除？"
        description={`即将删除支出「${deletingItem?.expenseNo ?? ''}」，删除后不可恢复。`}
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
