import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Key } from 'react';
import dayjs from 'dayjs';
import { Download, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Table, type TableProps } from '@lark-apaas/client-toolkit/antd-table';
import type {
  BatchExport,
  BatchExportListParams,
} from '@shared/api.interface';
import { ReportCard, SectionHeader } from '@client/src/components/blueprint';
import { Button } from '@client/src/components/ui/button';
import { ColumnSettingsButton } from '@client/src/components/column-settings-button';
import { useColumnSettings } from '@client/src/hooks/useColumnSettings';
import { AdsConfirmDialog } from '@client/src/pages/AdsBusiness/AdsConfirmDialog';
import { exportRowsToExcel } from '@client/src/pages/AdsBusiness/ads-excel';
import {
  WarehouseDatePicker,
  WarehouseFilterSelect,
} from '@client/src/pages/Admin/warehouse/warehouse-shared';
import {
  deleteBatchExport,
  listBatchExports,
  startBatchExport,
} from '@client/src/api/task-enhance/batch-exports';
import {
  TASK_ENHANCE_FILTER_ALL,
  TASK_EXPORT_TYPES,
  toTaskEnhanceErrorText,
} from '../task-enhance-shared';
import {
  BATCH_EXPORT_EXPORT_HEADERS,
  BATCH_EXPORT_SORT_FIELDS,
  BATCH_EXPORT_STATUS_OPTIONS,
  buildBatchExportColumns,
  buildBatchExportExportRows,
} from './BatchExportColumns';
import {
  BatchExportCreateDialog,
  BatchExportFinishDialog,
} from './BatchExportDialogs';

const EXPORT_PAGE_SIZE: number = 10;
const EXPORT_EXPORT_LIMIT: number = 100;

const BatchExportsPanel = () => {
  const [exportType, setExportType] = useState<string>(
    TASK_ENHANCE_FILTER_ALL,
  );
  const [status, setStatus] = useState<string>(TASK_ENHANCE_FILTER_ALL);
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [page, setPage] = useState<number>(1);
  const [items, setItems] = useState<BatchExport[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<string | undefined>(undefined);
  const [selectedKeys, setSelectedKeys] = useState<Key[]>([]);
  const [createOpen, setCreateOpen] = useState<boolean>(false);
  const [finishTarget, setFinishTarget] = useState<BatchExport | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BatchExport | null>(null);
  const [batchConfirmOpen, setBatchConfirmOpen] = useState<boolean>(false);

  const filterParams = useMemo((): BatchExportListParams => {
    const params: BatchExportListParams = {};
    if (exportType !== TASK_ENHANCE_FILTER_ALL) params.exportType = exportType;
    if (status !== TASK_ENHANCE_FILTER_ALL) params.status = status;
    if (dateFrom) params.dateFrom = dayjs(dateFrom).format('YYYY-MM-DD');
    if (dateTo) params.dateTo = dayjs(dateTo).format('YYYY-MM-DD');
    if (sortBy) params.sortBy = sortBy;
    if (sortOrder) params.sortOrder = sortOrder;
    return params;
  }, [exportType, status, dateFrom, dateTo, sortBy, sortOrder]);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listBatchExports({
        ...filterParams,
        page: String(page),
        pageSize: String(EXPORT_PAGE_SIZE),
      });
      setItems(result.items);
      setTotal(result.total);
    } catch (error: unknown) {
      logger.error('加载批量导出列表失败', String(error));
      toast.error(toTaskEnhanceErrorText(error));
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
    setExportType(TASK_ENHANCE_FILTER_ALL);
    setStatus(TASK_ENHANCE_FILTER_ALL);
    setDateFrom(undefined);
    setDateTo(undefined);
    setSortBy(undefined);
    setSortOrder(undefined);
    setPage(1);
  };

  const handleTableChange: TableProps<BatchExport>['onChange'] = (
    pagination,
    _filters,
    sorter,
  ) => {
    const next: number = pagination.current ?? page;
    if (next !== page) setPage(next);
    const result = Array.isArray(sorter) ? sorter[0] : sorter;
    const columnKey: string | undefined =
      result && result.columnKey !== undefined ? String(result.columnKey) : undefined;
    if (result && result.order && columnKey) {
      setSortBy(BATCH_EXPORT_SORT_FIELDS[columnKey] ?? undefined);
      setSortOrder(result.order === 'ascend' ? 'asc' : 'desc');
      setPage(1);
    } else {
      setSortBy(undefined);
      setSortOrder(undefined);
    }
  };

  const selectedIds: number[] = useMemo(
    () => selectedKeys.map((key: Key) => Number(key)),
    [selectedKeys],
  );

  const handleStart = useCallback(
    async (record: BatchExport): Promise<void> => {
      try {
        await startBatchExport(record.id);
        toast.success(`导出任务「${record.exportNo}」已开始处理`);
        refresh();
      } catch (error: unknown) {
        logger.error('开始导出任务失败', String(error));
        toast.error(toTaskEnhanceErrorText(error));
        refresh();
      }
    },
    [refresh],
  );

  const handleDeleteConfirmed = async (): Promise<void> => {
    const target: BatchExport | null = deleteTarget;
    setDeleteTarget(null);
    if (!target) return;
    try {
      await deleteBatchExport(target.id);
      toast.success(`导出任务「${target.exportNo}」已删除`);
      refresh();
    } catch (error: unknown) {
      logger.error('删除导出任务失败', String(error));
      toast.error(toTaskEnhanceErrorText(error));
      refresh();
    }
  };

  const handleBatchDeleteConfirmed = async (): Promise<void> => {
    const ids: number[] = selectedIds;
    setBatchConfirmOpen(false);
    if (ids.length === 0) return;
    let deletedCount: number = 0;
    let errorText: string | null = null;
    for (const id of ids) {
      try {
        await deleteBatchExport(id);
        deletedCount += 1;
      } catch (error: unknown) {
        if (!errorText) errorText = toTaskEnhanceErrorText(error);
      }
    }
    if (deletedCount > 0) toast.success(`已删除 ${deletedCount} 条导出任务`);
    if (errorText) toast.error(`部分导出任务删除失败：${errorText}`);
    setSelectedKeys([]);
    refresh();
  };

  const handleExport = async (): Promise<void> => {
    try {
      const result = await listBatchExports({
        ...filterParams,
        page: '1',
        pageSize: String(EXPORT_EXPORT_LIMIT),
      });
      const count: number = await exportRowsToExcel(
        buildBatchExportExportRows(result.items),
        BATCH_EXPORT_EXPORT_HEADERS,
        '批量导出',
        '批量导出任务',
      );
      toast.success(`已导出 ${count} 条导出任务`);
    } catch (error: unknown) {
      logger.error('导出任务清单失败', String(error));
      toast.error(toTaskEnhanceErrorText(error));
    }
  };

  const columns = useMemo(
    () =>
      buildBatchExportColumns({
        onStart: (record: BatchExport) => void handleStart(record),
        onFinish: (record: BatchExport) => setFinishTarget(record),
        onDelete: (record: BatchExport) => setDeleteTarget(record),
      }),
    [handleStart],
  );

  const {
    visibleColumns,
    columnMetas,
    hiddenIds,
    toggleColumn,
    resetColumns,
    setAllColumns,
  } = useColumnSettings(columns);

  return (
    <div className="space-y-6">
      <ReportCard>
        <SectionHeader
          no="01"
          label="BATCH EXPORTS"
          subtitle="批量导出任务管理 · 数据批量导出与文件下载"
        />
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <WarehouseFilterSelect
            value={exportType}
            placeholder="导出类型"
            allLabel="全部类型"
            options={TASK_EXPORT_TYPES}
            onChange={(value: string) => {
              setExportType(value);
              setPage(1);
            }}
          />
          <WarehouseFilterSelect
            value={status}
            placeholder="状态"
            allLabel="全部状态"
            options={BATCH_EXPORT_STATUS_OPTIONS}
            onChange={(value: string) => {
              setStatus(value);
              setPage(1);
            }}
          />
          <WarehouseDatePicker
            value={dateFrom}
            placeholder="创建日期从"
            onChange={(value: Date | undefined) => {
              setDateFrom(value);
              setPage(1);
            }}
          />
          <WarehouseDatePicker
            value={dateTo}
            placeholder="至"
            onChange={(value: Date | undefined) => {
              setDateTo(value);
              setPage(1);
            }}
          />
          <Button
            variant="ghost"
            size="sm"
            className="rounded-none"
            onClick={handleReset}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            重置
          </Button>
        </div>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Button
            data-ai-section-type="button"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-4 w-4" />
            新建导出任务
          </Button>
          <Button variant="outline" onClick={() => void handleExport()}>
            <Download className="h-4 w-4" />
            导出Excel
          </Button>
          <ColumnSettingsButton
            columnMetas={columnMetas}
            hiddenIds={hiddenIds}
            onToggle={toggleColumn}
            onReset={resetColumns}
            onSetAll={setAllColumns}
          />
          <Button
            variant="outline"
            size="sm"
            className="ml-auto rounded-none"
            disabled={selectedIds.length === 0}
            onClick={() => setBatchConfirmOpen(true)}
          >
            <Trash2 className="h-3.5 w-3.5" />
            批量删除（{selectedIds.length}）
          </Button>
        </div>
        <Table<BatchExport>
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
            pageSize: EXPORT_PAGE_SIZE,
            total,
            showSizeChanger: false,
          }}
          onChange={handleTableChange}
        />
      </ReportCard>

      <BatchExportCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={refresh}
      />
      <BatchExportFinishDialog
        open={finishTarget !== null}
        target={finishTarget}
        onOpenChange={(open: boolean) => {
          if (!open) setFinishTarget(null);
        }}
        onFinished={refresh}
      />
      <AdsConfirmDialog
        open={deleteTarget !== null}
        title="删除导出任务？"
        description={`即将删除导出任务「${deleteTarget?.exportNo ?? '—'}」，删除后不可恢复。`}
        confirmText="删除"
        destructive
        onOpenChange={(open: boolean) => {
          if (!open) setDeleteTarget(null);
        }}
        onConfirm={() => void handleDeleteConfirmed()}
      />
      <AdsConfirmDialog
        open={batchConfirmOpen}
        title="批量删除导出任务？"
        description={`即将删除已勾选的 ${selectedIds.length} 条导出任务，删除后不可恢复；处理中的任务将删除失败。`}
        confirmText="批量删除"
        destructive
        onOpenChange={setBatchConfirmOpen}
        onConfirm={() => void handleBatchDeleteConfirmed()}
      />
    </div>
  );
};

export default BatchExportsPanel;
