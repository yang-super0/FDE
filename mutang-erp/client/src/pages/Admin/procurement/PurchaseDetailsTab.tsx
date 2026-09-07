import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Key } from 'react';
import { Download, Plus, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Table, type TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import { ColumnSettingsButton } from '@client/src/components/column-settings-button';
import { useColumnSettings } from '@client/src/hooks/useColumnSettings';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import type { AdminEnhanceListParams, AdminPurchaseDetail } from '@shared/api.interface';
import {
  batchDeletePurchaseDetails, deletePurchaseDetail, fetchPurchaseDetails,
} from '@client/src/api/admin-enhance/purchase';
import { AdsConfirmDialog } from '@client/src/pages/AdsBusiness/AdsConfirmDialog';
import { exportRowsToExcel } from '@client/src/pages/AdsBusiness/ads-excel';
import { ADMIN_FILTER_ALL, ADMIN_PD_STATUS_OPTIONS } from '../admin-enhance-constants';
import {
  buildPurchaseDetailsColumns, buildPurchaseDetailsExportRows,
  PURCHASE_DETAIL_EXPORT_HEADERS,
} from './PurchaseDetailsColumns';
import {
  PurchaseDetailsFormDialog, PurchaseReceiveDialog,
} from './PurchaseDetailsFormDialog';
import {
  AdminProcureFilterSelect, PROCUREMENT_EXPORT_LIMIT, PROCUREMENT_PAGE_SIZE,
  reportProcurementError,
} from './procurement-shared';

export function PurchaseDetailsTab() {
  const [draftKeyword, setDraftKeyword] = useState<string>('');
  const [keyword, setKeyword] = useState<string>('');
  const [status, setStatus] = useState<string>(ADMIN_FILTER_ALL);
  const [orderIdText, setOrderIdText] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [items, setItems] = useState<AdminPurchaseDetail[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [editing, setEditing] = useState<AdminPurchaseDetail | null>(null);
  const [receiveTarget, setReceiveTarget] = useState<AdminPurchaseDetail | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminPurchaseDetail | null>(null);
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
    orderId: /^\d+$/.test(orderIdText.trim())
      ? Number(orderIdText.trim())
      : undefined,
  }), [keyword, status, orderIdText]);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchPurchaseDetails({
        ...filterParams,
        page: String(page),
        pageSize: String(PROCUREMENT_PAGE_SIZE),
      });
      setItems(result.items);
      setTotal(result.total);
    } catch (error: unknown) {
      reportProcurementError('加载采购明细列表失败', error);
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
    setOrderIdText('');
    setPage(1);
  };

  const handleDelete = async (): Promise<void> => {
    if (!deleteTarget) return;
    try {
      await deletePurchaseDetail(deleteTarget.id);
      toast.success('采购明细已删除');
      setDeleteTarget(null);
      refresh();
    } catch (error: unknown) {
      reportProcurementError('删除采购明细失败', error);
    }
  };

  const selectedIds: number[] = useMemo(
    () => selectedKeys.map((key: Key) => Number(key)),
    [selectedKeys],
  );

  const handleBatchDelete = async (): Promise<void> => {
    if (selectedIds.length === 0) {
      toast.error('请先勾选采购明细');
      return;
    }
    try {
      const result = await batchDeletePurchaseDetails({ ids: selectedIds });
      toast.success(`已批量删除 ${result.deleted} 条采购明细`);
      setBatchConfirmOpen(false);
      setSelectedKeys([]);
      refresh();
    } catch (error: unknown) {
      reportProcurementError('批量删除采购明细失败', error);
    }
  };

  const handleExport = async (): Promise<void> => {
    try {
      const result = await fetchPurchaseDetails({
        ...filterParams, page: '1', pageSize: String(PROCUREMENT_EXPORT_LIMIT),
      });
      const rows: Record<string, string>[] = buildPurchaseDetailsExportRows(result.items);
      const count: number = await exportRowsToExcel(
        rows, PURCHASE_DETAIL_EXPORT_HEADERS, '采购明细', '采购明细',
      );
      toast.success(`已导出 ${count} 条采购明细记录`);
    } catch (error: unknown) {
      reportProcurementError('导出采购明细记录失败', error);
    }
  };

  const columns = useMemo(
    (): TableColumnsType<AdminPurchaseDetail> => buildPurchaseDetailsColumns({
      onEdit: (record: AdminPurchaseDetail) => { setEditing(record); setFormOpen(true); },
      onDelete: (record: AdminPurchaseDetail) => setDeleteTarget(record),
      onReceive: (record: AdminPurchaseDetail) => setReceiveTarget(record),
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
          placeholder="关键词（编号/物品）"
          value={draftKeyword}
          onChange={(event) => setDraftKeyword(event.target.value)}
        />
        <AdminProcureFilterSelect
          value={status} placeholder="状态" allLabel="全部状态"
          options={ADMIN_PD_STATUS_OPTIONS}
          onChange={(value: string) => { setStatus(value); setPage(1); }}
        />
        <Input
          className="w-28 rounded-none"
          placeholder="订单ID"
          value={orderIdText}
          onChange={(event) => { setOrderIdText(event.target.value); setPage(1); }}
        />
        <Button variant="ghost" size="sm" className="rounded-none" onClick={handleReset}>
          <RotateCcw className="h-3.5 w-3.5" />
          重置
        </Button>
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button data-ai-section-type="button" onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4" />
          新建明细
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
      <Table<AdminPurchaseDetail>
        columns={visibleColumns}
        dataSource={items}
        loading={loading}
        rowKey="id"
        scroll={{ x: 2000, y: 500 }}
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
      <PurchaseDetailsFormDialog
        open={formOpen}
        editing={editing}
        onSaved={refresh}
        onOpenChange={(open: boolean) => {
          setFormOpen(open);
          if (!open) setEditing(null);
        }}
      />
      <PurchaseReceiveDialog
        open={receiveTarget !== null}
        target={receiveTarget}
        onSaved={refresh}
        onOpenChange={(open: boolean) => {
          if (!open) setReceiveTarget(null);
        }}
      />
      <AdsConfirmDialog
        open={deleteTarget !== null}
        title="删除采购明细？"
        description={deleteTarget
          ? `即将删除采购明细「${deleteTarget.detailNo}」（${deleteTarget.itemName}），删除后不可恢复。`
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
        title="批量删除采购明细？"
        description={`即将删除已勾选的 ${selectedIds.length} 条采购明细（仅待收货状态会被删除），删除后不可恢复。`}
        confirmText="批量删除"
        destructive
        onOpenChange={setBatchConfirmOpen}
        onConfirm={() => void handleBatchDelete()}
      />
    </div>
  );
}
