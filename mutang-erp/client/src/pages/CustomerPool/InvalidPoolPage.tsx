import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
} from 'react';
import dayjs from 'dayjs';
import { Download, RotateCcw, Search } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Table } from '@lark-apaas/client-toolkit/antd-table';
import type { TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import { ColumnSettingsButton } from '@client/src/components/column-settings-button';
import { useColumnSettings } from '@client/src/hooks/useColumnSettings';
import { ReportCard, SectionHeader } from '@client/src/components/blueprint';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@client/src/components/ui/alert-dialog';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import type { PoolLead } from '@shared/api.interface';
import { fetchPoolLeads, restorePoolLead } from '@client/src/api/customer-pool';
import { PoolTabs } from './PoolTabs';
import { DatePickerButton } from './DatePickerButton';
import { exportPoolLeadsToExcel } from './pool-excel';
import {
  FILTER_ALL,
  INDUSTRY_OPTIONS,
  POOL_LEVEL_OPTIONS,
  PoolStatusBadge,
  toErrorText,
} from './constants';

const PAGE_SIZE: number = 20;

export default function InvalidPoolPage() {
  const [searchText, setSearchText] = useState<string>('');
  const [subjectName, setSubjectName] = useState<string>('');
  const [leadLevel, setLeadLevel] = useState<string>(FILTER_ALL);
  const [industry1, setIndustry1] = useState<string>(FILTER_ALL);
  const [startTime, setStartTime] = useState<Date | undefined>(undefined);
  const [endTime, setEndTime] = useState<Date | undefined>(undefined);
  const [page, setPage] = useState<number>(1);

  const [items, setItems] = useState<PoolLead[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [restoreTarget, setRestoreTarget] = useState<PoolLead | null>(null);

  useEffect(() => {
    const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
      setSubjectName(searchText.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchPoolLeads({
        status: '无效',
        subjectName: subjectName || undefined,
        leadLevel: leadLevel === FILTER_ALL ? undefined : leadLevel,
        industry1: industry1 === FILTER_ALL ? undefined : industry1,
        startTime: startTime
          ? dayjs(startTime).startOf('day').toISOString()
          : undefined,
        endTime: endTime ? dayjs(endTime).endOf('day').toISOString() : undefined,
        page,
        pageSize: PAGE_SIZE,
      });
      setItems(result.items);
      setTotal(result.total);
    } catch (error: unknown) {
      logger.error(`加载无效客资失败: ${toErrorText(error)}`);
      toast.error('加载无效客资失败');
    } finally {
      setLoading(false);
    }
  }, [subjectName, leadLevel, industry1, startTime, endTime, page]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const handleRestore = async (): Promise<void> => {
    if (!restoreTarget) return;
    try {
      await restorePoolLead(restoreTarget.id);
      toast.success(`已恢复「${restoreTarget.subjectName}」至公海`);
      setRestoreTarget(null);
      void loadList();
    } catch (error: unknown) {
      logger.error(`恢复失败: ${toErrorText(error)}`);
      toast.error(`恢复失败：${toErrorText(error)}`);
    }
  };

  const handleExport = async (): Promise<void> => {
    try {
      const result = await fetchPoolLeads({
        status: '无效',
        subjectName: subjectName || undefined,
        leadLevel: leadLevel === FILTER_ALL ? undefined : leadLevel,
        industry1: industry1 === FILTER_ALL ? undefined : industry1,
        startTime: startTime
          ? dayjs(startTime).startOf('day').toISOString()
          : undefined,
        endTime: endTime ? dayjs(endTime).endOf('day').toISOString() : undefined,
        page: 1,
        pageSize: 1000,
      });
      const count: number = await exportPoolLeadsToExcel(result.items);
      toast.success(`已导出 ${count} 条无效客资`);
    } catch (error: unknown) {
      logger.error(`导出失败: ${toErrorText(error)}`);
      toast.error(`导出失败：${toErrorText(error)}`);
    }
  };

  const columns: TableColumnsType<PoolLead> = useMemo(
    () => [
      {
        title: '主体名称',
        dataIndex: 'subjectName',
        fixed: 'left',
        width: 200,
        render: (value: string) => (
          <span className="font-bold text-primary">{value}</span>
        ),
      },
      { title: '客资分层', dataIndex: 'leadLevel', width: 90 },
      { title: '一级行业', dataIndex: 'industry1', width: 110 },
      { title: '二级行业', dataIndex: 'industry2', width: 110 },
      { title: '联系人', dataIndex: 'contactPerson', width: 100 },
      {
        title: '联系电话',
        dataIndex: 'contactPhone',
        width: 130,
        render: (value: string) => (
          <span className="font-mono">{value || '-'}</span>
        ),
      },
      {
        title: '状态',
        dataIndex: 'status',
        width: 80,
        render: (value: PoolLead['status']) => (
          <PoolStatusBadge status={value} />
        ),
      },
      {
        title: '调入时间',
        dataIndex: 'createdAt',
        width: 150,
        render: (value: string) => (
          <span className="font-mono text-xs">
            {dayjs(value).format('YYYY-MM-DD HH:mm')}
          </span>
        ),
      },
      { title: '备注', dataIndex: 'remark', width: 160 },
      {
        title: '操作',
        key: 'action',
        fixed: 'right',
        width: 100,
        render: (_: unknown, record: PoolLead) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRestoreTarget(record)}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            恢复
          </Button>
        ),
      },
    ],
    [],
  );

  const {
    visibleColumns, columnMetas, hiddenIds,
    toggleColumn, resetColumns, setAllColumns,
  } = useColumnSettings(columns);

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-8 px-8 py-8">
      <PoolTabs />
      <ReportCard>
        <SectionHeader
          no="01"
          label="INVALID POOL"
          subtitle="无效客资 / 筛选查询 / 恢复公海"
        />
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-56">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="rounded-none pl-8"
                placeholder="搜索主体名称"
                value={searchText}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setSearchText(event.target.value)
                }
              />
            </div>
            <Select
              value={leadLevel}
              onValueChange={(value: string) => {
                setLeadLevel(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-32 rounded-none">
                <SelectValue placeholder="客资分层" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={FILTER_ALL}>全部分层</SelectItem>
                {POOL_LEVEL_OPTIONS.map((option: string) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={industry1}
              onValueChange={(value: string) => {
                setIndustry1(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-32 rounded-none">
                <SelectValue placeholder="一级行业" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={FILTER_ALL}>全部行业</SelectItem>
                {INDUSTRY_OPTIONS.map((option: string) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">调入时间</span>
              <DatePickerButton
                value={startTime}
                onChange={(date: Date | undefined) => {
                  setStartTime(date);
                  setPage(1);
                }}
                placeholder="开始日期"
              />
              <span className="text-xs text-muted-foreground">至</span>
              <DatePickerButton
                value={endTime}
                onChange={(date: Date | undefined) => {
                  setEndTime(date);
                  setPage(1);
                }}
                placeholder="结束日期"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => void handleExport()}>
              <Download className="h-4 w-4" />
              导出Excel
            </Button>
            <ColumnSettingsButton
              columnMetas={columnMetas} hiddenIds={hiddenIds}
              onToggle={toggleColumn} onReset={resetColumns} onSetAll={setAllColumns}
            />
          </div>
        </div>
        <Table<PoolLead>
          columns={visibleColumns}
          dataSource={items}
          loading={loading}
          rowKey="id"
          scroll={{ x: 1300, y: 500 }}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total,
            onChange: (nextPage: number) => setPage(nextPage),
          }}
        />
      </ReportCard>
      <AlertDialog
        open={restoreTarget !== null}
        onOpenChange={(open: boolean) => {
          if (!open) setRestoreTarget(null);
        }}
      >
        <AlertDialogContent className="rounded-none">
          <AlertDialogHeader>
            <AlertDialogTitle>确认恢复？</AlertDialogTitle>
            <AlertDialogDescription>
              将把「{restoreTarget?.subjectName}」恢复至公海客资，状态重置为未分配。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleRestore()}>
              确认恢复
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
