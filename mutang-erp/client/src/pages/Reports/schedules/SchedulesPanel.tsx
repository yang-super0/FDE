import { useCallback, useEffect, useState } from 'react';
import type { Key } from 'react';
import { Download, Play, Plus } from 'lucide-react';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Table, type TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import { ReportCard } from '@client/src/components/blueprint';
import { ColumnSettingsButton } from '@client/src/components/column-settings-button';
import { useColumnSettings } from '@client/src/hooks/useColumnSettings';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import { AdsConfirmDialog } from '@client/src/pages/AdsBusiness/AdsConfirmDialog';
import { exportRowsToExcel } from '@client/src/pages/AdsBusiness/ads-excel';
import type {
  ScheduledReportListParams,
  ScheduledReportRecord,
} from '@shared/api.interface';
import {
  deleteSchedule,
  fetchSchedules,
  runScheduleNow,
  toggleScheduleStatus,
} from '@client/src/api/report-center/schedules';
import {
  FREQUENCIES,
  RC_FILTER_ALL,
  SCHEDULE_STATUSES,
  WEEK_DAY_OPTIONS,
  toRcErrorText,
} from '../report-center-constants';
import { ScheduleFormDialog } from './ScheduleFormDialog';
import { PreviewDialog } from './PreviewDialog';
import { RunHistoryDialog } from './RunHistoryDialog';

const DEFAULT_PAGE_SIZE = 20;

const toErrText = (error: unknown): string =>
  error instanceof Error ? error.message : toRcErrorText(error);

const ScheduleStatusBadge = ({ status }: { status: string }) => (
  <span
    className={`inline-flex items-center rounded-[2px] px-2 py-0.5 text-[10px] font-bold ${
      status === '启用' ? 'bg-[#ECFDF5] text-[#10B981]' : 'bg-slate-100 text-slate-500'
    }`}
  >
    {status}
  </span>
);

const RunStatusBadge = ({ status }: { status: string }) => (
  <span
    className={`inline-flex items-center rounded-[2px] px-2 py-0.5 text-[10px] font-bold ${
      status === '成功' ? 'bg-[#ECFDF5] text-[#10B981]' : 'bg-[#FEF2F2] text-[#EF4444]'
    }`}
  >
    {status}
  </span>
);

const cycleText = (record: ScheduledReportRecord): string => {
  if (record.frequency === '每周' && record.dayOfWeek !== null) {
    return WEEK_DAY_OPTIONS.find((o) => o.value === String(record.dayOfWeek))?.label ?? '—';
  }
  if (record.frequency === '每月' && record.dayOfMonth !== null) {
    return `每月${record.dayOfMonth}日`;
  }
  return '—';
};

const targetText = (record: ScheduledReportRecord): string => {
  if (record.reportId !== null) return `报表#${record.reportId}`;
  if (record.reportTemplateId !== null) return `模板#${record.reportTemplateId}`;
  return '—';
};

interface ScheduleFilters {
  frequency: string;
  status: string;
  keyword: string;
}

const EMPTY_FILTERS: ScheduleFilters = {
  frequency: RC_FILTER_ALL,
  status: RC_FILTER_ALL,
  keyword: '',
};

const SchedulesPanel: React.FC = () => {
  const [items, setItems] = useState<ScheduledReportRecord[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [loading, setLoading] = useState<boolean>(false);
  const [draft, setDraft] = useState<ScheduleFilters>({ ...EMPTY_FILTERS });
  const [applied, setApplied] = useState<ScheduleFilters>({ ...EMPTY_FILTERS });
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [formRecord, setFormRecord] = useState<ScheduledReportRecord | null>(null);
  const [deleteRecord, setDeleteRecord] = useState<ScheduledReportRecord | null>(null);
  const [batchDeleteOpen, setBatchDeleteOpen] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<Key[]>([]);
  const [previewRecord, setPreviewRecord] = useState<ScheduledReportRecord | null>(null);
  const [historyRecord, setHistoryRecord] = useState<ScheduledReportRecord | null>(null);
  const [runId, setRunId] = useState<number | null>(null);

  const loadList = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const params: ScheduledReportListParams = {
        page: String(page),
        pageSize: String(pageSize),
        frequency: applied.frequency === RC_FILTER_ALL ? undefined : applied.frequency,
        status: applied.status === RC_FILTER_ALL ? undefined : applied.status,
        keyword: applied.keyword.trim() || undefined,
      };
      const result = await fetchSchedules(params);
      setItems(result.items);
      setTotal(result.total);
    } catch (error) {
      logger.error('获取定时任务列表失败', error);
      toast.error(toErrText(error));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, applied]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const selectedIdList: number[] = selectedIds.map((k: Key) => Number(k));

  const handleRun = async (record: ScheduledReportRecord): Promise<void> => {
    setRunId(record.id);
    try {
      const res = await runScheduleNow(record.id);
      if (res.success) {
        toast.success(`执行${res.attempts}次：${res.message}`);
      } else {
        toast.error(`执行${res.attempts}次：${res.message}`);
      }
      void loadList();
    } catch (error) {
      logger.error('立即执行定时任务失败', error);
      toast.error(toErrText(error));
    } finally {
      setRunId(null);
    }
  };

  const handleToggle = async (record: ScheduledReportRecord): Promise<void> => {
    const nextStatus: string = record.status === '启用' ? '停用' : '启用';
    try {
      await toggleScheduleStatus(record.id, nextStatus);
      toast.success(nextStatus === '启用' ? '任务已启用' : '任务已停用');
      void loadList();
    } catch (error) {
      logger.error('切换任务状态失败', error);
      toast.error(toErrText(error));
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!deleteRecord) return;
    try {
      await deleteSchedule(deleteRecord.id);
      toast.success('任务已删除');
      setDeleteRecord(null);
      void loadList();
    } catch (error) {
      logger.error('删除定时任务失败', error);
      toast.error(toErrText(error));
    }
  };

  const handleBatchDelete = async (): Promise<void> => {
    if (selectedIdList.length === 0) return;
    try {
      await Promise.all(selectedIdList.map((id: number) => deleteSchedule(id)));
      toast.success(`已删除 ${selectedIdList.length} 个任务`);
      setSelectedIds([]);
      setBatchDeleteOpen(false);
      void loadList();
    } catch (error) {
      logger.error('批量删除定时任务失败', error);
      toast.error(toErrText(error));
    }
  };

  const handleExport = async (): Promise<void> => {
    if (items.length === 0) {
      toast.error('当前无数据可导出');
      return;
    }
    const headers: string[] = [
      '任务编号', '任务名称', '关联对象', '频率', '周期', '推送时间',
      '推送目标', '文件格式', '包含图表', '状态',
      '上次运行时间', '上次运行状态', '下次执行时间',
    ];
    const rows: Record<string, string>[] = items.map((r: ScheduledReportRecord) => ({
      任务编号: r.scheduleNo,
      任务名称: r.scheduleName,
      关联对象: targetText(r),
      频率: r.frequency,
      周期: cycleText(r),
      推送时间: r.scheduleTime,
      推送目标: `${r.targetType}${r.targetName ? `(${r.targetName})` : ''}`,
      文件格式: r.fileFormat,
      包含图表: r.includeChart ? '是' : '否',
      状态: r.status,
      上次运行时间: r.lastRunAt ? dayjs(r.lastRunAt).format('YYYY-MM-DD HH:mm') : '—',
      上次运行状态: r.lastRunStatus ?? '—',
      下次执行时间: r.nextRunAt ? dayjs(r.nextRunAt).format('YYYY-MM-DD HH:mm') : '—',
    }));
    try {
      const count = await exportRowsToExcel(rows, headers, '定时任务', '定时任务');
      toast.success(`已导出 ${count} 条任务`);
    } catch {
      toast.error('导出失败');
    }
  };

  const columns: TableColumnsType<ScheduledReportRecord> = [
    { title: '任务编号', dataIndex: 'scheduleNo', width: 130, fixed: 'left' },
    {
      title: '任务名称', dataIndex: 'scheduleName', width: 150,
      render: (v: string) => <span className="font-bold text-primary">{v}</span>,
    },
    {
      title: '关联对象', dataIndex: 'reportId', width: 110,
      render: (_: unknown, record: ScheduledReportRecord) => (
        <span className="font-mono text-xs">{targetText(record)}</span>
      ),
    },
    {
      title: '频率', dataIndex: 'frequency', width: 100,
      render: (v: string, record: ScheduledReportRecord) => (
        <div className="text-xs">
          <div>{v}</div>
          <div className="text-muted-foreground">{cycleText(record)}</div>
        </div>
      ),
    },
    {
      title: '推送时间', dataIndex: 'scheduleTime', width: 90,
      render: (v: string) => <span className="font-mono text-xs">{v}</span>,
    },
    {
      title: '推送目标', dataIndex: 'targetType', width: 140,
      render: (v: string, record: ScheduledReportRecord) => (
        <div className="text-xs">
          <div>{v}</div>
          <div className="text-muted-foreground">
            {record.targetName || record.targetId || '—'}
          </div>
        </div>
      ),
    },
    {
      title: '文件格式', dataIndex: 'fileFormat', width: 100,
      render: (v: string, record: ScheduledReportRecord) => (
        <span className="flex items-center gap-1">
          <span>{v}</span>
          {record.includeChart ? (
            <span className="inline-flex items-center rounded-[2px] bg-accent px-1.5 py-0.5 text-[10px] font-bold text-primary">
              含图
            </span>
          ) : null}
        </span>
      ),
    },
    {
      title: '状态', dataIndex: 'status', width: 70,
      render: (v: string) => <ScheduleStatusBadge status={v} />,
    },
    {
      title: '上次运行', dataIndex: 'lastRunAt', width: 150,
      render: (_: unknown, record: ScheduledReportRecord) => (
        <div className="text-xs">
          <div className="font-mono text-muted-foreground">
            {record.lastRunAt ? dayjs(record.lastRunAt).format('YYYY-MM-DD HH:mm') : '—'}
          </div>
          {record.lastRunStatus ? (
            <span
              className={record.lastRunStatus === '成功' ? '' : 'text-destructive'}
              title={
                record.lastRunStatus === '失败'
                  ? record.lastRunError ?? '执行失败'
                  : undefined
              }
            >
              <RunStatusBadge status={record.lastRunStatus} />
            </span>
          ) : null}
        </div>
      ),
    },
    {
      title: '下次执行', dataIndex: 'nextRunAt', width: 130,
      render: (v: string | null) => (
        <span className="font-mono text-xs">
          {v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '—'}
        </span>
      ),
    },
    {
      title: '操作', key: 'action', fixed: 'right', width: 330,
      render: (_: unknown, record: ScheduledReportRecord) => (
        <div className="flex flex-wrap gap-1">
          <Button
            size="sm" variant="ghost" className="rounded-none"
            disabled={runId !== null}
            onClick={() => void handleRun(record)}
          >
            <Play className="h-3.5 w-3.5" />
            {runId === record.id ? '执行中...' : '立即执行'}
          </Button>
          <Button
            size="sm" variant="ghost" className="rounded-none"
            onClick={() => void handleToggle(record)}
          >
            {record.status === '启用' ? '停用' : '启用'}
          </Button>
          <Button size="sm" variant="ghost" className="rounded-none" onClick={() => setPreviewRecord(record)}>
            预览
          </Button>
          <Button size="sm" variant="ghost" className="rounded-none" onClick={() => setHistoryRecord(record)}>
            运行记录
          </Button>
          <Button
            size="sm" variant="ghost" className="rounded-none"
            onClick={() => { setFormRecord(record); setFormOpen(true); }}
          >
            编辑
          </Button>
          <Button
            size="sm" variant="ghost"
            className="rounded-none text-destructive hover:text-destructive"
            onClick={() => setDeleteRecord(record)}
          >
            删除
          </Button>
        </div>
      ),
    },
  ];

  const {
    visibleColumns, columnMetas, hiddenIds, toggleColumn, resetColumns, setAllColumns,
  } = useColumnSettings(columns);

  return (
    <div className="space-y-6">
      <ReportCard>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={draft.frequency}
              onValueChange={(v: string) => setDraft({ ...draft, frequency: v })}>
              <SelectTrigger className="w-[120px] rounded-none"><SelectValue placeholder="频率" /></SelectTrigger>
              <SelectContent className="rounded-none">
                <SelectItem value={RC_FILTER_ALL}>全部频率</SelectItem>
                {FREQUENCIES.map((opt: string) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={draft.status}
              onValueChange={(v: string) => setDraft({ ...draft, status: v })}>
              <SelectTrigger className="w-[110px] rounded-none"><SelectValue placeholder="状态" /></SelectTrigger>
              <SelectContent className="rounded-none">
                <SelectItem value={RC_FILTER_ALL}>全部状态</SelectItem>
                {SCHEDULE_STATUSES.map((opt: string) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input className="w-[180px] rounded-none" value={draft.keyword}
              onChange={(e) => setDraft({ ...draft, keyword: e.target.value })}
              placeholder="任务名称/编号关键字" />
            <Button variant="outline" className="rounded-none"
              onClick={() => { setApplied({ ...draft }); setPage(1); }}>查询</Button>
            <Button variant="outline" className="rounded-none"
              onClick={() => {
                const empty: ScheduleFilters = { ...EMPTY_FILTERS };
                setDraft(empty); setApplied(empty); setPage(1);
              }}>重置</Button>
          </div>
          <Button data-ai-section-type="button" className="rounded-none"
            onClick={() => { setFormRecord(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4" />新建任务
          </Button>
        </div>
        <div className="space-y-4">
          <div className="flex flex-wrap justify-end gap-2">
            <ColumnSettingsButton columnMetas={columnMetas} hiddenIds={hiddenIds}
              onToggle={toggleColumn} onReset={resetColumns} onSetAll={setAllColumns} />
            <Button size="sm" variant="outline" className="rounded-none"
              onClick={() => void handleExport()}>
              <Download className="h-4 w-4" />导出
            </Button>
            {selectedIdList.length > 0 ? (
              <Button size="sm" variant="outline" className="rounded-none text-destructive"
                onClick={() => setBatchDeleteOpen(true)}>
                批量删除（{selectedIdList.length}）
              </Button>
            ) : null}
          </div>
          <Table
            columns={visibleColumns}
            dataSource={items}
            loading={loading}
            rowKey="id"
            scroll={{ x: 1550, y: 500 }}
            locale={{ emptyText: '暂无定时任务数据' }}
            rowSelection={{
              selectedRowKeys: selectedIds,
              onChange: (keys: Key[]) => setSelectedIds(keys),
            }}
            pagination={{
              current: page, pageSize, total, showSizeChanger: true,
              onChange: (nextPage: number, nextPageSize: number) => {
                setPage(nextPage); setPageSize(nextPageSize);
              },
            }}
          />
        </div>
      </ReportCard>

      <ScheduleFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={() => void loadList()}
        initial={formRecord ?? undefined}
      />

      <AdsConfirmDialog
        open={deleteRecord !== null}
        title="删除任务"
        description={`确认删除任务「${deleteRecord?.scheduleName ?? ''}（${deleteRecord?.scheduleNo ?? ''}）」吗？删除后不可恢复。`}
        confirmText="删除"
        destructive
        onOpenChange={(open: boolean) => { if (!open) setDeleteRecord(null); }}
        onConfirm={() => void handleDelete()}
      />

      <AdsConfirmDialog
        open={batchDeleteOpen}
        title="批量删除任务"
        description={`确认删除选中的 ${selectedIdList.length} 个定时任务吗？删除后不可恢复。`}
        confirmText="删除"
        destructive
        onOpenChange={(open: boolean) => { if (!open) setBatchDeleteOpen(false); }}
        onConfirm={() => void handleBatchDelete()}
      />

      <PreviewDialog
        open={previewRecord !== null}
        schedule={previewRecord}
        onClose={() => setPreviewRecord(null)}
      />

      {historyRecord ? (
        <RunHistoryDialog
          open={historyRecord !== null}
          scheduleNo={historyRecord.scheduleNo}
          scheduleName={historyRecord.scheduleName}
          onClose={() => setHistoryRecord(null)}
        />
      ) : null}
    </div>
  );
};

export { SchedulesPanel };
