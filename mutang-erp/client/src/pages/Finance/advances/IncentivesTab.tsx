import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';
import dayjs from 'dayjs';
import { Download, Plus, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Table, type TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import { ReportCard, SectionHeader } from '@client/src/components/blueprint';
import { ColumnSettingsButton } from '@client/src/components/column-settings-button';
import { useColumnSettings } from '@client/src/hooks/useColumnSettings';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import type {
  FinanceIncentive, FinanceIncentiveListParams,
} from '@shared/api.interface';
import {
  approveFinanceIncentive, deleteFinanceIncentive, fetchFinanceIncentives,
} from '@client/src/api/finance-enhance/advances';
import { AdsConfirmDialog } from '@client/src/pages/AdsBusiness/AdsConfirmDialog';
import { exportRowsToExcel } from '@client/src/pages/AdsBusiness/ads-excel';
import { FINANCE_FILTER_ALL, formatFinanceAmount } from '../finance-constants';
import { IncentiveFormDialog, IncentiveIssueDialog } from './IncentiveDialogs';
import { INCENTIVE_STATUS_OPTIONS, INCENTIVE_TYPE_OPTIONS } from './incentive-options';
import {
  ActionLink, ApproveDialog, FilterSelect, FinanceEnhanceStatusBadge, reportError,
} from './advances-shared';

const PAGE_SIZE: number = 10;

const INCENTIVE_STATUS_BADGE: Record<string, string> = {
  待审批: 'bg-[#FFF7ED] text-[#F97316]',
  已通过: 'bg-[#EFF6FF] text-[#0033A0]',
  已驳回: 'bg-[#FEF2F2] text-[#EF4444]',
  已发放: 'bg-[#ECFDF5] text-[#10B981]',
};

export function IncentivesTab() {
  const [draftEmployee, setDraftEmployee] = useState<string>('');
  const [employeeName, setEmployeeName] = useState<string>('');
  const [status, setStatus] = useState<string>(FINANCE_FILTER_ALL);
  const [page, setPage] = useState<number>(1);
  const [items, setItems] = useState<FinanceIncentive[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [approvingItem, setApprovingItem] = useState<FinanceIncentive | null>(null);
  const [issuingItem, setIssuingItem] = useState<FinanceIncentive | null>(null);
  const [deletingItem, setDeletingItem] = useState<FinanceIncentive | null>(null);

  useEffect(() => {
    const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
      setEmployeeName(draftEmployee.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [draftEmployee]);

  const filterParams = useMemo(
    (): FinanceIncentiveListParams => ({
      employeeName: employeeName || undefined,
      status: status === FINANCE_FILTER_ALL ? undefined : status,
    }),
    [employeeName, status],
  );

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchFinanceIncentives({ ...filterParams, page, pageSize: PAGE_SIZE });
      setItems(result.items);
      setTotal(result.total);
    } catch (error: unknown) {
      reportError('加载激励列表失败', error);
    } finally {
      setLoading(false);
    }
  }, [filterParams, page]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const refresh = useCallback((): void => {
    void loadList();
  }, [loadList]);

  const handleReset = (): void => {
    setDraftEmployee('');
    setEmployeeName('');
    setStatus(FINANCE_FILTER_ALL);
    setPage(1);
  };

  const handleApprove = async (approved: boolean, rejectReason?: string): Promise<void> => {
    if (!approvingItem) return;
    await approveFinanceIncentive(approvingItem.id, { approved, rejectReason });
    toast.success(approved ? '激励已通过' : '激励已驳回');
    setApprovingItem(null);
    refresh();
  };

  const handleDelete = async (): Promise<void> => {
    if (!deletingItem) return;
    try {
      await deleteFinanceIncentive(deletingItem.id);
      toast.success('激励已删除');
      setDeletingItem(null);
      refresh();
    } catch (error: unknown) {
      reportError('删除激励失败', error);
    }
  };

  const handleExport = async (): Promise<void> => {
    try {
      const rows: Record<string, string>[] = items.map((item: FinanceIncentive) => ({
        激励单号: item.incentiveNo,
        员工姓名: item.employeeName,
        部门: item.department,
        激励类型: item.incentiveType,
        金额: String(item.amount),
        激励事由: item.reason,
        状态: item.status,
        审批人: item.approver,
        审批时间: item.approveTime ?? '',
        发放时间: item.issueTime ?? '',
        备注: item.remark,
        创建时间: dayjs(item.createdAt).format('YYYY-MM-DD HH:mm'),
      }));
      const count: number = await exportRowsToExcel(rows, Object.keys(rows[0] ?? { 激励单号: '' }), '激励管理', '激励管理');
      toast.success(`已导出 ${count} 条激励记录`);
    } catch (error: unknown) {
      reportError('导出失败', error);
    }
  };

  const columns = useMemo((): TableColumnsType<FinanceIncentive> => [
    {
      title: '激励单号',
      dataIndex: 'incentiveNo',
      width: 150,
      fixed: 'left',
      render: (value: string) => <span className="font-bold text-primary">{value}</span>,
    },
    { title: '员工姓名', dataIndex: 'employeeName', width: 110 },
    { title: '部门', dataIndex: 'department', width: 120, ellipsis: true },
    { title: '激励类型', dataIndex: 'incentiveType', width: 100 },
    {
      title: '金额',
      dataIndex: 'amount',
      width: 130,
      align: 'right',
      render: (value: number) => <span className="font-mono">{formatFinanceAmount(value)}</span>,
    },
    { title: '激励事由', dataIndex: 'reason', width: 160, ellipsis: true },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (value: string) => <FinanceEnhanceStatusBadge status={value} map={INCENTIVE_STATUS_BADGE} />,
    },
    { title: '审批人', dataIndex: 'approver', width: 100 },
    { title: '审批时间', dataIndex: 'approveTime', width: 150 },
    { title: '发放时间', dataIndex: 'issueTime', width: 150 },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      fixed: 'right',
      render: (_: unknown, record: FinanceIncentive) => (
        <div className="flex flex-wrap items-center gap-1">
          {record.status === '待审批' ? (
            <ActionLink onClick={() => setApprovingItem(record)}>审批</ActionLink>
          ) : null}
          {record.status === '已通过' ? (
            <ActionLink onClick={() => setIssuingItem(record)}>发放</ActionLink>
          ) : null}
          {record.status !== '已发放' ? (
            <ActionLink danger onClick={() => setDeletingItem(record)}>删除</ActionLink>
          ) : null}
        </div>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], []);

  const {
    visibleColumns, columnMetas, hiddenIds,
    toggleColumn, resetColumns, setAllColumns,
  } = useColumnSettings(columns);

  return (
    <ReportCard>
      <SectionHeader no="04" label="INCENTIVES" subtitle="激励管理 / 审批发放 / 导出" />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          className="w-36 rounded-none"
          placeholder="员工姓名"
          value={draftEmployee}
          onChange={(event: ChangeEvent<HTMLInputElement>) => setDraftEmployee(event.target.value)}
        />
        <FilterSelect
          value={status}
          placeholder="状态"
          allLabel="全部状态"
          options={INCENTIVE_STATUS_OPTIONS}
          onChange={(value: string) => {
            setStatus(value);
            setPage(1);
          }}
        />
        <Button variant="ghost" size="sm" className="rounded-none" onClick={handleReset}>
          <RotateCcw className="h-3.5 w-3.5" />
          重置
        </Button>
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button data-ai-section-type="button" onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" />
          新建激励
        </Button>
        <Button variant="outline" className="rounded-none" onClick={() => void handleExport()}>
          <Download className="h-4 w-4" />
          导出Excel
        </Button>
        <ColumnSettingsButton
          columnMetas={columnMetas} hiddenIds={hiddenIds}
          onToggle={toggleColumn} onReset={resetColumns} onSetAll={setAllColumns}
        />
        <span className="text-xs text-muted-foreground">
          激励类型：{INCENTIVE_TYPE_OPTIONS.join(' / ')}
        </span>
      </div>
      <Table<FinanceIncentive>
        columns={visibleColumns}
        dataSource={items}
        loading={loading}
        rowKey="id"
        scroll={{ x: 1500, y: 500 }}
        pagination={{
          current: page,
          pageSize: PAGE_SIZE,
          total,
          onChange: (nextPage: number) => setPage(nextPage),
        }}
      />

      <IncentiveFormDialog open={formOpen} onSaved={refresh} onOpenChange={setFormOpen} />

      <ApproveDialog
        open={approvingItem !== null}
        title="激励审批"
        description={approvingItem
          ? `${approvingItem.incentiveNo} · ${approvingItem.employeeName} · ${approvingItem.incentiveType}，请选择审批结果`
          : ''}
        onOpenChange={(open: boolean) => {
          if (!open) setApprovingItem(null);
        }}
        onSubmit={(approved: boolean, rejectReason?: string) =>
          handleApprove(approved, rejectReason)}
      />

      <IncentiveIssueDialog
        open={issuingItem !== null}
        incentive={issuingItem}
        onDone={refresh}
        onOpenChange={(open: boolean) => {
          if (!open) setIssuingItem(null);
        }}
      />

      <AdsConfirmDialog
        open={deletingItem !== null}
        title="确认删除？"
        description={`即将删除激励「${deletingItem?.incentiveNo ?? ''}」，删除后不可恢复。`}
        confirmText="确认删除"
        destructive
        onOpenChange={(open: boolean) => {
          if (!open) setDeletingItem(null);
        }}
        onConfirm={() => void handleDelete()}
      />
    </ReportCard>
  );
}
