import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Table } from '@lark-apaas/client-toolkit/antd-table';
import type { TableProps } from '@lark-apaas/client-toolkit/antd-table';
import type {
  FinanceMonthlyTrendItem,
  FinanceRecord,
  FinanceRecordType,
  FinanceRelatedType,
  FinanceSummary,
} from '@shared/api.interface';
import {
  deleteFinanceRecord,
  getFinanceMonthlyTrend,
  getFinanceRecords,
  getFinanceSummary,
} from '@client/src/api/finance';
import {
  GradientHeader,
  ReportCard,
  SectionHeader,
} from '@client/src/components/blueprint';
import { Badge } from '@client/src/components/ui/badge';
import { Button } from '@client/src/components/ui/button';
import { Skeleton } from '@client/src/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@client/src/components/ui/alert-dialog';
import { cn } from '@client/src/lib/utils';
import { FinanceSummaryCards, formatAmount } from './FinanceSummaryCards';
import { FinanceRecordDialog } from './FinanceRecordDialog';
import { FinanceTrendChart } from './FinanceTrendChart';

const RELATED_TYPE_LABELS: Record<FinanceRelatedType, string> = {
  contract: '合同',
  campaign: '投放项目',
  other: '其他',
};

type TypeFilter = 'all' | FinanceRecordType;

const Finance = () => {
  const [month, setMonth] = useState<string>(dayjs().format('YYYY-MM'));
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);

  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState<boolean>(true);
  const [records, setRecords] = useState<FinanceRecord[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [listLoading, setListLoading] = useState<boolean>(true);
  const [trend, setTrend] = useState<FinanceMonthlyTrendItem[]>([]);
  const [trendLoading, setTrendLoading] = useState<boolean>(true);

  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [editing, setEditing] = useState<FinanceRecord | null>(null);
  const [deleting, setDeleting] = useState<FinanceRecord | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);

  const monthOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [];
    const now = dayjs();
    for (let i = 0; i < 12; i += 1) {
      const current = now.subtract(i, 'month');
      options.push({
        value: current.format('YYYY-MM'),
        label: current.format('YYYY年M月'),
      });
    }
    return options;
  }, []);

  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const res = await getFinanceSummary(month);
      setSummary(res.data);
    } catch (error) {
      logger.error('获取财务汇总失败', error);
      toast.error('获取财务汇总失败');
    } finally {
      setSummaryLoading(false);
    }
  }, [month]);

  const fetchList = useCallback(async () => {
    setListLoading(true);
    try {
      const res = await getFinanceRecords({
        month,
        type: typeFilter === 'all' ? undefined : typeFilter,
        page,
        pageSize,
      });
      setRecords(res.data.items);
      setTotal(res.data.total);
    } catch (error) {
      logger.error('获取收支记录失败', error);
      toast.error('获取收支记录失败');
      setRecords([]);
      setTotal(0);
    } finally {
      setListLoading(false);
    }
  }, [month, typeFilter, page, pageSize]);

  const fetchTrend = useCallback(async () => {
    setTrendLoading(true);
    try {
      const res = await getFinanceMonthlyTrend();
      setTrend(res.data.items);
    } catch (error) {
      logger.error('获取月度趋势失败', error);
      toast.error('获取月度趋势失败');
      setTrend([]);
    } finally {
      setTrendLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    fetchTrend();
  }, [fetchTrend]);

  const refreshAll = useCallback((): void => {
    fetchSummary();
    fetchList();
    fetchTrend();
  }, [fetchSummary, fetchList, fetchTrend]);

  const handleMonthChange = (value: string): void => {
    setMonth(value);
    setPage(1);
  };

  const handleTypeChange = (value: string): void => {
    const next: TypeFilter =
      value === 'income' || value === 'expense' ? value : 'all';
    setTypeFilter(next);
    setPage(1);
  };

  const openCreate = (): void => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (record: FinanceRecord): void => {
    setEditing(record);
    setDialogOpen(true);
  };

  const handleDelete = async (): Promise<void> => {
    if (!deleting) {
      return;
    }
    setDeleteLoading(true);
    try {
      await deleteFinanceRecord(deleting.id);
      toast.success('收支记录已删除');
      setDeleting(null);
      refreshAll();
    } catch (error) {
      logger.error('删除收支记录失败', error);
      toast.error('删除失败，请稍后重试');
    } finally {
      setDeleteLoading(false);
    }
  };

  const columns: TableProps<FinanceRecord>['columns'] = [
    {
      title: '日期',
      dataIndex: 'recordDate',
      width: 120,
      render: (value: string) => dayjs(value).format('YYYY-MM-DD'),
    },
    {
      title: '类型',
      dataIndex: 'recordType',
      width: 100,
      render: (value: FinanceRecordType) =>
        value === 'income' ? (
          <Badge className="rounded-none border-transparent bg-[#CCE0FF] text-[#0033A0]">
            收入
          </Badge>
        ) : (
          <Badge className="rounded-none border-transparent bg-[#0033A0] text-white">
            支出
          </Badge>
        ),
    },
    {
      title: '关联对象',
      dataIndex: 'relatedName',
      width: 220,
      render: (value: string, record: FinanceRecord) => (
        <div>
          <div className="font-medium">{value || '—'}</div>
          <div className="text-xs text-muted-foreground">
            {RELATED_TYPE_LABELS[record.relatedType]}
          </div>
        </div>
      ),
    },
    {
      title: '金额',
      dataIndex: 'amount',
      width: 160,
      align: 'right',
      render: (value: number, record: FinanceRecord) => (
        <span
          className={cn(
            'font-mono font-semibold',
            record.recordType === 'income' ? 'text-primary' : 'text-foreground',
          )}
        >
          {record.recordType === 'income' ? '+' : '-'}
          {formatAmount(value)}
        </span>
      ),
    },
    {
      title: '备注',
      dataIndex: 'remark',
      ellipsis: true,
      render: (value: string) => value || '—',
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right',
      render: (_value: unknown, record: FinanceRecord) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => openEdit(record)}>
            <Pencil className="mr-1 h-3.5 w-3.5" />
            编辑
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-[hsl(0_84%_60%)] hover:text-[hsl(0_84%_60%)]"
            onClick={() => setDeleting(record)}
          >
            <Trash2 className="mr-1 h-3.5 w-3.5" />
            删除
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <GradientHeader
        title="财务管理"
        subtitle="FINANCE MANAGEMENT"
        meta="收支明细与资金流"
      />
      <main className="mx-auto max-w-[1280px] space-y-8 px-8 pb-16 pt-8">
        <section>
          <SectionHeader
            no="01"
            label="OVERVIEW · 本月收支汇总"
            subtitle={`统计月份：${month}`}
          />
          <FinanceSummaryCards summary={summary} loading={summaryLoading} />
        </section>

        <section>
          <SectionHeader
            no="02"
            label="RECORDS · 收支明细"
            subtitle="按月查看与登记收入、支出记录"
          />
          <ReportCard>
            <div className="mb-6 flex flex-wrap items-center gap-4">
              <Select value={month} onValueChange={handleMonthChange}>
                <SelectTrigger className="w-44 rounded-none">
                  <SelectValue placeholder="选择月份" />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={handleTypeChange}>
                <SelectTrigger className="w-36 rounded-none">
                  <SelectValue placeholder="选择类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部类型</SelectItem>
                  <SelectItem value="income">收入</SelectItem>
                  <SelectItem value="expense">支出</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex-1" />
              <Button className="rounded-none" onClick={openCreate} data-ai-section-type="button">
                <Plus className="mr-1 h-4 w-4" />
                新建收支记录
              </Button>
            </div>
            <Table
              columns={columns}
              dataSource={records}
              loading={listLoading}
              rowKey="id"
              scroll={{ x: 900, y: 500 }}
              pagination={{
                current: page,
                pageSize,
                total,
                showSizeChanger: false,
                onChange: (nextPage: number, nextPageSize: number) => {
                  setPage(nextPage);
                  setPageSize(nextPageSize);
                },
              }}
            />
          </ReportCard>
        </section>

        <section>
          <SectionHeader
            no="03"
            label="TREND · 月度收支趋势"
            subtitle="近 6 个月收入与支出对比"
          />
          <ReportCard>
            {trendLoading ? (
              <Skeleton className="h-[320px] w-full rounded-none" />
            ) : (
              <FinanceTrendChart items={trend} />
            )}
          </ReportCard>
        </section>
      </main>

      <FinanceRecordDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onSubmitted={refreshAll}
      />

      <AlertDialog
        open={Boolean(deleting)}
        onOpenChange={(open: boolean) => {
          if (!open) {
            setDeleting(null);
          }
        }}
      >
        <AlertDialogContent className="rounded-none">
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定删除收支记录「{deleting?.relatedName ?? ''}」吗？该操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-none">取消</AlertDialogCancel>
            <Button
              className="rounded-none bg-[hsl(0_84%_60%)] text-white hover:bg-[hsl(0_84%_54%)]"
              disabled={deleteLoading}
              onClick={handleDelete}
            >
              {deleteLoading ? '删除中...' : '删除'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Finance;
