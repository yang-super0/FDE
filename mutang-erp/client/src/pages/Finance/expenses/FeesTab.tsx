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
import type { FinanceFee, FinanceFeeListParams } from '@shared/api.interface';
import {
  approveFinanceFee, deleteFinanceFee, fetchFinanceFees, submitFinanceFee,
} from '@client/src/api/finance-enhance/expenses';
import { AdsConfirmDialog } from '@client/src/pages/AdsBusiness/AdsConfirmDialog';
import { exportRowsToExcel } from '@client/src/pages/AdsBusiness/ads-excel';
import { FINANCE_FILTER_ALL, formatFinanceAmount } from '../finance-constants';
import { FeeFormDialog, FEE_TYPE_OPTIONS } from './FeesFormDialog';
import { FeeReimburseDialog } from './FeesActionDialogs';
import {
  ActionLink, ApproveDialog, FilterSelect, FinanceEnhanceStatusBadge, reportError,
} from './expenses-shared';

const PAGE_SIZE: number = 10;

const FEE_STATUS_OPTIONS: string[] = ['待提交', '待审批', '已通过', '已驳回', '已报销'];

const FEE_STATUS_BADGE: Record<string, string> = {
  待提交: 'bg-slate-100 text-slate-500',
  待审批: 'bg-[#FFF7ED] text-[#F97316]',
  已通过: 'bg-[#EFF6FF] text-[#0033A0]',
  已驳回: 'bg-[#FEF2F2] text-[#EF4444]',
  已报销: 'bg-[#ECFDF5] text-[#10B981]',
};

export function FeesTab() {
  const [feeType, setFeeType] = useState<string>(FINANCE_FILTER_ALL);
  const [status, setStatus] = useState<string>(FINANCE_FILTER_ALL);
  const [draftApplicant, setDraftApplicant] = useState<string>('');
  const [applicant, setApplicant] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [items, setItems] = useState<FinanceFee[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [editing, setEditing] = useState<FinanceFee | null>(null);
  const [submittingIds, setSubmittingIds] = useState<number[]>([]);
  const [approvingItem, setApprovingItem] = useState<FinanceFee | null>(null);
  const [reimbursingItem, setReimbursingItem] = useState<FinanceFee | null>(null);
  const [deletingItem, setDeletingItem] = useState<FinanceFee | null>(null);

  useEffect(() => {
    const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
      setApplicant(draftApplicant.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [draftApplicant]);

  const filterParams = useMemo(
    (): FinanceFeeListParams => ({
      feeType: feeType === FINANCE_FILTER_ALL ? undefined : feeType,
      status: status === FINANCE_FILTER_ALL ? undefined : status,
      applicant: applicant || undefined,
    }),
    [feeType, status, applicant],
  );

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchFinanceFees({ ...filterParams, page, pageSize: PAGE_SIZE });
      setItems(result.items);
      setTotal(result.total);
    } catch (error: unknown) {
      reportError('加载费用列表失败', error);
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
    setFeeType(FINANCE_FILTER_ALL);
    setStatus(FINANCE_FILTER_ALL);
    setDraftApplicant('');
    setApplicant('');
    setPage(1);
  };

  const openCreate = (): void => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (item: FinanceFee): void => {
    setEditing(item);
    setFormOpen(true);
  };

  const handleSubmitFee = async (): Promise<void> => {
    try {
      await submitFinanceFee(submittingIds[0]);
      toast.success('费用已提交');
      setSubmittingIds([]);
      refresh();
    } catch (error: unknown) {
      reportError('提交费用失败', error);
    }
  };

  const handleApprove = async (approved: boolean, rejectReason?: string): Promise<void> => {
    if (!approvingItem) return;
    await approveFinanceFee(approvingItem.id, { approved, rejectReason });
    toast.success(approved ? '费用已通过' : '费用已驳回');
    setApprovingItem(null);
    refresh();
  };

  const handleDelete = async (): Promise<void> => {
    if (!deletingItem) return;
    try {
      await deleteFinanceFee(deletingItem.id);
      toast.success('费用已删除');
      setDeletingItem(null);
      refresh();
    } catch (error: unknown) {
      reportError('删除费用失败', error);
    }
  };

  const handleExport = async (): Promise<void> => {
    try {
      const rows: Record<string, string>[] = items.map((item: FinanceFee) => ({
        费用单号: item.feeNo,
        费用类型: item.feeType,
        申请人: item.applicant,
        部门: item.department,
        金额: String(item.amount),
        费用日期: item.expenseDate,
        发票号: item.invoiceNo,
        状态: item.status,
        审批人: item.approver,
        审批时间: item.approveTime ?? '',
        报销时间: item.reimburseTime ?? '',
        备注: item.remark,
        创建时间: dayjs(item.createdAt).format('YYYY-MM-DD HH:mm'),
      }));
      const count: number = await exportRowsToExcel(rows, Object.keys(rows[0] ?? { 费用单号: '' }), '费用报销', '费用报销');
      toast.success(`已导出 ${count} 条费用记录`);
    } catch (error: unknown) {
      reportError('导出失败', error);
    }
  };

  const columns = useMemo((): TableColumnsType<FinanceFee> => [
    {
      title: '费用单号',
      dataIndex: 'feeNo',
      width: 150,
      fixed: 'left',
      render: (value: string) => <span className="font-bold text-primary">{value}</span>,
    },
    { title: '费用类型', dataIndex: 'feeType', width: 100 },
    { title: '申请人', dataIndex: 'applicant', width: 100 },
    { title: '部门', dataIndex: 'department', width: 120, ellipsis: true },
    {
      title: '金额',
      dataIndex: 'amount',
      width: 130,
      align: 'right',
      render: (value: number) => <span className="font-mono">{formatFinanceAmount(value)}</span>,
    },
    { title: '费用日期', dataIndex: 'expenseDate', width: 110 },
    { title: '发票号', dataIndex: 'invoiceNo', width: 130, ellipsis: true },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (value: string) => <FinanceEnhanceStatusBadge status={value} map={FEE_STATUS_BADGE} />,
    },
    { title: '审批人', dataIndex: 'approver', width: 100 },
    { title: '审批时间', dataIndex: 'approveTime', width: 150 },
    { title: '报销时间', dataIndex: 'reimburseTime', width: 150 },
    {
      title: '操作',
      key: 'actions',
      width: 220,
      fixed: 'right',
      render: (_: unknown, record: FinanceFee) => (
        <div className="flex flex-wrap items-center gap-1">
          {record.status === '待提交' ? (
            <ActionLink onClick={() => setSubmittingIds([record.id])}>提交</ActionLink>
          ) : null}
          {record.status === '待审批' ? (
            <ActionLink onClick={() => setApprovingItem(record)}>审批</ActionLink>
          ) : null}
          {record.status === '已通过' ? (
            <ActionLink onClick={() => setReimbursingItem(record)}>报销</ActionLink>
          ) : null}
          {record.status === '待提交' || record.status === '已驳回' ? (
            <ActionLink onClick={() => openEdit(record)}>编辑</ActionLink>
          ) : null}
          {record.status !== '已报销' ? (
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
      <SectionHeader no="05" label="FEE REIMBURSEMENT" subtitle="费用报销 / 提交审批 / 报销 / 导出" />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <FilterSelect
          value={feeType}
          placeholder="费用类型"
          allLabel="全部类型"
          options={FEE_TYPE_OPTIONS}
          onChange={(value: string) => {
            setFeeType(value);
            setPage(1);
          }}
        />
        <FilterSelect
          value={status}
          placeholder="状态"
          allLabel="全部状态"
          options={FEE_STATUS_OPTIONS}
          onChange={(value: string) => {
            setStatus(value);
            setPage(1);
          }}
        />
        <Input
          className="w-32 rounded-none"
          placeholder="申请人"
          value={draftApplicant}
          onChange={(event: ChangeEvent<HTMLInputElement>) => setDraftApplicant(event.target.value)}
        />
        <Button variant="ghost" size="sm" className="rounded-none" onClick={handleReset}>
          <RotateCcw className="h-3.5 w-3.5" />
          重置
        </Button>
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button data-ai-section-type="button" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          新建费用
        </Button>
        <Button variant="outline" className="rounded-none" onClick={() => void handleExport()}>
          <Download className="h-4 w-4" />
          导出Excel
        </Button>
        <ColumnSettingsButton
          columnMetas={columnMetas} hiddenIds={hiddenIds}
          onToggle={toggleColumn} onReset={resetColumns} onSetAll={setAllColumns}
        />
      </div>
      <Table<FinanceFee>
        columns={visibleColumns}
        dataSource={items}
        loading={loading}
        rowKey="id"
        scroll={{ x: 1700, y: 500 }}
        pagination={{
          current: page,
          pageSize: PAGE_SIZE,
          total,
          onChange: (nextPage: number) => setPage(nextPage),
        }}
      />

      <FeeFormDialog
        open={formOpen}
        editing={editing}
        onSaved={refresh}
        onOpenChange={setFormOpen}
      />

      <AdsConfirmDialog
        open={submittingIds.length > 0}
        title="提交费用？"
        description={`即将提交费用「${items.find((item: FinanceFee) => item.id === submittingIds[0])?.feeNo ?? ''}」进入审批流程，提交后不可编辑。`}
        confirmText="确认提交"
        onOpenChange={(open: boolean) => {
          if (!open) setSubmittingIds([]);
        }}
        onConfirm={() => void handleSubmitFee()}
      />

      <ApproveDialog
        open={approvingItem !== null}
        title="费用审批"
        description={approvingItem
          ? `${approvingItem.feeNo} · ${approvingItem.feeType} · ${formatFinanceAmount(approvingItem.amount)}，请选择审批结果`
          : ''}
        onOpenChange={(open: boolean) => {
          if (!open) setApprovingItem(null);
        }}
        onSubmit={(approved: boolean, rejectReason?: string) =>
          handleApprove(approved, rejectReason)}
      />

      <FeeReimburseDialog
        open={reimbursingItem !== null}
        fee={reimbursingItem}
        onDone={refresh}
        onOpenChange={(open: boolean) => {
          if (!open) setReimbursingItem(null);
        }}
      />

      <AdsConfirmDialog
        open={deletingItem !== null}
        title="确认删除？"
        description={`即将删除费用「${deletingItem?.feeNo ?? ''}」，删除后不可恢复。`}
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
