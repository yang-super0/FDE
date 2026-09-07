import { useCallback, useEffect, useState } from 'react';
import {
  Table,
  type TableColumnsType,
} from '@lark-apaas/client-toolkit/antd-table';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import { CalendarIcon } from 'lucide-react';
import { hrApi } from '@client/src/api';
import { ReportCard, StatusBadge } from '@client/src/components/blueprint';
import type { StatusTone } from '@client/src/components/blueprint';
import { Button } from '@client/src/components/ui/button';
import { Calendar } from '@client/src/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@client/src/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import type {
  AttendanceRecord,
  AttendanceStatus,
  PageResult,
} from '@shared/api.interface';
import { useDepartments } from './useDepartments';

const STATUS_META: Record<AttendanceStatus, { label: string; tone: StatusTone }> = {
  normal: { label: '正常', tone: 'success' },
  late: { label: '迟到', tone: 'warning' },
  early: { label: '早退', tone: 'warning' },
  absent: { label: '旷工', tone: 'danger' },
};

const ALL_DEPARTMENT_VALUE = 'all';

interface DateFilterProps {
  label: string;
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
}

const DateFilter = ({ label, value, onChange }: DateFilterProps) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-40 justify-start rounded-none font-normal"
        >
          <CalendarIcon className="size-4" />
          {value ? dayjs(value).format('YYYY-MM-DD') : label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={value} onSelect={onChange} />
      </PopoverContent>
    </Popover>
  );
};

export const AttendanceSection = () => {
  const { options } = useDepartments();
  const [departmentId, setDepartmentId] = useState<string>(ALL_DEPARTMENT_VALUE);
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [result, setResult] = useState<PageResult<AttendanceRecord> | null>(null);
  const [tableLoading, setTableLoading] = useState<boolean>(false);

  const fetchAttendances = useCallback(async (): Promise<void> => {
    setTableLoading(true);
    try {
      const res: PageResult<AttendanceRecord> = await hrApi.listAttendances({
        departmentId:
          departmentId === ALL_DEPARTMENT_VALUE ? undefined : departmentId,
        dateFrom: dateFrom ? dateFrom.toISOString() : undefined,
        dateTo: dateTo ? dateTo.toISOString() : undefined,
        page,
        pageSize,
      });
      setResult(res);
    } catch (error) {
      logger.error('加载考勤记录失败:', error);
      toast.error('加载考勤记录失败');
    } finally {
      setTableLoading(false);
    }
  }, [departmentId, dateFrom, dateTo, page, pageSize]);

  useEffect(() => {
    void fetchAttendances();
  }, [fetchAttendances]);

  const columns: TableColumnsType<AttendanceRecord> = [
    {
      title: '员工',
      dataIndex: 'employeeName',
      width: 140,
      fixed: 'left',
      render: (name: string) => (
        <span className="font-bold text-primary">{name || '—'}</span>
      ),
    },
    { title: '部门', dataIndex: 'departmentName', width: 180 },
    {
      title: '日期',
      dataIndex: 'attendDate',
      width: 130,
      render: (value: string) => dayjs(value).format('YYYY-MM-DD'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (status: AttendanceStatus) => {
        const meta = STATUS_META[status] ?? STATUS_META.normal;
        return <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>;
      },
    },
  ];

  return (
    <ReportCard>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-[11px] font-black uppercase tracking-[0.15em] text-primary">
          考勤看板
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={departmentId}
            onValueChange={(value: string) => {
              setDepartmentId(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-44 rounded-none">
              <SelectValue placeholder="选择部门" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_DEPARTMENT_VALUE}>全部部门</SelectItem>
              {options.map((dept) => (
                <SelectItem key={dept.id} value={dept.id}>
                  {dept.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DateFilter
            label="开始日期"
            value={dateFrom}
            onChange={(date) => {
              setDateFrom(date);
              setPage(1);
            }}
          />
          <DateFilter
            label="结束日期"
            value={dateTo}
            onChange={(date) => {
              setDateTo(date);
              setPage(1);
            }}
          />
        </div>
      </div>
      <Table<AttendanceRecord>
        columns={columns}
        dataSource={result?.items ?? []}
        loading={tableLoading}
        rowKey="id"
        scroll={{ x: 600, y: 500 }}
        pagination={{
          current: page,
          pageSize,
          total: result?.total ?? 0,
          showSizeChanger: true,
          onChange: (nextPage: number, nextPageSize: number) => {
            setPage(nextPage);
            setPageSize(nextPageSize);
          },
        }}
      />
    </ReportCard>
  );
};
