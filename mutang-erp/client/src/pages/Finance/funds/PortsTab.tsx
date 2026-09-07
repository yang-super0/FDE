import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Download, Plus, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Table, type TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import { ColumnSettingsButton } from '@client/src/components/column-settings-button';
import { useColumnSettings } from '@client/src/hooks/useColumnSettings';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import type { FinancePort, FinancePortListParams } from '@shared/api.interface';
import {
  deleteFinancePort, enableFinancePort, fetchFinancePorts,
  setFinancePortBalance,
} from '@client/src/api/finance-enhance/funds';
import { AdsConfirmDialog } from '@client/src/pages/AdsBusiness/AdsConfirmDialog';
import { exportRowsToExcel } from '@client/src/pages/AdsBusiness/ads-excel';
import { PortFormDialog } from './PortFormDialog';
import { FINANCE_FILTER_ALL, formatFinanceAmount } from '../finance-constants';
import {
  FUNDS_ENABLE_STATUS_OPTIONS, FUNDS_EXPORT_LIMIT, FUNDS_PAGE_SIZE,
  FUNDS_PORT_TYPE_OPTIONS, FundsActionLink, FundsBalanceDialog, FundsFilterSelect,
  FundsStatusBadge, reportFundsError,
} from './funds-shared';

const EXPORT_HEADERS: string[] = [
  '端口编号', '端口名称', '端口类型', '平台', '余额', '冻结金额', '联系人', '联系电话', '状态', '备注', '创建时间',
];

type PortAction = 'enable' | 'disable' | 'delete';

const PORT_ACTION_TEXT: Record<PortAction, string> = {
  enable: '启用', disable: '停用', delete: '删除',
};

interface PendingPortAction {
  item: FinancePort;
  action: PortAction;
}

export function PortsTab() {
  const [draftName, setDraftName] = useState<string>('');
  const [portName, setPortName] = useState<string>('');
  const [portType, setPortType] = useState<string>(FINANCE_FILTER_ALL);
  const [status, setStatus] = useState<string>(FINANCE_FILTER_ALL);
  const [page, setPage] = useState<number>(1);
  const [items, setItems] = useState<FinancePort[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [editing, setEditing] = useState<FinancePort | null>(null);
  const [pending, setPending] = useState<PendingPortAction | null>(null);
  const [balanceItem, setBalanceItem] = useState<FinancePort | null>(null);

  useEffect(() => {
    const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
      setPortName(draftName.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [draftName]);

  const filterParams = useMemo((): FinancePortListParams => ({
    portName: portName || undefined,
    portType: portType === FINANCE_FILTER_ALL ? undefined : portType,
    status: status === FINANCE_FILTER_ALL ? undefined : status,
  }), [portName, portType, status]);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchFinancePorts({
        ...filterParams, page, pageSize: FUNDS_PAGE_SIZE,
      });
      setItems(result.items);
      setTotal(result.total);
    } catch (error: unknown) {
      reportFundsError('加载端口列表失败', error);
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
    setDraftName('');
    setPortName('');
    setPortType(FINANCE_FILTER_ALL);
    setStatus(FINANCE_FILTER_ALL);
    setPage(1);
  };

  const handlePending = async (): Promise<void> => {
    if (!pending) return;
    const actionText: string = PORT_ACTION_TEXT[pending.action];
    try {
      if (pending.action === 'enable') await enableFinancePort(pending.item.id, true);
      else if (pending.action === 'disable') await enableFinancePort(pending.item.id, false);
      else await deleteFinancePort(pending.item.id);
      toast.success(`端口已${actionText}`);
      setPending(null);
      refresh();
    } catch (error: unknown) {
      reportFundsError(`${actionText}端口失败`, error);
    }
  };

  const handleBalance = async (balance: number): Promise<void> => {
    if (!balanceItem) return;
    await setFinancePortBalance(balanceItem.id, balance);
    toast.success('端口余额已登记');
    refresh();
  };

  const handleExport = async (): Promise<void> => {
    try {
      const result = await fetchFinancePorts({
        ...filterParams, page: 1, pageSize: FUNDS_EXPORT_LIMIT,
      });
      const rows: Record<string, string>[] = result.items.map((item: FinancePort) => ({
        端口编号: item.portNo,
        端口名称: item.portName,
        端口类型: item.portType,
        平台: item.platform,
        余额: String(item.balance),
        冻结金额: String(item.frozenBalance),
        联系人: item.contactPerson,
        联系电话: item.contactPhone,
        状态: item.status,
        备注: item.remark,
        创建时间: item.createdAt,
      }));
      const count: number = await exportRowsToExcel(rows, EXPORT_HEADERS, '端口管理', '端口管理');
      toast.success(`已导出 ${count} 条端口记录`);
    } catch (error: unknown) {
      reportFundsError('导出端口记录失败', error);
    }
  };

  const columns = useMemo((): TableColumnsType<FinancePort> => [
    {
      key: 'pt-portNo', title: '端口编号', dataIndex: 'portNo', width: 150, fixed: 'left',
      render: (value: string) => <span className="font-bold text-primary">{value}</span>,
    },
    { key: 'pt-portName', title: '端口名称', dataIndex: 'portName', width: 140 },
    { key: 'pt-portType', title: '端口类型', dataIndex: 'portType', width: 100 },
    { key: 'pt-platform', title: '平台', dataIndex: 'platform', width: 100 },
    {
      key: 'pt-balance', title: '余额', dataIndex: 'balance', width: 130, align: 'right',
      render: (value: number) => <span className="font-mono">{formatFinanceAmount(value)}</span>,
    },
    {
      key: 'pt-frozenBalance', title: '冻结金额', dataIndex: 'frozenBalance', width: 130,
      align: 'right',
      render: (value: number) => <span className="font-mono">{formatFinanceAmount(value)}</span>,
    },
    { key: 'pt-contactPerson', title: '联系人', dataIndex: 'contactPerson', width: 100 },
    { key: 'pt-contactPhone', title: '联系电话', dataIndex: 'contactPhone', width: 130 },
    {
      key: 'pt-status', title: '状态', dataIndex: 'status', width: 90,
      render: (value: string) => <FundsStatusBadge status={value} />,
    },
    { key: 'pt-remark', title: '备注', dataIndex: 'remark', width: 140 },
    {
      key: 'pt-createdAt', title: '创建时间', dataIndex: 'createdAt', width: 150,
      render: (value: string) => dayjs(value).format('YYYY-MM-DD HH:mm'),
    },
    {
      key: 'pt-actions', title: '操作', width: 230, fixed: 'right',
      render: (_: unknown, record: FinancePort) => (
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

  const pendingText: string = pending ? PORT_ACTION_TEXT[pending.action] : '启用';

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          className="w-36 rounded-none"
          placeholder="端口名称"
          value={draftName}
          onChange={(event) => setDraftName(event.target.value)}
        />
        <FundsFilterSelect
          value={portType} placeholder="端口类型" allLabel="全部类型"
          options={FUNDS_PORT_TYPE_OPTIONS}
          onChange={(value: string) => { setPortType(value); setPage(1); }}
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
          新建端口
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
      <Table<FinancePort>
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
      <PortFormDialog
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
        title={`${pendingText}端口？`}
        description={pending
          ? `即将${pendingText}端口「${pending.item.portName}」${pending.action === 'delete' ? '，删除后不可恢复。' : '。'}`
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
        title="端口余额登记"
        description={balanceItem ? `端口「${balanceItem.portName}」当前余额 ${formatFinanceAmount(balanceItem.balance)}` : ''}
        onSubmit={handleBalance}
        onOpenChange={(open: boolean) => {
          if (!open) setBalanceItem(null);
        }}
      />
    </div>
  );
}
