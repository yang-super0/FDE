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
import { BadgeCheck, Download, Plus, Upload } from 'lucide-react';
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
  AdApplication,
  CreateAdApplicationRequest,
} from '@shared/api.interface';
import {
  approveAdApplication,
  batchCreateAdApplications,
  batchOpenAdApplications,
  deleteAdApplication,
  fetchAdApplications,
} from '@client/src/api/ad-business';
import { AdsTabs } from './AdsTabs';
import { AdsDatePickerButton } from './AdsDatePickerButton';
import { AdsConfirmDialog } from './AdsConfirmDialog';
import { AdsApproveDialog } from './AdsApproveDialog';
import { ApplicationFormDialog } from './ApplicationFormDialog';
import { ApplicationDetailDialog } from './ApplicationDetailDialog';
import { buildApplicationColumns } from './application-columns';
import {
  exportAdApplications,
  parseApplicationImportFile,
} from './ads-excel';
import {
  APPLICATION_STATUS_OPTIONS,
  FILTER_ALL,
  PLATFORM_OPTIONS,
  PORT_TYPE_OPTIONS,
  toErrorText,
} from './ads-constants';

const PAGE_SIZE: number = 20;

export default function AccountApplicationsPage() {
  /* 文本筛选（防抖） */
  const [draftNo, setDraftNo] = useState<string>('');
  const [draftGroup, setDraftGroup] = useState<string>('');
  const [draftSubject, setDraftSubject] = useState<string>('');
  const [applicationNo, setApplicationNo] = useState<string>('');
  const [groupName, setGroupName] = useState<string>('');
  const [subjectName, setSubjectName] = useState<string>('');
  const [platform, setPlatform] = useState<string>(FILTER_ALL);
  const [portType, setPortType] = useState<string>(FILTER_ALL);
  const [status, setStatus] = useState<string>(FILTER_ALL);
  const [startTime, setStartTime] = useState<Date | undefined>(undefined);
  const [endTime, setEndTime] = useState<Date | undefined>(undefined);
  const [page, setPage] = useState<number>(1);

  const [items, setItems] = useState<AdApplication[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedKeys, setSelectedKeys] = useState<Key[]>([]);

  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<AdApplication | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [approvingItem, setApprovingItem] = useState<AdApplication | null>(
    null,
  );
  const [deletingItem, setDeletingItem] = useState<AdApplication | null>(null);
  const [batchOpenOpen, setBatchOpenOpen] = useState<boolean>(false);
  const [importing, setImporting] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
      setApplicationNo(draftNo.trim());
      setGroupName(draftGroup.trim());
      setSubjectName(draftSubject.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [draftNo, draftGroup, draftSubject]);

  const filterParams = useMemo(
    () => ({
      applicationNo: applicationNo || undefined,
      groupName: groupName || undefined,
      subjectName: subjectName || undefined,
      platform: platform === FILTER_ALL ? undefined : platform,
      portType: portType === FILTER_ALL ? undefined : portType,
      status: status === FILTER_ALL ? undefined : status,
      startTime: startTime
        ? dayjs(startTime).startOf('day').toISOString()
        : undefined,
      endTime: endTime ? dayjs(endTime).endOf('day').toISOString() : undefined,
    }),
    [applicationNo, groupName, subjectName, platform, portType, status, startTime, endTime],
  );

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchAdApplications({
        ...filterParams,
        page,
        pageSize: PAGE_SIZE,
      });
      setItems(result.items);
      setTotal(result.total);
    } catch (error: unknown) {
      logger.error(`加载开户申请失败: ${toErrorText(error)}`);
      toast.error('加载开户申请失败');
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

  const handleApprove = async (
    approved: boolean,
    rejectReason?: string,
  ): Promise<void> => {
    if (!approvingItem) return;
    try {
      await approveAdApplication(approvingItem.id, { approved, rejectReason });
      toast.success(approved ? '已通过该开户申请' : '已驳回该开户申请');
      refresh();
    } catch (error: unknown) {
      logger.error(`审批失败: ${toErrorText(error)}`);
      toast.error(`审批失败：${toErrorText(error)}`);
      throw error;
    }
  };

  const handleBatchOpen = async (): Promise<void> => {
    try {
      const result = await batchOpenAdApplications(selectedKeys.map(String));
      toast.success(`成功开户 ${result.opened} 条申请`);
      setBatchOpenOpen(false);
      refresh();
    } catch (error: unknown) {
      logger.error(`批量开户失败: ${toErrorText(error)}`);
      toast.error(`批量开户失败：${toErrorText(error)}`);
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!deletingItem) return;
    try {
      await deleteAdApplication(deletingItem.id);
      toast.success('已删除该开户申请');
      setDeletingItem(null);
      refresh();
    } catch (error: unknown) {
      logger.error(`删除失败: ${toErrorText(error)}`);
      toast.error(`删除失败：${toErrorText(error)}`);
    }
  };

  const handleExport = async (): Promise<void> => {
    try {
      const result = await fetchAdApplications({
        ...filterParams,
        page: 1,
        pageSize: 1000,
      });
      const count: number = await exportAdApplications(result.items);
      toast.success(`已导出 ${count} 条开户申请`);
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
      const parsed: CreateAdApplicationRequest[] =
        await parseApplicationImportFile(file);
      if (parsed.length === 0) {
        toast.error('未解析到有效数据（需包含「集团名称/主体名称/投放平台」列）');
        return;
      }
      const result = await batchCreateAdApplications(parsed);
      toast.success(`成功导入 ${result.created} 条开户申请`);
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
      buildApplicationColumns({
        onDetail: (item: AdApplication) => setDetailId(item.id),
        onApprove: (item: AdApplication) => setApprovingItem(item),
        onEdit: (item: AdApplication) => {
          setEditingItem(item);
          setFormOpen(true);
        },
        onDelete: (item: AdApplication) => setDeletingItem(item),
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
          no="01"
          label="ACCOUNT APPLICATIONS"
          subtitle="开户管理 / 申请审批 / 批量开户 / 导入导出"
        />
        {/* 筛选区 */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Input
            className="w-36 rounded-none"
            placeholder="申请编号"
            value={draftNo}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setDraftNo(event.target.value)
            }
          />
          <Input
            className="w-36 rounded-none"
            placeholder="集团名称"
            value={draftGroup}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setDraftGroup(event.target.value)
            }
          />
          <Input
            className="w-36 rounded-none"
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
            value={portType}
            onValueChange={(value: string) => {
              setPortType(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-32 rounded-none">
              <SelectValue placeholder="端口" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={FILTER_ALL}>全部端口</SelectItem>
              {PORT_TYPE_OPTIONS.map((option: string) => (
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
              {APPLICATION_STATUS_OPTIONS.map((option: string) => (
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
              onClick={() => {
                setEditingItem(null);
                setFormOpen(true);
              }}
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
            <Button
              variant="outline"
              disabled={!hasSelection}
              onClick={() => setBatchOpenOpen(true)}
            >
              <BadgeCheck className="h-4 w-4" />
              批量开户
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
              已选 {selectedKeys.length} 条
            </span>
          ) : null}
        </div>
        {/* 表格 */}
        <Table<AdApplication>
          columns={visibleColumns}
          dataSource={items}
          loading={loading}
          rowKey="id"
          scroll={{ x: 1400, y: 500 }}
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

      <ApplicationFormDialog
        open={formOpen}
        editing={editingItem}
        onOpenChange={setFormOpen}
        onSaved={refresh}
      />
      <ApplicationDetailDialog
        applicationId={detailId}
        onOpenChange={(open: boolean) => {
          if (!open) setDetailId(null);
        }}
      />
      <AdsApproveDialog
        open={approvingItem !== null}
        title="开户申请审批"
        targetName={
          approvingItem
            ? `${approvingItem.applicationNo}（${approvingItem.subjectName}）`
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
        description={`即将删除开户申请「${deletingItem?.applicationNo ?? ''}」，删除后不可恢复。`}
        confirmText="确认删除"
        destructive
        onOpenChange={(open: boolean) => {
          if (!open) setDeletingItem(null);
        }}
        onConfirm={() => void handleDelete()}
      />
      <AdsConfirmDialog
        open={batchOpenOpen}
        title="确认批量开户？"
        description={`将对已选中的 ${selectedKeys.length} 条申请执行批量开户，仅已通过审批的申请会成功开户。`}
        confirmText="确认开户"
        onOpenChange={setBatchOpenOpen}
        onConfirm={() => void handleBatchOpen()}
      />
    </div>
  );
}
