import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type Key } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { Download, Plus, RotateCcw, Search } from 'lucide-react';
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
import type { VideoOrder, VideoOrderListParams, VideoOrderStatusRequest } from '@shared/api.interface';
import {
  advanceVideoOrderStatus, batchApproveVideoOrders, deleteVideoOrder, fetchVideoOrders,
} from '@client/src/api/video-core/orders';
import { AdsConfirmDialog } from '@client/src/pages/AdsBusiness/AdsConfirmDialog';
import { AdsDatePickerButton } from '@client/src/pages/AdsBusiness/AdsDatePickerButton';
import { exportRowsToExcel } from '@client/src/pages/AdsBusiness/ads-excel';
import { VideoCoreTabs } from './VideoCoreTabs';
import {
  VideoOrderApproveDialog, VideoOrderDetailDialog, VideoOrderFormDialog, VideoOrderRejectDialog,
} from './VideoOrderDialogs';
import {
  formatVideoAmount, ORDER_STATUS_OPTIONS, toVideoErrorText, VIDEO_FILTER_ALL,
  VIDEO_TYPE_OPTIONS, VideoStatusBadge,
} from './video-constants';

const PAGE_SIZE: number = 10;

const NEXT_STATUS: Record<string, VideoOrderStatusRequest['status']> = {
  已通过: '制作中', 制作中: '已交付', 已交付: '已完成',
};

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

export default function VideoOrdersPage() {
  const navigate = useNavigate();
  /* 筛选（文本防抖） */
  const [draftOrderNo, setDraftOrderNo] = useState<string>('');
  const [draftGroup, setDraftGroup] = useState<string>('');
  const [draftSubject, setDraftSubject] = useState<string>('');
  const [orderNo, setOrderNo] = useState<string>('');
  const [groupName, setGroupName] = useState<string>('');
  const [subjectName, setSubjectName] = useState<string>('');
  const [videoType, setVideoType] = useState<string>(VIDEO_FILTER_ALL);
  const [status, setStatus] = useState<string>(VIDEO_FILTER_ALL);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [page, setPage] = useState<number>(1);
  const [items, setItems] = useState<VideoOrder[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedKeys, setSelectedKeys] = useState<Key[]>([]);
  /* 弹窗状态 */
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [editing, setEditing] = useState<VideoOrder | null>(null);
  const [detailItem, setDetailItem] = useState<VideoOrder | null>(null);
  const [deletingItem, setDeletingItem] = useState<VideoOrder | null>(null);
  const [approvingItem, setApprovingItem] = useState<VideoOrder | null>(null);
  const [approvingIds, setApprovingIds] = useState<number[]>([]);
  const [rejectingIds, setRejectingIds] = useState<number[]>([]);

  const filterTexts: Array<{ placeholder: string; width: string; value: string; set: (value: string) => void }> = [
    { placeholder: '订单号', width: 'w-32', value: draftOrderNo, set: setDraftOrderNo },
    { placeholder: '集团名称', width: 'w-32', value: draftGroup, set: setDraftGroup },
    { placeholder: '主体名称', width: 'w-32', value: draftSubject, set: setDraftSubject },
  ];

  const commitFilters = useCallback((): void => {
    setOrderNo(draftOrderNo.trim());
    setGroupName(draftGroup.trim());
    setSubjectName(draftSubject.trim());
    setPage(1);
  }, [draftOrderNo, draftGroup, draftSubject]);

  useEffect(() => {
    const timer: ReturnType<typeof setTimeout> = setTimeout(() => { commitFilters(); }, 300);
    return () => clearTimeout(timer);
  }, [commitFilters]);

  const filterParams = useMemo(
    (): VideoOrderListParams => ({
      orderNo: orderNo || undefined,
      groupName: groupName || undefined,
      subjectName: subjectName || undefined,
      videoType: videoType === VIDEO_FILTER_ALL ? undefined : videoType,
      status: status === VIDEO_FILTER_ALL ? undefined : status,
      startDate: startDate ? dayjs(startDate).format('YYYY-MM-DD') : undefined,
      endDate: endDate ? dayjs(endDate).format('YYYY-MM-DD') : undefined,
    }),
    [orderNo, groupName, subjectName, videoType, status, startDate, endDate],
  );

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchVideoOrders({ ...filterParams, page, pageSize: PAGE_SIZE });
      setItems(result.items);
      setTotal(result.total);
    } catch (error: unknown) {
      reportError('加载订单列表失败', error);
    } finally {
      setLoading(false);
    }
  }, [filterParams, page]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const refresh = useCallback((): void => {
    setSelectedKeys([]);
    void loadList();
  }, [loadList]);

  const handleReset = (): void => {
    setDraftOrderNo(''); setDraftGroup(''); setDraftSubject('');
    setOrderNo(''); setGroupName(''); setSubjectName('');
    setVideoType(VIDEO_FILTER_ALL); setStatus(VIDEO_FILTER_ALL);
    setStartDate(undefined); setEndDate(undefined);
    setPage(1);
  };

  const openCreate = (): void => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (item: VideoOrder): void => {
    setEditing(item);
    setFormOpen(true);
  };

  const pendingSelectedIds = (): number[] =>
    items
      .filter((item: VideoOrder) => selectedKeys.includes(item.id) && item.status === '待审核')
      .map((item: VideoOrder) => item.id);

  const handleBatchApprove = (): void => {
    const pendingIds: number[] = pendingSelectedIds();
    if (pendingIds.length === 0) {
      toast.error('所选记录中没有待审核的订单');
      return;
    }
    setApprovingIds(pendingIds);
  };

  const handleBatchApproveConfirm = async (): Promise<void> => {
    try {
      const result = await batchApproveVideoOrders({ ids: approvingIds, approved: true });
      toast.success(`已通过 ${result.updated} 条${result.skipped > 0 ? `，跳过 ${result.skipped} 条` : ''}`);
      setApprovingIds([]);
      refresh();
    } catch (error: unknown) {
      reportError('批量通过失败', error);
    }
  };

  const handleBatchReject = (): void => {
    const pendingIds: number[] = pendingSelectedIds();
    if (pendingIds.length === 0) {
      toast.error('所选记录中没有待审核的订单');
      return;
    }
    setRejectingIds(pendingIds);
  };

  const handleAdvance = async (record: VideoOrder): Promise<void> => {
    const next: VideoOrderStatusRequest['status'] | undefined = NEXT_STATUS[record.status];
    if (!next) return;
    try {
      await advanceVideoOrderStatus(record.id, { status: next });
      toast.success(`订单已推进为「${next}」`);
      refresh();
    } catch (error: unknown) {
      reportError('推进订单状态失败', error);
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!deletingItem) return;
    try {
      await deleteVideoOrder(deletingItem.id);
      toast.success('订单已删除');
      setDeletingItem(null);
      refresh();
    } catch (error: unknown) {
      reportError('删除订单失败', error);
    }
  };

  const handleExport = async (): Promise<void> => {
    if (items.length === 0) {
      toast.error('当前列表无数据可导出');
      return;
    }
    try {
      const rows: Record<string, string>[] = items.map((item: VideoOrder) => ({
        订单号: item.orderNo, 集团名称: item.groupName, 主体名称: item.subjectName,
        视频类型: item.videoType, 数量: String(item.quantity), 单价: String(item.unitPrice),
        总金额: String(item.totalAmount), 状态: item.status, 商务负责人: item.salesperson,
        项目负责人: item.projectManager, 下单日期: item.orderDate, 交付日期: item.deliveryDate,
        备注: item.remark,
      }));
      const count: number = await exportRowsToExcel(
        rows,
        ['订单号', '集团名称', '主体名称', '视频类型', '数量', '单价', '总金额', '状态',
          '商务负责人', '项目负责人', '下单日期', '交付日期', '备注'],
        '视频订单', '视频订单',
      );
      toast.success(`已导出 ${count} 条订单记录`);
    } catch (error: unknown) {
      reportError('导出失败', error);
    }
  };

  const columns = useMemo((): TableColumnsType<VideoOrder> => [
    {
      title: '订单号',
      dataIndex: 'orderNo',
      width: 150,
      fixed: 'left',
      render: (value: string) => <span className="font-bold text-primary">{value}</span>,
    },
    { title: '集团名称', dataIndex: 'groupName', width: 120 },
    { title: '主体名称', dataIndex: 'subjectName', width: 120 },
    { title: '视频类型', dataIndex: 'videoType', width: 100 },
    { title: '数量', dataIndex: 'quantity', width: 70, align: 'right' },
    {
      title: '单价', dataIndex: 'unitPrice', width: 110, align: 'right',
      render: (value: number) => <span className="font-mono">{formatVideoAmount(value)}</span>,
    },
    {
      title: '总金额', dataIndex: 'totalAmount', width: 120, align: 'right',
      render: (value: number) => <span className="font-mono font-medium">{formatVideoAmount(value)}</span>,
    },
    { title: '状态', dataIndex: 'status', width: 90, render: (value: string) => <VideoStatusBadge status={value} /> },
    { title: '商务', dataIndex: 'salesperson', width: 90 },
    { title: '下单日期', dataIndex: 'orderDate', width: 110 },
    { title: '交付日期', dataIndex: 'deliveryDate', width: 110 },
    {
      title: '操作',
      key: 'actions',
      width: 260,
      fixed: 'right',
      render: (_: unknown, record: VideoOrder) => {
        const next: VideoOrderStatusRequest['status'] | undefined = NEXT_STATUS[record.status];
        return (
          <div className="flex flex-wrap items-center gap-1">
            <ActionLink onClick={() => setDetailItem(record)}>详情</ActionLink>
            {record.status === '待审核' || record.status === '已驳回' ? (
              <ActionLink onClick={() => openEdit(record)}>编辑</ActionLink>
            ) : null}
            {record.status === '待审核' ? (
              <ActionLink onClick={() => setApprovingItem(record)}>审批</ActionLink>
            ) : null}
            {next ? <ActionLink onClick={() => void handleAdvance(record)}>{next}</ActionLink> : null}
            <ActionLink onClick={() => navigate('/video/projects')}>新建项目</ActionLink>
            <ActionLink onClick={() => navigate('/video/samples')}>样品邮寄</ActionLink>
            <ActionLink danger onClick={() => setDeletingItem(record)}>删除</ActionLink>
          </div>
        );
      },
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], []);

  const {
    visibleColumns, columnMetas, hiddenIds,
    toggleColumn, resetColumns, setAllColumns,
  } = useColumnSettings(columns);

  const hasSelection: boolean = selectedKeys.length > 0;

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-8 px-8 py-8">
      <VideoCoreTabs active="orders" />
      <ReportCard>
        <SectionHeader no="02" label="VIDEO ORDERS" subtitle="订单管理 / 审批流转 / 导出" />
        {/* 筛选区 */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          {filterTexts.map((field: { placeholder: string; width: string; value: string; set: (value: string) => void }) => (
            <Input
              key={field.placeholder}
              className={`${field.width} rounded-none`}
              placeholder={field.placeholder}
              value={field.value}
              onChange={(event: ChangeEvent<HTMLInputElement>) => field.set(event.target.value)}
            />
          ))}
          <FilterSelect
            value={videoType}
            placeholder="视频类型"
            allLabel="全部类型"
            options={VIDEO_TYPE_OPTIONS}
            onChange={(value: string) => { setVideoType(value); setPage(1); }}
          />
          <FilterSelect
            value={status}
            placeholder="状态"
            allLabel="全部状态"
            options={ORDER_STATUS_OPTIONS}
            onChange={(value: string) => { setStatus(value); setPage(1); }}
          />
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">下单日期</span>
            <AdsDatePickerButton
              value={startDate}
              placeholder="开始日期"
              onChange={(date: Date | undefined) => { setStartDate(date); setPage(1); }}
            />
            <span className="text-xs text-muted-foreground">至</span>
            <AdsDatePickerButton
              value={endDate}
              placeholder="结束日期"
              onChange={(date: Date | undefined) => { setEndDate(date); setPage(1); }}
            />
          </div>
          <Button variant="ghost" size="sm" className="rounded-none" onClick={commitFilters}>
            <Search className="h-3.5 w-3.5" />
            查询
          </Button>
          <Button variant="ghost" size="sm" className="rounded-none" onClick={handleReset}>
            <RotateCcw className="h-3.5 w-3.5" />
            重置
          </Button>
        </div>
        {/* 操作区 */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button data-ai-section-type="button" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              新建订单
            </Button>
            <Button variant="outline" disabled={!hasSelection} onClick={handleBatchApprove}>批量通过</Button>
            <Button variant="outline" disabled={!hasSelection} onClick={handleBatchReject}>批量驳回</Button>
            <Button variant="outline" onClick={() => void handleExport()}>
              <Download className="h-4 w-4" />
              导出Excel
            </Button>
            <ColumnSettingsButton
              columnMetas={columnMetas} hiddenIds={hiddenIds}
              onToggle={toggleColumn} onReset={resetColumns} onSetAll={setAllColumns}
            />
          </div>
          {hasSelection ? (
            <span className="text-xs text-muted-foreground">已选 {selectedKeys.length} 条</span>
          ) : null}
        </div>
        {/* 表格 */}
        <Table<VideoOrder>
          columns={visibleColumns}
          dataSource={items}
          loading={loading}
          rowKey="id"
          scroll={{ x: 1500, y: 500 }}
          locale={{ emptyText: '暂无订单数据' }}
          rowSelection={{
            selectedRowKeys: selectedKeys,
            onChange: (keys: Key[]) => setSelectedKeys(keys),
          }}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total,
            onChange: (nextPage: number) => setPage(nextPage),
          }}
        />
      </ReportCard>

      {/* 新建 / 编辑弹窗 */}
      <VideoOrderFormDialog
        open={formOpen}
        editing={editing}
        onSaved={refresh}
        onOpenChange={setFormOpen}
      />

      {/* 详情弹窗 */}
      <VideoOrderDetailDialog
        open={detailItem !== null}
        order={detailItem}
        onOpenChange={(open: boolean) => { if (!open) setDetailItem(null); }}
      />

      {/* 单条审批弹窗 */}
      <VideoOrderApproveDialog
        open={approvingItem !== null}
        order={approvingItem}
        onDone={refresh}
        onOpenChange={(open: boolean) => { if (!open) setApprovingItem(null); }}
      />

      {/* 批量驳回弹窗 */}
      <VideoOrderRejectDialog
        open={rejectingIds.length > 0}
        ids={rejectingIds}
        onDone={refresh}
        onOpenChange={(open: boolean) => { if (!open) setRejectingIds([]); }}
      />

      {/* 批量通过确认弹窗 */}
      <AdsConfirmDialog
        open={approvingIds.length > 0}
        title="批量通过订单？"
        description={`即将通过 ${approvingIds.length} 条待审核订单，通过后订单进入已通过状态。`}
        confirmText="确认通过"
        onOpenChange={(open: boolean) => { if (!open) setApprovingIds([]); }}
        onConfirm={() => void handleBatchApproveConfirm()}
      />

      {/* 删除二次确认 */}
      <AdsConfirmDialog
        open={deletingItem !== null}
        title="确认删除？"
        description={`即将删除订单「${deletingItem?.orderNo ?? ''}」，删除后不可恢复。`}
        confirmText="确认删除"
        destructive
        onOpenChange={(open: boolean) => { if (!open) setDeletingItem(null); }}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}
