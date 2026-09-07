import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { ListOrdered, Pencil, Plus, Power } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Table } from '@lark-apaas/client-toolkit/antd-table';
import type { TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import { ReportCard, SectionHeader } from '@client/src/components/blueprint';
import { ColumnSettingsButton } from '@client/src/components/column-settings-button';
import { useColumnSettings } from '@client/src/hooks/useColumnSettings';
import { Button } from '@client/src/components/ui/button';
import type { FinanceAccount } from '@shared/api.interface';
import {
  fetchFinanceAccounts,
  setFinanceAccountStatus,
} from '@client/src/api/finance-core';
import { AdsConfirmDialog } from '@client/src/pages/AdsBusiness/AdsConfirmDialog';
import { FinanceCoreTabs } from './FinanceCoreTabs';
import { AccountFormDialog, AccountTxnDialog } from './FinanceAccountDialogs';
import {
  BALANCE_BAR_COLORS,
  FinanceStatusBadge,
  formatFinanceAmount,
  toFinanceErrorText,
  toFinanceNumber,
} from './finance-constants';

const PAGE_SIZE: number = 10;

export default function FinanceAccountsPage() {
  const [items, setItems] = useState<FinanceAccount[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [allAccounts, setAllAccounts] = useState<FinanceAccount[]>([]);
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [editing, setEditing] = useState<FinanceAccount | null>(null);
  const [togglingItem, setTogglingItem] = useState<FinanceAccount | null>(null);
  const [txnAccount, setTxnAccount] = useState<FinanceAccount | null>(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchFinanceAccounts({ page, pageSize: PAGE_SIZE });
      setItems(result.items);
      setTotal(result.total);
    } catch (error: unknown) {
      logger.error(`加载资金账户失败: ${toFinanceErrorText(error)}`);
      toast.error(toFinanceErrorText(error));
    } finally {
      setLoading(false);
    }
  }, [page]);

  const loadAll = useCallback(async () => {
    try {
      const result = await fetchFinanceAccounts({ page: 1, pageSize: 200 });
      setAllAccounts(result.items);
    } catch (error: unknown) {
      logger.error(`加载账户汇总失败: ${toFinanceErrorText(error)}`);
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const refresh = useCallback((): void => {
    void loadList();
    void loadAll();
  }, [loadList, loadAll]);

  /* 余额汇总（仅统计启用账户） */
  const activeAccounts: FinanceAccount[] = useMemo(
    () => allAccounts.filter((account: FinanceAccount) => account.status === '启用'),
    [allAccounts],
  );
  const totalBalance: number = useMemo(
    () => activeAccounts.reduce(
    (sum: number, account: FinanceAccount) => sum + toFinanceNumber(account.balance),
    0,
  ),
    [activeAccounts],
  );

  const openCreate = (): void => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (item: FinanceAccount): void => {
    setEditing(item);
    setFormOpen(true);
  };

  const handleToggleStatus = async (): Promise<void> => {
    if (!togglingItem) return;
    const nextStatus: string = togglingItem.status === '启用' ? '停用' : '启用';
    try {
      await setFinanceAccountStatus(togglingItem.id, nextStatus);
      toast.success(`账户已${nextStatus}`);
      setTogglingItem(null);
      refresh();
    } catch (error: unknown) {
      logger.error(`切换账户状态失败: ${toFinanceErrorText(error)}`);
      toast.error(toFinanceErrorText(error));
    }
  };

  const columns = useMemo(
    (): TableColumnsType<FinanceAccount> => [
      {
        title: '账户名称',
        dataIndex: 'accountName',
        width: 160,
        render: (value: string) => <span className="font-bold">{value}</span>,
      },
      { title: '类型', dataIndex: 'accountType', width: 100 },
      { title: '银行', dataIndex: 'bankName', width: 130 },
      {
        title: '账号',
        dataIndex: 'bankAccount',
        width: 170,
        render: (value: string) => <span className="font-mono text-xs">{value || '-'}</span>,
      },
      {
        title: '余额',
        dataIndex: 'balance',
        width: 140,
        align: 'right',
        render: (value: number) => <span className="font-mono font-bold">{formatFinanceAmount(value)}</span>,
      },
      {
        title: '期初余额',
        dataIndex: 'initialBalance',
        width: 140,
        align: 'right',
        render: (value: number) => <span className="font-mono">{formatFinanceAmount(value)}</span>,
      },
      {
        title: '状态',
        dataIndex: 'status',
        width: 80,
        render: (value: string) => <FinanceStatusBadge status={value} />,
      },
      {
        title: '创建时间',
        dataIndex: 'createdAt',
        width: 150,
        render: (value: string) => (
          <span className="font-mono text-xs">{dayjs(value).format('YYYY-MM-DD HH:mm')}</span>
        ),
      },
      {
        title: '操作',
        key: 'action',
        fixed: 'right',
        width: 230,
        render: (_: unknown, record: FinanceAccount) => (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => openEdit(record)}>
              <Pencil className="h-3.5 w-3.5" />
              编辑
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setTogglingItem(record)}>
              <Power className="h-3.5 w-3.5" />
              {record.status === '启用' ? '停用' : '启用'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setTxnAccount(record)}>
              <ListOrdered className="h-3.5 w-3.5" />
              流水
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  const {
    visibleColumns, columnMetas, hiddenIds,
    toggleColumn, resetColumns, setAllColumns,
  } = useColumnSettings(columns);

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-8 px-8 py-8">
      <FinanceCoreTabs active="accounts" />
      {/* 余额汇总 */}
      <ReportCard>
        <SectionHeader no="02" label="FUND ACCOUNTS" subtitle="资金账户 / 余额汇总 / 收支流水" />
        <div className="mb-6 grid gap-6 md:grid-cols-3" data-ai-section-type="card-stat">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground mb-2">
              总余额（启用账户）
            </div>
            <div className="font-mono text-3xl font-bold tracking-tight text-primary">
              {formatFinanceAmount(totalBalance)}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground mb-2">
              启用账户数
            </div>
            <div className="font-mono text-3xl font-bold tracking-tight">
              {activeAccounts.length}
              <span className="ml-2 text-xs font-bold text-muted-foreground">/ 共 {allAccounts.length} 个</span>
            </div>
          </div>
        </div>
        {activeAccounts.length > 0 ? (
          <div className="space-y-3">
            <div className="flex h-3 w-full overflow-hidden rounded-none bg-accent">
              {activeAccounts.map((account: FinanceAccount, index: number) => (
                <div
                  key={account.id}
                  className="h-full"
                  style={{
                    width: `${totalBalance > 0 ? (toFinanceNumber(account.balance) / totalBalance) * 100 : 0}%`,
                    backgroundColor: BALANCE_BAR_COLORS[index % BALANCE_BAR_COLORS.length],
                  }}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1.5">
              {activeAccounts.map((account: FinanceAccount, index: number) => (
                <span key={account.id} className="flex items-center gap-1.5 text-xs">
                  <span
                    className="inline-block h-2 w-2 rounded-none"
                    style={{ backgroundColor: BALANCE_BAR_COLORS[index % BALANCE_BAR_COLORS.length] }}
                  />
                  <span className="font-medium">{account.accountName}</span>
                  <span className="font-mono text-muted-foreground">
                    {totalBalance > 0 ? ((toFinanceNumber(account.balance) / totalBalance) * 100).toFixed(1) : '0.0'}%
                  </span>
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="border border-border p-4 text-xs text-muted-foreground">暂无启用中的资金账户</div>
        )}
      </ReportCard>
      {/* 账户列表 */}
      <ReportCard>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-bold">账户列表</div>
          <div className="flex items-center gap-2">
            <Button data-ai-section-type="button" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              新建账户
            </Button>
            <ColumnSettingsButton
              columnMetas={columnMetas} hiddenIds={hiddenIds}
              onToggle={toggleColumn} onReset={resetColumns} onSetAll={setAllColumns}
            />
          </div>
        </div>
        <Table<FinanceAccount>
          columns={visibleColumns}
          dataSource={items}
          loading={loading}
          rowKey="id"
          scroll={{ x: 1300, y: 500 }}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total,
            onChange: (nextPage: number) => setPage(nextPage),
          }}
        />
      </ReportCard>
      {/* 新建/编辑弹窗 */}
      <AccountFormDialog open={formOpen} editing={editing} onOpenChange={setFormOpen} onSaved={refresh} />
      {/* 停用/启用确认 */}
      <AdsConfirmDialog
        open={togglingItem !== null}
        title={togglingItem?.status === '启用' ? '确认停用？' : '确认启用？'}
        description={
          togglingItem?.status === '启用'
            ? `停用后账户「${togglingItem?.accountName ?? ''}」将无法用于收款与付款。`
            : `启用后账户「${togglingItem?.accountName ?? ''}」可正常用于收款与付款。`
        }
        confirmText="确认"
        destructive={togglingItem?.status === '启用'}
        onOpenChange={(open: boolean) => {
          if (!open) setTogglingItem(null);
        }}
        onConfirm={() => void handleToggleStatus()}
      />
      {/* 流水弹窗 */}
      <AccountTxnDialog
        account={txnAccount}
        onOpenChange={(open: boolean) => {
          if (!open) setTxnAccount(null);
        }}
      />
    </div>
  );
}
