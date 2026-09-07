import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Download, Plus, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Table, type TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import { ColumnSettingsButton } from '@client/src/components/column-settings-button';
import { useColumnSettings } from '@client/src/hooks/useColumnSettings';
import { Button } from '@client/src/components/ui/button';
import type { FinanceCoinReturn, FinanceCoinReturnListParams } from '@shared/api.interface';
import {
  deleteFinanceCoinReturn, failFinanceCoinReturn, fetchFinanceCoinReturns,
  finishFinanceCoinReturn, processFinanceCoinReturn,
} from '@client/src/api/finance-enhance/funds';
import { AdsConfirmDialog } from '@client/src/pages/AdsBusiness/AdsConfirmDialog';
import { exportRowsToExcel } from '@client/src/pages/AdsBusiness/ads-excel';
import { CoinReturnFormDialog } from './CoinReturnFormDialog';
import { FINANCE_FILTER_ALL, formatFinanceAmount } from '../finance-constants';
import {
  FUNDS_COIN_STATUS_OPTIONS, FUNDS_EXPORT_LIMIT, FUNDS_PAGE_SIZE,
  FUNDS_PLATFORM_OPTIONS, FundsActionLink, FundsFilterSelect, FundsStatusBadge,
  reportFundsError,
} from './funds-shared';

const EXPORT_HEADERS: string[] = [
  '退币单号', '客户ID', '广告账户ID', '平台', '退币数量', '人民币等值', '状态', '操作人', '完成时间', '创建时间',
];

type CoinAction = 'process' | 'finish' | 'fail' | 'delete';

const COIN_ACTION_TEXT: Record<CoinAction, string> = {
  process: '处理', finish: '完成', fail: '标失败', delete: '删除',
};

interface PendingCoinAction {
  item: FinanceCoinReturn;
  action: CoinAction;
}

export function CoinReturnsTab() {
  const [status, setStatus] = useState<string>(FINANCE_FILTER_ALL);
  const [platform, setPlatform] = useState<string>(FINANCE_FILTER_ALL);
  const [page, setPage] = useState<number>(1);
  const [items, setItems] = useState<FinanceCoinReturn[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [pending, setPending] = useState<PendingCoinAction | null>(null);

  const filterParams = useMemo((): FinanceCoinReturnListParams => ({
    status: status === FINANCE_FILTER_ALL ? undefined : status,
    platform: platform === FINANCE_FILTER_ALL ? undefined : platform,
  }), [status, platform]);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchFinanceCoinReturns({
        ...filterParams, page, pageSize: FUNDS_PAGE_SIZE,
      });
      setItems(result.items);
      setTotal(result.total);
    } catch (error: unknown) {
      reportFundsError('加载退币列表失败', error);
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
    setStatus(FINANCE_FILTER_ALL);
    setPlatform(FINANCE_FILTER_ALL);
    setPage(1);
  };

  const handlePending = async (): Promise<void> => {
    if (!pending) return;
    const actionText: string = COIN_ACTION_TEXT[pending.action];
    try {
      if (pending.action === 'process') await processFinanceCoinReturn(pending.item.id);
      else if (pending.action === 'finish') await finishFinanceCoinReturn(pending.item.id);
      else if (pending.action === 'fail') await failFinanceCoinReturn(pending.item.id);
      else await deleteFinanceCoinReturn(pending.item.id);
      toast.success(`退币单已${actionText}`);
      setPending(null);
      refresh();
    } catch (error: unknown) {
      reportFundsError(`${actionText}退币失败`, error);
    }
  };

  const handleExport = async (): Promise<void> => {
    try {
      const result = await fetchFinanceCoinReturns({
        ...filterParams, page: 1, pageSize: FUNDS_EXPORT_LIMIT,
      });
      const rows: Record<string, string>[] = result.items.map((item: FinanceCoinReturn) => ({
        退币单号: item.returnNo,
        客户ID: item.customerId,
        广告账户ID: item.adAccountId,
        平台: item.platform,
        退币数量: String(item.coinAmount),
        人民币等值: String(item.rmbEquivalent),
        状态: item.status,
        操作人: item.operator,
        完成时间: item.finishTime ?? '',
        创建时间: item.createdAt,
      }));
      const count: number = await exportRowsToExcel(rows, EXPORT_HEADERS, '退币管理', '退币管理');
      toast.success(`已导出 ${count} 条退币记录`);
    } catch (error: unknown) {
      reportFundsError('导出退币记录失败', error);
    }
  };

  const columns = useMemo((): TableColumnsType<FinanceCoinReturn> => [
    {
      key: 'cr-returnNo', title: '退币单号', dataIndex: 'returnNo', width: 150, fixed: 'left',
      render: (value: string) => <span className="font-bold text-primary">{value}</span>,
    },
    { key: 'cr-customerId', title: '客户ID', dataIndex: 'customerId', width: 140 },
    { key: 'cr-adAccountId', title: '广告账户ID', dataIndex: 'adAccountId', width: 140 },
    { key: 'cr-platform', title: '平台', dataIndex: 'platform', width: 100 },
    {
      key: 'cr-coinAmount', title: '退币数量', dataIndex: 'coinAmount', width: 120, align: 'right',
      render: (value: number) => (
        <span className="font-mono">{value.toLocaleString('zh-CN')}</span>
      ),
    },
    {
      key: 'cr-rmbEquivalent', title: '人民币等值', dataIndex: 'rmbEquivalent', width: 130,
      align: 'right',
      render: (value: number) => <span className="font-mono">{formatFinanceAmount(value)}</span>,
    },
    {
      key: 'cr-status', title: '状态', dataIndex: 'status', width: 90,
      render: (value: string) => <FundsStatusBadge status={value} />,
    },
    { key: 'cr-operator', title: '操作人', dataIndex: 'operator', width: 100 },
    {
      key: 'cr-finishTime', title: '完成时间', dataIndex: 'finishTime', width: 150,
      render: (value: string | null) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '—'),
    },
    {
      key: 'cr-createdAt', title: '创建时间', dataIndex: 'createdAt', width: 150,
      render: (value: string) => dayjs(value).format('YYYY-MM-DD HH:mm'),
    },
    {
      key: 'cr-actions', title: '操作', width: 210, fixed: 'right',
      render: (_: unknown, record: FinanceCoinReturn) => (
        <div className="flex flex-wrap items-center gap-1">
          {record.status === '待处理' ? (
            <FundsActionLink onClick={() => setPending({ item: record, action: 'process' })}>
              处理
            </FundsActionLink>
          ) : null}
          {record.status === '处理中' ? (
            <>
              <FundsActionLink onClick={() => setPending({ item: record, action: 'finish' })}>
                完成
              </FundsActionLink>
              <FundsActionLink onClick={() => setPending({ item: record, action: 'fail' })}>
                标失败
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

  const pendingText: string = pending ? COIN_ACTION_TEXT[pending.action] : '处理';

  return (
    <div>
      {/* 筛选区 */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <FundsFilterSelect
          value={status}
          placeholder="状态"
          allLabel="全部状态"
          options={FUNDS_COIN_STATUS_OPTIONS}
          onChange={(value: string) => {
            setStatus(value);
            setPage(1);
          }}
        />
        <FundsFilterSelect
          value={platform}
          placeholder="平台"
          allLabel="全部平台"
          options={FUNDS_PLATFORM_OPTIONS}
          onChange={(value: string) => {
            setPlatform(value);
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
          新建退币
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
      <Table<FinanceCoinReturn>
        columns={visibleColumns}
        dataSource={items}
        loading={loading}
        rowKey="id"
        scroll={{ x: 1600, y: 500 }}
        pagination={{
          current: page,
          pageSize: FUNDS_PAGE_SIZE,
          total,
          onChange: (nextPage: number) => setPage(nextPage),
        }}
      />
      <CoinReturnFormDialog
        open={formOpen}
        onSaved={refresh}
        onOpenChange={setFormOpen}
      />
      <AdsConfirmDialog
        open={pending !== null}
        title={`${pendingText}退币？`}
        description={pending
          ? `即将${pendingText}退币单「${pending.item.returnNo}」${pending.action === 'delete' ? '，删除后不可恢复。' : '。'}`
          : ''}
        confirmText={pendingText}
        destructive={pending?.action === 'delete' || pending?.action === 'fail'}
        onOpenChange={(open: boolean) => {
          if (!open) setPending(null);
        }}
        onConfirm={() => void handlePending()}
      />
    </div>
  );
}
