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
  AdminEnhanceListParams, AdminRequisition,
} from '@shared/api.interface';
import {
  batchDeleteRequisitions, cancelRequisition, deleteRequisition,
  fetchRequisitions, issueRequisition,
} from '@client/src/api/admin-enhance/warehouse';
import { AdsConfirmDialog } from '@client/src/pages/AdsBusiness/AdsConfirmDialog';
import { exportRowsToExcel } from '@client/src/pages/AdsBusiness/ads-excel';
import {
  ADMIN_FILTER_ALL, ADMIN_REQUISITION_STATUS_OPTIONS,
} from '../admin-enhance-constants';
import {
  buildRequisitionsColumns, buildRequisitionsExportRows,
  REQUISITIONS_EXPORT_HEADERS,
} from './RequisitionsColumns';
import { RequisitionsFormDialog } from './RequisitionsFormDialog';
import { RequisitionsApproveDialog } from './RequisitionsApproveDialog';
import {
  formatWarehouseDate, reportWarehouseError,
  WAREHOUSE_EXPORT_LIMIT, WAREHOUSE_PAGE_SIZE, WarehouseDatePicker,
  WarehouseFilterSelect,
} from './warehouse-shared';

type RequisitionConfirmKind = 'issue' | 'cancel' | 'delete' | 'batch';

interface RequisitionConfirmState {
  kind: RequisitionConfirmKind;
  item: AdminRequisition | null;
}

export function RequisitionsTab() {
  const [draftKeyword, setDraftKeyword] = useState<string>('');
  const [keyword, setKeyword] = useState<string>('');
  const [department, setDepartment] = useState<string>('');
  const [status, setStatus] = useState<string>(ADMIN_FILTER_ALL);
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [page, setPage] = useState<number>(1);
  const [items, setItems] = useState<AdminRequisition[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [editing, setEditing] = useState<AdminRequisition | null>(null);
  const [approveTarget, setApproveTarget] = useState<AdminRequisition | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Key[]>([]);
  const [confirmState, setConfirmState] = useState<RequisitionConfirmState | null>(null);

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
      const result = await fetchRequisitions({
        ...filterParams,
        page: String(page),
        pageSize: String(WAREHOUSE_PAGE_SIZE),
      });
      setItems(result.items);
      setTotal(result.total);
    } catch (error: unknown) {
      reportWarehouseError('加载领用单列表失败', error);
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
    setDraftKeyword(''); setKeyword(''); setDepartment('');
    setStatus(ADMIN_FILTER_ALL); setDateFrom(undefined); setDateTo(undefined);
    setPage(1);
  };

  const selectedIds: number[] = useMemo(
    () => selectedKeys.map((key: Key) => Number(key)),
    [selectedKeys],
  );

  const handleConfirmAction = async (): Promise<void> => {
    if (!confirmState) return;
    const kind: RequisitionConfirmKind = confirmState.kind;
    const target: AdminRequisition | null = confirmState.item;
    setConfirmState(null);
    try {
      if (kind === 'issue' && target) {
        await issueRequisition(target.id);
        toast.success(`领用单「${target.requisitionNo}」领用确认成功，库存已扣减`);
      } else if (kind === 'cancel' && target) {
        await cancelRequisition(target.id);
        toast.success(`领用单「${target.requisitionNo}」已取消`);
      } else if (kind === 'delete' && target) {
        await deleteRequisition(target.id);
        toast.success(`领用单「${target.requisitionNo}」已删除`);
      } else if (kind === 'batch') {
        const result = await batchDeleteRequisitions(selectedIds);
        toast.success(`已批量删除 ${result.deleted} 条领用单`);
        setSelectedKeys([]);
      }
      refresh();
    } catch (error: unknown) {
      reportWarehouseError('操作领用单失败', error);
    }
  };

  const handleExport = async (): Promise<void> => {
    try {
      const result = await fetchRequisitions({
        ...filterParams, page: '1', pageSize: String(WAREHOUSE_EXPORT_LIMIT),
      });
      const count: number = await exportRowsToExcel(
        buildRequisitionsExportRows(result.items), REQUISITIONS_EXPORT_HEADERS,
        '领用管理', '领用管理',
      );
      toast.success(`已导出 ${count} 条领用记录`);
    } catch (error: unknown) {
      reportWarehouseError('导出领用记录失败', error);
    }
  };

  const columns = useMemo(
    () => buildRequisitionsColumns({
      onApprove: (record: AdminRequisition) => setApproveTarget(record),
      onIssue: (record: AdminRequisition) => setConfirmState({ kind: 'issue', item: record }),
      onCancel: (record: AdminRequisition) => setConfirmState({ kind: 'cancel', item: record }),
      onDelete: (record: AdminRequisition) => setConfirmState({ kind: 'delete', item: record }),
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
    const item: AdminRequisition | null = confirmState.item;
    if (confirmState.kind === 'issue' && item) {
      return {
        title: '领用确认？', destructive: false, confirmText: '确认领用',
        description: `即将确认领用单「${item.requisitionNo}」（${item.itemName} × ${item.quantity}），确认后将从库存中扣减对应数量，库存不足将失败。`,
      };
    }
    if (confirmState.kind === 'cancel' && item) {
      return {
        title: '取消领用单？', destructive: true, confirmText: '取消领用单',
        description: `即将取消领用单「${item.requisitionNo}」，取消后不可恢复。`,
      };
    }
    if (confirmState.kind === 'delete' && item) {
      return {
        title: '删除领用单？', destructive: true, confirmText: '删除',
        description: `即将删除领用单「${item.requisitionNo}」，删除后不可恢复。`,
      };
    }
    return {
      title: '批量删除领用单？', destructive: true, confirmText: '批量删除',
      description: `即将删除已勾选的 ${selectedIds.length} 条领用单，删除后不可恢复。`,
    };
  };

  const meta = confirmMeta();

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          className="w-44 rounded-none" placeholder="关键词（申请人/物品/单号）"
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
          options={ADMIN_REQUISITION_STATUS_OPTIONS}
          onChange={(value: string) => { setStatus(value); setPage(1); }}
        />
        <WarehouseDatePicker
          value={dateFrom} placeholder="申请日期从"
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
          新建领用单
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
      <Table<AdminRequisition>
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
          pageSize: WAREHOUSE_PAGE_SIZE,
          total,
          onChange: (nextPage: number) => setPage(nextPage),
        }}
      />
      <RequisitionsFormDialog
        open={formOpen}
        editing={editing}
        onSaved={refresh}
        onOpenChange={(open: boolean) => {
          setFormOpen(open);
          if (!open) setEditing(null);
        }}
      />
      <RequisitionsApproveDialog
        open={approveTarget !== null}
        editing={approveTarget}
        onSaved={refresh}
        onOpenChange={(open: boolean) => {
          if (!open) setApproveTarget(null);
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
