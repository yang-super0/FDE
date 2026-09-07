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
import { Download, Plus, Search, Upload, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Table } from '@lark-apaas/client-toolkit/antd-table';
import { UserSelect } from '@client/src/components/business-ui/user-select';
import { ColumnSettingsButton } from '@client/src/components/column-settings-button';
import { useColumnSettings } from '@client/src/hooks/useColumnSettings';
import { ReportCard, SectionHeader } from '@client/src/components/blueprint';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@client/src/components/ui/alert-dialog';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import type { CreateLeadRequest, Lead, LeadStatus } from '@shared/api.interface';
import {
  assignLeads,
  batchCreateLeads,
  deleteLead,
  fetchLeads,
} from '@client/src/api/customer-pool';
import { PoolTabs } from './PoolTabs';
import { DatePickerButton } from './DatePickerButton';
import { AssignUserDialog } from './AssignUserDialog';
import { LeadCreateDialog } from './LeadCreateDialog';
import { LeadDetailDrawer } from './LeadDetailDrawer';
import { LeadFollowUpDialog } from './LeadFollowUpDialog';
import { AbandonLeadDialog, LeadConvertDialog } from './LeadConvertDialog';
import { buildLeadColumns } from './lead-columns';
import { exportLeadsToExcel, parseLeadImportFile } from './lead-excel';
import {
  FILTER_ALL,
  INDUSTRY_OPTIONS,
  LEAD_SOURCE_OPTIONS,
  toErrorText,
} from './constants';

const PAGE_SIZE: number = 20;
const LEAD_STATUS_OPTIONS: LeadStatus[] = ['待跟进', '跟进中', '已转化', '已放弃'];

export default function LeadsPage() {
  const [searchText, setSearchText] = useState<string>('');
  const [contactText, setContactText] = useState<string>('');
  const [leadName, setLeadName] = useState<string>('');
  const [contactPerson, setContactPerson] = useState<string>('');
  const [industry, setIndustry] = useState<string>(FILTER_ALL);
  const [source, setSource] = useState<string>(FILTER_ALL);
  const [status, setStatus] = useState<string>(FILTER_ALL);
  const [owner, setOwner] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<Date | undefined>(undefined);
  const [endTime, setEndTime] = useState<Date | undefined>(undefined);
  const [page, setPage] = useState<number>(1);

  const [items, setItems] = useState<Lead[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedKeys, setSelectedKeys] = useState<Key[]>([]);

  const [createOpen, setCreateOpen] = useState<boolean>(false);
  const [assignOpen, setAssignOpen] = useState<boolean>(false);
  const [assignIds, setAssignIds] = useState<string[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [importing, setImporting] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [detailVersion, setDetailVersion] = useState<number>(0);
  const [followUpLead, setFollowUpLead] = useState<Lead | null>(null);
  const [convertTarget, setConvertTarget] = useState<Lead | null>(null);
  const [abandonTarget, setAbandonTarget] = useState<Lead | null>(null);

  useEffect(() => {
    const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
      setLeadName(searchText.trim());
      setContactPerson(contactText.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchText, contactText]);

  const filterParams = useMemo(
    () => ({
      leadName: leadName || undefined,
      contactPerson: contactPerson || undefined,
      industry: industry === FILTER_ALL ? undefined : industry,
      source: source === FILTER_ALL ? undefined : source,
      status: status === FILTER_ALL ? undefined : status,
      owner: owner ?? undefined,
      startTime: startTime ? dayjs(startTime).startOf('day').toISOString() : undefined,
      endTime: endTime ? dayjs(endTime).endOf('day').toISOString() : undefined,
    }),
    [leadName, contactPerson, industry, source, status, owner, startTime, endTime],
  );

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchLeads({ ...filterParams, page, pageSize: PAGE_SIZE });
      setItems(result.items);
      setTotal(result.total);
    } catch (error: unknown) {
      logger.error(`加载线索失败: ${toErrorText(error)}`);
      toast.error('加载线索失败');
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

  const handleLeadChanged = useCallback((): void => {
    setDetailVersion((version: number) => version + 1);
    refresh();
  }, [refresh]);

  const handleAssignSubmit = async (userId: string): Promise<void> => {
    try {
      const result = await assignLeads(assignIds, userId);
      toast.success(`成功分配 ${result.assigned} 条线索`);
      refresh();
    } catch (error: unknown) {
      logger.error(`分配失败: ${toErrorText(error)}`);
      toast.error(`分配失败：${toErrorText(error)}`);
      throw error;
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!deleteId) return;
    try {
      await deleteLead(deleteId);
      toast.success('线索已删除');
      setDeleteId(null);
      refresh();
    } catch (error: unknown) {
      logger.error(`删除失败: ${toErrorText(error)}`);
      toast.error(`删除失败：${toErrorText(error)}`);
    }
  };

  const handleExport = async (): Promise<void> => {
    try {
      const result = await fetchLeads({ ...filterParams, page: 1, pageSize: 1000 });
      const count: number = await exportLeadsToExcel(result.items);
      toast.success(`已导出 ${count} 条线索`);
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
      const parsed: CreateLeadRequest[] = await parseLeadImportFile(file);
      if (parsed.length === 0) {
        toast.error('未解析到有效数据（需包含「线索名称」列）');
        return;
      }
      const result = await batchCreateLeads(parsed);
      toast.success(`成功导入 ${result.created} 条线索`);
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
      buildLeadColumns({
        onDetail: (lead: Lead) => setDetailLead(lead),
        onFollowUp: (lead: Lead) => setFollowUpLead(lead),
        onConvert: (lead: Lead) => setConvertTarget(lead),
        onAbandon: (lead: Lead) => setAbandonTarget(lead),
        onDelete: (lead: Lead) => setDeleteId(lead.id),
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
      <PoolTabs />
      <ReportCard>
        <SectionHeader no="01" label="LEADS" subtitle="线索管理 / 跟进转化 / 导入导出" />
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative w-52">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="rounded-none pl-8"
              placeholder="搜索线索名称"
              value={searchText}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setSearchText(event.target.value)}
            />
          </div>
          <Input
            className="w-32 rounded-none"
            placeholder="联系人"
            value={contactText}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setContactText(event.target.value)}
          />
          <Select
            value={industry}
            onValueChange={(value: string) => { setIndustry(value); setPage(1); }}
          >
            <SelectTrigger className="w-32 rounded-none">
              <SelectValue placeholder="行业" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={FILTER_ALL}>全部行业</SelectItem>
              {INDUSTRY_OPTIONS.map((option: string) => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={source}
            onValueChange={(value: string) => { setSource(value); setPage(1); }}
          >
            <SelectTrigger className="w-32 rounded-none">
              <SelectValue placeholder="来源" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={FILTER_ALL}>全部来源</SelectItem>
              {LEAD_SOURCE_OPTIONS.map((option: string) => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={status}
            onValueChange={(value: string) => { setStatus(value); setPage(1); }}
          >
            <SelectTrigger className="w-32 rounded-none">
              <SelectValue placeholder="状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={FILTER_ALL}>全部状态</SelectItem>
              {LEAD_STATUS_OPTIONS.map((option: LeadStatus) => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="w-44">
            <UserSelect
              value={owner}
              onChange={(value: string | null) => { setOwner(value); setPage(1); }}
              triggerType="search"
              placeholder="负责人"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">创建时间</span>
            <DatePickerButton
              value={startTime}
              onChange={(date: Date | undefined) => { setStartTime(date); setPage(1); }}
              placeholder="开始日期"
            />
            <span className="text-xs text-muted-foreground">至</span>
            <DatePickerButton
              value={endTime}
              onChange={(date: Date | undefined) => { setEndTime(date); setPage(1); }}
              placeholder="结束日期"
            />
          </div>
        </div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button data-ai-section-type="button" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              新建线索
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
              onChange={(event: ChangeEvent<HTMLInputElement>) => void handleImportFile(event)}
            />
            <Button variant="outline" onClick={() => void handleExport()}>
              <Download className="h-4 w-4" />
              导出Excel
            </Button>
            <Button
              variant="outline"
              disabled={!hasSelection}
              onClick={() => {
                setAssignIds(selectedKeys.map(String));
                setAssignOpen(true);
              }}
            >
              <UserPlus className="h-4 w-4" />
              批量分配
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
        <Table<Lead>
          columns={visibleColumns}
          dataSource={items}
          loading={loading}
          rowKey="id"
          scroll={{ x: 1600, y: 500 }}
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

      <LeadCreateDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={refresh} />
      <LeadDetailDrawer
        key={detailVersion}
        leadId={detailLead?.id ?? null}
        onOpenChange={(open: boolean) => { if (!open) setDetailLead(null); }}
        onFollowUp={(lead: Lead) => setFollowUpLead(lead)}
        onConvert={(lead: Lead) => setConvertTarget(lead)}
        onAbandon={(lead: Lead) => setAbandonTarget(lead)}
      />
      <LeadFollowUpDialog
        lead={followUpLead}
        onOpenChange={(open: boolean) => { if (!open) setFollowUpLead(null); }}
        onSaved={handleLeadChanged}
      />
      <LeadConvertDialog
        lead={convertTarget}
        onOpenChange={(open: boolean) => { if (!open) setConvertTarget(null); }}
        onSaved={handleLeadChanged}
      />
      <AbandonLeadDialog
        lead={abandonTarget}
        onOpenChange={(open: boolean) => { if (!open) setAbandonTarget(null); }}
        onSaved={handleLeadChanged}
      />
      <AssignUserDialog
        open={assignOpen}
        title="分配线索"
        description={`将选中的 ${assignIds.length} 条线索分配给指定负责人`}
        onOpenChange={setAssignOpen}
        onSubmit={handleAssignSubmit}
      />
      <AlertDialog
        open={deleteId !== null}
        onOpenChange={(open: boolean) => { if (!open) setDeleteId(null); }}
      >
        <AlertDialogContent className="rounded-none">
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除？</AlertDialogTitle>
            <AlertDialogDescription>即将删除该线索，删除后不可恢复。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => void handleDelete()}
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
