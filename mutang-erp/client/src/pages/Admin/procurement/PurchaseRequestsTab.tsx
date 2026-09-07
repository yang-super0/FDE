import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Key } from 'react';
import { Download, Plus, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Table, type TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import { ColumnSettingsButton } from '@client/src/components/column-settings-button';
import { useColumnSettings } from '@client/src/hooks/useColumnSettings';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import type {
  AdminEnhanceListParams, AdminPurchaseRequest,
} from '@shared/api.interface';
import {
  batchDeletePurchaseRequests, cancelPurchaseRequest, deletePurchaseRequest,
  fetchPurchaseRequests,
} from '@client/src/api/admin-enhance/purchase';
import { AdsConfirmDialog } from '@client/src/pages/AdsBusiness/AdsConfirmDialog';
import { exportRowsToExcel } from '@client/src/pages/AdsBusiness/ads-excel';
import { ADMIN_FILTER_ALL, ADMIN_ITEM_TYPE_OPTIONS, ADMIN_PR_STATUS_OPTIONS } from '../admin-enhance-constants';
import {
  buildPurchaseRequestsColumns, buildPurchaseRequestsExportRows,
  PURCHASE_REQUEST_EXPORT_HEADERS,
} from './PurchaseRequestsColumns';
import { PurchaseApproveDialog, PurchaseRequestsFormDialog } from './PurchaseRequestsFormDialog';
import {
  AdminProcureFilterSelect, PROCUREMENT_EXPORT_LIMIT, PROCUREMENT_PAGE_SIZE,
  reportProcurementError,
} from './procurement-shared';

export function PurchaseRequestsTab() {
  const [draftKeyword, setDraftKeyword] = useState<string>('');
  const [keyword, setKeyword] = useState<string>('');
  const [status, setStatus] = useState<string>(ADMIN_FILTER_ALL);
  const [itemType, setItemType] = useState<string>(ADMIN_FILTER_ALL);
  const [department, setDepartment] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [items, setItems] = useState<AdminPurchaseRequest[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [editing, setEditing] = useState<AdminPurchaseRequest | null>(null);
  const [approveTarget, setApproveTarget] = useState<AdminPurchaseRequest | null>(null);
  const [cancelTarget, setCancelTarget] = useState<AdminPurchaseRequest | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminPurchaseRequest | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Key[]>([]);
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
    status: status === ADMIN_FILTER_ALL ? undefined : status,
    itemType: itemType === ADMIN_FILTER_ALL ? undefined : itemType,
    department: department.trim() || undefined,
  }), [keyword, status, itemType, department]);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchPurchaseRequests({
        ...filterParams,
        page: String(page),
        pageSize: String(PROCUREMENT_PAGE_SIZE),
      });
      setItems(result.items);
      setTotal(result.total);
    } catch (error: unknown) {
      reportProcurementError('加载采购申请列表失败', error);
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
    setStatus(ADMIN_FILTER_ALL);
    setItemType(ADMIN_FILTER_ALL);
    setDepartment('');
    setPage(1);
  };

  const handleCancel = async (): Promise<void> => {
    if (!cancelTarget) return;
    try {
      await cancelPurchaseRequest(cancelTarget.id);
      toast.success('采购申请已取消');
      setCancelTarget(null);
      refresh();
    } catch (error: unknown) {
      reportProcurementError('取消采购申请失败', error);
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!deleteTarget) return;
    try {
      await deletePurchaseRequest(deleteTarget.id);
      toast.success('采购申请已删除');
      setDeleteTarget(null);
      refresh();
    } catch (error: unknown) {
      reportProcurementError('删除采购申请失败', error);
    }
  };

  const selectedIds: number[] = useMemo(
    () => selectedKeys.map((key: Key) => Number(key)),
    [selectedKeys],
  );

  const handleBatchDelete = async (): Promise<void> => {
    if (selectedIds.length === 0) {
      toast.error('请先勾选采购申请');
      return;
    }
    try {
      const result = await batchDeletePurchaseRequests({ ids: selectedIds });
      toast.success(`已批量删除 ${result.deleted} 条采购申请`);
      setBatchConfirmOpen(false);
      setSelectedKeys([]);
      refresh();
    } catch (error: unknown) {
      reportProcurementError('批量删除采购申请失败', error);
    }
  };

  const handleExport = async (): Promise<void> => {
    try {
      const result = await fetchPurchaseRequests({
        ...filterParams, page: '1', pageSize: String(PROCUREMENT_EXPORT_LIMIT),
      });
      const rows: Record<string, string>[] = buildPurchaseRequestsExportRows(result.items);
      const count: number = await exportRowsToExcel(
        rows, PURCHASE_REQUEST_EXPORT_HEADERS, '采购申请', '采购申请',
      );
      toast.success(`已导出 ${count} 条采购申请记录`);
    } catch (error: unknown) {
      reportProcurementError('导出采购申请记录失败', error);
    }
  };

  const columns = useMemo(
    (): TableColumnsType<AdminPurchaseRequest> => buildPurchaseRequestsColumns({
      onEdit: (record: AdminPurchaseRequest) => { setEditing(record); setFormOpen(true); },
      onDelete: (record: AdminPurchaseRequest) => setDeleteTarget(record),
      onApprove: (record: AdminPurchaseRequest) => setApproveTarget(record),
      onCancel: (record: AdminPurchaseRequest) => setCancelTarget(record),
    }),
    [],
  );

  const {
    visibleColumns, columnMetas, hiddenIds,
    toggleColumn, resetColumns, setAllColumns,
  } = useColumnSettings(columns);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          className="w-44 rounded-none"
          placeholder="关键词（编号/物品/申请人）"
          value={draftKeyword}
          onChange={(event) => setDraftKeyword(event.target.value)}
        />
        <AdminProcureFilterSelect
          value={status} placeholder="状态" allLabel="全部状态"
          options={ADMIN_PR_STATUS_OPTIONS}
          onChange={(value: string) => { setStatus(value); setPage(1); }}
        />
        <AdminProcureFilterSelect
          value={itemType} placeholder="物品类型" allLabel="全部类型"
          options={ADMIN_ITEM_TYPE_OPTIONS}
          onChange={(value: string) => { setItemType(value); setPage(1); }}
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
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button data-ai-section-type="button" onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4" />
          新建申请
        </Button>
        <Button variant="outline" onClick={() => void handleExport()}>
          <Download className="h-4 w-4" />
          导出Excel
        </Button>
        <ColumnSettingsButton
          columnMetas={columnMetas} hiddenIds={hiddenIds}
          onToggle={toggleColumn} onReset={resetColumns} onSetAll={setAllColumns}
        />
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline" size="sm" className="rounded-none"
            disabled={selectedIds.length === 0}
            onClick={() => setBatchConfirmOpen(true)}
          >
            批量删除（{selectedIds.length}）
          </Button>
        </div>
      </div>
      <Table<AdminPurchaseRequest>
        columns={visibleColumns}
        dataSource={items}
        loading={loading}
        rowKey="id"
        scroll={{ x: 2200, y: 500 }}
        rowSelection={{
          selectedRowKeys: selectedKeys,
          onChange: (keys: Key[]) => setSelectedKeys(keys),
        }}
        pagination={{
          current: page,
          pageSize: PROCUREMENT_PAGE_SIZE,
          total,
          onChange: (nextPage: number) => setPage(nextPage),
        }}
      />
      <PurchaseRequestsFormDialog
        open={formOpen}
        editing={editing}
        onSaved={refresh}
        onOpenChange={(open: boolean) => {
          setFormOpen(open);
          if (!open) setEditing(null);
        }}
      />
      <PurchaseApproveDialog
        open={approveTarget !== null}
        target={approveTarget}
        onSaved={refresh}
        onOpenChange={(open: boolean) => {
          if (!open) setApproveTarget(null);
        }}
      />
      <AdsConfirmDialog
        open={cancelTarget !== null}
        title="取消采购申请？"
        description={cancelTarget
          ? `即将取消采购申请「${cancelTarget.requestNo}」（${cancelTarget.itemName}），取消后不可恢复。`
          : ''}
        confirmText="确认取消"
        destructive
        onOpenChange={(open: boolean) => {
          if (!open) setCancelTarget(null);
        }}
        onConfirm={() => void handleCancel()}
      />
      <AdsConfirmDialog
        open={deleteTarget !== null}
        title="删除采购申请？"
        description={deleteTarget
          ? `即将删除采购申请「${deleteTarget.requestNo}」（${deleteTarget.itemName}），删除后不可恢复。`
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
        title="批量删除采购申请？"
        description={`即将删除已勾选的 ${selectedIds.length} 条采购申请（仅待审批、已驳回或已取消状态会被删除），删除后不可恢复。`}
        confirmText="批量删除"
        destructive
        onOpenChange={setBatchConfirmOpen}
        onConfirm={() => void handleBatchDelete()}
      />
    </div>
  );
}
