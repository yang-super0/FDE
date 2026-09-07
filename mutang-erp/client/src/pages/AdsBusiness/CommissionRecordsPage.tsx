import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type Key,
} from 'react';
import dayjs from 'dayjs';
import { Banknote, Calculator, Download } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Table } from '@lark-apaas/client-toolkit/antd-table';
import { ReportCard, SectionHeader } from '@client/src/components/blueprint';
import { ColumnSettingsButton } from '@client/src/components/column-settings-button';
import { useColumnSettings } from '@client/src/hooks/useColumnSettings';
import { UserSelect } from '@client/src/components/business-ui/user-select';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import type { CommissionRecord } from '@shared/api.interface';
import {
  calculateCommissions,
  deleteCommissionRecord,
  fetchCommissionRecords,
  payCommissions,
} from '@client/src/api/ad-business';
import { AdsTabs } from './AdsTabs';
import { AdsConfirmDialog } from './AdsConfirmDialog';
import { RecordDetailDialog } from './RecordDetailDialog';
import { buildRecordColumns } from './record-columns';
import { exportRowsToExcel } from './ads-excel';
import {
  FILTER_ALL,
  PLATFORM_OPTIONS,
  RECORD_STATUS_OPTIONS,
  formatMoney,
  toErrorText,
} from './ads-constants';

const PAGE_SIZE: number = 20;
const PERIOD_PATTERN: RegExp = /^\d{4}-\d{2}$/u;

export default function CommissionRecordsPage() {
  /* 文本筛选（防抖） */
  const [draftNo, setDraftNo] = useState<string>('');
  const [draftSalesperson, setDraftSalesperson] = useState<string>('');
  const [draftAccount, setDraftAccount] = useState<string>('');
  const [draftGroup, setDraftGroup] = useState<string>('');
  const [recordNo, setRecordNo] = useState<string>('');
  const [salesperson, setSalesperson] = useState<string>('');
  const [accountName, setAccountName] = useState<string>('');
  const [groupName, setGroupName] = useState<string>('');
  const [platform, setPlatform] = useState<string>(FILTER_ALL);
  const [status, setStatus] = useState<string>(FILTER_ALL);

  /* 周期筛选：输入草稿 + 校验后才生效 */
  const [draftPeriod, setDraftPeriod] = useState<string>('');
  const [period, setPeriod] = useState<string>('');

  const [page, setPage] = useState<number>(1);
  const [items, setItems] = useState<CommissionRecord[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedKeys, setSelectedKeys] = useState<Key[]>([]);

  const [calcOpen, setCalcOpen] = useState<boolean>(false);
  const [calcPeriod, setCalcPeriod] = useState<string>('');
  const [calcSalesperson, setCalcSalesperson] = useState<string | null>(null);
  const [calculating, setCalculating] = useState<boolean>(false);

  const [detailId, setDetailId] = useState<string | null>(null);
  const [payingItems, setPayingItems] = useState<CommissionRecord[]>([]);
  const [deletingItem, setDeletingItem] = useState<CommissionRecord | null>(null);

  useEffect(() => {
    const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
      setRecordNo(draftNo.trim());
      setSalesperson(draftSalesperson.trim());
      setAccountName(draftAccount.trim());
      setGroupName(draftGroup.trim());
      /* 周期校验：为空或格式合法才触发查询 */
      const nextPeriod: string = draftPeriod.trim();
      if (nextPeriod === '') {
        setPeriod('');
      } else if (PERIOD_PATTERN.test(nextPeriod)) {
        setPeriod(nextPeriod);
      } else {
        toast.error('周期格式不正确，请输入如 2026-09 的年月');
      }
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [draftNo, draftSalesperson, draftAccount, draftGroup, draftPeriod]);

  const filterParams = useMemo(
    () => ({
      recordNo: recordNo || undefined,
      salesperson: salesperson || undefined,
      accountName: accountName || undefined,
      groupName: groupName || undefined,
      platform: platform === FILTER_ALL ? undefined : platform,
      period: period || undefined,
      status: status === FILTER_ALL ? undefined : status,
    }),
    [recordNo, salesperson, accountName, groupName, platform, period, status],
  );

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchCommissionRecords({
        ...filterParams,
        page,
        pageSize: PAGE_SIZE,
      });
      setItems(result.items);
      setTotal(result.total);
    } catch (error: unknown) {
      logger.error(`加载提成记录失败: ${toErrorText(error)}`);
      toast.error('加载提成记录失败');
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

  /* ============ 计算提成 ============ */

  const openCalcDialog = (): void => {
    setCalcPeriod(dayjs().format('YYYY-MM'));
    setCalcSalesperson(null);
    setCalcOpen(true);
  };

  const handleCalculate = async (): Promise<void> => {
    const targetPeriod: string = calcPeriod.trim();
    if (!PERIOD_PATTERN.test(targetPeriod)) {
      toast.error('周期格式不正确，请输入如 2026-09 的年月');
      return;
    }
    setCalculating(true);
    try {
      const result = await calculateCommissions({
        period: targetPeriod,
        salesperson: calcSalesperson ?? undefined,
      });
      toast.success(`成功生成 ${result.created} 条提成记录`);
      setCalcOpen(false);
      refresh();
    } catch (error: unknown) {
      logger.error(`计算提成失败: ${toErrorText(error)}`);
      toast.error(`计算提成失败：${toErrorText(error)}`);
    } finally {
      setCalculating(false);
    }
  };

  /* ============ 发放（批量 / 单条） ============ */

  const selectedPending: CommissionRecord[] = useMemo(
    () => items.filter(
        (item: CommissionRecord) =>
          selectedKeys.includes(item.id) && item.status === '待发放',
      ),
    [items, selectedKeys],
  );

  const handleBatchPay = (): void => {
    if (selectedPending.length === 0) {
      toast.error('请先勾选「待发放」的提成记录');
      return;
    }
    setPayingItems(selectedPending);
  };

  const confirmPay = async (): Promise<void> => {
    const ids: string[] = payingItems.map((item: CommissionRecord) => item.id);
    try {
      const result = await payCommissions(ids);
      toast.success(`已发放 ${result.paid} 条`);
      setPayingItems([]);
      refresh();
    } catch (error: unknown) {
      logger.error(`发放失败: ${toErrorText(error)}`);
      toast.error(`发放失败：${toErrorText(error)}`);
    }
  };

  /* ============ 删除 ============ */

  const handleDelete = async (): Promise<void> => {
    if (!deletingItem) return;
    try {
      await deleteCommissionRecord(deletingItem.id);
      toast.success('已删除该提成记录');
      setDeletingItem(null);
      refresh();
    } catch (error: unknown) {
      logger.error(`删除失败: ${toErrorText(error)}`);
      toast.error(`删除失败：${toErrorText(error)}`);
    }
  };

  /* ============ 导出 ============ */

  const handleExport = async (): Promise<void> => {
    try {
      const result = await fetchCommissionRecords({
        ...filterParams,
        page: 1,
        pageSize: 1000,
      });
      const rows: Record<string, string>[] = result.items.map(
        (item: CommissionRecord) => ({
          记录编号: item.recordNo,
          账户: item.accountName,
          集团: item.groupName,
          平台: item.platform,
          周期: item.period,
          消耗金额: formatMoney(item.consumeAmount),
          提成金额: formatMoney(item.commissionAmount),
          状态: item.status,
          计算时间: item.calculatedAt ? dayjs(item.calculatedAt).format('YYYY-MM-DD HH:mm') : '',
          发放时间: item.paidAt ? dayjs(item.paidAt).format('YYYY-MM-DD HH:mm') : '',
        }),
      );
      const headers: string[] = [
        '记录编号', '账户', '集团', '平台', '周期',
        '消耗金额', '提成金额', '状态', '计算时间', '发放时间',
      ];
      const count: number = await exportRowsToExcel(
        rows,
        headers,
        '提成记录',
        '提成记录',
      );
      toast.success(`已导出 ${count} 条提成记录`);
    } catch (error: unknown) {
      logger.error(`导出失败: ${toErrorText(error)}`);
      toast.error(`导出失败：${toErrorText(error)}`);
    }
  };

  const columns = useMemo(
    () =>
      buildRecordColumns({
        onDetail: (item: CommissionRecord) => setDetailId(item.id),
        onPay: (item: CommissionRecord) => setPayingItems([item]),
        onDelete: (item: CommissionRecord) => setDeletingItem(item),
      }),
    [],
  );

  const {
    visibleColumns, columnMetas, hiddenIds,
    toggleColumn, resetColumns, setAllColumns,
  } = useColumnSettings(columns);

  const hasSelection: boolean = selectedKeys.length > 0;

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-8 px-8 py-8">
      <AdsTabs />
      <ReportCard>
        <SectionHeader
          no="06"
          label="COMMISSION RECORDS"
          subtitle="提成记录 / 计算提成 / 批量发放"
        />
        {/* 筛选区 */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Input
            className="w-32 rounded-none"
            placeholder="记录编号"
            value={draftNo}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setDraftNo(event.target.value)
            }
          />
          <Input
            className="w-32 rounded-none"
            placeholder="商务"
            value={draftSalesperson}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setDraftSalesperson(event.target.value)
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
            placeholder="集团名称"
            value={draftGroup}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setDraftGroup(event.target.value)
            }
          />
          <Select
            value={platform}
            onValueChange={(value: string) => {
              setPlatform(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-32 rounded-none">
              <SelectValue placeholder="平台" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={FILTER_ALL}>全部平台</SelectItem>
              {PLATFORM_OPTIONS.map((option: string) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            className="w-32 rounded-none font-mono"
            placeholder="2026-09"
            value={draftPeriod}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setDraftPeriod(event.target.value)
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
              {RECORD_STATUS_OPTIONS.map((option: string) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {/* 操作区 */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button data-ai-section-type="button" onClick={openCalcDialog}>
              <Calculator className="h-4 w-4" />
              计算提成
            </Button>
            <Button
              variant="outline"
              disabled={selectedPending.length === 0}
              onClick={handleBatchPay}
            >
              <Banknote className="h-4 w-4" />
              批量发放
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
          {hasSelection ? (
            <span className="text-xs text-muted-foreground">
              已选 {selectedKeys.length} 条，其中待发放{' '}
              {selectedPending.length} 条
            </span>
          ) : null}
        </div>
        {/* 表格 */}
        <Table<CommissionRecord>
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

      {/* 计算提成弹窗 */}
      <Dialog
        open={calcOpen}
        onOpenChange={(open: boolean) => {
          if (!calculating) setCalcOpen(open);
        }}
      >
        <DialogContent className="rounded-none sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              计算提成
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="text-xs font-bold">
                周期 <span className="text-destructive">*</span>
              </div>
              <Input
                className="rounded-none font-mono"
                placeholder="2026-09"
                value={calcPeriod}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setCalcPeriod(event.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <div className="text-xs font-bold">商务（可选）</div>
              <UserSelect
                value={calcSalesperson}
                onChange={(value: string | null) => setCalcSalesperson(value)}
                placeholder="不选则计算全部商务"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={calculating}
              onClick={() => setCalcOpen(false)}
            >
              取消
            </Button>
            <Button disabled={calculating} onClick={() => void handleCalculate()}>
              {calculating ? '计算中...' : '开始计算'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RecordDetailDialog
        recordId={detailId}
        onOpenChange={(open: boolean) => {
          if (!open) setDetailId(null);
        }}
      />

      <AdsConfirmDialog
        open={payingItems.length > 0}
        title="确认发放？"
        description={`即将发放 ${payingItems.length} 条提成记录，发放后状态变更为「已发放」。`}
        confirmText="确认发放"
        onOpenChange={(open: boolean) => {
          if (!open) setPayingItems([]);
        }}
        onConfirm={() => void confirmPay()}
      />

      <AdsConfirmDialog
        open={deletingItem !== null}
        title="确认删除？"
        description={
          deletingItem?.status === '已发放'
            ? `该提成记录「${deletingItem?.recordNo ?? ''}」已发放，删除将影响发放数据，请谨慎操作！`
            : `即将删除提成记录「${deletingItem?.recordNo ?? ''}」，删除后不可恢复。`
        }
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
