import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Key } from 'react';
import { Download, Plus, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Table } from '@lark-apaas/client-toolkit/antd-table';
import { ColumnSettingsButton } from '@client/src/components/column-settings-button';
import { useColumnSettings } from '@client/src/hooks/useColumnSettings';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import type {
  AdminEnhanceListParams, AdminInventoryCheck,
} from '@shared/api.interface';
import {
  batchDeleteInventoryChecks, completeInventoryCheck, deleteInventoryCheck,
  fetchInventoryChecks,
} from '@client/src/api/admin-enhance/warehouse';
import { AdsConfirmDialog } from '@client/src/pages/AdsBusiness/AdsConfirmDialog';
import { exportRowsToExcel } from '@client/src/pages/AdsBusiness/ads-excel';
import { ADMIN_FILTER_ALL, ADMIN_CHECK_STATUS_OPTIONS } from '../admin-enhance-constants';
import {
  buildChecksExportRows, buildInventoryChecksColumns, CHECKS_EXPORT_HEADERS,
} from './InventoryChecksColumns';
import { InventoryChecksFormDialog } from './InventoryChecksFormDialog';
import { CheckDetailsDialog, type CheckDetailsMode } from './CheckDetailsDialog';
import {
  formatWarehouseDate, reportWarehouseError, WAREHOUSE_EXPORT_LIMIT,
  WAREHOUSE_PAGE_SIZE, WarehouseDatePicker, WarehouseFilterSelect,
} from './warehouse-shared';

type CheckConfirmKind = 'complete' | 'delete' | 'batch';

interface CheckConfirmState {
  kind: CheckConfirmKind;
  item: AdminInventoryCheck | null;
}

interface CheckDetailsState {
  mode: CheckDetailsMode;
  check: AdminInventoryCheck | null;
}

export function InventoryChecksTab() {
  const [draftKeyword, setDraftKeyword] = useState<string>('');
  const [keyword, setKeyword] = useState<string>('');
  const [department, setDepartment] = useState<string>('');
  const [status, setStatus] = useState<string>(ADMIN_FILTER_ALL);
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [page, setPage] = useState<number>(1);
  const [items, setItems] = useState<AdminInventoryCheck[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [editing, setEditing] = useState<AdminInventoryCheck | null>(null);
  const [detailsState, setDetailsState] = useState<CheckDetailsState | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Key[]>([]);
  const [confirmState, setConfirmState] = useState<CheckConfirmState | null>(null);

  useEffect(() => {
    const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
      setKeyword(draftKeyword.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [draftKeyword]);

  const filterParams = useMemo((): AdminEnhanceListParams => ({
    keyword: keyword || undefined,
    department: department.trim() || undefined,
    status: status === ADMIN_FILTER_ALL ? undefined : status,
    dateFrom: dateFrom ? formatWarehouseDate(dateFrom.toISOString()) : undefined,
    dateTo: dateTo ? formatWarehouseDate(dateTo.toISOString()) : undefined,
  }), [keyword, department, status, dateFrom, dateTo]);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchInventoryChecks({
        ...filterParams,
        page: String(page),
        pageSize: String(WAREHOUSE_PAGE_SIZE),
      });
      setItems(result.items);
      setTotal(result.total);
    } catch (error: unknown) {
      reportWarehouseError('加载盘点单列表失败', error);
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
    setDepartment('');
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
    const kind: CheckConfirmKind = confirmState.kind;
    const target: AdminInventoryCheck | null = confirmState.item;
    setConfirmState(null);
    try {
      if (kind === 'complete' && target) {
        await completeInventoryCheck(target.id);
        toast.success(`盘点单「${target.inventoryCheckNo}」已完成，库存已按盘盈盘亏调整`);
      } else if (kind === 'delete' && target) {
        await deleteInventoryCheck(target.id);
        toast.success(`盘点单「${target.inventoryCheckNo}」已删除`);
      } else if (kind === 'batch') {
        const result = await batchDeleteInventoryChecks(selectedIds);
        toast.success(`已批量删除 ${result.deleted} 条盘点单`);
        setSelectedKeys([]);
      }
      refresh();
    } catch (error: unknown) {
      reportWarehouseError('操作盘点单失败', error);
    }
  };

  const handleExport = async (): Promise<void> => {
    try {
      const result = await fetchInventoryChecks({
        ...filterParams, page: '1', pageSize: String(WAREHOUSE_EXPORT_LIMIT),
      });
      const count: number = await exportRowsToExcel(
        buildChecksExportRows(result.items), CHECKS_EXPORT_HEADERS,
        '盘点管理', '盘点管理',
      );
      toast.success(`已导出 ${count} 条盘点记录`);
    } catch (error: unknown) {
      reportWarehouseError('导出盘点记录失败', error);
    }
  };

  const columns = useMemo(
    () => buildInventoryChecksColumns({
      onEditDetails: (record: AdminInventoryCheck) =>
        setDetailsState({ mode: 'edit', check: record }),
      onViewDetails: (record: AdminInventoryCheck) =>
        setDetailsState({ mode: 'view', check: record }),
      onComplete: (record: AdminInventoryCheck) =>
        setConfirmState({ kind: 'complete', item: record }),
      onDelete: (record: AdminInventoryCheck) =>
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
    const item: AdminInventoryCheck | null = confirmState.item;
    if (confirmState.kind === 'complete' && item) {
      return {
        title: '完成盘点？', destructive: false, confirmText: '完成盘点',
        description: `即将完成盘点单「${item.inventoryCheckNo}」，系统将按盘盈盘亏自动调整库存（盘盈补入、盘亏扣减），完成后不可撤销。`,
      };
    }
    if (confirmState.kind === 'delete' && item) {
      return {
        title: '删除盘点单？', destructive: true, confirmText: '删除',
        description: `即将删除盘点单「${item.inventoryCheckNo}」及其全部明细，删除后不可恢复。`,
      };
    }
    return {
      title: '批量删除盘点单？', destructive: true, confirmText: '批量删除',
      description: `即将删除已勾选的 ${selectedIds.length} 条盘点单及其全部明细，删除后不可恢复。`,
    };
  };

  const meta = confirmMeta();

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          className="w-44 rounded-none" placeholder="关键词（盘点人/单号/库位）"
          value={draftKeyword}
          onChange={(event) => setDraftKeyword(event.target.value)}
        />
        <Input
          className="w-32 rounded-none" placeholder="部门"
          value={department}
          onChange={(event) => { setDepartment(event.target.value); setPage(1); }}
        />
        <WarehouseFilterSelect
          value={status} placeholder="状态" allLabel="全部状态"
          options={ADMIN_CHECK_STATUS_OPTIONS}
          onChange={(value: string) => { setStatus(value); setPage(1); }}
        />
        <WarehouseDatePicker
          value={dateFrom} placeholder="盘点日期从"
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
          新建盘点单
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
      <Table<AdminInventoryCheck>
        columns={visibleColumns}
        dataSource={items}
        loading={loading}
        rowKey="id"
        scroll={{ x: 1700, y: 500 }}
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
      <InventoryChecksFormDialog
        open={formOpen}
        editing={editing}
        onSaved={refresh}
        onOpenChange={(open: boolean) => {
          setFormOpen(open);
          if (!open) setEditing(null);
        }}
      />
      <CheckDetailsDialog
        open={detailsState !== null}
        mode={detailsState?.mode ?? 'view'}
        check={detailsState?.check ?? null}
        onSaved={refresh}
        onOpenChange={(open: boolean) => {
          if (!open) setDetailsState(null);
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
