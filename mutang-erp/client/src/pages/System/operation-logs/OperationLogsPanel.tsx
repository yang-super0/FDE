import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Archive, Download, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Table, type TableProps } from '@lark-apaas/client-toolkit/antd-table';
import type { OperationLogEnhance } from '@shared/api.interface';
import { ReportCard, SectionHeader } from '@client/src/components/blueprint';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import { ColumnSettingsButton } from '@client/src/components/column-settings-button';
import { useColumnSettings } from '@client/src/hooks/useColumnSettings';
import { AdsConfirmDialog } from '@client/src/pages/AdsBusiness/AdsConfirmDialog';
import { exportRowsToExcel } from '@client/src/pages/AdsBusiness/ads-excel';
import {
  WarehouseDatePicker,
  WarehouseFilterSelect,
} from '@client/src/pages/Admin/warehouse/warehouse-shared';
import {
  archiveOperationLogs,
  deleteOperationLog,
  getOperationLogStats,
  listOperationLogs,
} from '@client/src/api/system-enhance/operation-logs';
import { toSystemEnhanceErrorText } from '../system-enhance-shared';
import {
  OPERATION_LOG_EXPORT_HEADERS,
  OPERATION_LOG_MODULE_OPTIONS,
  OPERATION_LOG_OPERATION_OPTIONS,
  OPERATION_LOG_RISK_OPTIONS,
  buildOperationLogColumns,
  buildOperationLogExportRows,
} from './OperationLogColumns';
import { OperationLogDetailDialog } from './OperationLogDetailDialog';
import {
  OperationLogStatsSection,
  type OperationLogStatsData,
} from './OperationLogStatsSection';

const LOG_PAGE_SIZE: number = 10;
const LOG_EXPORT_LIMIT: number = 100;
const LOG_FILTER_ALL: string = '__all__';
const ARCHIVED_ALL: string = 'only-active';
const ARCHIVED_INCLUDE: string = 'include-archived';

const EMPTY_STATS: OperationLogStatsData = {
  stats: null,
  highRiskCount: 0,
  todayCount: 0,
  archivedCount: 0,
};

const OperationLogsPanel = () => {
  const [module, setModule] = useState<string>(LOG_FILTER_ALL);
  const [operation, setOperation] = useState<string>(LOG_FILTER_ALL);
  const [username, setUsername] = useState<string>('');
  const [riskLevel, setRiskLevel] = useState<string>(LOG_FILTER_ALL);
  const [includeArchived, setIncludeArchived] = useState<string>(
    ARCHIVED_ALL,
  );
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [page, setPage] = useState<number>(1);
  const [items, setItems] = useState<OperationLogEnhance[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [statsData, setStatsData] = useState<OperationLogStatsData>(
    EMPTY_STATS,
  );
  const [viewTarget, setViewTarget] = useState<OperationLogEnhance | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<OperationLogEnhance | null>(
    null,
  );
  const [archiveOpen, setArchiveOpen] = useState<boolean>(false);

  const filterParams = useMemo(
    () => ({
      module: module !== LOG_FILTER_ALL ? module : undefined,
      operation: operation !== LOG_FILTER_ALL ? operation : undefined,
      username: username.trim() || undefined,
      riskLevel: riskLevel !== LOG_FILTER_ALL ? riskLevel : undefined,
      includeArchived:
        includeArchived === ARCHIVED_INCLUDE ? 'true' : undefined,
      dateFrom: dateFrom
        ? dayjs(dateFrom).format('YYYY-MM-DD')
        : undefined,
      dateTo: dateTo ? dayjs(dateTo).format('YYYY-MM-DD') : undefined,
    }),
    [module, operation, username, riskLevel, includeArchived, dateFrom, dateTo],
  );

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listOperationLogs({
        ...filterParams,
        page: String(page),
        pageSize: String(LOG_PAGE_SIZE),
      });
      setItems(result.items);
      setTotal(result.total);
    } catch (error: unknown) {
      logger.error('加载操作日志失败', String(error));
      toast.error(toSystemEnhanceErrorText(error));
    } finally {
      setLoading(false);
    }
  }, [filterParams, page]);

  const loadStats = useCallback(async () => {
    const today: string = dayjs().format('YYYY-MM-DD');
    try {
      const [stats, highRisk, todayResult, allIncluded] = await Promise.all([
        getOperationLogStats(),
        listOperationLogs({
          riskLevel: '高风险',
          page: '1',
          pageSize: '1',
        }),
        listOperationLogs({
          dateFrom: today,
          dateTo: today,
          page: '1',
          pageSize: '1',
        }),
        listOperationLogs({
          includeArchived: 'true',
          page: '1',
          pageSize: '1',
        }),
      ]);
      const includedTotal: number = allIncluded.total;
      setStatsData({
        stats,
        highRiskCount: highRisk.total,
        todayCount: todayResult.total,
        archivedCount: Math.max(0, includedTotal - stats.totalCount),
      });
    } catch (error: unknown) {
      logger.error('加载操作日志统计失败', String(error));
      toast.error(toSystemEnhanceErrorText(error));
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const refresh = useCallback((): void => {
    void loadList();
    void loadStats();
  }, [loadList, loadStats]);

  const handleReset = (): void => {
    setModule(LOG_FILTER_ALL);
    setOperation(LOG_FILTER_ALL);
    setUsername('');
    setRiskLevel(LOG_FILTER_ALL);
    setIncludeArchived(ARCHIVED_ALL);
    setDateFrom(undefined);
    setDateTo(undefined);
    setPage(1);
  };

  const handleTableChange: TableProps<OperationLogEnhance>['onChange'] = (
    pagination,
  ) => {
    const next: number = pagination.current ?? page;
    if (next !== page) setPage(next);
  };

  const handleArchiveConfirmed = async (): Promise<void> => {
    setArchiveOpen(false);
    try {
      const result = await archiveOperationLogs();
      toast.success(`已归档 ${result.archived} 条操作日志`);
      refresh();
    } catch (error: unknown) {
      logger.error('归档操作日志失败', String(error));
      toast.error(toSystemEnhanceErrorText(error));
    }
  };

  const handleDeleteConfirmed = async (): Promise<void> => {
    const target: OperationLogEnhance | null = deleteTarget;
    setDeleteTarget(null);
    if (!target) return;
    try {
      await deleteOperationLog(target.id);
      toast.success(`日志「${target.logNo}」已删除`);
      refresh();
    } catch (error: unknown) {
      logger.error('删除操作日志失败', String(error));
      toast.error(toSystemEnhanceErrorText(error));
      refresh();
    }
  };

  const handleExport = async (): Promise<void> => {
    try {
      const result = await listOperationLogs({
        ...filterParams,
        page: '1',
        pageSize: String(LOG_EXPORT_LIMIT),
      });
      const count: number = await exportRowsToExcel(
        buildOperationLogExportRows(result.items),
        OPERATION_LOG_EXPORT_HEADERS,
        '操作日志',
        '操作日志',
      );
      toast.success(`已导出 ${count} 条操作日志`);
    } catch (error: unknown) {
      logger.error('导出操作日志失败', String(error));
      toast.error(toSystemEnhanceErrorText(error));
    }
  };

  const columns = useMemo(
    () =>
      buildOperationLogColumns({
        onView: (record: OperationLogEnhance) => setViewTarget(record),
        onDelete: (record: OperationLogEnhance) => setDeleteTarget(record),
      }),
    [],
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
      <OperationLogStatsSection data={statsData} />
      <ReportCard>
        <SectionHeader
          no="02"
          label="OPERATION LOGS"
          subtitle="操作日志审计 · 用户行为与高风险操作追踪"
        />
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <WarehouseFilterSelect
            value={module}
            placeholder="模块"
            allLabel="全部模块"
            options={OPERATION_LOG_MODULE_OPTIONS}
            onChange={(value: string) => {
              setModule(value);
              setPage(1);
            }}
          />
          <WarehouseFilterSelect
            value={operation}
            placeholder="操作类型"
            allLabel="全部操作"
            options={OPERATION_LOG_OPERATION_OPTIONS}
            onChange={(value: string) => {
              setOperation(value);
              setPage(1);
            }}
          />
          <WarehouseFilterSelect
            value={riskLevel}
            placeholder="风险等级"
            allLabel="全部风险"
            options={OPERATION_LOG_RISK_OPTIONS}
            onChange={(value: string) => {
              setRiskLevel(value);
              setPage(1);
            }}
          />
          <WarehouseFilterSelect
            value={includeArchived}
            placeholder="归档范围"
            allLabel="仅未归档"
            options={[]}
            onChange={(value: string) => {
              setIncludeArchived(value);
              setPage(1);
            }}
          />
          <Input
            className="h-9 w-32 rounded-none"
            value={username}
            placeholder="用户名"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setUsername(e.target.value);
              setPage(1);
            }}
          />
          <WarehouseDatePicker
            value={dateFrom}
            placeholder="操作日期从"
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
            variant="outline"
            onClick={() => setArchiveOpen(true)}
          >
            <Archive className="h-4 w-4" />
            归档历史日志
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
        </div>
        <Table<OperationLogEnhance>
          columns={visibleColumns}
          dataSource={items}
          loading={loading}
          rowKey="id"
          scroll={{ x: 1300, y: 500 }}
          pagination={{
            current: page,
            pageSize: LOG_PAGE_SIZE,
            total,
            showSizeChanger: false,
          }}
          onChange={handleTableChange}
        />
      </ReportCard>

      <OperationLogDetailDialog
        open={viewTarget !== null}
        target={viewTarget}
        onOpenChange={(open: boolean) => {
          if (!open) setViewTarget(null);
        }}
      />
      <AdsConfirmDialog
        open={deleteTarget !== null}
        title="删除操作日志？"
        description={`即将删除日志「${deleteTarget?.logNo ?? '—'}」，删除后不可恢复。`}
        confirmText="删除"
        destructive
        onOpenChange={(open: boolean) => {
          if (!open) setDeleteTarget(null);
        }}
        onConfirm={() => void handleDeleteConfirmed()}
      />
      <AdsConfirmDialog
        open={archiveOpen}
        title="归档历史操作日志？"
        description="即将按归档策略归档历史操作日志，归档后默认列表不再展示，可通过「含归档」筛选查看。"
        confirmText="归档"
        onOpenChange={setArchiveOpen}
        onConfirm={() => void handleArchiveConfirmed()}
      />
    </div>
  );
};

export default OperationLogsPanel;
