import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';
import dayjs from 'dayjs';
import { Download, Plus, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Table, type TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import { ReportCard, SectionHeader } from '@client/src/components/blueprint';
import { ColumnSettingsButton } from '@client/src/components/column-settings-button';
import { useColumnSettings } from '@client/src/hooks/useColumnSettings';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@client/src/components/ui/select';
import type { VenueExpense, VenueExpenseListParams } from '@shared/api.interface';
import {
  deleteVenueExpense, deductVenueDeposit, fetchVenueExpenses,
  returnVenueDeposit, setVenueExpenseStatus,
} from '@client/src/api/video-core/venues';
import { AdsConfirmDialog } from '@client/src/pages/AdsBusiness/AdsConfirmDialog';
import { AdsDatePickerButton } from '@client/src/pages/AdsBusiness/AdsDatePickerButton';
import { exportRowsToExcel } from '@client/src/pages/AdsBusiness/ads-excel';
import { VideoCoreTabs } from './VideoCoreTabs';
import { VenueApproveDialog, VenueDetailDialog, VenueFormDialog } from './VideoVenueDialogs';
import {
  VIDEO_FILTER_ALL, VENUE_TYPE_OPTIONS, VideoStatusBadge, formatVideoAmount, toVideoErrorText,
} from './video-constants';

const PAGE_SIZE: number = 10;
const VENUE_STATUS_OPTIONS: string[] = [
  '待审批', '已审批', '已使用', '已结算', '已取消', '已驳回',
];

interface VenueStatusTarget {
  item: VenueExpense;
  status: '已使用' | '已结算' | '已取消';
}

interface VenueDepositTarget {
  item: VenueExpense;
  action: 'return' | 'deduct';
}

const reportError = (context: string, error: unknown): void => {
  logger.error(`${context}: ${toVideoErrorText(error)}`);
  toast.error(toVideoErrorText(error));
};

function FilterSelect({ value, placeholder, options, allLabel, onChange }: {
  value: string; placeholder: string; options: string[]; allLabel: string;
  onChange: (value: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-32 rounded-none"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        <SelectItem value={VIDEO_FILTER_ALL}>{allLabel}</SelectItem>
        {options.map((option: string) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function ActionLink({ danger, onClick, children }: {
  danger?: boolean; onClick: () => void; children: string;
}) {
  return (
    <Button variant="ghost" size="sm" onClick={onClick}
      className={`h-auto px-1 text-xs ${danger ? 'text-destructive' : 'text-primary'}`}>
      {children}
    </Button>
  );
}

export default function VideoVenueExpensesPage() {
  /* 筛选（文本防抖） */
  const [draftNo, setDraftNo] = useState<string>('');
  const [draftName, setDraftName] = useState<string>('');
  const [venueNo, setVenueNo] = useState<string>('');
  const [venueName, setVenueName] = useState<string>('');
  const [venueType, setVenueType] = useState<string>(VIDEO_FILTER_ALL);
  const [status, setStatus] = useState<string>(VIDEO_FILTER_ALL);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [page, setPage] = useState<number>(1);
  const [items, setItems] = useState<VenueExpense[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  /* 弹窗状态 */
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [editing, setEditing] = useState<VenueExpense | null>(null);
  const [detailItem, setDetailItem] = useState<VenueExpense | null>(null);
  const [deletingItem, setDeletingItem] = useState<VenueExpense | null>(null);
  const [approvingItem, setApprovingItem] = useState<VenueExpense | null>(null);
  const [statusTarget, setStatusTarget] = useState<VenueStatusTarget | null>(null);
  const [depositTarget, setDepositTarget] = useState<VenueDepositTarget | null>(null);

  const filterTexts: Array<{ placeholder: string; value: string; set: (value: string) => void }> = [
    { placeholder: '场地单号', value: draftNo, set: setDraftNo },
    { placeholder: '场地名称', value: draftName, set: setDraftName },
  ];

  useEffect(() => {
    const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
      setVenueNo(draftNo.trim());
      setVenueName(draftName.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [draftNo, draftName]);

  const filterParams = useMemo(
    (): VenueExpenseListParams => ({
      venueNo: venueNo || undefined,
      venueName: venueName || undefined,
      venueType: venueType === VIDEO_FILTER_ALL ? undefined : venueType,
      status: status === VIDEO_FILTER_ALL ? undefined : status,
      startDate: startDate ? dayjs(startDate).format('YYYY-MM-DD') : undefined,
      endDate: endDate ? dayjs(endDate).format('YYYY-MM-DD') : undefined,
    }),
    [venueNo, venueName, venueType, status, startDate, endDate],
  );

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchVenueExpenses({ ...filterParams, page, pageSize: PAGE_SIZE });
      setItems(result.items);
      setTotal(result.total);
    } catch (error: unknown) {
      reportError('加载场地费用列表失败', error);
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
    setDraftNo('');
    setDraftName('');
    setVenueNo('');
    setVenueName('');
    setVenueType(VIDEO_FILTER_ALL);
    setStatus(VIDEO_FILTER_ALL);
    setStartDate(undefined);
    setEndDate(undefined);
    setPage(1);
  };

  const handleDelete = async (): Promise<void> => {
    if (!deletingItem) return;
    try {
      await deleteVenueExpense(deletingItem.id);
      toast.success('场地单已删除');
      setDeletingItem(null);
      refresh();
    } catch (error: unknown) {
      reportError('删除场地单失败', error);
    }
  };

  const handleStatusChange = async (): Promise<void> => {
    if (!statusTarget) return;
    try {
      await setVenueExpenseStatus(statusTarget.item.id, { status: statusTarget.status });
      toast.success(`场地单已${statusTarget.status === '已取消' ? '取消' : '登记' + statusTarget.status}`);
      setStatusTarget(null);
      refresh();
    } catch (error: unknown) {
      reportError('更新场地单状态失败', error);
    }
  };

  const handleDeposit = async (): Promise<void> => {
    if (!depositTarget) return;
    const { item, action } = depositTarget;
    try {
      if (action === 'return') await returnVenueDeposit(item.id);
      else await deductVenueDeposit(item.id);
      toast.success(action === 'return' ? '押金已退还' : '押金已扣除');
      setDepositTarget(null);
      refresh();
    } catch (error: unknown) {
      reportError(action === 'return' ? '退还押金失败' : '扣除押金失败', error);
    }
  };

  const handleExport = async (): Promise<void> => {
    try {
      const rows: Record<string, string>[] = items.map((item: VenueExpense) => ({
        场地单号: item.venueNo,
        场地名称: item.venueName,
        场地类型: item.venueType,
        地址: item.address,
        联系人: item.contactPerson,
        联系电话: item.phone,
        租赁日期: item.rentalDate,
        租赁时长: item.rentalDuration,
        租赁费: String(item.rentalFee),
        押金: String(item.deposit),
        押金状态: item.depositStatus,
        状态: item.status,
        关联项目: item.projectNo,
        备注: item.remark,
      }));
      const count: number = await exportRowsToExcel(
        rows, Object.keys(rows[0] ?? { 场地单号: '' }), '场地费用', '场地费用',
      );
      toast.success(`已导出 ${count} 条场地费用记录`);
    } catch (error: unknown) {
      reportError('导出失败', error);
    }
  };

  const columns = useMemo((): TableColumnsType<VenueExpense> => [
    {
      title: '场地单号',
      dataIndex: 'venueNo',
      width: 150,
      fixed: 'left',
      render: (value: string) => <span className="font-bold text-primary">{value}</span>,
    },
    { title: '场地名称', dataIndex: 'venueName', width: 140 },
    { title: '类型', dataIndex: 'venueType', width: 80 },
    { title: '地址', dataIndex: 'address', width: 160, ellipsis: true },
    { title: '联系人', dataIndex: 'contactPerson', width: 90 },
    { title: '租赁日期', dataIndex: 'rentalDate', width: 110 },
    { title: '时长', dataIndex: 'rentalDuration', width: 90 },
    {
      title: '租赁费',
      dataIndex: 'rentalFee',
      width: 120,
      align: 'right',
      render: (value: number) => <span className="font-mono">{formatVideoAmount(value)}</span>,
    },
    {
      title: '押金',
      dataIndex: 'deposit',
      width: 110,
      align: 'right',
      render: (value: number) => <span className="font-mono">{formatVideoAmount(value)}</span>,
    },
    {
      title: '押金状态', dataIndex: 'depositStatus', width: 90,
      render: (value: string) => <VideoStatusBadge status={value} />,
    },
    {
      title: '状态', dataIndex: 'status', width: 90,
      render: (value: string) => <VideoStatusBadge status={value} />,
    },
    {
      title: '操作',
      key: 'actions',
      width: 280,
      fixed: 'right',
      render: (_: unknown, record: VenueExpense) => (
        <div className="flex flex-wrap items-center gap-1">
          <ActionLink onClick={() => setDetailItem(record)}>详情</ActionLink>
          {record.status === '待审批' ? (
            <>
              <ActionLink onClick={() => { setEditing(record); setFormOpen(true); }}>编辑</ActionLink>
              <ActionLink onClick={() => setApprovingItem(record)}>审批</ActionLink>
            </>
          ) : null}
          {record.status === '已审批' ? (
            <ActionLink onClick={() => setStatusTarget({ item: record, status: '已使用' })}>登记使用</ActionLink>
          ) : null}
          {record.status === '已使用' ? (
            <ActionLink onClick={() => setStatusTarget({ item: record, status: '已结算' })}>登记结算</ActionLink>
          ) : null}
          {record.status === '已审批' || record.status === '已使用' ? (
            <ActionLink danger onClick={() => setStatusTarget({ item: record, status: '已取消' })}>取消</ActionLink>
          ) : null}
          {record.depositStatus === '未退还' ? (
            <>
              <ActionLink onClick={() => setDepositTarget({ item: record, action: 'return' })}>退还押金</ActionLink>
              <ActionLink danger onClick={() => setDepositTarget({ item: record, action: 'deduct' })}>扣除押金</ActionLink>
            </>
          ) : null}
          <ActionLink danger onClick={() => setDeletingItem(record)}>删除</ActionLink>
        </div>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], []);

  const {
    visibleColumns, columnMetas, hiddenIds,
    toggleColumn, resetColumns, setAllColumns,
  } = useColumnSettings(columns);

  const statusTargetCancel: boolean = statusTarget?.status === '已取消';

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-8 px-8 py-8">
      <VideoCoreTabs active="venue" />
      <ReportCard>
        <SectionHeader no="08" label="VENUE" subtitle="场地费用 / 押金管理 / 审批流转" />
        {/* 筛选区 */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          {filterTexts.map((field: { placeholder: string; value: string; set: (value: string) => void }) => (
            <Input
              key={field.placeholder}
              className="w-36 rounded-none"
              placeholder={field.placeholder}
              value={field.value}
              onChange={(event: ChangeEvent<HTMLInputElement>) => field.set(event.target.value)}
            />
          ))}
          <FilterSelect
            value={venueType}
            placeholder="场地类型"
            allLabel="全部类型"
            options={VENUE_TYPE_OPTIONS}
            onChange={(value: string) => { setVenueType(value); setPage(1); }}
          />
          <FilterSelect
            value={status}
            placeholder="状态"
            allLabel="全部状态"
            options={VENUE_STATUS_OPTIONS}
            onChange={(value: string) => { setStatus(value); setPage(1); }}
          />
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">租赁日期</span>
            <AdsDatePickerButton value={startDate} placeholder="开始日期"
              onChange={(date: Date | undefined) => { setStartDate(date); setPage(1); }} />
            <span className="text-xs text-muted-foreground">至</span>
            <AdsDatePickerButton value={endDate} placeholder="结束日期"
              onChange={(date: Date | undefined) => { setEndDate(date); setPage(1); }} />
          </div>
          <Button variant="ghost" size="sm" className="rounded-none" onClick={handleReset}>
            <RotateCcw className="h-3.5 w-3.5" />
            重置
          </Button>
        </div>
        {/* 操作区 */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Button data-ai-section-type="button" onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4" />
            新建场地单
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
        {/* 表格 */}
        <Table<VenueExpense>
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
      </ReportCard>

      {/* 新建 / 编辑弹窗 */}
      <VenueFormDialog
        open={formOpen}
        editing={editing}
        onSaved={refresh}
        onOpenChange={setFormOpen}
      />

      {/* 审批弹窗 */}
      <VenueApproveDialog
        open={approvingItem !== null}
        venue={approvingItem}
        onDone={refresh}
        onOpenChange={(open: boolean) => { if (!open) setApprovingItem(null); }}
      />

      {/* 详情弹窗 */}
      <VenueDetailDialog
        open={detailItem !== null}
        venue={detailItem}
        onOpenChange={(open: boolean) => { if (!open) setDetailItem(null); }}
      />

      {/* 状态推进 / 取消确认 */}
      <AdsConfirmDialog
        open={statusTarget !== null}
        title={statusTargetCancel ? '确认取消场地单？' : `确认${statusTarget?.status ?? ''}？`}
        description={`场地单「${statusTarget?.item.venueNo ?? ''}」即将更新为「${statusTarget?.status ?? ''}」。`}
        confirmText="确认"
        destructive={statusTargetCancel}
        onOpenChange={(open: boolean) => { if (!open) setStatusTarget(null); }}
        onConfirm={() => void handleStatusChange()}
      />

      {/* 押金退还 / 扣除确认 */}
      <AdsConfirmDialog
        open={depositTarget !== null}
        title={depositTarget?.action === 'deduct' ? '确认扣除押金？' : '确认退还押金？'}
        description={`场地单「${depositTarget?.item.venueNo ?? ''}」押金 ${
          formatVideoAmount(depositTarget?.item.deposit ?? 0)
        }，${depositTarget?.action === 'deduct' ? '扣除后不可恢复' : '退还后不可撤销'}。`}
        confirmText="确认"
        destructive={depositTarget?.action === 'deduct'}
        onOpenChange={(open: boolean) => { if (!open) setDepositTarget(null); }}
        onConfirm={() => void handleDeposit()}
      />

      {/* 删除二次确认 */}
      <AdsConfirmDialog
        open={deletingItem !== null}
        title="确认删除？"
        description={`即将删除场地单「${deletingItem?.venueNo ?? ''}」，删除后不可恢复。`}
        confirmText="确认删除"
        destructive
        onOpenChange={(open: boolean) => { if (!open) setDeletingItem(null); }}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}
