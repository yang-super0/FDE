import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type Key,
} from 'react';
import dayjs from 'dayjs';
import { Download, Plus, Upload } from 'lucide-react';
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
import type {
  AdAccount,
  AdAccountListResult,
  AdFiling,
  CreateAdFilingRequest,
} from '@shared/api.interface';
import {
  batchCreateAdFilings,
  deleteAdFiling,
  fetchAdAccounts,
  fetchAdFilings,
  reviewAdFiling,
} from '@client/src/api/ad-business';
import { AdsTabs } from './AdsTabs';
import { AdsDatePickerButton } from './AdsDatePickerButton';
import { AdsConfirmDialog } from './AdsConfirmDialog';
import { AdsApproveDialog } from './AdsApproveDialog';
import { FilingFormDialog } from './FilingFormDialog';
import { FilingDetailDialog } from './FilingDetailDialog';
import { buildFilingColumns } from './filing-columns';
import { exportAdFilings, parseFilingImportFile } from './ads-excel';
import {
  FILTER_ALL,
  FILING_STATUS_OPTIONS,
  INDUSTRY_OPTIONS,
  PLATFORM_OPTIONS,
  toErrorText,
} from './ads-constants';

const PAGE_SIZE: number = 20;

export default function AdFilingsPage() {
  /* 文本筛选（防抖） */
  const [draftNo, setDraftNo] = useState<string>('');
  const [draftAccount, setDraftAccount] = useState<string>('');
  const [draftGroup, setDraftGroup] = useState<string>('');
  const [draftSubject, setDraftSubject] = useState<string>('');
  const [filingNo, setFilingNo] = useState<string>('');
  const [accountName, setAccountName] = useState<string>('');
  const [groupName, setGroupName] = useState<string>('');
  const [subjectName, setSubjectName] = useState<string>('');
  const [platform, setPlatform] = useState<string>(FILTER_ALL);
  const [industry, setIndustry] = useState<string>(FILTER_ALL);
  const [status, setStatus] = useState<string>(FILTER_ALL);
  const [startTime, setStartTime] = useState<Date | undefined>(undefined);
  const [endTime, setEndTime] = useState<Date | undefined>(undefined);
  const [page, setPage] = useState<number>(1);

  const [items, setItems] = useState<AdFiling[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedKeys, setSelectedKeys] = useState<Key[]>([]);

  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [reviewingItem, setReviewingItem] = useState<AdFiling | null>(null);
  const [deletingItem, setDeletingItem] = useState<AdFiling | null>(null);
  const [importing, setImporting] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
      setFilingNo(draftNo.trim());
      setAccountName(draftAccount.trim());
      setGroupName(draftGroup.trim());
      setSubjectName(draftSubject.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [draftNo, draftAccount, draftGroup, draftSubject]);

  const filterParams = useMemo(
    () => ({
      filingNo: filingNo || undefined,
      accountName: accountName || undefined,
      groupName: groupName || undefined,
      subjectName: subjectName || undefined,
      platform: platform === FILTER_ALL ? undefined : platform,
      industry: industry === FILTER_ALL ? undefined : industry,
      status: status === FILTER_ALL ? undefined : status,
      startTime: startTime
        ? dayjs(startTime).startOf('day').toISOString()
        : undefined,
      endTime: endTime ? dayjs(endTime).endOf('day').toISOString() : undefined,
    }),
    [filingNo, accountName, groupName, subjectName, platform, industry, status, startTime, endTime],
  );

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchAdFilings({
        ...filterParams,
        page,
        pageSize: PAGE_SIZE,
      });
      setItems(result.items);
      setTotal(result.total);
    } catch (error: unknown) {
      logger.error(`加载报备列表失败: ${toErrorText(error)}`);
      toast.error('加载报备列表失败');
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

  const handleReview = async (
    approved: boolean,
    rejectReason?: string,
  ): Promise<void> => {
    if (!reviewingItem) return;
    try {
      await reviewAdFiling(reviewingItem.id, { approved, rejectReason });
      toast.success(approved ? '已通过该报备' : '已驳回该报备');
      refresh();
    } catch (error: unknown) {
      logger.error(`审核失败: ${toErrorText(error)}`);
      toast.error(`审核失败：${toErrorText(error)}`);
      throw error;
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!deletingItem) return;
    try {
      await deleteAdFiling(deletingItem.id);
      toast.success('已删除该报备');
      setDeletingItem(null);
      refresh();
    } catch (error: unknown) {
      logger.error(`删除失败: ${toErrorText(error)}`);
      toast.error(`删除失败：${toErrorText(error)}`);
    }
  };

  const handleExport = async (): Promise<void> => {
    try {
      const result = await fetchAdFilings({
        ...filterParams,
        page: 1,
        pageSize: 1000,
      });
      const count: number = await exportAdFilings(result.items);
      toast.success(`已导出 ${count} 条报备`);
    } catch (error: unknown) {
      logger.error(`导出失败: ${toErrorText(error)}`);
      toast.error(`导出失败：${toErrorText(error)}`);
    }
  };

  const handleImportFile = async (
    event: ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const file: File | undefined = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setImporting(true);
    try {
      const accountResult: AdAccountListResult = await fetchAdAccounts({
        page: 1,
        pageSize: 1000,
      });
      const accountIdMap: Map<string, string> = new Map();
      accountResult.items.forEach((account: AdAccount) => {
        accountIdMap.set(account.accountNo, account.id);
      });
      const parsed: CreateAdFilingRequest[] = await parseFilingImportFile(
        file,
        (accountNo: string) => accountIdMap.get(accountNo) ?? null,
      );
      if (parsed.length === 0) {
        toast.error(
          '未解析到有效数据（需包含「账户编号」列，且编号需匹配已有广告账户）',
        );
        return;
      }
      const result = await batchCreateAdFilings(parsed);
      toast.success(`成功导入 ${result.created} 条报备`);
      refresh();
    } catch (error: unknown) {
      logger.error(`导入失败: ${toErrorText(error)}`);
      toast.error(`导入失败：${toErrorText(error)}`);
    } finally {
      setImporting(false);
    }
  };

  const columns = useMemo(
    () =>
      buildFilingColumns({
        onDetail: (item: AdFiling) => setDetailId(item.id),
        onReview: (item: AdFiling) => setReviewingItem(item),
        onDelete: (item: AdFiling) => setDeletingItem(item),
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
          no="03"
          label="AD FILINGS"
          subtitle="报备管理 / 报备审核 / 导入导出"
        />
        {/* 筛选区 */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Input
            className="w-32 rounded-none"
            placeholder="报备编号"
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
            placeholder="集团名称"
            value={draftGroup}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setDraftGroup(event.target.value)
            }
          />
          <Input
            className="w-32 rounded-none"
            placeholder="主体名称"
            value={draftSubject}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setDraftSubject(event.target.value)
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
          <Select
            value={industry}
            onValueChange={(value: string) => {
              setIndustry(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-32 rounded-none">
              <SelectValue placeholder="行业" />
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
              {FILING_STATUS_OPTIONS.map((option: string) => (
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
            <Button
              variant="outline"
              disabled={importing}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              {importing ? '导入中...' : '批量导入'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                void handleImportFile(event)
              }
            />
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
              已选 {selectedKeys.length} 条
            </span>
          ) : null}
        </div>
        {/* 表格 */}
        <Table<AdFiling>
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

      <FilingFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSaved={refresh}
      />
      <FilingDetailDialog
        filingId={detailId}
        onOpenChange={(open: boolean) => {
          if (!open) setDetailId(null);
        }}
      />
      <AdsApproveDialog
        open={reviewingItem !== null}
        title="报备审核"
        targetName={
          reviewingItem
            ? `${reviewingItem.filingNo}（${reviewingItem.accountName}）`
            : ''
        }
        onOpenChange={(open: boolean) => {
          if (!open) setReviewingItem(null);
        }}
        onConfirm={handleReview}
      />
      <AdsConfirmDialog
        open={deletingItem !== null}
        title="确认删除？"
        description={`即将删除报备「${deletingItem?.filingNo ?? ''}」，删除后不可恢复。`}
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
