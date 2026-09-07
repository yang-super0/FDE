import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Key } from 'react';
import { Download, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Table, type TableProps } from '@lark-apaas/client-toolkit/antd-table';
import type { CustomerAccount } from '@shared/api.interface';
import { ReportCard, SectionHeader } from '@client/src/components/blueprint';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import { ColumnSettingsButton } from '@client/src/components/column-settings-button';
import { useColumnSettings } from '@client/src/hooks/useColumnSettings';
import { exportRowsToExcel } from '@client/src/pages/AdsBusiness/ads-excel';
import {
  WarehouseFilterSelect,
} from '@client/src/pages/Admin/warehouse/warehouse-shared';
import {
  listCustomerAccounts,
  unlockCustomerAccount,
} from '@client/src/api/system-enhance/customer-accounts';
import { toSystemEnhanceErrorText } from '../system-enhance-shared';
import {
  CUSTOMER_ACCOUNT_EXPORT_HEADERS,
  CUSTOMER_ACCOUNT_STATUS_OPTIONS,
  buildCustomerAccountColumns,
  buildCustomerAccountExportRows,
} from './CustomerAccountColumns';
import { CustomerAccountFormDialog } from './CustomerAccountDialogs';
import { CustomerAccountLoginLogsDialog } from './CustomerAccountLoginLogsDialog';
import { CustomerAccountConfirmDialogs } from './CustomerAccountConfirmDialogs';
import { useCustomerAccountActions } from './useCustomerAccountActions';

const ACCOUNT_PAGE_SIZE: number = 10;
const ACCOUNT_EXPORT_LIMIT: number = 100;
const ACCOUNT_FILTER_ALL: string = '__all__';

const CustomerAccountsPanel = () => {
  const [status, setStatus] = useState<string>(ACCOUNT_FILTER_ALL);
  const [customerName, setCustomerName] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [items, setItems] = useState<CustomerAccount[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedKeys, setSelectedKeys] = useState<Key[]>([]);
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [editTarget, setEditTarget] = useState<CustomerAccount | null>(null);
  const [loginLogsTarget, setLoginLogsTarget] = useState<CustomerAccount | null>(
    null,
  );

  const filterParams = useMemo(
    () => ({
      status: status !== ACCOUNT_FILTER_ALL ? status : undefined,
      customerName: customerName.trim() || undefined,
      username: username.trim() || undefined,
    }),
    [status, customerName, username],
  );

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listCustomerAccounts({
        ...filterParams,
        page: String(page),
        pageSize: String(ACCOUNT_PAGE_SIZE),
      });
      setItems(result.items);
      setTotal(result.total);
    } catch (error: unknown) {
      logger.error('加载客户账户列表失败', String(error));
      toast.error(toSystemEnhanceErrorText(error));
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

  const actions = useCustomerAccountActions(refresh);

  const handleReset = (): void => {
    setStatus(ACCOUNT_FILTER_ALL);
    setCustomerName('');
    setUsername('');
    setPage(1);
  };

  const handleTableChange: TableProps<CustomerAccount>['onChange'] = (
    pagination,
  ) => {
    const next: number = pagination.current ?? page;
    if (next !== page) setPage(next);
  };

  const selectedIds: number[] = useMemo(
    () => selectedKeys.map((key: Key) => Number(key)),
    [selectedKeys],
  );

  const handleUnlock = useCallback(
    async (record: CustomerAccount): Promise<void> => {
      try {
        await unlockCustomerAccount(record.id);
        toast.success(`账户「${record.username}」已解锁`);
        refresh();
      } catch (error: unknown) {
        logger.error('解锁客户账户失败', String(error));
        toast.error(toSystemEnhanceErrorText(error));
        refresh();
      }
    },
    [refresh],
  );

  const handleExport = async (): Promise<void> => {
    try {
      const result = await listCustomerAccounts({
        ...filterParams,
        page: '1',
        pageSize: String(ACCOUNT_EXPORT_LIMIT),
      });
      const count: number = await exportRowsToExcel(
        buildCustomerAccountExportRows(result.items),
        CUSTOMER_ACCOUNT_EXPORT_HEADERS,
        '客户账户',
        '客户账户',
      );
      toast.success(`已导出 ${count} 个客户账户`);
    } catch (error: unknown) {
      logger.error('导出客户账户失败', String(error));
      toast.error(toSystemEnhanceErrorText(error));
    }
  };

  const columns = useMemo(
    () =>
      buildCustomerAccountColumns({
        onEdit: (record: CustomerAccount) => setEditTarget(record),
        onResetPassword: (record: CustomerAccount) => actions.requestReset(record),
        onUnlock: (record: CustomerAccount) => void handleUnlock(record),
        onViewLoginLogs: (record: CustomerAccount) => setLoginLogsTarget(record),
        onDelete: (record: CustomerAccount) => actions.requestDelete(record),
      }),
    [handleUnlock, actions],
  );

  const {
    visibleColumns,
    columnMetas,
    hiddenIds,
    toggleColumn,
    resetColumns,
    setAllColumns,
  } = useColumnSettings(columns);

  const handleBatchDeleted = useCallback((): void => {
    setSelectedKeys([]);
    refresh();
  }, [refresh]);

  return (
    <div className="space-y-6">
      <ReportCard>
        <SectionHeader
          no="01"
          label="CUSTOMER ACCOUNTS"
          subtitle="客户账户管理 · 外部客户登录账号与安全控制"
        />
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <WarehouseFilterSelect
            value={status}
            placeholder="状态"
            allLabel="全部状态"
            options={CUSTOMER_ACCOUNT_STATUS_OPTIONS}
            onChange={(value: string) => {
              setStatus(value);
              setPage(1);
            }}
          />
          <Input
            className="h-9 w-40 rounded-none"
            value={customerName}
            placeholder="客户名称"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setCustomerName(e.target.value);
              setPage(1);
            }}
          />
          <Input
            className="h-9 w-36 rounded-none"
            value={username}
            placeholder="用户名"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setUsername(e.target.value);
              setPage(1);
            }}
          />
          <Button
            variant="ghost"
            size="sm"
            className="rounded-none"
            onClick={handleReset}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            重置
          </Button>
        </div>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Button
            data-ai-section-type="button"
            onClick={() => setFormOpen(true)}
          >
            <Plus className="h-4 w-4" />
            新建客户账户
          </Button>
          <Button variant="outline" onClick={() => void handleExport()}>
            <Download className="h-4 w-4" />
            导出Excel
          </Button>
          <ColumnSettingsButton
            columnMetas={columnMetas}
            hiddenIds={hiddenIds}
            onToggle={toggleColumn}
            onReset={resetColumns}
            onSetAll={setAllColumns}
          />
          <Button
            variant="outline"
            size="sm"
            className="ml-auto rounded-none"
            disabled={selectedIds.length === 0}
            onClick={actions.requestBatchDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
            批量删除（{selectedIds.length}）
          </Button>
        </div>
        <Table<CustomerAccount>
          columns={visibleColumns}
          dataSource={items}
          loading={loading}
          rowKey="id"
          scroll={{ x: 1500, y: 500 }}
          rowSelection={{
            selectedRowKeys: selectedKeys,
            onChange: (keys: Key[]) => setSelectedKeys(keys),
          }}
          pagination={{
            current: page,
            pageSize: ACCOUNT_PAGE_SIZE,
            total,
            showSizeChanger: false,
          }}
          onChange={handleTableChange}
        />
      </ReportCard>

      <CustomerAccountFormDialog
        open={formOpen || editTarget !== null}
        target={editTarget}
        onOpenChange={(open: boolean) => {
          if (!open) {
            setFormOpen(false);
            setEditTarget(null);
          }
        }}
        onSaved={refresh}
      />
      <CustomerAccountLoginLogsDialog
        open={loginLogsTarget !== null}
        target={loginLogsTarget}
        onOpenChange={(open: boolean) => {
          if (!open) setLoginLogsTarget(null);
        }}
      />
      <CustomerAccountConfirmDialogs
        actions={actions}
        selectedIds={selectedIds}
        onBatchDeleted={handleBatchDeleted}
      />
    </div>
  );
};

export default CustomerAccountsPanel;
