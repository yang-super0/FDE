import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type Key, type ReactNode } from 'react';
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
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@client/src/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@client/src/components/ui/select';
import type { Sample, SampleListParams } from '@shared/api.interface';
import {
  deleteSample, fetchSamples, markSample, receiveSample, shootingSample,
} from '@client/src/api/video-core/samples';
import { AdsConfirmDialog } from '@client/src/pages/AdsBusiness/AdsConfirmDialog';
import { AdsDatePickerButton } from '@client/src/pages/AdsBusiness/AdsDatePickerButton';
import { exportRowsToExcel } from '@client/src/pages/AdsBusiness/ads-excel';
import { VideoCoreTabs } from './VideoCoreTabs';
import {
  SampleFormDialog, SampleMailDialog, SampleReturnDialog,
} from './VideoSampleDialogs';
import { VIDEO_FILTER_ALL, VideoStatusBadge, toVideoErrorText } from './video-constants';

const PAGE_SIZE: number = 10;
const SAMPLE_STATUS_OPTIONS: string[] = [
  '待邮寄', '已邮寄', '已接收', '拍摄中', '已归还', '已丢失', '已消耗',
];

type SampleFlowKind = 'receive' | 'shooting' | 'lost' | 'consumed';

interface SampleConfirmTarget {
  item: Sample;
  kind: SampleFlowKind;
}

const reportError = (context: string, error: unknown): void => {
  logger.error(`${context}: ${toVideoErrorText(error)}`);
  toast.error(toVideoErrorText(error));
};

const CONFIRM_TEXT: Record<SampleFlowKind, { title: string; next: string; danger: boolean }> = {
  receive: { title: '确认登记接收？', next: '已接收', danger: false },
  shooting: { title: '确认进入拍摄中？', next: '拍摄中', danger: false },
  lost: { title: '确认标记丢失？', next: '已丢失', danger: true },
  consumed: { title: '确认标记消耗？', next: '已消耗', danger: true },
};

function StatusFilterSelect({ value, onChange }: {
  value: string; onChange: (value: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-32 rounded-none"><SelectValue placeholder="状态" /></SelectTrigger>
      <SelectContent>
        <SelectItem value={VIDEO_FILTER_ALL}>全部状态</SelectItem>
        {SAMPLE_STATUS_OPTIONS.map((option: string) => (
          <SelectItem key={option} value={option}>{option}</SelectItem>
        ))}
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

/** 样品详情内容：基本信息 + 快递信息垂直步骤条 */
function SampleDetailView({ sample }: { sample: Sample | null }) {
  const fmt = (value: string): string => (value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '');
  const rows: Array<[string, ReactNode]> = sample ? [
    ['样品单号', sample.sampleNo], ['产品名称', sample.productName],
    ['型号', sample.productModel], ['数量', `${sample.quantity}${sample.unit}`],
    ['客户名称', sample.customerName], ['关联项目', sample.projectNo], ['关联订单', sample.orderNo],
    ['状态', <VideoStatusBadge key="s" status={sample.status} />],
    ['寄件人', [sample.sender, sample.senderPhone].filter(Boolean).join(' · ')],
    ['寄件地址', sample.senderAddress],
    ['收件人', [sample.receiver, sample.receiverPhone].filter(Boolean).join(' · ')],
    ['收件地址', sample.receiverAddress], ['备注', sample.remark],
    ['创建时间', dayjs(sample.createdAt).format('YYYY-MM-DD HH:mm')],
  ] : [];
  const steps: Array<[string, string, string]> = sample ? [
    ['邮寄', sample.mailedAt, [sample.expressCompany, sample.expressNo].filter(Boolean).join(' · ')],
    ['接收', sample.receivedAt, sample.receiver],
    ['归还', sample.returnedAt, sample.returnExpressNo],
  ] : [];
  return (
    <>
      <div>
        {rows.map(([label, value]: [string, ReactNode]) => (
          <div key={label} className="flex items-start justify-between gap-4 border-b border-border py-2 text-sm">
            <span className="shrink-0 text-muted-foreground">{label}</span>
            <span className="break-words text-right font-medium">{value || '—'}</span>
          </div>
        ))}
      </div>
      <div className="pt-2">
        <div className="mb-3 text-xs font-black uppercase tracking-[0.15em] text-muted-foreground">快递信息</div>
        {steps.map(([label, time, detail]: [string, string, string], index: number) => (
          <div key={label} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className={`h-2.5 w-2.5 ${time ? 'bg-primary' : 'bg-border'}`} />
              {index < steps.length - 1 ? <span className="h-10 w-px bg-border" /> : null}
            </div>
            <div className="-mt-1 pb-4 text-sm">
              <div className="font-medium">{label}</div>
              <div className="text-xs text-muted-foreground">
                {time ? `${fmt(time)}${detail ? ` · ${detail}` : ''}` : '未完成'}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export default function VideoSamplesPage() {
  /* Filters: text inputs are debounced */
  const [draftNo, setDraftNo] = useState<string>('');
  const [draftProduct, setDraftProduct] = useState<string>('');
  const [draftCustomer, setDraftCustomer] = useState<string>('');
  const [sampleNo, setSampleNo] = useState<string>('');
  const [productName, setProductName] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [status, setStatus] = useState<string>(VIDEO_FILTER_ALL);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [page, setPage] = useState<number>(1);
  const [items, setItems] = useState<Sample[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedKeys, setSelectedKeys] = useState<Key[]>([]);
  /* 弹窗状态 */
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [editing, setEditing] = useState<Sample | null>(null);
  const [detailItem, setDetailItem] = useState<Sample | null>(null);
  const [deletingItem, setDeletingItem] = useState<Sample | null>(null);
  const [mailIds, setMailIds] = useState<number[]>([]);
  const [returnItem, setReturnItem] = useState<Sample | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<SampleConfirmTarget | null>(null);

  const filterTexts: Array<{ placeholder: string; value: string; set: (value: string) => void }> = [
    { placeholder: '样品单号', value: draftNo, set: setDraftNo },
    { placeholder: '产品名称', value: draftProduct, set: setDraftProduct },
    { placeholder: '客户名称', value: draftCustomer, set: setDraftCustomer },
  ];

  useEffect(() => {
    const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
      setSampleNo(draftNo.trim());
      setProductName(draftProduct.trim());
      setCustomerName(draftCustomer.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [draftNo, draftProduct, draftCustomer]);

  const filterParams = useMemo(
    (): SampleListParams => ({
      sampleNo: sampleNo || undefined,
      productName: productName || undefined,
      customerName: customerName || undefined,
      status: status === VIDEO_FILTER_ALL ? undefined : status,
      startDate: startDate ? dayjs(startDate).format('YYYY-MM-DD') : undefined,
      endDate: endDate ? dayjs(endDate).format('YYYY-MM-DD') : undefined,
    }),
    [sampleNo, productName, customerName, status, startDate, endDate],
  );

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchSamples({ ...filterParams, page, pageSize: PAGE_SIZE });
      setItems(result.items);
      setTotal(result.total);
    } catch (error: unknown) {
      reportError('加载样品列表失败', error);
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
    setDraftNo('');
    setDraftProduct('');
    setDraftCustomer('');
    setSampleNo('');
    setProductName('');
    setCustomerName('');
    setStatus(VIDEO_FILTER_ALL);
    setStartDate(undefined);
    setEndDate(undefined);
    setPage(1);
  };

  const handleDelete = async (): Promise<void> => {
    if (!deletingItem) return;
    try {
      await deleteSample(deletingItem.id);
      toast.success('样品单已删除');
      setDeletingItem(null);
      refresh();
    } catch (error: unknown) {
      reportError('删除样品单失败', error);
    }
  };

  const handleFlow = async (): Promise<void> => {
    if (!confirmTarget) return;
    const { item, kind } = confirmTarget;
    try {
      if (kind === 'receive') await receiveSample(item.id);
      else if (kind === 'shooting') await shootingSample(item.id);
      else await markSample(item.id, { status: kind === 'lost' ? '已丢失' : '已消耗' });
      toast.success(`样品状态已更新为「${CONFIRM_TEXT[kind].next}」`);
      setConfirmTarget(null);
      refresh();
    } catch (error: unknown) {
      reportError('更新样品状态失败', error);
    }
  };

  const handleBatchMail = (): void => {
    const pendingIds: number[] = items
      .filter((item: Sample) => selectedKeys.includes(item.id) && item.status === '待邮寄')
      .map((item: Sample) => item.id);
    if (pendingIds.length === 0) {
      toast.error('所选记录中没有待邮寄的样品');
      return;
    }
    setMailIds(pendingIds);
  };

  const handleExport = async (): Promise<void> => {
    try {
      const rows: Record<string, string>[] = items.map((item: Sample) => ({
        样品单号: item.sampleNo, 产品名称: item.productName, 型号: item.productModel,
        数量: `${item.quantity}${item.unit}`, 客户名称: item.customerName,
        关联项目: item.projectNo, 关联订单: item.orderNo, 状态: item.status,
        寄件人: item.sender, 收件人: item.receiver,
        快递公司: item.expressCompany, 快递单号: item.expressNo,
        邮寄日期: item.mailedAt ? dayjs(item.mailedAt).format('YYYY-MM-DD') : '',
        备注: item.remark,
      }));
      const count: number = await exportRowsToExcel(
        rows, Object.keys(rows[0] ?? { 样品单号: '' }), '样品管理', '样品管理',
      );
      toast.success(`已导出 ${count} 条样品记录`);
    } catch (error: unknown) {
      reportError('导出失败', error);
    }
  };

  const columns = useMemo((): TableColumnsType<Sample> => [
    {
      title: '样品单号',
      dataIndex: 'sampleNo',
      width: 150,
      fixed: 'left',
      render: (value: string) => <span className="font-bold text-primary">{value}</span>,
    },
    { title: '产品名称', dataIndex: 'productName', width: 130 },
    { title: '型号', dataIndex: 'productModel', width: 90 },
    {
      title: '数量', dataIndex: 'quantity', width: 80, align: 'right',
      render: (value: number, record: Sample) => `${value}${record.unit}`,
    },
    { title: '客户名称', dataIndex: 'customerName', width: 120 },
    { title: '关联项目', dataIndex: 'projectNo', width: 110 },
    {
      title: '状态', dataIndex: 'status', width: 90,
      render: (value: string) => <VideoStatusBadge status={value} />,
    },
    { title: '寄件人', dataIndex: 'sender', width: 90 },
    { title: '收件人', dataIndex: 'receiver', width: 90 },
    { title: '快递单号', dataIndex: 'expressNo', width: 130 },
    {
      title: '邮寄日期', dataIndex: 'mailedAt', width: 100,
      render: (value: string) => (value ? dayjs(value).format('YYYY-MM-DD') : ''),
    },
    {
      title: '操作',
      key: 'actions',
      width: 270,
      fixed: 'right',
      render: (_: unknown, record: Sample) => {
        const inUse: boolean = record.status === '已接收' || record.status === '拍摄中';
        return (
          <div className="flex flex-wrap items-center gap-1">
            <ActionLink onClick={() => setDetailItem(record)}>详情</ActionLink>
            {record.status === '待邮寄' ? (
              <>
                <ActionLink onClick={() => { setEditing(record); setFormOpen(true); }}>编辑</ActionLink>
                <ActionLink onClick={() => setMailIds([record.id])}>邮寄</ActionLink>
              </>
            ) : null}
            {record.status === '已邮寄' ? (
              <ActionLink onClick={() => setConfirmTarget({ item: record, kind: 'receive' })}>登记接收</ActionLink>
            ) : null}
            {record.status === '已接收' ? (
              <ActionLink onClick={() => setConfirmTarget({ item: record, kind: 'shooting' })}>拍摄中</ActionLink>
            ) : null}
            {inUse ? <ActionLink onClick={() => setReturnItem(record)}>归还</ActionLink> : null}
            {inUse ? (
              <>
                <ActionLink danger onClick={() => setConfirmTarget({ item: record, kind: 'lost' })}>标记丢失</ActionLink>
                <ActionLink danger onClick={() => setConfirmTarget({ item: record, kind: 'consumed' })}>标记消耗</ActionLink>
              </>
            ) : null}
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
  const confirmText = confirmTarget ? CONFIRM_TEXT[confirmTarget.kind] : undefined;

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-8 px-8 py-8">
      <VideoCoreTabs active="samples" />
      <ReportCard>
        <SectionHeader no="09" label="SAMPLES" subtitle="样品管理 / 邮寄流转 / 批量发货" />
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
          <StatusFilterSelect
            value={status}
            onChange={(value: string) => { setStatus(value); setPage(1); }}
          />
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">邮寄日期</span>
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
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button data-ai-section-type="button" onClick={() => { setEditing(null); setFormOpen(true); }}>
              <Plus className="h-4 w-4" />
              新建样品
            </Button>
            <Button variant="outline" disabled={!hasSelection} onClick={handleBatchMail}>批量邮寄</Button>
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
        <Table<Sample>
          columns={visibleColumns}
          dataSource={items}
          loading={loading}
          rowKey="id"
          scroll={{ x: 1500, y: 500 }}
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
      <SampleFormDialog
        open={formOpen}
        editing={editing}
        onSaved={refresh}
        onOpenChange={setFormOpen}
      />

      {/* 邮寄弹窗（行内 + 批量） */}
      <SampleMailDialog
        open={mailIds.length > 0}
        ids={mailIds}
        onDone={refresh}
        onOpenChange={(open: boolean) => { if (!open) setMailIds([]); }}
      />

      {/* 归还弹窗 */}
      <SampleReturnDialog
        open={returnItem !== null}
        sample={returnItem}
        onDone={refresh}
        onOpenChange={(open: boolean) => { if (!open) setReturnItem(null); }}
      />

      {/* 详情弹窗 */}
      <Dialog open={detailItem !== null}
        onOpenChange={(open: boolean) => { if (!open) setDetailItem(null); }}>
        <DialogContent className="max-w-xl rounded-none">
          <DialogHeader>
            <DialogTitle>样品详情</DialogTitle>
            <DialogDescription>{detailItem?.sampleNo ?? ''}</DialogDescription>
          </DialogHeader>
          <SampleDetailView sample={detailItem} />
        </DialogContent>
      </Dialog>

      {/* 状态流转确认：登记接收 / 拍摄中 / 标记丢失 / 标记消耗 */}
      <AdsConfirmDialog
        open={confirmTarget !== null}
        title={confirmText?.title ?? ''}
        description={`样品「${confirmTarget?.item.productName ?? ''}（${
          confirmTarget?.item.sampleNo ?? ''
        }）」状态即将更新为「${confirmText?.next ?? ''}」。${
          confirmText?.danger ? '操作后不可恢复。' : ''
        }`}
        confirmText="确认"
        destructive={confirmText?.danger}
        onOpenChange={(open: boolean) => { if (!open) setConfirmTarget(null); }}
        onConfirm={() => void handleFlow()}
      />

      {/* 删除二次确认 */}
      <AdsConfirmDialog
        open={deletingItem !== null}
        title="确认删除？"
        description={`即将删除样品单「${deletingItem?.sampleNo ?? ''}」，删除后不可恢复。`}
        confirmText="确认删除"
        destructive
        onOpenChange={(open: boolean) => { if (!open) setDeletingItem(null); }}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}
