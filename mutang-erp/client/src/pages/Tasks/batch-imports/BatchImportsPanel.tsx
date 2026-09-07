import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Key } from 'react';
import dayjs from 'dayjs';
import { Download, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Table, type TableProps } from '@lark-apaas/client-toolkit/antd-table';
import type {
  BatchImport,
  BatchImportListParams,
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
  deleteBatchImport,
  listBatchImports,
  startBatchImport,
} from '@client/src/api/task-enhance/batch-imports';
import {
  TASK_ENHANCE_FILTER_ALL,
  TASK_IMPORT_TYPES,
  toTaskEnhanceErrorText,
} from '../task-enhance-shared';
import {
  BATCH_IMPORT_EXPORT_HEADERS,
  BATCH_IMPORT_SORT_FIELDS,
  BATCH_IMPORT_STATUS_OPTIONS,
  buildBatchImportColumns,
  buildBatchImportExportRows,
} from './BatchImportColumns';
import {
  BatchImportCreateDialog,
  BatchImportFinishDialog,
  BatchImportResultDialog,
} from './BatchImportDialogs';

const IMPORT_PAGE_SIZE: number = 10;
const IMPORT_EXPORT_LIMIT: number = 100;

const BatchImportsPanel = () => {
  const [importType, setImportType] = useState<string>(TASK_ENHANCE_FILTER_ALL);
  const [status, setStatus] = useState<string>(TASK_ENHANCE_FILTER_ALL);
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [page, setPage] = useState<number>(1);
  const [items, setItems] = useState<BatchImport[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<string | undefined>(undefined);
  const [selectedKeys, setSelectedKeys] = useState<Key[]>([]);
  const [createOpen, setCreateOpen] = useState<boolean>(false);
  const [finishTarget, setFinishTarget] = useState<BatchImport | null>(null);
  const [resultTarget, setResultTarget] = useState<BatchImport | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BatchImport | null>(null);
  const [batchConfirmOpen, setBatchConfirmOpen] = useState<boolean>(false);

  const filterParams = useMemo((): BatchImportListParams => {
    const params: BatchImportListParams = {};
    if (importType !== TASK_ENHANCE_FILTER_ALL) params.importType = importType;
    if (status !== TASK_ENHANCE_FILTER_ALL) params.status = status;
    if (dateFrom) params.dateFrom = dayjs(dateFrom).format('YYYY-MM-DD');
    if (dateTo) params.dateTo = dayjs(dateTo).format('YYYY-MM-DD');
    if (sortBy) params.sortBy = sortBy;
    if (sortOrder) params.sortOrder = sortOrder;
    return params;
  }, [importType, status, dateFrom, dateTo, sortBy, sortOrder]);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listBatchImports({
        ...filterParams,
        page: String(page),
        pageSize: String(IMPORT_PAGE_SIZE),
      });
      setItems(result.items);
      setTotal(result.total);
    } catch (error: unknown) {
      logger.error('加载批量导入列表失败', String(error));
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
    setImportType(TASK_ENHANCE_FILTER_ALL);
    setStatus(TASK_ENHANCE_FILTER_ALL);
    setDateFrom(undefined);
    setDateTo(undefined);
    setSortBy(undefined);
    setSortOrder(undefined);
    setPage(1);
  };

  const handleTableChange: TableProps<BatchImport>['onChange'] = (
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
      setSortBy(BATCH_IMPORT_SORT_FIELDS[columnKey] ?? undefined);
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
    async (record: BatchImport): Promise<void> => {
      try {
        await startBatchImport(record.id);
        toast.success(`导入任务「${record.importNo}」已开始处理`);
        refresh();
      } catch (error: unknown) {
        logger.error('开始导入任务失败', String(error));
        toast.error(toTaskEnhanceErrorText(error));
        refresh();
      }
    },
    [refresh],
  );

  const handleDeleteConfirmed = async (): Promise<void> => {
    const target: BatchImport | null = deleteTarget;
    setDeleteTarget(null);
    if (!target) return;
    try {
      await deleteBatchImport(target.id);
      toast.success(`导入任务「${target.importNo}」已删除`);
      refresh();
    } catch (error: unknown) {
      logger.error('删除导入任务失败', String(error));
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
        await deleteBatchImport(id);
        deletedCount += 1;
      } catch (error: unknown) {
        if (!errorText) errorText = toTaskEnhanceErrorText(error);
      }
    }
    if (deletedCount > 0) toast.success(`已删除 ${deletedCount} 条导入任务`);
    if (errorText) toast.error(`部分导入任务删除失败：${errorText}`);
    setSelectedKeys([]);
    refresh();
  };

  const handleExport = async (): Promise<void> => {
    try {
      const result = await listBatchImports({
        ...filterParams,
        page: '1',
        pageSize: String(IMPORT_EXPORT_LIMIT),
      });
      const count: number = await exportRowsToExcel(
        buildBatchImportExportRows(result.items),
        BATCH_IMPORT_EXPORT_HEADERS,
        '批量导入',
        '批量导入任务',
      );
      toast.success(`已导出 ${count} 条导入任务`);
    } catch (error: unknown) {
      logger.error('导出导入任务失败', String(error));
      toast.error(toTaskEnhanceErrorText(error));
    }
  };

  const columns = useMemo(
    () =>
      buildBatchImportColumns({
        onStart: (record: BatchImport) => void handleStart(record),
        onFinish: (record: BatchImport) => setFinishTarget(record),
        onView: (record: BatchImport) => setResultTarget(record),
        onDelete: (record: BatchImport) => setDeleteTarget(record),
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
          label="BATCH IMPORTS"
          subtitle="批量导入任务管理 · 数据批量入库执行记录"
        />
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <WarehouseFilterSelect
            value={importType}
            placeholder="导入类型"
            allLabel="全部类型"
            options={TASK_IMPORT_TYPES}
            onChange={(value: string) => {
              setImportType(value);
              setPage(1);
            }}
          />
          <WarehouseFilterSelect
            value={status}
            placeholder="状态"
            allLabel="全部状态"
            options={BATCH_IMPORT_STATUS_OPTIONS}
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
            新建导入任务
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
        <Table<BatchImport>
          columns={visibleColumns}
          dataSource={items}
          loading={loading}
          rowKey="id"
          scroll={{ x: 1800, y: 500 }}
          rowSelection={{
            selectedRowKeys: selectedKeys,
            onChange: (keys: Key[]) => setSelectedKeys(keys),
          }}
          pagination={{
            current: page,
            pageSize: IMPORT_PAGE_SIZE,
            total,
            showSizeChanger: false,
          }}
          onChange={handleTableChange}
        />
      </ReportCard>

      <BatchImportCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={refresh}
      />
      <BatchImportFinishDialog
        open={finishTarget !== null}
        target={finishTarget}
        onOpenChange={(open: boolean) => {
          if (!open) setFinishTarget(null);
        }}
        onFinished={refresh}
      />
      <BatchImportResultDialog
        open={resultTarget !== null}
        target={resultTarget}
        onOpenChange={(open: boolean) => {
          if (!open) setResultTarget(null);
        }}
      />
      <AdsConfirmDialog
        open={deleteTarget !== null}
        title="删除导入任务？"
        description={`即将删除导入任务「${deleteTarget?.importNo ?? '—'}」，删除后不可恢复。`}
        confirmText="删除"
        destructive
        onOpenChange={(open: boolean) => {
          if (!open) setDeleteTarget(null);
        }}
        onConfirm={() => void handleDeleteConfirmed()}
      />
      <AdsConfirmDialog
        open={batchConfirmOpen}
        title="批量删除导入任务？"
        description={`即将删除已勾选的 ${selectedIds.length} 条导入任务，删除后不可恢复；处理中的任务将删除失败。`}
        confirmText="批量删除"
        destructive
        onOpenChange={setBatchConfirmOpen}
        onConfirm={() => void handleBatchDeleteConfirmed()}
      />
    </div>
  );
};

export default BatchImportsPanel;
