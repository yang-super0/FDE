import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Download, Plus, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Table } from '@lark-apaas/client-toolkit/antd-table';
import { ColumnSettingsButton } from '@client/src/components/column-settings-button';
import { useColumnSettings } from '@client/src/hooks/useColumnSettings';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import type {
  HrAttendance, HrAttendanceListParams, HrAttendanceStats,
} from '@shared/api.interface';
import {
  approveHrAttendanceLeave, checkInHrAttendance, checkOutHrAttendance,
  deleteHrAttendance, fetchHrAttendanceStats, fetchHrAttendances,
} from '@client/src/api/hr-enhance/attendance';
import { AdsConfirmDialog } from '@client/src/pages/AdsBusiness/AdsConfirmDialog';
import { exportRowsToExcel } from '@client/src/pages/AdsBusiness/ads-excel';
import {
  HR_ATTENDANCE_STATUS_OPTIONS, HR_FILTER_ALL, toHrErrorText,
} from '../hr-enhance-constants';
import { AttendanceFormDialog } from './AttendanceFormDialog';
import { LeaveApplyDialog, LeaveRejectDialog } from './LeaveDialogs';
import { OvertimeDialog } from './OvertimeDialog';
import {
  ATTENDANCE_EXPORT_HEADERS, ATTENDANCE_EXPORT_LIMIT, ATTENDANCE_PAGE_SIZE,
  AttendanceFilterSelect, AttendanceStatsRow, buildAttendanceColumns,
  buildAttendanceExportRows,
} from './attendance-shared';

type AttendanceConfirmAction = 'approve' | 'delete';

interface PendingAttendanceAction {
  item: HrAttendance;
  action: AttendanceConfirmAction;
}

const CONFIRM_ACTION_TEXT: Record<AttendanceConfirmAction, string> = {
  approve: '审批通过', delete: '删除',
};

export function AttendanceTab() {
  const [month, setMonth] = useState<string>(dayjs().format('YYYY-MM'));
  const [draftDepartment, setDraftDepartment] = useState<string>('');
  const [department, setDepartment] = useState<string>('');
  const [draftEmployee, setDraftEmployee] = useState<string>('');
  const [employeeName, setEmployeeName] = useState<string>('');
  const [status, setStatus] = useState<string>(HR_FILTER_ALL);
  const [page, setPage] = useState<number>(1);
  const [items, setItems] = useState<HrAttendance[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [stats, setStats] = useState<HrAttendanceStats | null>(null);
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [editing, setEditing] = useState<HrAttendance | null>(null);
  const [leaveTarget, setLeaveTarget] = useState<HrAttendance | null>(null);
  const [rejectTarget, setRejectTarget] = useState<HrAttendance | null>(null);
  const [overtimeTarget, setOvertimeTarget] = useState<HrAttendance | null>(null);
  const [pending, setPending] = useState<PendingAttendanceAction | null>(null);

  useEffect(() => {
    const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
      setDepartment(draftDepartment.trim());
      setEmployeeName(draftEmployee.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [draftDepartment, draftEmployee]);

  const filterParams = useMemo((): HrAttendanceListParams => ({
    month: month.trim() || undefined,
    department: department || undefined,
    employeeName: employeeName || undefined,
    status: status === HR_FILTER_ALL ? undefined : status,
  }), [month, department, employeeName, status]);

  const statsParams = useMemo((): { month?: string; department?: string } => ({
    month: month.trim() || undefined,
    department: department || undefined,
  }), [month, department]);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchHrAttendances({
        ...filterParams, page: String(page), pageSize: String(ATTENDANCE_PAGE_SIZE),
      });
      setItems(result.items);
      setTotal(result.total);
    } catch (error: unknown) {
      toast.error(toHrErrorText(error));
    } finally {
      setLoading(false);
    }
  }, [filterParams, page]);

  const loadStats = useCallback(async () => {
    try {
      const result = await fetchHrAttendanceStats(statsParams);
      setStats(result);
    } catch (error: unknown) {
      toast.error(toHrErrorText(error));
    }
  }, [statsParams]);

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
    setMonth(dayjs().format('YYYY-MM'));
    setDraftDepartment('');
    setDepartment('');
    setDraftEmployee('');
    setEmployeeName('');
    setStatus(HR_FILTER_ALL);
    setPage(1);
  };

  const handleCheckIn = async (record: HrAttendance): Promise<void> => {
    try {
      await checkInHrAttendance(record.id, {});
      toast.success('签到成功');
      refresh();
    } catch (error: unknown) {
      toast.error(toHrErrorText(error));
    }
  };

  const handleCheckOut = async (record: HrAttendance): Promise<void> => {
    try {
      await checkOutHrAttendance(record.id, {});
      toast.success('签退成功');
      refresh();
    } catch (error: unknown) {
      toast.error(toHrErrorText(error));
    }
  };

  const handlePending = async (): Promise<void> => {
    if (!pending) return;
    try {
      if (pending.action === 'approve') {
        await approveHrAttendanceLeave(pending.item.id);
        toast.success('请假已审批通过');
      } else {
        await deleteHrAttendance(pending.item.id);
        toast.success('考勤记录已删除');
      }
      setPending(null);
      refresh();
    } catch (error: unknown) {
      toast.error(toHrErrorText(error));
    }
  };

  const handleExport = async (): Promise<void> => {
    try {
      const result = await fetchHrAttendances({
        ...filterParams, page: '1', pageSize: String(ATTENDANCE_EXPORT_LIMIT),
      });
      const count: number = await exportRowsToExcel(
        buildAttendanceExportRows(result.items),
        ATTENDANCE_EXPORT_HEADERS, '考勤管理', '考勤管理',
      );
      toast.success(`已导出 ${count} 条考勤记录`);
    } catch (error: unknown) {
      toast.error(toHrErrorText(error));
    }
  };

  const columns = buildAttendanceColumns({
    onCheckIn: (record: HrAttendance) => void handleCheckIn(record),
    onCheckOut: (record: HrAttendance) => void handleCheckOut(record),
    onLeave: (record: HrAttendance) => setLeaveTarget(record),
    onApprove: (record: HrAttendance) => setPending({ item: record, action: 'approve' }),
    onReject: (record: HrAttendance) => setRejectTarget(record),
    onOvertime: (record: HrAttendance) => setOvertimeTarget(record),
    onEdit: (record: HrAttendance) => { setEditing(record); setFormOpen(true); },
    onDelete: (record: HrAttendance) => setPending({ item: record, action: 'delete' }),  });

  const {
    visibleColumns, columnMetas, hiddenIds,
    toggleColumn, resetColumns, setAllColumns,
  } = useColumnSettings(columns);

  return (
    <div>
      <AttendanceStatsRow stats={stats} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          className="w-32 rounded-none" placeholder="YYYY-MM" value={month}
          onChange={(event) => { setMonth(event.target.value); setPage(1); }}
        />
        <Input
          className="w-36 rounded-none" placeholder="部门" value={draftDepartment}
          onChange={(event) => setDraftDepartment(event.target.value)}
        />
        <Input
          className="w-32 rounded-none" placeholder="员工" value={draftEmployee}
          onChange={(event) => setDraftEmployee(event.target.value)}
        />
        <AttendanceFilterSelect
          value={status}
          placeholder="状态"
          allLabel="全部状态"
          options={HR_ATTENDANCE_STATUS_OPTIONS}
          onChange={(value: string) => { setStatus(value); setPage(1); }}
        />
        <Button variant="ghost" size="sm" className="rounded-none" onClick={handleReset}>
          <RotateCcw className="h-3.5 w-3.5" />
          重置
        </Button>
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button data-ai-section-type="button" onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4" />
          新建考勤记录
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
      <Table<HrAttendance>
        columns={visibleColumns}
        dataSource={items}
        loading={loading}
        rowKey="id"
        scroll={{ x: 1700, y: 500 }}
        pagination={{
          current: page,
          pageSize: ATTENDANCE_PAGE_SIZE,
          total,
          onChange: (nextPage: number) => setPage(nextPage),
        }}
      />
      <AttendanceFormDialog
        open={formOpen}
        editing={editing}
        onSaved={refresh}
        onOpenChange={(open: boolean) => {
          setFormOpen(open);
          if (!open) setEditing(null);
        }}
      />
      <LeaveApplyDialog
        target={leaveTarget}
        onSaved={refresh}
        onOpenChange={(open: boolean) => {
          if (!open) setLeaveTarget(null);
        }}
      />
      <LeaveRejectDialog
        target={rejectTarget}
        onSaved={refresh}
        onOpenChange={(open: boolean) => {
          if (!open) setRejectTarget(null);
        }}
      />
      <OvertimeDialog
        target={overtimeTarget}
        onSaved={refresh}
        onOpenChange={(open: boolean) => {
          if (!open) setOvertimeTarget(null);
        }}
      />
      <AdsConfirmDialog
        open={pending !== null}
        title={pending ? `${CONFIRM_ACTION_TEXT[pending.action]}？` : ''}
        description={pending
          ? pending.action === 'approve'
            ? `即将通过「${pending.item.employeeName}」${pending.item.attendanceDate} 的请假申请。`
            : `即将删除考勤记录「${pending.item.attendanceNo}」，删除后不可恢复。`
          : ''}
        confirmText={pending ? CONFIRM_ACTION_TEXT[pending.action] : '确认'}
        destructive={pending?.action === 'delete'}
        onOpenChange={(open: boolean) => {
          if (!open) setPending(null);
        }}
        onConfirm={() => void handlePending()}
      />
    </div>
  );
}
