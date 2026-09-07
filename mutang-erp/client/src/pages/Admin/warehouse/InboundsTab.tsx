import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Key } from 'react';
import { Download, Plus, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Table } from '@lark-apaas/client-toolkit/antd-table';
import { ColumnSettingsButton } from '@client/src/components/column-settings-button';
import { useColumnSettings } from '@client/src/hooks/useColumnSettings';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import type { AdminEnhanceListParams, AdminInbound } from '@shared/api.interface';
import {
  batchDeleteInbounds, cancelInbound, confirmInbound, deleteInbound,
  fetchInbounds,
} from '@client/src/api/admin-enhance/warehouse';
import { AdsConfirmDialog } from '@client/src/pages/AdsBusiness/AdsConfirmDialog';
import { exportRowsToExcel } from '@client/src/pages/AdsBusiness/ads-excel';
import {
  ADMIN_FILTER_ALL, ADMIN_INBOUND_STATUS_OPTIONS,
} from '../admin-enhance-constants';
import {
  buildInboundsColumns, buildInboundsExportRows, INBOUNDS_EXPORT_HEADERS,
} from './InboundsColumns';
import { InboundsFormDialog } from './InboundsFormDialog';
import {
  formatWarehouseDate, reportWarehouseError, WAREHOUSE_EXPORT_LIMIT,
  WAREHOUSE_PAGE_SIZE, WarehouseDatePicker, WarehouseFilterSelect,
} from './warehouse-shared';

type InboundConfirmKind = 'confirm' | 'cancel' | 'delete' | 'batch';

interface InboundConfirmState {
  kind: InboundConfirmKind;
  item: AdminInbound | null;
}

export function InboundsTab() {
  const [draftKeyword, setDraftKeyword] = useState<string>('');
  const [keyword, setKeyword] = useState<string>('');
  const [supplierName, setSupplierName] = useState<string>('');
  const [status, setStatus] = useState<string>(ADMIN_FILTER_ALL);
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [page, setPage] = useState<number>(1);
  const [items, setItems] = useState<AdminInbound[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [editing, setEditing] = useState<AdminInbound | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Key[]>([]);
  const [confirmState, setConfirmState] = useState<InboundConfirmState | null>(null);

  useEffect(() => {
    const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
      setKeyword(draftKeyword.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [draftKeyword]);

  const filterParams = useMemo((): AdminEnhanceListParams => ({
    keyword: keyword || undefined,
    supplierName: supplierName.trim() || undefined,
    status: status === ADMIN_FILTER_ALL ? undefined : status,
    dateFrom: dateFrom ? formatWarehouseDate(dateFrom.toISOString()) : undefined,
    dateTo: dateTo ? formatWarehouseDate(dateTo.toISOString()) : undefined,
  }), [keyword, supplierName, status, dateFrom, dateTo]);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchInbounds({
        ...filterParams,
        page: String(page),
        pageSize: String(WAREHOUSE_PAGE_SIZE),
      });
      setItems(result.items);
      setTotal(result.total);
    } catch (error: unknown) {
      reportWarehouseError('加载入库单列表失败', error);
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
    setSupplierName('');
    setStatus(ADMIN_FILTER_ALL);
    setDateFrom(undefined);
    setDateTo(undefined);
    setPage(1);
  };

  const selectedIds: number[] = useMemo(
    () => selectedKeys.map((key: Key) => Number(key)),
    [selectedKeys],
  );

  const handleConfirmAction = async (): Promise<void> => {
    if (!confirmState) return;
    const kind: InboundConfirmKind = confirmState.kind;
    const target: AdminInbound | null = confirmState.item;
    setConfirmState(null);
    try {
      if (kind === 'confirm' && target) {
        await confirmInbound(target.id);
        toast.success(`入库单「${target.inboundNo}」已确认入库，库存已更新`);
      } else if (kind === 'cancel' && target) {
        await cancelInbound(target.id);
        toast.success(`入库单「${target.inboundNo}」已取消`);
      } else if (kind === 'delete' && target) {
        await deleteInbound(target.id);
        toast.success(`入库单「${target.inboundNo}」已删除`);
      } else if (kind === 'batch') {
        const result = await batchDeleteInbounds(selectedIds);
        toast.success(`已批量删除 ${result.deleted} 条入库单`);
        setSelectedKeys([]);
      }
      refresh();
    } catch (error: unknown) {
      reportWarehouseError('操作入库单失败', error);
    }
  };

  const handleExport = async (): Promise<void> => {
    try {
      const result = await fetchInbounds({
        ...filterParams, page: '1', pageSize: String(WAREHOUSE_EXPORT_LIMIT),
      });
      const count: number = await exportRowsToExcel(
        buildInboundsExportRows(result.items), INBOUNDS_EXPORT_HEADERS,
        '入库管理', '入库管理',
      );
      toast.success(`已导出 ${count} 条入库记录`);
    } catch (error: unknown) {
      reportWarehouseError('导出入库记录失败', error);
    }
  };

  const columns = useMemo(
    () => buildInboundsColumns({
      onConfirm: (record: AdminInbound) =>
        setConfirmState({ kind: 'confirm', item: record }),
      onCancel: (record: AdminInbound) =>
        setConfirmState({ kind: 'cancel', item: record }),
      onDelete: (record: AdminInbound) =>
        setConfirmState({ kind: 'delete', item: record }),
    }),
    [],
  );

  const {
    visibleColumns, columnMetas, hiddenIds,
    toggleColumn, resetColumns, setAllColumns,
  } = useColumnSettings(columns);

  const confirmMeta = (): {
    title: string; description: string; confirmText: string; destructive: boolean;
  } | null => {
    if (!confirmState) return null;
    const item: AdminInbound | null = confirmState.item;
    if (confirmState.kind === 'confirm' && item) {
      return {
        title: '确认入库？', destructive: false, confirmText: '确认入库',
        description: `即将确认入库单「${item.inboundNo}」（${item.itemName} × ${item.quantity}），确认后库存将同步增加。`,
      };
    }
    if (confirmState.kind === 'cancel' && item) {
      return {
        title: '取消入库单？', destructive: true, confirmText: '取消入库单',
        description: `即将取消入库单「${item.inboundNo}」，取消后不可恢复。`,
      };
    }
    if (confirmState.kind === 'delete' && item) {
      return {
        title: '删除入库单？', destructive: true, confirmText: '删除',
        description: `即将删除入库单「${item.inboundNo}」，删除后不可恢复。`,
      };
    }
    return {
      title: '批量删除入库单？', destructive: true, confirmText: '批量删除',
      description: `即将删除已勾选的 ${selectedIds.length} 条入库单，删除后不可恢复。`,
    };
  };

  const meta = confirmMeta();

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          className="w-44 rounded-none" placeholder="关键词（物品/供应商/单号）"
          value={draftKeyword}
          onChange={(event) => setDraftKeyword(event.target.value)}
        />
        <Input
          className="w-32 rounded-none" placeholder="供应商"
          value={supplierName}
          onChange={(event) => { setSupplierName(event.target.value); setPage(1); }}
        />
        <WarehouseFilterSelect
          value={status} placeholder="状态" allLabel="全部状态"
          options={ADMIN_INBOUND_STATUS_OPTIONS}
          onChange={(value: string) => { setStatus(value); setPage(1); }}
        />
        <WarehouseDatePicker
          value={dateFrom} placeholder="入库日期从"
          onChange={(value: Date | undefined) => { setDateFrom(value); setPage(1); }}
        />
        <WarehouseDatePicker
          value={dateTo} placeholder="至"
          onChange={(value: Date | undefined) => { setDateTo(value); setPage(1); }}
        />
        <Button variant="ghost" size="sm" className="rounded-none" onClick={handleReset}>
          <RotateCcw className="h-3.5 w-3.5" />
          重置
        </Button>
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button data-ai-section-type="button" onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4" />
          新建入库单
        </Button>
        <Button variant="outline" onClick={() => void handleExport()}>
          <Download className="h-4 w-4" />
          导出Excel
        </Button>
        <ColumnSettingsButton
          columnMetas={columnMetas} hiddenIds={hiddenIds}
          onToggle={toggleColumn} onReset={resetColumns} onSetAll={setAllColumns}
        />
        <Button
          variant="outline" size="sm" className="ml-auto rounded-none"
          disabled={selectedIds.length === 0}
          onClick={() => setConfirmState({ kind: 'batch', item: null })}
        >
          批量删除（{selectedIds.length}）
        </Button>
      </div>
      <Table<AdminInbound>
        columns={visibleColumns}
        dataSource={items}
        loading={loading}
        rowKey="id"
        scroll={{ x: 1900, y: 500 }}
        rowSelection={{
          selectedRowKeys: selectedKeys,
          onChange: (keys: Key[]) => setSelectedKeys(keys),
        }}
        pagination={{
          current: page,
          pageSize: WAREHOUSE_PAGE_SIZE,
          total,
          onChange: (nextPage: number) => setPage(nextPage),
        }}
      />
      <InboundsFormDialog
        open={formOpen}
        editing={editing}
        onSaved={refresh}
        onOpenChange={(open: boolean) => {
          setFormOpen(open);
          if (!open) setEditing(null);
        }}
      />
      <AdsConfirmDialog
        open={confirmState !== null}
        title={meta?.title ?? ''}
        description={meta?.description ?? ''}
        confirmText={meta?.confirmText}
        destructive={meta?.destructive}
        onOpenChange={(open: boolean) => {
          if (!open) setConfirmState(null);
        }}
        onConfirm={() => void handleConfirmAction()}
      />
    </div>
  );
}
