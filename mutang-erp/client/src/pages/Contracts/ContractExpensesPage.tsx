import {
  useCallback, useEffect, useMemo, useState, type ChangeEvent, type ReactNode,
} from 'react';
import { useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { Plus, RotateCcw, X } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Table, type TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import { ReportCard, SectionHeader, StatusBadge } from '@client/src/components/blueprint';
import { ColumnSettingsButton } from '@client/src/components/column-settings-button';
import { useColumnSettings } from '@client/src/hooks/useColumnSettings';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@client/src/components/ui/select';
import type {
  ContractExpense, ContractExpenseListParams, ContractPaymentStatus,
} from '@shared/api.interface';
import { deleteContractExpense, listContractExpenses } from '@client/src/api/contract-enhance';
import { AdsConfirmDialog } from '@client/src/pages/AdsBusiness/AdsConfirmDialog';
import { AdsDatePickerButton } from '@client/src/pages/AdsBusiness/AdsDatePickerButton';
import {
  ContractExpenseFormDialog, EXPENSE_TYPE_OPTIONS, toContractErrorText,
} from './ContractExpenseDialogs';
import { PaymentRecordsDialog } from './PaymentRecordsDialog';

const PAGE_SIZE: number = 10;
const FILTER_ALL: string = '__ALL__';
const PAYMENT_STATUS_OPTIONS: ContractPaymentStatus[] = ['未付款', '部分付款', '已付款'];
const PAYMENT_STATUS_TONE: Record<ContractPaymentStatus, 'neutral' | 'warning' | 'success'> = {
  '未付款': 'neutral',
  '部分付款': 'warning',
  '已付款': 'success',
};

const reportError = (context: string, error: unknown): void => {
  logger.error(`${context}: ${toContractErrorText(error)}`);
  toast.error(toContractErrorText(error));
};

function ActionLink({ danger, onClick, children }: {
  danger?: boolean; onClick: () => void; children: string;
}): ReactNode {
  return (
    <Button variant="ghost" size="sm" onClick={onClick}
      className={`h-auto px-1 text-xs ${danger ? 'text-destructive' : 'text-primary'}`}>
      {children}
    </Button>
  );
}

export default function ContractExpensesPage() {
  /* URL query 预填：从合同详情页跳转时带上 contractId */
  const [searchParams] = useSearchParams();
  const [contractId, setContractId] = useState<string>(searchParams.get('contractId') ?? '');
  /* 筛选：文本输入做 300ms 防抖 */
  const [draftKeyword, setDraftKeyword] = useState<string>('');
  const [keyword, setKeyword] = useState<string>('');
  const [expenseType, setExpenseType] = useState<string>(FILTER_ALL);
  const [paymentStatus, setPaymentStatus] = useState<string>(FILTER_ALL);
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [page, setPage] = useState<number>(1);
  const [items, setItems] = useState<ContractExpense[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  /* 弹窗状态 */
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [editing, setEditing] = useState<ContractExpense | null>(null);
  const [paymentItem, setPaymentItem] = useState<ContractExpense | null>(null);
  const [paymentFocusForm, setPaymentFocusForm] = useState<boolean>(false);
  const [deletingItem, setDeletingItem] = useState<ContractExpense | null>(null);

  useEffect(() => {
    const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
      setKeyword(draftKeyword.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [draftKeyword]);

  const filterParams = useMemo(
    (): ContractExpenseListParams => ({
      page,
      pageSize: PAGE_SIZE,
      contractId: contractId || undefined,
      keyword: keyword || undefined,
      expenseType: expenseType === FILTER_ALL ? undefined : expenseType,
      paymentStatus: paymentStatus === FILTER_ALL ? undefined : paymentStatus,
      dateFrom: dateFrom ? dayjs(dateFrom).format('YYYY-MM-DD') : undefined,
      dateTo: dateTo ? dayjs(dateTo).format('YYYY-MM-DD') : undefined,
    }),
    [page, contractId, keyword, expenseType, paymentStatus, dateFrom, dateTo],
  );

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listContractExpenses(filterParams);
      setItems(result.items);
      setTotal(result.total);
    } catch (error: unknown) {
      reportError('加载合同费用列表失败', error);
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
    setDraftKeyword('');
    setKeyword('');
    setContractId('');
    setExpenseType(FILTER_ALL);
    setPaymentStatus(FILTER_ALL);
    setDateFrom(undefined);
    setDateTo(undefined);
    setPage(1);
  };

  const handleDelete = async (): Promise<void> => {
    if (!deletingItem) return;
    try {
      await deleteContractExpense(deletingItem.id);
      toast.success('合同费用已删除');
      setDeletingItem(null);
      refresh();
    } catch (error: unknown) {
      reportError('删除合同费用失败', error);
    }
  };

  const columns = useMemo((): TableColumnsType<ContractExpense> => [
    {
      title: '费用编号', dataIndex: 'expenseNo', width: 150, fixed: 'left',
      render: (value: string) => <span className="font-bold text-primary">{value}</span>,
    },
    { title: '合同名称', dataIndex: 'customerName', width: 140 },
    { title: '合同编号', dataIndex: 'contractCode', width: 130 },
    { title: '费用类型', dataIndex: 'expenseType', width: 90 },
    {
      title: '金额', dataIndex: 'amount', width: 110, align: 'right',
      render: (value: number) => <span className="font-mono font-medium">{value.toLocaleString()}</span>,
    },
    {
      title: '已付金额', dataIndex: 'paidAmount', width: 110, align: 'right',
      render: (value: number) => <span className="font-mono">{value.toLocaleString()}</span>,
    },
    {
      title: '付款状态', dataIndex: 'paymentStatus', width: 90,
      render: (value: ContractPaymentStatus) => (
        <StatusBadge tone={PAYMENT_STATUS_TONE[value] ?? 'neutral'}>{value}</StatusBadge>
      ),
    },
    {
      title: '计划付款日期', dataIndex: 'plannedPaymentDate', width: 110,
      render: (value: string | null) => (value ? dayjs(value).format('YYYY-MM-DD') : '—'),
    },
    {
      title: '操作', key: 'actions', width: 250, fixed: 'right',
      render: (_: unknown, record: ContractExpense) => (
        <div className="flex flex-wrap items-center gap-1">
          <ActionLink onClick={() => { setPaymentItem(record); setPaymentFocusForm(false); }}>
            付款记录
          </ActionLink>
          <ActionLink onClick={() => { setPaymentItem(record); setPaymentFocusForm(true); }}>
            登记付款
          </ActionLink>
          <ActionLink onClick={() => { setEditing(record); setFormOpen(true); }}>编辑</ActionLink>
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
    <div className="mx-auto w-full max-w-[1280px] space-y-8 px-8 py-8">
      <ReportCard>
        <SectionHeader
          no="10"
          label="CONTRACT EXPENSES"
          subtitle="合同费用管理 / 付款登记 / 费用台账"
        />
        {/* 筛选区 */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Input
            className="w-44 rounded-none"
            placeholder="合同编号 / 名称关键词"
            value={draftKeyword}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setDraftKeyword(event.target.value)}
          />
          <Select value={expenseType} onValueChange={(value: string) => { setExpenseType(value); setPage(1); }}>
            <SelectTrigger className="w-32 rounded-none"><SelectValue placeholder="费用类型" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={FILTER_ALL}>全部类型</SelectItem>
              {EXPENSE_TYPE_OPTIONS.map((option: string) => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={paymentStatus} onValueChange={(value: string) => { setPaymentStatus(value); setPage(1); }}>
            <SelectTrigger className="w-32 rounded-none"><SelectValue placeholder="付款状态" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={FILTER_ALL}>全部状态</SelectItem>
              {PAYMENT_STATUS_OPTIONS.map((option: ContractPaymentStatus) => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">计划付款日期</span>
            <AdsDatePickerButton value={dateFrom} placeholder="开始日期"
              onChange={(date: Date | undefined) => { setDateFrom(date); setPage(1); }} />
            <span className="text-xs text-muted-foreground">至</span>
            <AdsDatePickerButton value={dateTo} placeholder="结束日期"
              onChange={(date: Date | undefined) => { setDateTo(date); setPage(1); }} />
          </div>
          {contractId ? (
            <span className="inline-flex items-center gap-1 bg-accent px-2 py-1 text-xs text-accent-foreground">
              已按指定合同筛选
              <button type="button" className="text-primary hover:underline"
                onClick={() => { setContractId(''); setPage(1); }}>
                <X className="size-3" />
              </button>
            </span>
          ) : null}
          <Button variant="ghost" size="sm" className="rounded-none" onClick={handleReset}>
            <RotateCcw className="h-3.5 w-3.5" />
            重置
          </Button>
        </div>
        {/* 操作区 */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button data-ai-section-type="button" onClick={() => { setEditing(null); setFormOpen(true); }}>
              <Plus className="h-4 w-4" />
              新建费用
            </Button>
            <ColumnSettingsButton
              columnMetas={columnMetas} hiddenIds={hiddenIds}
              onToggle={toggleColumn} onReset={resetColumns} onSetAll={setAllColumns}
            />
          </div>
          <span className="text-xs text-muted-foreground">共 {total} 条费用记录</span>
        </div>
        {/* 表格 */}
        <Table<ContractExpense>
          columns={visibleColumns}
          dataSource={items}
          loading={loading}
          rowKey="id"
          scroll={{ x: 1180, y: 500 }}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total,
            onChange: (nextPage: number) => setPage(nextPage),
          }}
        />
      </ReportCard>

      {/* 新建 / 编辑费用弹窗 */}
      <ContractExpenseFormDialog
        open={formOpen}
        editing={editing}
        onSaved={refresh}
        onOpenChange={setFormOpen}
      />

      {/* 付款记录弹窗（查看记录 / 登记付款） */}
      <PaymentRecordsDialog
        open={paymentItem !== null}
        expense={paymentItem}
        focusForm={paymentFocusForm}
        onChanged={refresh}
        onOpenChange={(open: boolean) => { if (!open) setPaymentItem(null); }}
      />

      {/* 删除费用二次确认 */}
      <AdsConfirmDialog
        open={deletingItem !== null}
        title="确认删除？"
        description={`即将删除合同费用「${deletingItem?.expenseNo ?? ''}」（${deletingItem?.expenseType ?? ''}），删除后不可恢复。`}
        confirmText="确认删除"
        destructive
        onOpenChange={(open: boolean) => { if (!open) setDeletingItem(null); }}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}
