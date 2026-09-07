import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Table, type TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import { ReportCard } from '@client/src/components/blueprint';
import { Button } from '@client/src/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import type { PerformanceTask, PerformanceTaskSummary } from '@shared/api.interface';
import { getPerformanceSummary, listPerformanceTasks } from '@client/src/api/workbench-enhance';
import {
  ConfirmTaskDialog,
  PerformanceTaskFormDialog,
  RejectTaskDialog,
} from './PerformanceTaskDialogs';
import { useI18n } from '@client/src/i18n';

const PAGE_SIZE: number = 10;
const FILTER_ALL: string = '__ALL__';
const STATUS_OPTIONS: string[] = ['待确认', '已确认', '已驳回'];

const STATUS_BADGE_CLASS: Record<string, string> = {
  待确认: 'bg-[hsl(45_100%_96%)] text-[#D97706]',
  已确认: 'bg-[hsl(160_63%_96%)] text-[#0B8A6B]',
  已驳回: 'bg-[hsl(0_93%_94%)] text-[#DC2626]',
};

const STATUS_BADGE_CLASS_FALLBACK: string = 'bg-accent text-muted-foreground';

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }): ReactNode {
  return (
    <div className={`border-t-[3px] rounded-none shadow-sm p-4 bg-card ${accent ? 'border-t-[#0F766E]' : 'border-t-[#0033A0]'}`}>
      <div className="text-[9px] font-black tracking-[0.15em] uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-black font-mono text-foreground">{value}</div>
    </div>
  );
}

export const DashboardPerformanceSection = () => {
  const { t, tEnum } = useI18n();
  const [summary, setSummary] = useState<PerformanceTaskSummary | null>(null);
  const [tasks, setTasks] = useState<PerformanceTask[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [statusFilter, setStatusFilter] = useState<string>(FILTER_ALL);
  const [loading, setLoading] = useState<boolean>(false);
  const [creating, setCreating] = useState<boolean>(false);
  const [viewing, setViewing] = useState<PerformanceTask | null>(null);
  const [confirming, setConfirming] = useState<PerformanceTask | null>(null);
  const [rejecting, setRejecting] = useState<PerformanceTask | null>(null);

  const loadAll = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const [summaryRes, listRes] = await Promise.all([
        getPerformanceSummary(),
        listPerformanceTasks({
          page,
          pageSize: PAGE_SIZE,
          status: statusFilter === FILTER_ALL ? undefined : statusFilter,
        }),
      ]);
      setSummary(summaryRes);
      setTasks(listRes.items);
      setTotal(listRes.total);
    } catch (error) {
      logger.error('绩效任务数据加载失败', error);
      toast.error(t('dashboard.performance.loadFailedToast'));
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, t]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const columns: TableColumnsType<PerformanceTask> = [
    { title: t('dashboard.performance.columns.taskNo'), dataIndex: 'taskNo', width: 130, render: (value: string) => <span className="font-mono text-xs">{value}</span> },
    { title: t('dashboard.performance.columns.taskName'), dataIndex: 'taskName', ellipsis: true },
    { title: t('dashboard.performance.columns.employee'), dataIndex: 'assignee', width: 100 },
    {
      title: t('dashboard.performance.columns.score'),
      key: 'score',
      width: 110,
      align: 'right',
      render: (_: unknown, record: PerformanceTask): ReactNode => (
        <span className="font-mono text-xs">
          {record.score === null ? '-' : record.score.toFixed(2)} / {record.maxScore.toFixed(2)}
        </span>
      ),
    },
    {
      title: t('dashboard.performance.columns.status'),
      dataIndex: 'status',
      width: 90,
      render: (value: string): ReactNode => (
        <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold rounded-none ${STATUS_BADGE_CLASS[value] ?? STATUS_BADGE_CLASS_FALLBACK}`}>
          {tEnum(value)}
        </span>
      ),
    },
    {
      title: t('dashboard.performance.columns.dueDate'),
      dataIndex: 'dueDate',
      width: 110,
      render: (value: string | null): ReactNode => <span className="font-mono text-xs">{value ?? '-'}</span>,
    },
    {
      title: t('common.action'),
      key: 'action',
      fixed: 'right',
      width: 170,
      render: (_: unknown, record: PerformanceTask): ReactNode => (
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={(): void => setViewing(record)}>
            {t('common.view')}
          </Button>
          {record.status === '待确认' ? (
            <>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-primary" onClick={(): void => setConfirming(record)}>
                {t('dashboard.performance.confirm')}
              </Button>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-[#DC2626]" onClick={(): void => setRejecting(record)}>
                {t('dashboard.performance.reject')}
              </Button>
            </>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <ReportCard>
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
        <div className="text-sm font-bold">{t('dashboard.performance.title')}</div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={statusFilter}
            onValueChange={(value: string): void => {
              setStatusFilter(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[110px] h-8 rounded-none text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-none">
              <SelectItem value={FILTER_ALL}>{t('dashboard.performance.allStatus')}</SelectItem>
              {STATUS_OPTIONS.map((item: string): ReactNode => (
                <SelectItem key={item} value={item}>{tEnum(item)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="rounded-none h-8" disabled={loading} onClick={(): Promise<void> => loadAll()}>
            <RefreshCw className="size-3.5 mr-1" />
            {t('common.refresh')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 pb-6">
        <StatCard label={t('dashboard.performance.stats.departmentAvgScore')} value={summary ? summary.departmentAvgScore.toFixed(2) : '-'} />
        <StatCard label={t('dashboard.performance.stats.personInCharge')} value={summary?.personInCharge ?? '-'} accent />
        <StatCard label={t('dashboard.performance.stats.employeeScore')} value={summary ? summary.employeeScore.toFixed(2) : '-'} accent />
        <StatCard label={t('dashboard.performance.stats.totalTasks')} value={summary ? String(summary.totalTasks) : '-'} />
        <StatCard label={t('dashboard.performance.stats.confirmedCount')} value={summary ? String(summary.confirmedCount) : '-'} />
        <StatCard label={t('dashboard.performance.stats.pendingCount')} value={summary ? String(summary.pendingCount) : '-'} />
      </div>

      <Table
        columns={columns}
        dataSource={tasks}
        rowKey="id"
        loading={loading}
        scroll={{ x: 900, y: 400 }}
        pagination={{
          current: page,
          pageSize: PAGE_SIZE,
          total,
          onChange: (next: number): void => setPage(next),
        }}
      />

      <div className="pt-4">
        <Button className="rounded-none" onClick={(): void => setCreating(true)}>
          <Plus className="size-4 mr-1" />
          {t('dashboard.performance.newTask')}
        </Button>
      </div>

      <Dialog open={viewing !== null} onOpenChange={(open: boolean): void => !open && setViewing(null)}>
        <DialogContent className="rounded-none max-w-md">
          <DialogHeader>
            <DialogTitle>{viewing?.taskName ?? ''}</DialogTitle>
            <DialogDescription>{viewing?.taskNo ?? ''}</DialogDescription>
          </DialogHeader>
          {viewing ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">{t('dashboard.performance.dialog.taskType')}</span><span>{tEnum(viewing.taskType)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t('dashboard.performance.dialog.department')}</span><span>{viewing.department}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t('dashboard.performance.dialog.personInCharge')}</span><span>{viewing.personInCharge}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t('dashboard.performance.dialog.employee')}</span><span>{viewing.assignee}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t('dashboard.performance.dialog.score')}</span><span className="font-mono">{viewing.score === null ? '-' : viewing.score.toFixed(2)} / {viewing.maxScore.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t('dashboard.performance.dialog.status')}</span><span>{tEnum(viewing.status)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t('dashboard.performance.dialog.dueDate')}</span><span className="font-mono">{viewing.dueDate ?? '-'}</span></div>
              {viewing.description ? (
                <div><span className="text-muted-foreground">{t('dashboard.performance.dialog.description')}</span><p className="pt-1 break-words">{viewing.description}</p></div>
              ) : null}
              {viewing.confirmRemark ? (
                <div><span className="text-muted-foreground">{t('dashboard.performance.dialog.rejectReason')}</span><p className="pt-1 break-words text-[#DC2626]">{viewing.confirmRemark}</p></div>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <PerformanceTaskFormDialog open={creating} onSaved={loadAll} onOpenChange={setCreating} />
      <ConfirmTaskDialog
        task={confirming}
        onSaved={loadAll}
        onOpenChange={(open: boolean): void => !open && setConfirming(null)}
      />
      <RejectTaskDialog
        task={rejecting}
        onSaved={loadAll}
        onOpenChange={(open: boolean): void => !open && setRejecting(null)}
      />
    </ReportCard>
  );
};
