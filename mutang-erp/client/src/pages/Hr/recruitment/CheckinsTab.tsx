import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Download, Plus, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Table, type TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import { ColumnSettingsButton } from '@client/src/components/column-settings-button';
import { useColumnSettings } from '@client/src/hooks/useColumnSettings';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import type { HrCheckin, HrCheckinListParams, HrCheckinStats } from '@shared/api.interface';
import {
  deleteCheckin, doCheckinAction, fetchCheckinList, fetchCheckinStats,
} from '@client/src/api/hr-enhance/recruitment';
import { AdsConfirmDialog } from '@client/src/pages/AdsBusiness/AdsConfirmDialog';
import { exportRowsToExcel } from '@client/src/pages/AdsBusiness/ads-excel';
import { CheckinsFormDialog } from './CheckinsFormDialog';
import {
  HR_CHECKIN_STATUS_OPTIONS, HR_CHECKIN_TYPE_OPTIONS, HR_FILTER_ALL,
} from '../hr-enhance-constants';
import { buildCheckinsColumns } from './CheckinsColumns';
import {
  RECRUIT_EXPORT_LIMIT, RECRUIT_PAGE_SIZE,
  RecruitFilterSelect, RecruitStatCard, isValidHrDate, reportRecruitError,
} from './recruitment-shared';

const EXPORT_HEADERS: string[] = [
  '签到编号', '候选人', '类型', '签到时间', '地点', '状态', '备注', '创建时间',
];

export function CheckinsTab() {
  const [type, setType] = useState<string>(HR_FILTER_ALL);
  const [status, setStatus] = useState<string>(HR_FILTER_ALL);
  const [dateStart, setDateStart] = useState<string>('');
  const [dateEnd, setDateEnd] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [items, setItems] = useState<HrCheckin[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [stats, setStats] = useState<HrCheckinStats | null>(null);
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [editing, setEditing] = useState<HrCheckin | null>(null);
  const [checkinTarget, setCheckinTarget] = useState<HrCheckin | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HrCheckin | null>(null);

  const filterParams = useMemo((): HrCheckinListParams => ({
    type: type === HR_FILTER_ALL ? undefined : type,
    status: status === HR_FILTER_ALL ? undefined : status,
    dateStart: dateStart.trim() || undefined,
    dateEnd: dateEnd.trim() || undefined,
  }), [type, status, dateStart, dateEnd]);

  const loadStats = useCallback(async () => {
    try {
      setStats(await fetchCheckinStats());
    } catch (error: unknown) {
      reportRecruitError('加载签到统计失败', error);
    }
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchCheckinList({
        ...filterParams,
        page: String(page),
        pageSize: String(RECRUIT_PAGE_SIZE),
      });
      setItems(result.items);
      setTotal(result.total);
    } catch (error: unknown) {
      reportRecruitError('加载签到列表失败', error);
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
    setType(HR_FILTER_ALL);
    setStatus(HR_FILTER_ALL);
    setDateStart('');
    setDateEnd('');
    setPage(1);
  };

  const handleFilterChange = (setter: (value: string) => void): ((value: string) => void) => (
    (value: string) => { setter(value); setPage(1); }
  );

  const handleCheckin = async (): Promise<void> => {
    if (!checkinTarget) return;
    try {
      await doCheckinAction(
        checkinTarget.id,
        checkinTarget.location || undefined,
      );
      toast.success(`「${checkinTarget.candidateName}」签到成功`);
      setCheckinTarget(null);
      refresh();
    } catch (error: unknown) {
      reportRecruitError('签到失败', error);
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!deleteTarget) return;
    try {
      await deleteCheckin(deleteTarget.id);
      toast.success('签到记录已删除');
      setDeleteTarget(null);
      refresh();
    } catch (error: unknown) {
      reportRecruitError('删除签到记录失败', error);
    }
  };

  const handleExport = async (): Promise<void> => {
    try {
      const result = await fetchCheckinList({
        ...filterParams, page: '1', pageSize: String(RECRUIT_EXPORT_LIMIT),
      });
      const rows: Record<string, string>[] = result.items.map((item: HrCheckin) => ({
        签到编号: item.checkinNo,
        候选人: item.candidateName,
        类型: item.type,
        签到时间: item.checkinTime ?? '',
        地点: item.location,
        状态: item.status,
        备注: item.remark,
        创建时间: dayjs(item.createdAt).format('YYYY-MM-DD HH:mm:ss'),
      }));
      const count: number = await exportRowsToExcel(rows, EXPORT_HEADERS, '签到管理', '签到管理');
      toast.success(`已导出 ${count} 条签到记录`);
    } catch (error: unknown) {
      reportRecruitError('导出签到记录失败', error);
    }
  };

  const columns = useMemo(
    (): TableColumnsType<HrCheckin> => buildCheckinsColumns({
      onEdit: (record: HrCheckin) => { setEditing(record); setFormOpen(true); },
      onCheckin: (record: HrCheckin) => setCheckinTarget(record),
      onDelete: (record: HrCheckin) => setDeleteTarget(record),
    }),
    [],
  );

  const {
    visibleColumns, columnMetas, hiddenIds,
    toggleColumn, resetColumns, setAllColumns,
  } = useColumnSettings(columns);

  const dateStartInvalid: boolean = !isValidHrDate(dateStart.trim());
  const dateEndInvalid: boolean = !isValidHrDate(dateEnd.trim());

  return (
    <div>
      {/* 统计卡 */}
      <div data-ai-section-type="card-stat" className="mb-4 flex flex-wrap gap-4">
        <RecruitStatCard label="签到总数" value={stats ? String(stats.total) : '—'} />
        <RecruitStatCard label="已签到" value={stats ? String(stats.checkedIn) : '—'} />
        <RecruitStatCard label="未签到" value={stats ? String(stats.notCheckedIn) : '—'} />
        <RecruitStatCard label="迟到" value={stats ? String(stats.late) : '—'} />
      </div>
      {/* 筛选区 */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <RecruitFilterSelect
          value={type} placeholder="类型" allLabel="全部类型"
          options={HR_CHECKIN_TYPE_OPTIONS}
          onChange={handleFilterChange(setType)}
        />
        <RecruitFilterSelect
          value={status} placeholder="状态" allLabel="全部状态"
          options={HR_CHECKIN_STATUS_OPTIONS}
          onChange={handleFilterChange(setStatus)}
        />
        <Input
          className="w-36 rounded-none"
          placeholder="开始日期 YYYY-MM-DD"
          value={dateStart}
          onChange={(event) => { setDateStart(event.target.value); setPage(1); }}
        />
        <Input
          className="w-36 rounded-none"
          placeholder="结束日期 YYYY-MM-DD"
          value={dateEnd}
          onChange={(event) => { setDateEnd(event.target.value); setPage(1); }}
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
          新建签到记录
        </Button>
        <Button
          variant="outline"
          disabled={dateStartInvalid || dateEndInvalid}
          onClick={() => {
            if (dateStartInvalid || dateEndInvalid) {
              toast.error('日期格式须为 YYYY-MM-DD');
              return;
            }
            void handleExport();
          }}
        >
          <Download className="h-4 w-4" />
          导出Excel
        </Button>
        <ColumnSettingsButton
          columnMetas={columnMetas} hiddenIds={hiddenIds}
          onToggle={toggleColumn} onReset={resetColumns} onSetAll={setAllColumns}
        />
      </div>
      {/* 表格 */}
      <Table<HrCheckin>
        columns={visibleColumns}
        dataSource={items}
        loading={loading}
        rowKey="id"
        scroll={{ x: 1400, y: 500 }}
        pagination={{
          current: page,
          pageSize: RECRUIT_PAGE_SIZE,
          total,
          onChange: (nextPage: number) => setPage(nextPage),
        }}
      />
      <CheckinsFormDialog
        open={formOpen}
        editing={editing}
        onSaved={refresh}
        onOpenChange={(open: boolean) => {
          setFormOpen(open);
          if (!open) setEditing(null);
        }}
      />
      <AdsConfirmDialog
        open={checkinTarget !== null}
        title="确认签到？"
        description={checkinTarget
          ? `即将为「${checkinTarget.candidateName}」执行签到（${checkinTarget.checkinNo}）。`
          : ''}
        confirmText="签到"
        onOpenChange={(open: boolean) => {
          if (!open) setCheckinTarget(null);
        }}
        onConfirm={() => void handleCheckin()}
      />
      <AdsConfirmDialog
        open={deleteTarget !== null}
        title="删除签到记录？"
        description={deleteTarget
          ? `即将删除「${deleteTarget.candidateName}」的签到记录（${deleteTarget.checkinNo}），删除后不可恢复。`
          : ''}
        confirmText="删除"
        destructive
        onOpenChange={(open: boolean) => {
          if (!open) setDeleteTarget(null);
        }}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}
