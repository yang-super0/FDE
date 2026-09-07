import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Download, Plus, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Table, type TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import { ColumnSettingsButton } from '@client/src/components/column-settings-button';
import { useColumnSettings } from '@client/src/hooks/useColumnSettings';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import type { HrPerformance, HrPerformanceListParams } from '@shared/api.interface';
import { deleteHrPerformance, fetchHrPerformances } from '@client/src/api/hr-enhance/compensation';
import { AdsConfirmDialog } from '@client/src/pages/AdsBusiness/AdsConfirmDialog';
import {
  HR_FILTER_ALL, HR_PERF_GRADE_OPTIONS, HR_PERF_MODE_OPTIONS,
  HR_PERF_PERIOD_OPTIONS, HR_PERF_STATUS_OPTIONS, HrStatusBadge,
} from '../hr-enhance-constants';
import {
  COMP_PAGE_SIZE, CompActionLink, CompFilterSelect, CompGradeBadge,
  exportPerformancesExcel, reportCompError,
} from './compensation-shared';
import { PerformanceFormDialog } from './PerformanceFormDialog';
import { ScoreDialog } from './ScoreDialog';
import { AppealDialog } from './AppealDialog';

interface ScoreTarget {
  mode: 'self' | 'leader';
  item: HrPerformance;
}

const SELF_SCORE_STATUSES: string[] = ['目标设定', '自评中'];
const LEADER_SCORE_STATUSES: string[] = ['上级评中', '已申诉'];

export function PerformancesTab() {
  const [period, setPeriod] = useState<string>(HR_FILTER_ALL);
  const [mode, setMode] = useState<string>(HR_FILTER_ALL);
  const [grade, setGrade] = useState<string>(HR_FILTER_ALL);
  const [status, setStatus] = useState<string>(HR_FILTER_ALL);
  const [draftEmployee, setDraftEmployee] = useState<string>('');
  const [employeeName, setEmployeeName] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [items, setItems] = useState<HrPerformance[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [editing, setEditing] = useState<HrPerformance | null>(null);
  const [scoreTarget, setScoreTarget] = useState<ScoreTarget | null>(null);
  const [appealOf, setAppealOf] = useState<HrPerformance | null>(null);
  const [deleteOf, setDeleteOf] = useState<HrPerformance | null>(null);

  useEffect(() => {
    const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
      setEmployeeName(draftEmployee.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [draftEmployee]);

  const filterParams = useMemo((): HrPerformanceListParams => ({
    period: period === HR_FILTER_ALL ? undefined : period,
    mode: mode === HR_FILTER_ALL ? undefined : mode,
    grade: grade === HR_FILTER_ALL ? undefined : grade,
    status: status === HR_FILTER_ALL ? undefined : status,
    employeeName: employeeName || undefined,
  }), [period, mode, grade, status, employeeName]);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchHrPerformances({
        ...filterParams, page: String(page), pageSize: String(COMP_PAGE_SIZE),
      });
      setItems(result.items);
      setTotal(result.total);
    } catch (error: unknown) {
      reportCompError('加载绩效列表失败', error);
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
    setPeriod(HR_FILTER_ALL);
    setMode(HR_FILTER_ALL);
    setGrade(HR_FILTER_ALL);
    setStatus(HR_FILTER_ALL);
    setDraftEmployee('');
    setEmployeeName('');
    setPage(1);
  };

  const handleDelete = async (): Promise<void> => {
    if (!deleteOf) return;
    try {
      await deleteHrPerformance(deleteOf.id);
      toast.success('绩效记录已删除');
      setDeleteOf(null);
      refresh();
    } catch (error: unknown) {
      reportCompError('删除绩效记录失败', error);
    }
  };

  const handleExport = async (): Promise<void> => {
    try {
      const count: number = await exportPerformancesExcel(filterParams);
      toast.success(`已导出 ${count} 条绩效记录`);
    } catch (error: unknown) {
      reportCompError('导出绩效记录失败', error);
    }
  };

  const columns = useMemo((): TableColumnsType<HrPerformance> => [
    {
      key: 'hr-performances-no', title: '编号', dataIndex: 'performanceNo', width: 140, fixed: 'left',
      render: (value: string) => <span className="font-bold text-primary">{value}</span>,
    },
    { key: 'hr-performances-employee', title: '员工', dataIndex: 'employeeName', width: 90 },
    { key: 'hr-performances-department', title: '部门', dataIndex: 'department', width: 120 },
    { key: 'hr-performances-period', title: '周期', dataIndex: 'period', width: 80 },
    { key: 'hr-performances-mode', title: '模式', dataIndex: 'mode', width: 80 },
    {
      key: 'hr-performances-selfScore', title: '自评分', dataIndex: 'selfScore', width: 90,
      align: 'right',
      render: (value: number | null) => (
        <span className="font-mono">{value === null ? '—' : String(value)}</span>
      ),
    },
    {
      key: 'hr-performances-leaderScore', title: '上级评分', dataIndex: 'leaderScore', width: 90,
      align: 'right',
      render: (value: number | null) => (
        <span className="font-mono">{value === null ? '—' : String(value)}</span>
      ),
    },
    {
      key: 'hr-performances-finalScore', title: '最终得分', dataIndex: 'finalScore', width: 100,
      align: 'right',
      render: (value: string | null) => (
        <span className="font-mono font-bold text-primary">{value ?? '—'}</span>
      ),
    },
    { key: 'hr-performances-grade', title: '等级', dataIndex: 'grade', width: 80,
      render: (value: string) => <CompGradeBadge grade={value} /> },
    { key: 'hr-performances-status', title: '状态', dataIndex: 'status', width: 90,
      render: (value: string) => <HrStatusBadge status={value} /> },
    {
      key: 'hr-performances-confirmDate', title: '确认日期', dataIndex: 'confirmDate', width: 110,
      render: (value: string | null) => (value ? dayjs(value).format('YYYY-MM-DD') : '—'),
    },
    {
      key: 'hr-performances-actions', title: '操作', width: 240, fixed: 'right',
      render: (_: unknown, record: HrPerformance) => (
        <div className="flex flex-wrap items-center gap-1">
          {SELF_SCORE_STATUSES.includes(record.status) ? (
            <CompActionLink onClick={() => setScoreTarget({ mode: 'self', item: record })}>
              自评
            </CompActionLink>
          ) : null}
          {LEADER_SCORE_STATUSES.includes(record.status) ? (
            <CompActionLink onClick={() => setScoreTarget({ mode: 'leader', item: record })}>
              上级评分
            </CompActionLink>
          ) : null}
          {record.status === '已确认' ? (
            <CompActionLink onClick={() => setAppealOf(record)}>申诉</CompActionLink>
          ) : null}
          <CompActionLink onClick={() => { setEditing(record); setFormOpen(true); }}>
            编辑
          </CompActionLink>
          <CompActionLink danger onClick={() => setDeleteOf(record)}>删除</CompActionLink>
        </div>
      ),
    },
  ], []);

  const {
    visibleColumns, columnMetas, hiddenIds,
    toggleColumn, resetColumns, setAllColumns,
  } = useColumnSettings(columns);

  return (
    <div>
      {/* 筛选区 */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <CompFilterSelect value={period} placeholder="周期" allLabel="全部周期"
          options={HR_PERF_PERIOD_OPTIONS}
          onChange={(value: string) => { setPeriod(value); setPage(1); }} />
        <CompFilterSelect value={mode} placeholder="模式" allLabel="全部模式"
          options={HR_PERF_MODE_OPTIONS}
          onChange={(value: string) => { setMode(value); setPage(1); }} />
        <CompFilterSelect value={grade} placeholder="等级" allLabel="全部等级"
          options={HR_PERF_GRADE_OPTIONS}
          onChange={(value: string) => { setGrade(value); setPage(1); }} />
        <CompFilterSelect value={status} placeholder="状态" allLabel="全部状态"
          options={HR_PERF_STATUS_OPTIONS}
          onChange={(value: string) => { setStatus(value); setPage(1); }} />
        <Input className="w-36 rounded-none" placeholder="员工姓名" value={draftEmployee}
          onChange={(event) => setDraftEmployee(event.target.value)} />
        <Button variant="ghost" size="sm" className="rounded-none" onClick={handleReset}>
          <RotateCcw className="h-3.5 w-3.5" />
          重置
        </Button>
      </div>
      {/* 操作区 */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button data-ai-section-type="button" onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" />
          新建绩效
        </Button>
        <Button variant="outline" onClick={() => void handleExport()}>
          <Download className="h-4 w-4" />
          导出Excel
        </Button>
        <ColumnSettingsButton
          columnMetas={columnMetas} hiddenIds={hiddenIds}
          onToggle={toggleColumn} onReset={resetColumns} onSetAll={setAllColumns}
        />
      </div>
      {/* 表格 */}
      <Table<HrPerformance>
        columns={visibleColumns}
        dataSource={items}
        loading={loading}
        rowKey="id"
        scroll={{ x: 1400, y: 500 }}
        pagination={{
          current: page,
          pageSize: COMP_PAGE_SIZE,
          total,
          onChange: (nextPage: number) => setPage(nextPage),
        }}
      />
      <PerformanceFormDialog
        open={formOpen}
        item={editing}
        onSaved={refresh}
        onOpenChange={(open: boolean) => {
          setFormOpen(open);
          if (!open) setEditing(null);
        }}
      />
      <ScoreDialog
        open={scoreTarget !== null}
        item={scoreTarget?.item ?? null}
        mode={scoreTarget?.mode ?? 'self'}
        onSaved={refresh}
        onOpenChange={(open: boolean) => {
          if (!open) setScoreTarget(null);
        }}
      />
      <AppealDialog
        open={appealOf !== null}
        item={appealOf}
        onSaved={refresh}
        onOpenChange={(open: boolean) => {
          if (!open) setAppealOf(null);
        }}
      />
      <AdsConfirmDialog
        open={deleteOf !== null}
        title="删除绩效记录？"
        description={deleteOf ? `即将删除绩效记录「${deleteOf.performanceNo}」，删除后不可恢复。` : ''}
        confirmText="删除"
        destructive
        onOpenChange={(open: boolean) => {
          if (!open) setDeleteOf(null);
        }}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}
