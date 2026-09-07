import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Download, Plus, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Table, type TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import { ColumnSettingsButton } from '@client/src/components/column-settings-button';
import { useColumnSettings } from '@client/src/hooks/useColumnSettings';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import type {
  HrPlanDepartmentStat, HrRecruitmentPlan, HrRecruitmentPlanListParams,
} from '@shared/api.interface';
import {
  deleteRecruitmentPlan, fetchPlanDepartmentStats, fetchRecruitmentPlanList,
  updatePlanStatusAction,
} from '@client/src/api/hr-enhance/recruitment';
import { AdsConfirmDialog } from '@client/src/pages/AdsBusiness/AdsConfirmDialog';
import { exportRowsToExcel } from '@client/src/pages/AdsBusiness/ads-excel';
import { PlansFormDialog } from './PlansFormDialog';
import {
  HR_FILTER_ALL, HR_PLAN_STATUS_OPTIONS,
} from '../hr-enhance-constants';
import {
  buildPlansColumns, PLAN_ACTION_STATUS, PLAN_ACTION_TEXT, type PlanAction,
} from './PlansColumns';
import {
  RECRUIT_EXPORT_LIMIT, RECRUIT_PAGE_SIZE,
  RecruitFilterSelect, reportRecruitError,
} from './recruitment-shared';

const EXPORT_HEADERS: string[] = [
  '计划编号', '计划名称', '部门', '职位', '需求人数', '已入职', '优先级',
  '状态', '开始日期', '结束日期', '创建时间',
];

interface PendingPlanAction {
  item: HrRecruitmentPlan;
  action: PlanAction;
}

export function PlansTab() {
  const [draftKeyword, setDraftKeyword] = useState<string>('');
  const [keyword, setKeyword] = useState<string>('');
  const [status, setStatus] = useState<string>(HR_FILTER_ALL);
  const [department, setDepartment] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [items, setItems] = useState<HrRecruitmentPlan[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [deptStats, setDeptStats] = useState<HrPlanDepartmentStat[]>([]);
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [editing, setEditing] = useState<HrRecruitmentPlan | null>(null);
  const [pending, setPending] = useState<PendingPlanAction | null>(null);

  useEffect(() => {
    const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
      setKeyword(draftKeyword.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [draftKeyword]);

  const filterParams = useMemo((): HrRecruitmentPlanListParams => ({
    keyword: keyword || undefined,
    status: status === HR_FILTER_ALL ? undefined : status,
    department: department.trim() || undefined,
  }), [keyword, status, department]);

  const loadStats = useCallback(async () => {
    try {
      setDeptStats(await fetchPlanDepartmentStats());
    } catch (error: unknown) {
      reportRecruitError('加载部门招聘统计失败', error);
    }
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchRecruitmentPlanList({
        ...filterParams,
        page: String(page),
        pageSize: String(RECRUIT_PAGE_SIZE),
      });
      setItems(result.items);
      setTotal(result.total);
    } catch (error: unknown) {
      reportRecruitError('加载招聘计划失败', error);
    } finally {
      setLoading(false);
    }
  }, [filterParams, page]);

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
    setDraftKeyword('');
    setKeyword('');
    setStatus(HR_FILTER_ALL);
    setDepartment('');
    setPage(1);
  };

  const handlePending = async (): Promise<void> => {
    if (!pending) return;
    const actionText: string = PLAN_ACTION_TEXT[pending.action];
    try {
      if (pending.action === 'delete') {
        await deleteRecruitmentPlan(pending.item.id);
      } else {
        await updatePlanStatusAction(pending.item.id, {
          status: PLAN_ACTION_STATUS[pending.action],
        });
      }
      toast.success(`计划已${actionText}`);
      setPending(null);
      refresh();
    } catch (error: unknown) {
      reportRecruitError(`${actionText}计划失败`, error);
    }
  };

  const handleExport = async (): Promise<void> => {
    try {
      const result = await fetchRecruitmentPlanList({
        ...filterParams, page: '1', pageSize: String(RECRUIT_EXPORT_LIMIT),
      });
      const rows: Record<string, string>[] = result.items.map((item: HrRecruitmentPlan) => ({
        计划编号: item.planNo,
        计划名称: item.planName,
        部门: item.department,
        职位: item.position,
        需求人数: String(item.headcount),
        已入职: String(item.hiredCount),
        优先级: item.priority,
        状态: item.status,
        开始日期: item.startDate ?? '',
        结束日期: item.endDate ?? '',
        创建时间: dayjs(item.createdAt).format('YYYY-MM-DD HH:mm:ss'),
      }));
      const count: number = await exportRowsToExcel(rows, EXPORT_HEADERS, '招聘计划', '招聘计划');
      toast.success(`已导出 ${count} 条招聘计划`);
    } catch (error: unknown) {
      reportRecruitError('导出招聘计划失败', error);
    }
  };

  const columns = useMemo(
    (): TableColumnsType<HrRecruitmentPlan> => buildPlansColumns({
      onEdit: (record: HrRecruitmentPlan) => { setEditing(record); setFormOpen(true); },
      onAction: (record: HrRecruitmentPlan, action: PlanAction) => {
        setPending({ item: record, action });
      },
    }),
    [],
  );

  const {
    visibleColumns, columnMetas, hiddenIds,
    toggleColumn, resetColumns, setAllColumns,
  } = useColumnSettings(columns);

  const pendingText: string = pending ? PLAN_ACTION_TEXT[pending.action] : '确认';

  return (
    <div>
      {/* 部门统计条 */}
      <div data-ai-section-type="card-stat" className="mb-4 flex flex-wrap gap-4">
        {deptStats.length === 0 ? (
          <div className="text-sm text-muted-foreground">暂无部门招聘统计数据</div>
        ) : deptStats.map((stat: HrPlanDepartmentStat) => (
          <div
            key={stat.department}
            className="min-w-[180px] flex-1 rounded-none border-t-[3px] border-primary bg-card px-4 py-3 shadow-md"
          >
            <div className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">
              {stat.department}
            </div>
            <div className="mt-1 flex items-baseline gap-3">
              <span className="font-mono text-xl font-bold text-foreground">
                {stat.totalHired}/{stat.totalHeadcount}
              </span>
              <span className="text-xs text-muted-foreground">
                {stat.planCount} 个计划
              </span>
            </div>
          </div>
        ))}
      </div>
      {/* 筛选区 */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          className="w-36 rounded-none"
          placeholder="关键词（计划名称/职位）"
          value={draftKeyword}
          onChange={(event) => setDraftKeyword(event.target.value)}
        />
        <RecruitFilterSelect
          value={status} placeholder="状态" allLabel="全部状态"
          options={HR_PLAN_STATUS_OPTIONS}
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
          新建招聘计划
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
      <Table<HrRecruitmentPlan>
        columns={visibleColumns}
        dataSource={items}
        loading={loading}
        rowKey="id"
        scroll={{ x: 1900, y: 500 }}
        pagination={{
          current: page,
          pageSize: RECRUIT_PAGE_SIZE,
          total,
          onChange: (nextPage: number) => setPage(nextPage),
        }}
      />
      <PlansFormDialog
        open={formOpen}
        editing={editing}
        onSaved={refresh}
        onOpenChange={(open: boolean) => {
          setFormOpen(open);
          if (!open) setEditing(null);
        }}
      />
      <AdsConfirmDialog
        open={pending !== null}
        title={`${pendingText}招聘计划？`}
        description={pending
          ? `即将${pendingText}「${pending.item.planName}」（${pending.item.planNo}）${pending.action === 'delete' ? '，删除后不可恢复。' : '。'}`
          : ''}
        confirmText={pendingText}
        destructive={pending?.action !== 'start' && pending?.action !== 'complete'}
        onOpenChange={(open: boolean) => {
          if (!open) setPending(null);
        }}
        onConfirm={() => void handlePending()}
      />
    </div>
  );
}
