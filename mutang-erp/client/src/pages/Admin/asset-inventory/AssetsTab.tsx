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
  AdminAsset, AdminEnhanceAssetStats, AdminEnhanceListParams,
} from '@shared/api.interface';
import {
  batchDeleteAssets, deleteAsset, fetchAssetList, fetchAssetStats,
  inventoryCheckAsset,
} from '@client/src/api/admin-enhance/asset-inventory';
import { AdsConfirmDialog } from '@client/src/pages/AdsBusiness/AdsConfirmDialog';
import { exportRowsToExcel } from '@client/src/pages/AdsBusiness/ads-excel';
import {
  ADMIN_ASSET_STATUS_OPTIONS, ADMIN_ASSET_TYPE_OPTIONS, ADMIN_FILTER_ALL,
} from '../admin-enhance-constants';
import { AssetsFormDialog } from './AssetsFormDialog';
import {
  ASSET_EXPORT_HEADERS, buildAssetExportRows, buildAssetsColumns,
} from './AssetsColumns';
import {
  AdminFilterSelect, AssetsStatsBand, ASSET_INVENTORY_EXPORT_LIMIT,
  ASSET_INVENTORY_PAGE_SIZE, reportAssetInventoryError,
} from './asset-inventory-shared';

export function AssetsTab() {
  const [draftKeyword, setDraftKeyword] = useState<string>('');
  const [keyword, setKeyword] = useState<string>('');
  const [assetType, setAssetType] = useState<string>(ADMIN_FILTER_ALL);
  const [department, setDepartment] = useState<string>('');
  const [status, setStatus] = useState<string>(ADMIN_FILTER_ALL);
  const [page, setPage] = useState<number>(1);
  const [items, setItems] = useState<AdminAsset[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [stats, setStats] = useState<AdminEnhanceAssetStats | null>(null);
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [editing, setEditing] = useState<AdminAsset | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Key[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<AdminAsset | null>(null);
  const [checkTarget, setCheckTarget] = useState<AdminAsset | null>(null);
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
    assetType: assetType === ADMIN_FILTER_ALL ? undefined : assetType,
    department: department.trim() || undefined,
    status: status === ADMIN_FILTER_ALL ? undefined : status,
  }), [keyword, assetType, department, status]);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchAssetList({
        ...filterParams,
        page: String(page),
        pageSize: String(ASSET_INVENTORY_PAGE_SIZE),
      });
      setItems(result.items);
      setTotal(result.total);
    } catch (error: unknown) {
      reportAssetInventoryError('加载资产列表失败', error);
    } finally {
      setLoading(false);
    }
  }, [filterParams, page]);

  const loadStats = useCallback(async (): Promise<void> => {
    try {
      setStats(await fetchAssetStats());
    } catch (error: unknown) {
      reportAssetInventoryError('加载资产统计失败', error);
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
    setAssetType(ADMIN_FILTER_ALL);
    setDepartment('');
    setStatus(ADMIN_FILTER_ALL);
    setPage(1);
  };

  const handleDelete = async (): Promise<void> => {
    if (!deleteTarget) return;
    try {
      await deleteAsset(deleteTarget.id);
      toast.success('资产已删除');
      setDeleteTarget(null);
      refreshAll();
    } catch (error: unknown) {
      reportAssetInventoryError('删除资产失败', error);
    }
  };

  const handleInventoryCheck = async (): Promise<void> => {
    if (!checkTarget) return;
    try {
      await inventoryCheckAsset(checkTarget.id);
      toast.success(`资产「${checkTarget.assetName}」盘点登记完成`);
      setCheckTarget(null);
      refreshAll();
    } catch (error: unknown) {
      reportAssetInventoryError('盘点登记失败', error);
    }
  };

  const selectedIds: number[] = useMemo(
    () => selectedKeys.map((key: Key) => Number(key)),
    [selectedKeys],
  );

  const handleBatchDelete = async (): Promise<void> => {
    if (selectedIds.length === 0) {
      toast.error('请先勾选资产');
      return;
    }
    try {
      const result = await batchDeleteAssets(selectedIds);
      toast.success(`已批量删除 ${result.deleted} 条资产记录`);
      setBatchConfirmOpen(false);
      setSelectedKeys([]);
      refreshAll();
    } catch (error: unknown) {
      reportAssetInventoryError('批量删除资产失败', error);
    }
  };

  const handleExport = async (): Promise<void> => {
    try {
      const result = await fetchAssetList({
        ...filterParams, page: '1', pageSize: String(ASSET_INVENTORY_EXPORT_LIMIT),
      });
      const rows: Record<string, string>[] = buildAssetExportRows(result.items);
      const count: number = await exportRowsToExcel(
        rows, ASSET_EXPORT_HEADERS, '资产管理', '资产管理',
      );
      toast.success(`已导出 ${count} 条资产记录`);
    } catch (error: unknown) {
      reportAssetInventoryError('导出资产记录失败', error);
    }
  };

  const columns = useMemo(
    (): TableColumnsType<AdminAsset> => buildAssetsColumns({
      onEdit: (record: AdminAsset) => { setEditing(record); setFormOpen(true); },
      onDelete: (record: AdminAsset) => setDeleteTarget(record),
      onInventoryCheck: (record: AdminAsset) => setCheckTarget(record),
    }),
    [],
  );

  const {
    visibleColumns, columnMetas, hiddenIds,
    toggleColumn, resetColumns, setAllColumns,
  } = useColumnSettings(columns);

  return (
    <div>
      {stats ? <AssetsStatsBand stats={stats} /> : null}
      {/* 筛选区 */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          className="w-40 rounded-none"
          placeholder="关键词（编号/名称/使用人）"
          value={draftKeyword}
          onChange={(event) => setDraftKeyword(event.target.value)}
        />
        <AdminFilterSelect
          value={assetType} placeholder="资产类型" allLabel="全部类型"
          options={ADMIN_ASSET_TYPE_OPTIONS}
          onChange={(value: string) => { setAssetType(value); setPage(1); }}
        />
        <AdminFilterSelect
          value={status} placeholder="状态" allLabel="全部状态"
          options={ADMIN_ASSET_STATUS_OPTIONS}
          onChange={(value: string) => { setStatus(value); setPage(1); }}
        />
        <Input
          className="w-28 rounded-none"
          placeholder="部门"
          value={department}
          onChange={(event) => { setDepartment(event.target.value); setPage(1); }}
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
          新建资产
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
      <Table<AdminAsset>
        columns={visibleColumns}
        dataSource={items}
        loading={loading}
        rowKey="id"
        scroll={{ x: 2100, y: 500 }}
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
      <AssetsFormDialog
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
        title="删除资产？"
        description={deleteTarget
          ? `即将删除资产「${deleteTarget.assetName}」（${deleteTarget.assetNo}），删除后不可恢复。`
          : ''}
        confirmText="删除"
        destructive
        onOpenChange={(open: boolean) => {
          if (!open) setDeleteTarget(null);
        }}
        onConfirm={() => void handleDelete()}
      />
      <AdsConfirmDialog
        open={checkTarget !== null}
        title="盘点登记？"
        description={checkTarget
          ? `即将为资产「${checkTarget.assetName}」（${checkTarget.assetNo}）执行盘点登记，最近盘点日期将更新为今天。`
          : ''}
        confirmText="确认盘点"
        onOpenChange={(open: boolean) => {
          if (!open) setCheckTarget(null);
        }}
        onConfirm={() => void handleInventoryCheck()}
      />
      <AdsConfirmDialog
        open={batchConfirmOpen}
        title="批量删除资产？"
        description={`即将删除已勾选的 ${selectedIds.length} 条资产记录，删除后不可恢复。`}
        confirmText="批量删除"
        destructive
        onOpenChange={setBatchConfirmOpen}
        onConfirm={() => void handleBatchDelete()}
      />
    </div>
  );
}
