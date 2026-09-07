import dayjs from 'dayjs';
import { Button } from '@client/src/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@client/src/components/ui/select';
import type { TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import type { HrAttendance, HrAttendanceStats } from '@shared/api.interface';
import { HR_FILTER_ALL, HrStatusBadge } from '../hr-enhance-constants';

/* ============ 常量 ============ */

export const ATTENDANCE_PAGE_SIZE: number = 10;
export const ATTENDANCE_EXPORT_LIMIT: number = 200;

export const ATTENDANCE_EXPORT_HEADERS: string[] = [
  '考勤编号', '员工', '部门', '考勤日期', '签到时间', '签退时间', '状态',
  '请假类型', '请假时长(h)', '加班时长(h)', '备注',
];

export function buildAttendanceExportRows(
  items: HrAttendance[],
): Record<string, string>[] {
  return items.map((item: HrAttendance) => ({
    考勤编号: item.attendanceNo,
    员工: item.employeeName,
    部门: item.department,
    考勤日期: dayjs(item.attendanceDate).format('YYYY-MM-DD'),
    签到时间: item.checkInTime
      ? dayjs(item.checkInTime).format('YYYY-MM-DD HH:mm:ss') : '',
    签退时间: item.checkOutTime
      ? dayjs(item.checkOutTime).format('YYYY-MM-DD HH:mm:ss') : '',
    状态: item.status,
    请假类型: item.leaveType,
    请假时长h: item.leaveHours,
    加班时长h: item.overtimeHours,
    备注: item.remark,
  }));
}

/* ============ 行内操作链接 ============ */

export function AttendanceActionLink({ danger, onClick, children }: {
  danger?: boolean; onClick: () => void; children: string;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={`h-auto px-1 text-xs ${danger ? 'text-destructive' : 'text-primary'}`}
    >
      {children}
    </Button>
  );
}

/* ============ 筛选下拉（带「全部」选项） ============ */

export function AttendanceFilterSelect({
  value, placeholder, options, allLabel, onChange,
}: {
  value: string;
  placeholder: string;
  options: string[];
  allLabel: string;
  onChange: (value: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-32 rounded-none">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={HR_FILTER_ALL}>{allLabel}</SelectItem>
        {options.map((option: string) => (
          <SelectItem key={option} value={option}>{option}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/* ============ 统计卡：零圆角 + 3px 顶边线蓝图规格 ============ */

export function AttendanceStatCard({ label, value }: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-none border border-border border-t-[3px] border-t-primary bg-card p-4 shadow-md">
      <div className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 font-mono text-xl font-bold text-foreground">
        {value}
      </div>
    </div>
  );
}

/* ============ 统计卡行：随筛选联动 ============ */

export function AttendanceStatsRow({ stats }: { stats: HrAttendanceStats | null }) {
  const statValue = (value: number | undefined): string =>
    value === undefined ? '—' : String(value);
  const hoursValue = (value: string | undefined): string =>
    value === undefined ? '—' : `${Number(value)} h`;
  return (
    <div
      data-ai-section-type="card-stat"
      className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-8"
    >
      <AttendanceStatCard label="出勤正常" value={statValue(stats?.normalCount)} />
      <AttendanceStatCard label="迟到" value={statValue(stats?.lateCount)} />
      <AttendanceStatCard label="早退" value={statValue(stats?.earlyLeaveCount)} />
      <AttendanceStatCard label="缺勤" value={statValue(stats?.absentCount)} />
      <AttendanceStatCard label="请假" value={statValue(stats?.leaveCount)} />
      <AttendanceStatCard label="加班" value={statValue(stats?.overtimeCount)} />
      <AttendanceStatCard label="累计请假时长" value={hoursValue(stats?.leaveHours)} />
      <AttendanceStatCard label="累计加班时长" value={hoursValue(stats?.overtimeHours)} />
    </div>
  );
}

/* ============ 表格列定义 ============ */

export interface AttendanceColumnHandlers {
  onCheckIn: (record: HrAttendance) => void;
  onCheckOut: (record: HrAttendance) => void;
  onLeave: (record: HrAttendance) => void;
  onApprove: (record: HrAttendance) => void;
  onReject: (record: HrAttendance) => void;
  onOvertime: (record: HrAttendance) => void;
  onEdit: (record: HrAttendance) => void;
  onDelete: (record: HrAttendance) => void;
}

export function buildAttendanceColumns(
  handlers: AttendanceColumnHandlers,
): TableColumnsType<HrAttendance> {
  return [
    {
      key: 'hr-attendances-no', title: '考勤编号', dataIndex: 'attendanceNo',
      width: 150, fixed: 'left',
      render: (value: string) => <span className="font-bold text-primary">{value}</span>,
    },
    { key: 'hr-attendances-employee', title: '员工', dataIndex: 'employeeName', width: 100 },
    { key: 'hr-attendances-department', title: '部门', dataIndex: 'department', width: 110 },
    {
      key: 'hr-attendances-date', title: '考勤日期', dataIndex: 'attendanceDate', width: 110,
      render: (value: string) => dayjs(value).format('YYYY-MM-DD'),
    },
    {
      key: 'hr-attendances-checkin', title: '签到时间', dataIndex: 'checkInTime', width: 160,
      render: (value: string) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '—'),
    },
    {
      key: 'hr-attendances-checkout', title: '签退时间', dataIndex: 'checkOutTime', width: 160,
      render: (value: string) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '—'),
    },
    {
      key: 'hr-attendances-status', title: '状态', dataIndex: 'status', width: 90,
      render: (value: string) => <HrStatusBadge status={value} />,
    },
    {
      key: 'hr-attendances-leavetype', title: '请假类型', dataIndex: 'leaveType', width: 90,
      render: (value: string) => value || '—',
    },
    {
      key: 'hr-attendances-leavehours', title: '请假时长', dataIndex: 'leaveHours',
      width: 90, align: 'right',
      render: (value: string) => (
        <span className="font-mono">{value ? `${value} h` : '—'}</span>
      ),
    },
    {
      key: 'hr-attendances-overtimehours', title: '加班时长', dataIndex: 'overtimeHours',
      width: 90, align: 'right',
      render: (value: string) => (
        <span className="font-mono">{value ? `${value} h` : '—'}</span>
      ),
    },
    {
      key: 'hr-attendances-remark', title: '备注', dataIndex: 'remark', width: 140,
      render: (value: string) => value || '—',
    },
    {
      key: 'hr-attendances-actions', title: '操作', width: 290, fixed: 'right',
      render: (_: unknown, record: HrAttendance) => (
        <div className="flex flex-wrap items-center gap-1">
          {!record.checkInTime ? (
            <AttendanceActionLink onClick={() => handlers.onCheckIn(record)}>
              签到
            </AttendanceActionLink>
          ) : null}
          {!record.checkOutTime ? (
            <AttendanceActionLink onClick={() => handlers.onCheckOut(record)}>
              签退
            </AttendanceActionLink>
          ) : null}
          <AttendanceActionLink onClick={() => handlers.onLeave(record)}>
            请假
          </AttendanceActionLink>
          {record.status === '请假' ? (
            <>
              <AttendanceActionLink onClick={() => handlers.onApprove(record)}>
                审批
              </AttendanceActionLink>
              <AttendanceActionLink onClick={() => handlers.onReject(record)}>
                驳回
              </AttendanceActionLink>
            </>
          ) : null}
          <AttendanceActionLink onClick={() => handlers.onOvertime(record)}>
            加班
          </AttendanceActionLink>
          <AttendanceActionLink onClick={() => handlers.onEdit(record)}>
            编辑
          </AttendanceActionLink>
          <AttendanceActionLink danger onClick={() => handlers.onDelete(record)}>
            删除
          </AttendanceActionLink>
        </div>
      ),
    },
  ];
}
