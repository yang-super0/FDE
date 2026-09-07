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
  AdminEnhanceListParams, AdminReturnRecord,
} from '@shared/api.interface';
import {
  batchDeleteReturns, confirmReturn, deleteReturn, fetchReturns,
} from '@client/src/api/admin-enhance/warehouse';
import { AdsConfirmDialog } from '@client/src/pages/AdsBusiness/AdsConfirmDialog';
import { exportRowsToExcel } from '@client/src/pages/AdsBusiness/ads-excel';
import {
  ADMIN_FILTER_ALL, ADMIN_RETURN_STATUS_OPTIONS,
} from '../admin-enhance-constants';
import { buildReturnsColumns } from './ReturnsColumns';
import { ReturnsFormDialog } from './ReturnsFormDialog';
import {
  formatWarehouseDate, reportWarehouseError, WAREHOUSE_EXPORT_LIMIT,
  WAREHOUSE_PAGE_SIZE, WarehouseDatePicker, WarehouseFilterSelect,
} from './warehouse-shared';

type ReturnConfirmKind = 'confirm' | 'delete' | 'batch';

interface ReturnConfirmState {
  kind: ReturnConfirmKind;
  item: AdminReturnRecord | null;
}

const EXPORT_HEADERS: string[] = [
  '归还单号', '领用单ID', '物品名称', '类型', '规格', '归还数量', '单位',
  '归还日期', '经办人', '物品状况', '状态', '损坏说明', '备注',
];

const buildExportRows = (items: AdminReturnRecord[]): Record<string, string>[] =>
  items.map((item: AdminReturnRecord) => ({
    归还单号: item.returnNo,
    领用单ID: String(item.requisitionId),
    物品名称: item.itemName,
    类型: item.itemType,
    规格: item.specification,
    归还数量: String(item.quantity),
    单位: item.unit,
    归还日期: formatWarehouseDate(item.returnDate),
    经办人: item.operator,
    物品状况: item.condition,
    状态: item.status,
    损坏说明: item.damageRemark,
    备注: item.remark,
  }));

export function ReturnsTab() {
  const [draftKeyword, setDraftKeyword] = useState<string>('');
  const [keyword, setKeyword] = useState<string>('');
  const [status, setStatus] = useState<string>(ADMIN_FILTER_ALL);
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [page, setPage] = useState<number>(1);
  const [items, setItems] = useState<AdminReturnRecord[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [editing, setEditing] = useState<AdminReturnRecord | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Key[]>([]);
  const [confirmState, setConfirmState] = useState<ReturnConfirmState | null>(null);

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
    dateFrom: dateFrom ? formatWarehouseDate(dateFrom.toISOString()) : undefined,
    dateTo: dateTo ? formatWarehouseDate(dateTo.toISOString()) : undefined,
  }), [keyword, status, dateFrom, dateTo]);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchReturns({
        ...filterParams,
        page: String(page),
        pageSize: String(WAREHOUSE_PAGE_SIZE),
      });
      setItems(result.items);
      setTotal(result.total);
    } catch (error: unknown) {
      reportWarehouseError('加载归还单列表失败', error);
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
    const kind: ReturnConfirmKind = confirmState.kind;
    const target: AdminReturnRecord | null = confirmState.item;
    setConfirmState(null);
    try {
      if (kind === 'confirm' && target) {
        await confirmReturn(target.id);
        toast.success(`归还单「${target.returnNo}」已确认归还，库存已回补，领用单状态已更新`);
      } else if (kind === 'delete' && target) {
        await deleteReturn(target.id);
        toast.success(`归还单「${target.returnNo}」已删除`);
      } else if (kind === 'batch') {
        const result = await batchDeleteReturns(selectedIds);
        toast.success(`已批量删除 ${result.deleted} 条归还单`);
        setSelectedKeys([]);
      }
      refresh();
    } catch (error: unknown) {
      reportWarehouseError('操作归还单失败', error);
    }
  };

  const handleExport = async (): Promise<void> => {
    try {
      const result = await fetchReturns({
        ...filterParams, page: '1', pageSize: String(WAREHOUSE_EXPORT_LIMIT),
      });
      const count: number = await exportRowsToExcel(
        buildExportRows(result.items), EXPORT_HEADERS, '归还管理', '归还管理',
      );
      toast.success(`已导出 ${count} 条归还记录`);
    } catch (error: unknown) {
      reportWarehouseError('导出归还记录失败', error);
    }
  };

  const columns = useMemo(
    () => buildReturnsColumns({
      onConfirm: (record: AdminReturnRecord) =>
        setConfirmState({ kind: 'confirm', item: record }),
      onDelete: (record: AdminReturnRecord) =>
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
    if (confirmState.kind === 'confirm' && confirmState.item) {
      return {
        title: '确认归还？',
        description: `即将确认归还单「${confirmState.item.returnNo}」（${confirmState.item.itemName} × ${confirmState.item.quantity}），确认后库存将回补，领用单状态将同步更新为已归还。`,
        confirmText: '确认归还', destructive: false,
      };
    }
    if (confirmState.kind === 'delete' && confirmState.item) {
      return {
        title: '删除归还单？',
        description: `即将删除归还单「${confirmState.item.returnNo}」，删除后不可恢复。`,
        confirmText: '删除', destructive: true,
      };
    }
    return {
      title: '批量删除归还单？',
      description: `即将删除已勾选的 ${selectedIds.length} 条归还单，删除后不可恢复。`,
      confirmText: '批量删除', destructive: true,
    };
  };

  const meta = confirmMeta();

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          className="w-44 rounded-none" placeholder="关键词（物品/单号/经办人）"
          value={draftKeyword}
          onChange={(event) => setDraftKeyword(event.target.value)}
        />
        <WarehouseFilterSelect
          value={status} placeholder="状态" allLabel="全部状态"
          options={ADMIN_RETURN_STATUS_OPTIONS}
          onChange={(value: string) => { setStatus(value); setPage(1); }}
        />
        <WarehouseDatePicker
          value={dateFrom} placeholder="归还日期从"
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
          新建归还单
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
      <Table<AdminReturnRecord>
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
      <ReturnsFormDialog
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
