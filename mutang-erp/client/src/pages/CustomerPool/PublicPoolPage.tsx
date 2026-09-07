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
import {
  Download,
  Hand,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  UserPlus,
} from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Table } from '@lark-apaas/client-toolkit/antd-table';
import { UserSelect } from '@client/src/components/business-ui/user-select';
import { ColumnSettingsButton } from '@client/src/components/column-settings-button';
import { useColumnSettings } from '@client/src/hooks/useColumnSettings';
import { ReportCard, SectionHeader } from '@client/src/components/blueprint';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import type { CreatePoolLeadRequest, PoolLead } from '@shared/api.interface';
import {
  assignPoolLeads,
  autoAssignPoolLeads,
  batchClaimPoolLeads,
  batchCreatePoolLeads,
  claimPoolLead,
  deletePoolLead,
  fetchPoolLeads,
  invalidatePoolLead,
} from '@client/src/api/customer-pool';
import { PoolTabs } from './PoolTabs';
import { DatePickerButton } from './DatePickerButton';
import { AssignUserDialog } from './AssignUserDialog';
import { PoolLeadDetailDialog, PoolLeadFormDialog } from './PoolLeadDialogs';
import { PoolConfirmDialogs } from './PoolConfirmDialogs';
import { buildPoolColumns } from './pool-columns';
import { exportPoolLeadsToExcel, parsePoolImportFile } from './pool-excel';
import {
  FILTER_ALL,
  INDUSTRY_OPTIONS,
  POOL_LEVEL_OPTIONS,
  toErrorText,
} from './constants';

const PAGE_SIZE: number = 20;
const POOL_STATUS_OPTIONS: string[] = ['未分配', '已领取', '已分配', '已转化'];

export default function PublicPoolPage() {
  const [searchText, setSearchText] = useState<string>('');
  const [subjectName, setSubjectName] = useState<string>('');
  const [leadLevel, setLeadLevel] = useState<string>(FILTER_ALL);
  const [industry1, setIndustry1] = useState<string>(FILTER_ALL);
  const [industry2, setIndustry2] = useState<string>('');
  const [status, setStatus] = useState<string>(FILTER_ALL);
  const [createdBy, setCreatedBy] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<Date | undefined>(undefined);
  const [endTime, setEndTime] = useState<Date | undefined>(undefined);
  const [page, setPage] = useState<number>(1);

  const [items, setItems] = useState<PoolLead[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedKeys, setSelectedKeys] = useState<Key[]>([]);

  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [editingLead, setEditingLead] = useState<PoolLead | null>(null);
  const [detailLead, setDetailLead] = useState<PoolLead | null>(null);
  const [assignOpen, setAssignOpen] = useState<boolean>(false);
  const [assignIds, setAssignIds] = useState<string[]>([]);
  const [autoAssignOpen, setAutoAssignOpen] = useState<boolean>(false);
  const [deleteIds, setDeleteIds] = useState<string[]>([]);
  const [invalidatingLead, setInvalidatingLead] = useState<PoolLead | null>(
    null,
  );
  const [importing, setImporting] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
      setSubjectName(searchText.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  const filterParams = useMemo(
    () => ({
      subjectName: subjectName || undefined,
      leadLevel: leadLevel === FILTER_ALL ? undefined : leadLevel,
      industry1: industry1 === FILTER_ALL ? undefined : industry1,
      industry2: industry2.trim() || undefined,
      status: status === FILTER_ALL ? undefined : status,
      createdBy: createdBy ?? undefined,
      startTime: startTime
        ? dayjs(startTime).startOf('day').toISOString()
        : undefined,
      endTime: endTime ? dayjs(endTime).endOf('day').toISOString() : undefined,
    }),
    [subjectName, leadLevel, industry1, industry2, status, createdBy, startTime, endTime],
  );

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchPoolLeads({
        ...filterParams,
        page,
        pageSize: PAGE_SIZE,
      });
      setItems(result.items);
      setTotal(result.total);
    } catch (error: unknown) {
      logger.error(`加载公海客资失败: ${toErrorText(error)}`);
      toast.error('加载公海客资失败');
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

  const handleClaim = async (lead: PoolLead): Promise<void> => {
    try {
      await claimPoolLead(lead.id);
      toast.success(`已领取「${lead.subjectName}」`);
      refresh();
    } catch (error: unknown) {
      logger.error(`领取失败: ${toErrorText(error)}`);
      toast.error(`领取失败：${toErrorText(error)}`);
    }
  };

  const handleBatchClaim = async (): Promise<void> => {
    try {
      const result = await batchClaimPoolLeads(selectedKeys.map(String));
      toast.success(`成功领取 ${result.claimed} 条客资`);
      refresh();
    } catch (error: unknown) {
      logger.error(`批量领取失败: ${toErrorText(error)}`);
      toast.error(`批量领取失败：${toErrorText(error)}`);
    }
  };

  const handleAssignSubmit = async (userId: string): Promise<void> => {
    try {
      const result = await assignPoolLeads({ ids: assignIds, assignee: userId });
      toast.success(`成功分配 ${result.assigned} 条客资`);
      refresh();
    } catch (error: unknown) {
      logger.error(`分配失败: ${toErrorText(error)}`);
      toast.error(`分配失败：${toErrorText(error)}`);
      throw error;
    }
  };

  const handleAutoAssign = async (): Promise<void> => {
    try {
      const result = await autoAssignPoolLeads();
      toast.success(`自动分配完成，共分配 ${result.assigned} 条`);
      setAutoAssignOpen(false);
      refresh();
    } catch (error: unknown) {
      logger.error(`自动分配失败: ${toErrorText(error)}`);
      toast.error(`自动分配失败：${toErrorText(error)}`);
    }
  };

  const handleInvalidate = async (): Promise<void> => {
    if (!invalidatingLead) return;
    try {
      await invalidatePoolLead(invalidatingLead.id);
      toast.success(`已将「${invalidatingLead.subjectName}」标记为无效`);
      setInvalidatingLead(null);
      refresh();
    } catch (error: unknown) {
      logger.error(`标记无效失败: ${toErrorText(error)}`);
      toast.error(`标记无效失败：${toErrorText(error)}`);
    }
  };

  const handleDelete = async (): Promise<void> => {
    try {
      for (const id of deleteIds) {
        await deletePoolLead(String(id));
      }
      toast.success(`已删除 ${deleteIds.length} 条客资`);
      setDeleteIds([]);
      refresh();
    } catch (error: unknown) {
      logger.error(`删除失败: ${toErrorText(error)}`);
      toast.error(`删除失败：${toErrorText(error)}`);
    }
  };

  const handleExport = async (): Promise<void> => {
    try {
      const result = await fetchPoolLeads({
        ...filterParams,
        page: 1,
        pageSize: 1000,
      });
      const count: number = await exportPoolLeadsToExcel(result.items);
      toast.success(`已导出 ${count} 条客资`);
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
      const parsed: CreatePoolLeadRequest[] = await parsePoolImportFile(file);
      if (parsed.length === 0) {
        toast.error('未解析到有效数据（需包含「主体名称」列）');
        return;
      }
      const result = await batchCreatePoolLeads(parsed);
      toast.success(`成功导入 ${result.created} 条客资`);
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
      buildPoolColumns({
        onDetail: (lead: PoolLead) => setDetailLead(lead),
        onEdit: (lead: PoolLead) => {
          setEditingLead(lead);
          setFormOpen(true);
        },
        onClaim: (lead: PoolLead) => void handleClaim(lead),
        onAssign: (lead: PoolLead) => {
          setAssignIds([lead.id]);
          setAssignOpen(true);
        },
        onInvalidate: (lead: PoolLead) => setInvalidatingLead(lead),
        onDelete: (lead: PoolLead) => setDeleteIds([lead.id]),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refresh],
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
        <SectionHeader
          no="01"
          label="PUBLIC POOL"
          subtitle="公海客资 / 领取分配 / 导入导出"
        />
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative w-56">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="rounded-none pl-8"
              placeholder="搜索主体名称"
              value={searchText}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setSearchText(event.target.value)
              }
            />
          </div>
          <Select
            value={leadLevel}
            onValueChange={(value: string) => {
              setLeadLevel(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-32 rounded-none">
              <SelectValue placeholder="客资分层" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={FILTER_ALL}>全部分层</SelectItem>
              {POOL_LEVEL_OPTIONS.map((option: string) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={industry1}
            onValueChange={(value: string) => {
              setIndustry1(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-32 rounded-none">
              <SelectValue placeholder="一级行业" />
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
          <Input
            className="w-32 rounded-none"
            placeholder="二级行业"
            value={industry2}
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              setIndustry2(event.target.value);
              setPage(1);
            }}
          />
          <Select
            value={status}
            onValueChange={(value: string) => {
              setStatus(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-32 rounded-none">
              <SelectValue placeholder="分配状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={FILTER_ALL}>全部状态</SelectItem>
              {POOL_STATUS_OPTIONS.map((option: string) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="w-44">
            <UserSelect
              value={createdBy}
              onChange={(value: string | null) => {
                setCreatedBy(value);
                setPage(1);
              }}
              triggerType="search"
              placeholder="创建人"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">调入时间</span>
            <DatePickerButton
              value={startTime}
              onChange={(date: Date | undefined) => {
                setStartTime(date);
                setPage(1);
              }}
              placeholder="开始日期"
            />
            <span className="text-xs text-muted-foreground">至</span>
            <DatePickerButton
              value={endTime}
              onChange={(date: Date | undefined) => {
                setEndTime(date);
                setPage(1);
              }}
              placeholder="结束日期"
            />
          </div>
        </div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              data-ai-section-type="button"
              onClick={() => {
                setEditingLead(null);
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
            <Button variant="outline" onClick={() => void handleExport()}>
              <Download className="h-4 w-4" />
              导出Excel
            </Button>
            <Button
              variant="outline"
              disabled={!hasSelection}
              onClick={() => void handleBatchClaim()}
            >
              <Hand className="h-4 w-4" />
              批量领取
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
            <Button variant="outline" onClick={() => setAutoAssignOpen(true)}>
              <RefreshCw className="h-4 w-4" />
              自动分配
            </Button>
            <Button
              variant="outline"
              className="text-destructive"
              disabled={!hasSelection}
              onClick={() => setDeleteIds(selectedKeys.map(String))}
            >
              <Trash2 className="h-4 w-4" />
              批量删除
            </Button>
            <ColumnSettingsButton
              columnMetas={columnMetas} hiddenIds={hiddenIds}
              onToggle={toggleColumn} onReset={resetColumns} onSetAll={setAllColumns}
            />
          </div>
          {hasSelection ? (
            <span className="text-xs text-muted-foreground">
              已选 {selectedKeys.length} 条
            </span>
          ) : null}
        </div>
        <Table<PoolLead>
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

      <PoolLeadFormDialog
        open={formOpen}
        lead={editingLead}
        onOpenChange={setFormOpen}
        onSaved={refresh}
      />
      <PoolLeadDetailDialog
        lead={detailLead}
        onOpenChange={() => setDetailLead(null)}
      />
      <AssignUserDialog
        open={assignOpen}
        title="分配客资"
        description={`将选中的 ${assignIds.length} 条客资分配给指定人员`}
        onOpenChange={setAssignOpen}
        onSubmit={handleAssignSubmit}
      />
      <PoolConfirmDialogs
        autoAssignOpen={autoAssignOpen}
        onAutoAssignOpenChange={setAutoAssignOpen}
        onAutoAssign={() => void handleAutoAssign()}
        deleteCount={deleteIds.length}
        onDeleteOpenChange={(open: boolean) => {
          if (!open) setDeleteIds([]);
        }}
        onDeleteConfirm={() => void handleDelete()}
        invalidateName={invalidatingLead?.subjectName ?? ''}
        onInvalidateOpenChange={(open: boolean) => {
          if (!open) setInvalidatingLead(null);
        }}
        onInvalidateConfirm={() => void handleInvalidate()}
      />
    </div>
  );
}
