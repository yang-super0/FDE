import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Table, type TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import { ReportCard, SectionHeader } from '@client/src/components/blueprint';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import type { DepartmentTarget } from '@shared/api.interface';
import {
  deleteDepartmentTarget,
  listDepartmentTargets,
  recalculateDepartmentTarget,
} from '@client/src/api/workbench-enhance';
import { AdsConfirmDialog } from '@client/src/pages/AdsBusiness/AdsConfirmDialog';
import { DepartmentTargetFormDialog } from './DepartmentTargetDialogs';
import { toPerformanceErrorText } from './PerformanceTaskDialogs';
import { formatRankAmount } from './DashboardRankSection';
import { useI18n } from '@client/src/i18n';

const PAGE_SIZE: number = 10;
const FILTER_ALL: string = '__ALL__';
const TARGET_TYPE_OPTIONS: string[] = ['月度', '年度'];

const STATUS_BADGE_CLASS: Record<string, string> = {
  已完成: 'bg-[hsl(160_63%_96%)] text-[#0B8A6B]',
  进行中: 'bg-[hsl(45_100%_96%)] text-[#D97706]',
  未达标: 'bg-[hsl(0_93%_94%)] text-[#DC2626]',
};

const STATUS_BADGE_CLASS_FALLBACK: string = 'bg-accent text-muted-foreground';

const rateBarColor = (rate: number): string =>
  rate >= 100 ? 'bg-[#0B8A6B]' : rate >= 80 ? 'bg-[#D97706]' : 'bg-[#DC2626]';

const rateTextColor = (rate: number): string =>
  rate >= 100 ? 'text-[#0B8A6B]' : rate >= 80 ? 'text-[#D97706]' : 'text-[#DC2626]';

const reportError = (context: string, error: unknown): void => {
  logger.error(`${context}: ${toPerformanceErrorText(error)}`);
  toast.error(toPerformanceErrorText(error));
};

export default function DepartmentTargetsPage(): ReactNode {
  const { t, tEnum } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const [targets, setTargets] = useState<DepartmentTarget[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [typeFilter, setTypeFilter] = useState<string>(searchParams.get('targetType') ?? FILTER_ALL);
  const [yearFilter, setYearFilter] = useState<string>(searchParams.get('year') ?? '');
  const [departmentKeyword, setDepartmentKeyword] = useState<string>(
    searchParams.get('department') ?? '',
  );
  const [creating, setCreating] = useState<boolean>(false);
  const [editing, setEditing] = useState<DepartmentTarget | null>(null);
  const [recalculating, setRecalculating] = useState<DepartmentTarget | null>(null);
  const [deleting, setDeleting] = useState<DepartmentTarget | null>(null);

  const loadTargets = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const result = await listDepartmentTargets({
        page,
        pageSize: PAGE_SIZE,
        targetType: typeFilter === FILTER_ALL ? undefined : typeFilter,
        year: yearFilter === '' ? undefined : Number(yearFilter),
        department: departmentKeyword.trim() === '' ? undefined : departmentKeyword.trim(),
      });
      setTargets(result.items);
      setTotal(result.total);
    } catch (error) {
      reportError('目标列表加载失败', error);
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter, yearFilter, departmentKeyword]);

  useEffect(() => {
    const next: Record<string, string> = {};
    if (typeFilter !== FILTER_ALL) next.targetType = typeFilter;
    if (yearFilter !== '') next.year = yearFilter;
    if (departmentKeyword.trim() !== '') next.department = departmentKeyword.trim();
    setSearchParams(next, { replace: true });
    void loadTargets();
  }, [loadTargets, setSearchParams, typeFilter, yearFilter, departmentKeyword]);

  const handleRecalculate = async (): Promise<void> => {
    if (!recalculating) return;
    try {
      const updated = await recalculateDepartmentTarget(recalculating.id);
      toast.success(
        t('dashboard.targets.recalcDoneToast', {
          rate: updated.completionRate.toFixed(2),
        }),
      );
      setRecalculating(null);
      await loadTargets();
    } catch (error) {
      reportError('目标重算失败', error);
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!deleting) return;
    try {
      await deleteDepartmentTarget(deleting.id);
      toast.success(t('dashboard.targets.deleteDoneToast'));
      setDeleting(null);
      await loadTargets();
    } catch (error) {
      reportError('目标删除失败', error);
    }
  };

  const columns: TableColumnsType<DepartmentTarget> = [
    { title: t('dashboard.targets.columns.targetNo'), dataIndex: 'targetNo', width: 140, render: (value: string) => <span className="font-mono text-xs">{value}</span> },
    {
      title: t('dashboard.targets.columns.period'),
      key: 'period',
      width: 120,
      render: (_: unknown, record: DepartmentTarget): ReactNode => (
        <span className="font-mono text-xs">
          {t(
            record.targetType === '月度'
              ? 'dashboard.targets.periodMonth'
              : 'dashboard.targets.periodAnnual',
            { year: String(record.year), month: String(record.month) },
          )}
        </span>
      ),
    },
    { title: t('dashboard.targets.columns.department'), dataIndex: 'department', width: 120 },
    {
      title: t('dashboard.targets.columns.targetValue'),
      dataIndex: 'targetConsumption',
      align: 'right',
      width: 130,
      render: (value: number): ReactNode => <span className="font-mono text-xs">{formatRankAmount(value)}</span>,
    },
    {
      title: t('dashboard.targets.columns.actualValue'),
      dataIndex: 'actualConsumption',
      align: 'right',
      width: 130,
      render: (value: number): ReactNode => <span className="font-mono text-xs">{formatRankAmount(value)}</span>,
    },
    {
      title: t('dashboard.targets.columns.completionRate'),
      key: 'completionRate',
      width: 180,
      render: (_: unknown, record: DepartmentTarget): ReactNode => (
        <div className="space-y-1">
          <div className={`text-xs font-mono font-black ${rateTextColor(record.completionRate)}`}>
            {record.completionRate.toFixed(2)}%
          </div>
          <div className="h-1.5 bg-accent w-full">
            <div
              className={`h-full ${rateBarColor(record.completionRate)}`}
              style={{ width: `${Math.min(record.completionRate, 100)}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      title: t('dashboard.targets.columns.status'),
      dataIndex: 'status',
      width: 90,
      render: (value: string): ReactNode => (
        <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold rounded-none ${STATUS_BADGE_CLASS[value] ?? STATUS_BADGE_CLASS_FALLBACK}`}>
          {tEnum(value)}
        </span>
      ),
    },
    {
      title: t('common.action'),
      key: 'action',
      fixed: 'right',
      width: 190,
      render: (_: unknown, record: DepartmentTarget): ReactNode => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={(): void => setEditing(record)}>
            {t('common.edit')}
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-primary" onClick={(): void => setRecalculating(record)}>
            {t('dashboard.targets.recalc')}
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-[#DC2626]" onClick={(): void => setDeleting(record)}>
            {t('common.delete')}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 lg:p-8">
      <SectionHeader no="01" label="DEPARTMENT TARGETS" subtitle={t('dashboard.targets.pageSubtitle')} />
      <div className="flex flex-wrap items-center gap-2 pb-4">
        <Select
          value={typeFilter}
          onValueChange={(value: string): void => {
            setTypeFilter(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[120px] h-8 rounded-none text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-none">
            <SelectItem value={FILTER_ALL}>{t('dashboard.targets.allTypes')}</SelectItem>
            {TARGET_TYPE_OPTIONS.map((item: string): ReactNode => (
              <SelectItem key={item} value={item}>
                {t(
                  item === '月度'
                    ? 'dashboard.targets.monthlyTarget'
                    : 'dashboard.targets.annualTarget',
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={yearFilter}
          onChange={(e) => {
            setYearFilter(e.target.value);
            setPage(1);
          }}
          type="number"
          placeholder={t('dashboard.targets.yearPlaceholder')}
          className="rounded-none w-[120px] h-8 text-xs"
        />
        <Input
          value={departmentKeyword}
          onChange={(e) => {
            setDepartmentKeyword(e.target.value);
            setPage(1);
          }}
          placeholder={t('dashboard.targets.departmentPlaceholder')}
          className="rounded-none w-[160px] h-8 text-xs"
        />
        <div className="flex-1" />
        <Button className="rounded-none h-8" onClick={(): void => setCreating(true)}>
          <Plus className="size-3.5 mr-1" />
          {t('dashboard.targets.newTarget')}
        </Button>
      </div>
      <ReportCard>
        <Table
          columns={columns}
          dataSource={targets}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1000, y: 500 }}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total,
            onChange: (next: number): void => setPage(next),
          }}
        />
      </ReportCard>

      <DepartmentTargetFormDialog
        open={creating || editing !== null}
        editing={editing}
        onSaved={loadTargets}
        onOpenChange={(open: boolean): void => {
          if (!open) {
            setCreating(false);
            setEditing(null);
          }
        }}
      />

      <AdsConfirmDialog
        open={recalculating !== null}
        title={t('dashboard.targets.recalcTitle')}
        description={t('dashboard.targets.recalcDescription', {
          department: recalculating?.department ?? '',
        })}
        confirmText={t('dashboard.targets.recalcConfirm')}
        onOpenChange={(open: boolean): void => !open && setRecalculating(null)}
        onConfirm={(): Promise<void> => handleRecalculate()}
      />

      <AdsConfirmDialog
        open={deleting !== null}
        title={t('dashboard.targets.deleteTitle')}
        description={t('dashboard.targets.deleteDescription', {
          targetNo: deleting?.targetNo ?? '',
          department: deleting?.department ?? '',
        })}
        confirmText={t('common.confirmDelete')}
        destructive
        onOpenChange={(open: boolean): void => !open && setDeleting(null)}
        onConfirm={(): Promise<void> => handleDelete()}
      />
    </div>
  );
}
