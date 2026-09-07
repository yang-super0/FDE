import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Download, Plus, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Table, type TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import { ColumnSettingsButton } from '@client/src/components/column-settings-button';
import { useColumnSettings } from '@client/src/hooks/useColumnSettings';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import type { FinanceBankAccount, FinanceBankAccountListParams } from '@shared/api.interface';
import {
  deleteFinanceBankAccount, enableFinanceBankAccount,
  fetchFinanceBankAccounts, setFinanceBankAccountBalance,
} from '@client/src/api/finance-enhance/funds';
import { AdsConfirmDialog } from '@client/src/pages/AdsBusiness/AdsConfirmDialog';
import { exportRowsToExcel } from '@client/src/pages/AdsBusiness/ads-excel';
import { BankAccountFormDialog } from './BankAccountFormDialog';
import { FINANCE_FILTER_ALL, formatFinanceAmount } from '../finance-constants';
import {
  FUNDS_ACCOUNT_TYPE_OPTIONS, FUNDS_ENABLE_STATUS_OPTIONS, FUNDS_EXPORT_LIMIT,
  FUNDS_PAGE_SIZE, FundsActionLink, FundsBalanceDialog, FundsFilterSelect,
  FundsStatusBadge, reportFundsError,
} from './funds-shared';

const EXPORT_HEADERS: string[] = [
  '账户编号', '银行名称', '账户名称', '银行账号', '开户支行', '账户类型', '余额', '状态', '备注', '创建时间',
];

type BankAction = 'enable' | 'disable' | 'delete';

const BANK_ACTION_TEXT: Record<BankAction, string> = {
  enable: '启用', disable: '停用', delete: '删除',
};

interface PendingBankAction {
  item: FinanceBankAccount;
  action: BankAction;
}

export function BankAccountsTab() {
  const [draftBank, setDraftBank] = useState<string>('');
  const [bankName, setBankName] = useState<string>('');
  const [accountType, setAccountType] = useState<string>(FINANCE_FILTER_ALL);
  const [status, setStatus] = useState<string>(FINANCE_FILTER_ALL);
  const [page, setPage] = useState<number>(1);
  const [items, setItems] = useState<FinanceBankAccount[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [editing, setEditing] = useState<FinanceBankAccount | null>(null);
  const [pending, setPending] = useState<PendingBankAction | null>(null);
  const [balanceItem, setBalanceItem] = useState<FinanceBankAccount | null>(null);

  useEffect(() => {
    const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
      setBankName(draftBank.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [draftBank]);

  const filterParams = useMemo((): FinanceBankAccountListParams => ({
    bankName: bankName || undefined,
    accountType: accountType === FINANCE_FILTER_ALL ? undefined : accountType,
    status: status === FINANCE_FILTER_ALL ? undefined : status,
  }), [bankName, accountType, status]);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchFinanceBankAccounts({
        ...filterParams, page, pageSize: FUNDS_PAGE_SIZE,
      });
      setItems(result.items);
      setTotal(result.total);
    } catch (error: unknown) {
      reportFundsError('加载银行账户列表失败', error);
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
    setDraftBank('');
    setBankName('');
    setAccountType(FINANCE_FILTER_ALL);
    setStatus(FINANCE_FILTER_ALL);
    setPage(1);
  };

  const handlePending = async (): Promise<void> => {
    if (!pending) return;
    const actionText: string = BANK_ACTION_TEXT[pending.action];
    try {
      if (pending.action === 'enable') await enableFinanceBankAccount(pending.item.id, true);
      else if (pending.action === 'disable') await enableFinanceBankAccount(pending.item.id, false);
      else await deleteFinanceBankAccount(pending.item.id);
      toast.success(`银行账户已${actionText}`);
      setPending(null);
      refresh();
    } catch (error: unknown) {
      reportFundsError(`${actionText}银行账户失败`, error);
    }
  };

  const handleBalance = async (balance: number): Promise<void> => {
    if (!balanceItem) return;
    await setFinanceBankAccountBalance(balanceItem.id, balance);
    toast.success('账户余额已登记');
    refresh();
  };

  const handleExport = async (): Promise<void> => {
    try {
      const result = await fetchFinanceBankAccounts({
        ...filterParams, page: 1, pageSize: FUNDS_EXPORT_LIMIT,
      });
      const rows: Record<string, string>[] = result.items.map((item: FinanceBankAccount) => ({
        账户编号: item.bankNo,
        银行名称: item.bankName,
        账户名称: item.accountName,
        银行账号: item.accountNo,
        开户支行: item.branch,
        账户类型: item.accountType,
        余额: String(item.balance),
        状态: item.status,
        备注: item.remark,
        创建时间: item.createdAt,
      }));
      const count: number = await exportRowsToExcel(
        rows, EXPORT_HEADERS, '银行账户', '银行账户',
      );
      toast.success(`已导出 ${count} 条银行账户记录`);
    } catch (error: unknown) {
      reportFundsError('导出银行账户失败', error);
    }
  };

  const columns = useMemo((): TableColumnsType<FinanceBankAccount> => [
    {
      key: 'bk-bankNo', title: '账户编号', dataIndex: 'bankNo', width: 150, fixed: 'left',
      render: (value: string) => <span className="font-bold text-primary">{value}</span>,
    },
    { key: 'bk-bankName', title: '银行名称', dataIndex: 'bankName', width: 140 },
    { key: 'bk-accountName', title: '账户名称', dataIndex: 'accountName', width: 140 },
    { key: 'bk-accountNo', title: '银行账号', dataIndex: 'accountNo', width: 180 },
    { key: 'bk-branch', title: '开户支行', dataIndex: 'branch', width: 160 },
    { key: 'bk-accountType', title: '账户类型', dataIndex: 'accountType', width: 100 },
    {
      key: 'bk-balance', title: '余额', dataIndex: 'balance', width: 130, align: 'right',
      render: (value: number) => <span className="font-mono">{formatFinanceAmount(value)}</span>,
    },
    {
      key: 'bk-status', title: '状态', dataIndex: 'status', width: 90,
      render: (value: string) => <FundsStatusBadge status={value} />,
    },
    { key: 'bk-remark', title: '备注', dataIndex: 'remark', width: 140 },
    {
      key: 'bk-createdAt', title: '创建时间', dataIndex: 'createdAt', width: 150,
      render: (value: string) => dayjs(value).format('YYYY-MM-DD HH:mm'),
    },
    {
      key: 'bk-actions', title: '操作', width: 230, fixed: 'right',
      render: (_: unknown, record: FinanceBankAccount) => (
        <div className="flex flex-wrap items-center gap-1">
          <FundsActionLink onClick={() => { setEditing(record); setFormOpen(true); }}>
            编辑
          </FundsActionLink>
          <FundsActionLink
            onClick={() => setPending({
              item: record,
              action: record.status === '启用' ? 'disable' : 'enable',
            })}
          >
            {record.status === '启用' ? '停用' : '启用'}
          </FundsActionLink>
          <FundsActionLink onClick={() => setBalanceItem(record)}>余额登记</FundsActionLink>
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

  const pendingText: string = pending ? BANK_ACTION_TEXT[pending.action] : '启用';

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          className="w-36 rounded-none"
          placeholder="银行名称"
          value={draftBank}
          onChange={(event) => setDraftBank(event.target.value)}
        />
        <FundsFilterSelect
          value={accountType} placeholder="账户类型" allLabel="全部类型"
          options={FUNDS_ACCOUNT_TYPE_OPTIONS}
          onChange={(value: string) => { setAccountType(value); setPage(1); }}
        />
        <FundsFilterSelect
          value={status} placeholder="状态" allLabel="全部状态"
          options={FUNDS_ENABLE_STATUS_OPTIONS}
          onChange={(value: string) => { setStatus(value); setPage(1); }}
        />
        <Button variant="ghost" size="sm" className="rounded-none" onClick={handleReset}>
          <RotateCcw className="h-3.5 w-3.5" />
          重置
        </Button>
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button
          data-ai-section-type="button"
          onClick={() => { setEditing(null); setFormOpen(true); }}
        >
          <Plus className="h-4 w-4" />
          新建银行账户
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
      <Table<FinanceBankAccount>
        columns={visibleColumns}
        dataSource={items}
        loading={loading}
        rowKey="id"
        scroll={{ x: 1700, y: 500 }}
        pagination={{
          current: page,
          pageSize: FUNDS_PAGE_SIZE,
          total,
          onChange: (nextPage: number) => setPage(nextPage),
        }}
      />
      <BankAccountFormDialog
        open={formOpen}
        editing={editing}
        onSaved={refresh}
        onOpenChange={(open: boolean) => {
          setFormOpen(open);
          if (!open) setEditing(null);
        }}
      />
      <AdsConfirmDialog
        open={pending !== null}
        title={`${pendingText}银行账户？`}
        description={pending
          ? `即将${pendingText}银行账户「${pending.item.bankName} - ${pending.item.accountName}」${pending.action === 'delete' ? '，删除后不可恢复。' : '。'}`
          : ''}
        confirmText={pendingText}
        destructive={pending?.action === 'delete'}
        onOpenChange={(open: boolean) => {
          if (!open) setPending(null);
        }}
        onConfirm={() => void handlePending()}
      />
      <FundsBalanceDialog
        open={balanceItem !== null}
        title="账户余额登记"
        description={balanceItem ? `「${balanceItem.bankName} - ${balanceItem.accountName}」当前余额 ${formatFinanceAmount(balanceItem.balance)}` : ''}
        onSubmit={handleBalance}
        onOpenChange={(open: boolean) => {
          if (!open) setBalanceItem(null);
        }}
      />
    </div>
  );
}
