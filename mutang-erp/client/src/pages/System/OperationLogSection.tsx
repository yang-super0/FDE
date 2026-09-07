import { useCallback, useEffect, useState } from 'react';
import {
  Table,
  type TableColumnsType,
} from '@lark-apaas/client-toolkit/antd-table';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import { CalendarIcon } from 'lucide-react';
import dayjs from 'dayjs';
import type {
  OperationLogListParams,
  OperationLogRecord,
} from '@shared/api.interface';
import { ReportCard, StatusBadge } from '@client/src/components/blueprint';
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
import { operationLogApi } from '@client/src/api';

const PAGE_SIZE = 10;

const ACTION_TYPE_LABEL: Record<string, string> = {
  create: '创建',
  update: '更新',
  delete: '删除',
  approve: '审批',
  status_change: '状态变更',
};

interface DateFilterProps {
  placeholder: string;
  value: Date | undefined;
  onChange: (value: Date | undefined) => void;
}

const DateFilter = ({ placeholder, value, onChange }: DateFilterProps) => (
  <Popover>
    <PopoverTrigger asChild>
      <Button
        variant="outline"
        size="sm"
        className="w-36 justify-start font-normal text-muted-foreground"
      >
        <CalendarIcon className="h-3.5 w-3.5" />
        {value ? dayjs(value).format('YYYY-MM-DD') : placeholder}
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-auto rounded-none p-0" align="start">
      <Calendar
        mode="single"
        selected={value}
        onSelect={(date: Date | undefined) => onChange(date)}
        initialFocus
      />
    </PopoverContent>
  </Popover>
);

export function OperationLogSection() {
  const [logs, setLogs] = useState<OperationLogRecord[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [actionType, setActionType] = useState<string>('all');
  const [from, setFrom] = useState<Date | undefined>(undefined);
  const [to, setTo] = useState<Date | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(true);

  const loadLogs = useCallback(
    async (
      pageToLoad: number,
      type: string,
      fromDate: Date | undefined,
      toDate: Date | undefined,
    ) => {
      setLoading(true);
      try {
        const toEnd: Date | undefined = toDate
          ? new Date(new Date(toDate).setHours(23, 59, 59, 999))
          : undefined;
        const params: OperationLogListParams = {
          page: pageToLoad,
          pageSize: PAGE_SIZE,
          actionType: type === 'all' ? undefined : type,
          from: fromDate ? fromDate.toISOString() : undefined,
          to: toEnd ? toEnd.toISOString() : undefined,
        };
        const res = await operationLogApi.listOperationLogs(params);
        setLogs(res.items);
        setTotal(res.total);
      } catch (error) {
        logger.error('加载操作日志失败', error);
        toast.error('加载操作日志失败');
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    loadLogs(page, actionType, from, to);
  }, [page, actionType, from, to, loadLogs]);

  const handleTypeChange = (value: string) => {
    setActionType(value);
    setPage(1);
  };

  const handleFromChange = (date: Date | undefined) => {
    setFrom(date);
    setPage(1);
  };

  const handleToChange = (date: Date | undefined) => {
    setTo(date);
    setPage(1);
  };

  const columns: TableColumnsType<OperationLogRecord> = [
    {
      title: '操作人',
      dataIndex: 'operatorName',
      width: 140,
      render: (name: string) => (
        <span className="font-bold text-primary">{name || '-'}</span>
      ),
    },
    {
      title: '类型',
      dataIndex: 'actionType',
      width: 110,
      render: (type: string) => (
        <StatusBadge tone="info">
          {ACTION_TYPE_LABEL[type] ?? type}
        </StatusBadge>
      ),
    },
    { title: '模块', dataIndex: 'module', width: 140 },
    { title: '对象', dataIndex: 'target' },
    {
      title: '时间',
      dataIndex: 'createdAt',
      width: 170,
      render: (value: string) => (
        <span className="font-mono text-xs">
          {dayjs(value).format('YYYY-MM-DD HH:mm')}
        </span>
      ),
    },
  ];

  return (
    <ReportCard>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-black uppercase tracking-[0.15em] text-foreground">
            操作日志
          </div>
          <div className="mt-0.5 text-[10px] text-muted-foreground">
            记录各模块的关键操作轨迹
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={actionType} onValueChange={handleTypeChange}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="操作类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类型</SelectItem>
              {Object.entries(ACTION_TYPE_LABEL).map(
                ([value, label]: [string, string]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
          <DateFilter
            placeholder="开始日期"
            value={from}
            onChange={handleFromChange}
          />
          <DateFilter placeholder="结束日期" value={to} onChange={handleToChange} />
          {from || to ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFrom(undefined);
                setTo(undefined);
                setPage(1);
              }}
            >
              清除
            </Button>
          ) : null}
        </div>
      </div>
      <Table
        columns={columns}
        dataSource={logs}
        rowKey="id"
        loading={loading}
        scroll={{ x: 800 }}
        pagination={{
          current: page,
          pageSize: PAGE_SIZE,
          total,
          showSizeChanger: false,
          onChange: (nextPage: number) => setPage(nextPage),
        }}
      />
    </ReportCard>
  );
}
