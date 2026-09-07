import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
} from 'react';
import dayjs from 'dayjs';
import { Download, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Table } from '@lark-apaas/client-toolkit/antd-table';
import { ReportCard, SectionHeader } from '@client/src/components/blueprint';
import { ColumnSettingsButton } from '@client/src/components/column-settings-button';
import { useColumnSettings } from '@client/src/hooks/useColumnSettings';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import type { AdTransfer } from '@shared/api.interface';
import {
  approveAdTransfer,
  deleteAdTransfer,
  fetchAdTransfers,
} from '@client/src/api/ad-business';
import { AdsTabs } from './AdsTabs';
import { AdsDatePickerButton } from './AdsDatePickerButton';
import { AdsConfirmDialog } from './AdsConfirmDialog';
import { AdsApproveDialog } from './AdsApproveDialog';
import { TransferFormDialog } from './TransferFormDialog';
import { TransferDetailDialog } from './TransferDetailDialog';
import { buildTransferColumns } from './transfer-columns';
import { exportRowsToExcel } from './ads-excel';
import {
  FILTER_ALL,
  TRANSFER_STATUS_OPTIONS,
  toErrorText,
} from './ads-constants';

const PAGE_SIZE: number = 20;

export default function AdTransfersPage() {
  /* 文本筛选（防抖） */
  const [draftNo, setDraftNo] = useState<string>('');
  const [draftAccount, setDraftAccount] = useState<string>('');
  const [draftFrom, setDraftFrom] = useState<string>('');
  const [draftTo, setDraftTo] = useState<string>('');
  const [transferNo, setTransferNo] = useState<string>('');
  const [accountName, setAccountName] = useState<string>('');
  const [fromSubject, setFromSubject] = useState<string>('');
  const [toSubject, setToSubject] = useState<string>('');
  const [status, setStatus] = useState<string>(FILTER_ALL);
  const [startTime, setStartTime] = useState<Date | undefined>(undefined);
  const [endTime, setEndTime] = useState<Date | undefined>(undefined);
  const [page, setPage] = useState<number>(1);

  const [items, setItems] = useState<AdTransfer[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [approvingItem, setApprovingItem] = useState<AdTransfer | null>(null);
  const [deletingItem, setDeletingItem] = useState<AdTransfer | null>(null);

  useEffect(() => {
    const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
      setTransferNo(draftNo.trim());
      setAccountName(draftAccount.trim());
      setFromSubject(draftFrom.trim());
      setToSubject(draftTo.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [draftNo, draftAccount, draftFrom, draftTo]);

  const filterParams = useMemo(
    () => ({
      transferNo: transferNo || undefined,
      accountName: accountName || undefined,
      fromSubject: fromSubject || undefined,
      toSubject: toSubject || undefined,
      status: status === FILTER_ALL ? undefined : status,
      startTime: startTime
        ? dayjs(startTime).startOf('day').toISOString()
        : undefined,
      endTime: endTime ? dayjs(endTime).endOf('day').toISOString() : undefined,
    }),
    [transferNo, accountName, fromSubject, toSubject, status, startTime, endTime],
  );

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchAdTransfers({
        ...filterParams,
        page,
        pageSize: PAGE_SIZE,
      });
      setItems(result.items);
      setTotal(result.total);
    } catch (error: unknown) {
      logger.error(`加载转户列表失败: ${toErrorText(error)}`);
      toast.error('加载转户列表失败');
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

  const handleApprove = async (
    approved: boolean,
    rejectReason?: string,
  ): Promise<void> => {
    if (!approvingItem) return;
    try {
      await approveAdTransfer(approvingItem.id, { approved, rejectReason });
      toast.success(approved ? '已通过该转户申请' : '已驳回该转户申请');
      refresh();
    } catch (error: unknown) {
      logger.error(`审批失败: ${toErrorText(error)}`);
      toast.error(`审批失败：${toErrorText(error)}`);
      throw error;
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!deletingItem) return;
    try {
      await deleteAdTransfer(deletingItem.id);
      toast.success('已删除该转户申请');
      setDeletingItem(null);
      refresh();
    } catch (error: unknown) {
      logger.error(`删除失败: ${toErrorText(error)}`);
      toast.error(`删除失败：${toErrorText(error)}`);
    }
  };

  const handleExport = async (): Promise<void> => {
    try {
      const result = await fetchAdTransfers({
        ...filterParams,
        page: 1,
        pageSize: 1000,
      });
      const rows: Record<string, string>[] = result.items.map(
        (item: AdTransfer) => ({
          转户编号: item.transferNo,
          账户: item.accountName,
          原主体: item.fromSubject,
          目标主体: item.toSubject,
          原端口: item.fromPort,
          目标端口: item.toPort,
          状态: item.status,
          申请时间: dayjs(item.createdAt).format('YYYY-MM-DD HH:mm'),
          转户原因: item.transferReason,
        }),
      );
      const count: number = await exportRowsToExcel(
        rows,
        ['转户编号', '账户', '原主体', '目标主体', '原端口', '目标端口', '状态', '申请时间', '转户原因'],
        '转户管理',
        '转户管理',
      );
      toast.success(`已导出 ${count} 条转户记录`);
    } catch (error: unknown) {
      logger.error(`导出失败: ${toErrorText(error)}`);
      toast.error(`导出失败：${toErrorText(error)}`);
    }
  };

  const columns = useMemo(
    () =>
      buildTransferColumns({
        onDetail: (item: AdTransfer) => setDetailId(item.id),
        onApprove: (item: AdTransfer) => setApprovingItem(item),
        onDelete: (item: AdTransfer) => setDeletingItem(item),
      }),
    [],
  );

  const {
    visibleColumns, columnMetas, hiddenIds,
    toggleColumn, resetColumns, setAllColumns,
  } = useColumnSettings(columns);

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-8 px-8 py-8">
      <AdsTabs />
      <ReportCard>
        <SectionHeader
          no="04"
          label="AD TRANSFERS"
          subtitle="转户管理 / 主体端口变更 / 审批流"
        />
        {/* 筛选区 */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Input
            className="w-32 rounded-none"
            placeholder="转户编号"
            value={draftNo}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setDraftNo(event.target.value)
            }
          />
          <Input
            className="w-36 rounded-none"
            placeholder="账户名称"
            value={draftAccount}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setDraftAccount(event.target.value)
            }
          />
          <Input
            className="w-32 rounded-none"
            placeholder="原主体"
            value={draftFrom}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setDraftFrom(event.target.value)
            }
          />
          <Input
            className="w-32 rounded-none"
            placeholder="目标主体"
            value={draftTo}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setDraftTo(event.target.value)
            }
          />
          <Select
            value={status}
            onValueChange={(value: string) => {
              setStatus(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-32 rounded-none">
              <SelectValue placeholder="状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={FILTER_ALL}>全部状态</SelectItem>
              {TRANSFER_STATUS_OPTIONS.map((option: string) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">申请时间</span>
            <AdsDatePickerButton
              value={startTime}
              onChange={(date: Date | undefined) => {
                setStartTime(date);
                setPage(1);
              }}
              placeholder="开始日期"
            />
            <span className="text-xs text-muted-foreground">至</span>
            <AdsDatePickerButton
              value={endTime}
              onChange={(date: Date | undefined) => {
                setEndTime(date);
                setPage(1);
              }}
              placeholder="结束日期"
            />
          </div>
        </div>
        {/* 操作区 */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              data-ai-section-type="button"
              onClick={() => setFormOpen(true)}
            >
              <Plus className="h-4 w-4" />
              新建
            </Button>
            <Button variant="outline" onClick={() => void handleExport()}>
              <Download className="h-4 w-4" />
              导出Excel
            </Button>
            <ColumnSettingsButton
              columnMetas={columnMetas}
              hiddenIds={hiddenIds}
              onToggle={toggleColumn}
              onReset={resetColumns}
              onSetAll={setAllColumns}
            />
          </div>
        </div>
        {/* 表格 */}
        <Table<AdTransfer>
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

      <TransferFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSaved={refresh}
      />
      <TransferDetailDialog
        transferId={detailId}
        onOpenChange={(open: boolean) => {
          if (!open) setDetailId(null);
        }}
      />
      <AdsApproveDialog
        open={approvingItem !== null}
        title="转户审批"
        targetName={
          approvingItem
            ? `${approvingItem.transferNo}（${approvingItem.accountName}），通过后将同步更新广告账户的主体与端口`
            : ''
        }
        onOpenChange={(open: boolean) => {
          if (!open) setApprovingItem(null);
        }}
        onConfirm={handleApprove}
      />
      <AdsConfirmDialog
        open={deletingItem !== null}
        title="确认删除？"
        description={`即将删除转户申请「${deletingItem?.transferNo ?? ''}」，删除后不可恢复。`}
        confirmText="确认删除"
        destructive
        onOpenChange={(open: boolean) => {
          if (!open) setDeletingItem(null);
        }}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}
