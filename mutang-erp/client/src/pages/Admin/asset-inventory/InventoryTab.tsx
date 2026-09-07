import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Key } from 'react';
import { Download, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Table, type TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import { ColumnSettingsButton } from '@client/src/components/column-settings-button';
import { useColumnSettings } from '@client/src/hooks/useColumnSettings';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import type {
  AdminEnhanceInventoryStats, AdminEnhanceListParams, AdminInventoryItem,
} from '@shared/api.interface';
import {
  batchDeleteInventoryItems, deleteInventoryItem, fetchInventoryItemList,
  fetchInventoryStats,
} from '@client/src/api/admin-enhance/asset-inventory';
import { AdsConfirmDialog } from '@client/src/pages/AdsBusiness/AdsConfirmDialog';
import { exportRowsToExcel } from '@client/src/pages/AdsBusiness/ads-excel';
import {
  ADMIN_FILTER_ALL, ADMIN_INVENTORY_STATUS_OPTIONS, ADMIN_ITEM_TYPE_OPTIONS,
} from '../admin-enhance-constants';
import { InventoryFormDialog } from './InventoryFormDialog';
import {
  buildInventoryColumns, buildInventoryExportRows, INVENTORY_EXPORT_HEADERS,
} from './InventoryColumns';
import {
  AdminFilterSelect, ASSET_INVENTORY_EXPORT_LIMIT, ASSET_INVENTORY_PAGE_SIZE,
  InventoryStatsBand, reportAssetInventoryError,
} from './asset-inventory-shared';

export function InventoryTab() {
  const [draftKeyword, setDraftKeyword] = useState<string>('');
  const [keyword, setKeyword] = useState<string>('');
  const [itemType, setItemType] = useState<string>(ADMIN_FILTER_ALL);
  const [status, setStatus] = useState<string>(ADMIN_FILTER_ALL);
  const [location, setLocation] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [items, setItems] = useState<AdminInventoryItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [stats, setStats] = useState<AdminEnhanceInventoryStats | null>(null);
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [editing, setEditing] = useState<AdminInventoryItem | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Key[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<AdminInventoryItem | null>(null);
  const [batchConfirmOpen, setBatchConfirmOpen] = useState<boolean>(false);

  useEffect(() => {
    const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
      setKeyword(draftKeyword.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [draftKeyword]);

  const filterParams = useMemo((): AdminEnhanceListParams => ({
    keyword: keyword || undefined,
    itemType: itemType === ADMIN_FILTER_ALL ? undefined : itemType,
    status: status === ADMIN_FILTER_ALL ? undefined : status,
    location: location.trim() || undefined,
  }), [keyword, itemType, status, location]);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchInventoryItemList({
        ...filterParams,
        page: String(page),
        pageSize: String(ASSET_INVENTORY_PAGE_SIZE),
      });
      setItems(result.items);
      setTotal(result.total);
    } catch (error: unknown) {
      reportAssetInventoryError('加载库存列表失败', error);
    } finally {
      setLoading(false);
    }
  }, [filterParams, page]);

  const loadStats = useCallback(async (): Promise<void> => {
    try {
      setStats(await fetchInventoryStats());
    } catch (error: unknown) {
      reportAssetInventoryError('加载库存统计失败', error);
    }
  }, []);

  useEffect(() => { void loadList(); }, [loadList]);
  useEffect(() => { void loadStats(); }, [loadStats]);

  const refreshAll = useCallback((): void => {
    void loadList();
    void loadStats();
  }, [loadList, loadStats]);

  const handleReset = (): void => {
    setDraftKeyword('');
    setKeyword('');
    setItemType(ADMIN_FILTER_ALL);
    setStatus(ADMIN_FILTER_ALL);
    setLocation('');
    setPage(1);
  };

  const handleDelete = async (): Promise<void> => {
    if (!deleteTarget) return;
    try {
      await deleteInventoryItem(deleteTarget.id);
      toast.success('库存物品已删除');
      setDeleteTarget(null);
      refreshAll();
    } catch (error: unknown) {
      reportAssetInventoryError('删除库存物品失败', error);
    }
  };

  const selectedIds: number[] = useMemo(
    () => selectedKeys.map((key: Key) => Number(key)),
    [selectedKeys],
  );

  const handleBatchDelete = async (): Promise<void> => {
    if (selectedIds.length === 0) {
      toast.error('请先勾选库存物品');
      return;
    }
    try {
      const result = await batchDeleteInventoryItems(selectedIds);
      toast.success(`已批量删除 ${result.deleted} 条库存记录`);
      setBatchConfirmOpen(false);
      setSelectedKeys([]);
      refreshAll();
    } catch (error: unknown) {
      reportAssetInventoryError('批量删除库存记录失败', error);
    }
  };

  const handleExport = async (): Promise<void> => {
    try {
      const result = await fetchInventoryItemList({
        ...filterParams, page: '1', pageSize: String(ASSET_INVENTORY_EXPORT_LIMIT),
      });
      const rows: Record<string, string>[] = buildInventoryExportRows(result.items);
      const count: number = await exportRowsToExcel(
        rows, INVENTORY_EXPORT_HEADERS, '库存管理', '库存管理',
      );
      toast.success(`已导出 ${count} 条库存记录`);
    } catch (error: unknown) {
      reportAssetInventoryError('导出库存记录失败', error);
    }
  };

  const columns = useMemo(
    (): TableColumnsType<AdminInventoryItem> => buildInventoryColumns({
      onEdit: (record: AdminInventoryItem) => { setEditing(record); setFormOpen(true); },
      onDelete: (record: AdminInventoryItem) => setDeleteTarget(record),
    }),
    [],
  );

  const {
    visibleColumns, columnMetas, hiddenIds,
    toggleColumn, resetColumns, setAllColumns,
  } = useColumnSettings(columns);

  return (
    <div>
      {stats ? <InventoryStatsBand stats={stats} /> : null}
      {/* 筛选区 */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          className="w-40 rounded-none"
          placeholder="关键词（编号/名称/地点）"
          value={draftKeyword}
          onChange={(event) => setDraftKeyword(event.target.value)}
        />
        <AdminFilterSelect
          value={itemType} placeholder="物品类型" allLabel="全部类型"
          options={ADMIN_ITEM_TYPE_OPTIONS}
          onChange={(value: string) => { setItemType(value); setPage(1); }}
        />
        <AdminFilterSelect
          value={status} placeholder="状态" allLabel="全部状态"
          options={ADMIN_INVENTORY_STATUS_OPTIONS}
          onChange={(value: string) => { setStatus(value); setPage(1); }}
        />
        <Input
          className="w-28 rounded-none"
          placeholder="存放地点"
          value={location}
          onChange={(event) => { setLocation(event.target.value); setPage(1); }}
        />
        <Button variant="ghost" size="sm" className="rounded-none" onClick={handleReset}>
          <RotateCcw className="h-3.5 w-3.5" />
          重置
        </Button>
      </div>
      {/* 操作区 */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button data-ai-section-type="button" onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4" />
          新建库存
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
          onClick={() => setBatchConfirmOpen(true)}
        >
          <Trash2 className="h-3.5 w-3.5" />
          批量删除（{selectedIds.length}）
        </Button>
      </div>
      {/* 表格 */}
      <Table<AdminInventoryItem>
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
          pageSize: ASSET_INVENTORY_PAGE_SIZE,
          total,
          onChange: (nextPage: number) => setPage(nextPage),
        }}
      />
      <InventoryFormDialog
        open={formOpen}
        editing={editing}
        onSaved={refreshAll}
        onOpenChange={(open: boolean) => {
          setFormOpen(open);
          if (!open) setEditing(null);
        }}
      />
      <AdsConfirmDialog
        open={deleteTarget !== null}
        title="删除库存物品？"
        description={deleteTarget
          ? `即将删除库存物品「${deleteTarget.itemName}」（${deleteTarget.inventoryNo}），删除后不可恢复。`
          : ''}
        confirmText="删除"
        destructive
        onOpenChange={(open: boolean) => {
          if (!open) setDeleteTarget(null);
        }}
        onConfirm={() => void handleDelete()}
      />
      <AdsConfirmDialog
        open={batchConfirmOpen}
        title="批量删除库存记录？"
        description={`即将删除已勾选的 ${selectedIds.length} 条库存记录，删除后不可恢复。`}
        confirmText="批量删除"
        destructive
        onOpenChange={setBatchConfirmOpen}
        onConfirm={() => void handleBatchDelete()}
      />
    </div>
  );
}
