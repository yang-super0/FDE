import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type Key } from 'react';
import dayjs from 'dayjs';
import { Download, Plus, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Table, type TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import { ReportCard, SectionHeader, StatusBadge } from '@client/src/components/blueprint';
import { ColumnSettingsButton } from '@client/src/components/column-settings-button';
import { useColumnSettings } from '@client/src/hooks/useColumnSettings';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@client/src/components/ui/select';
import type {
  ContractTemplate,
  ContractTemplateListParams,
  ContractTemplateStatus,
} from '@shared/api.interface';
import {
  applyContractTemplate,
  batchToggleTemplateStatus,
  deleteContractTemplate,
  listContractTemplates,
} from '@client/src/api/contract-enhance';
import { AdsConfirmDialog } from '@client/src/pages/AdsBusiness/AdsConfirmDialog';
import { exportRowsToExcel } from '@client/src/pages/AdsBusiness/ads-excel';
import { ContractCreateDialog } from './ContractCreateDialog';
import {
  ContractTemplateFormDialog,
  TEMPLATE_CATEGORY_OPTIONS,
  TEMPLATE_FILTER_ALL,
  TEMPLATE_INDUSTRY_OPTIONS,
  TEMPLATE_STATUS_OPTIONS,
  toTemplateErrorText,
} from './ContractTemplateDialogs';
import { ContractTemplateDetailDialog } from './ContractTemplateDetailDialog';

const PAGE_SIZE: number = 10;

interface TemplateApplyInitial {
  contractType: string;
  content: string;
}

const reportError = (context: string, error: unknown): void => {
  logger.error(`${context}: ${toTemplateErrorText(error)}`);
  toast.error(toTemplateErrorText(error));
};

function IndustryTagList({ industries }: { industries: string[] }) {
  if (!industries || industries.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <span className="flex flex-wrap gap-1">
      {industries.map((item: string) => (
        <span
          key={item}
          className="rounded-[2px] bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-foreground"
        >
          {item}
        </span>
      ))}
    </span>
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

export default function ContractTemplatesPage() {
  /* Filters: keyword 输入防抖 */
  const [draftKeyword, setDraftKeyword] = useState<string>('');
  const [keyword, setKeyword] = useState<string>('');
  const [category, setCategory] = useState<string>(TEMPLATE_FILTER_ALL);
  const [status, setStatus] = useState<string>(TEMPLATE_FILTER_ALL);
  const [industry, setIndustry] = useState<string>(TEMPLATE_FILTER_ALL);
  const [page, setPage] = useState<number>(1);
  const [items, setItems] = useState<ContractTemplate[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedKeys, setSelectedKeys] = useState<Key[]>([]);
  /* 弹窗状态 */
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [editing, setEditing] = useState<ContractTemplate | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [deletingItem, setDeletingItem] = useState<ContractTemplate | null>(null);
  const [createOpen, setCreateOpen] = useState<boolean>(false);
  const [applyInitial, setApplyInitial] = useState<TemplateApplyInitial | null>(null);

  useEffect(() => {
    const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
      setKeyword(draftKeyword.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [draftKeyword]);

  const filterParams = useMemo(
    (): Omit<ContractTemplateListParams, 'page' | 'pageSize'> => ({
      keyword: keyword || undefined,
      category: category === TEMPLATE_FILTER_ALL ? undefined : category,
      status: status === TEMPLATE_FILTER_ALL ? undefined : status,
      industry: industry === TEMPLATE_FILTER_ALL ? undefined : industry,
    }),
    [keyword, category, status, industry],
  );

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listContractTemplates({
        ...filterParams,
        page,
        pageSize: PAGE_SIZE,
      });
      setItems(result.items);
      setTotal(result.total);
    } catch (error: unknown) {
      reportError('加载合同模板列表失败', error);
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
    setDraftKeyword('');
    setKeyword('');
    setCategory(TEMPLATE_FILTER_ALL);
    setStatus(TEMPLATE_FILTER_ALL);
    setIndustry(TEMPLATE_FILTER_ALL);
    setPage(1);
  };

  const handleDelete = async (): Promise<void> => {
    if (!deletingItem) return;
    try {
      await deleteContractTemplate(deletingItem.id);
      toast.success('合同模板已删除');
      setDeletingItem(null);
      refresh();
    } catch (error: unknown) {
      reportError('删除合同模板失败', error);
    }
  };

  const handleBatchToggle = async (next: ContractTemplateStatus): Promise<void> => {
    const ids: number[] = items
      .filter((item: ContractTemplate) => selectedKeys.includes(item.id))
      .map((item: ContractTemplate) => item.id);
    if (ids.length === 0) {
      toast.error('请先勾选要操作的模板');
      return;
    }
    try {
      const result = await batchToggleTemplateStatus({ ids, status: next });
      toast.success(`已批量${next} ${result.updated} 个模板`);
      refresh();
    } catch (error: unknown) {
      reportError(`批量${next}模板失败`, error);
    }
  };

  const handleApply = async (record: ContractTemplate): Promise<void> => {
    try {
      const result = await applyContractTemplate(record.id);
      toast.success(`已套用模板「${result.templateName}」，请补全合同信息`);
      setApplyInitial({ contractType: result.category, content: result.content });
      setCreateOpen(true);
    } catch (error: unknown) {
      reportError('套用模板失败', error);
    }
  };

  const handleExport = async (): Promise<void> => {
    try {
      const rows: Record<string, string>[] = items.map((item: ContractTemplate) => ({
        模板编号: item.templateNo,
        模板名称: item.templateName,
        分类: item.category,
        适用行业: (item.applicableIndustry ?? []).join('、'),
        版本: item.version,
        状态: item.status,
        创建时间: dayjs(item.createdAt).format('YYYY-MM-DD HH:mm'),
      }));
      if (rows.length === 0) {
        toast.error('当前列表没有可导出的数据');
        return;
      }
      const count: number = await exportRowsToExcel(
        rows, Object.keys(rows[0]), '合同模板', '合同模板',
      );
      toast.success(`已导出 ${count} 条模板记录`);
    } catch (error: unknown) {
      reportError('导出失败', error);
    }
  };

  const columns = useMemo((): TableColumnsType<ContractTemplate> => [
    {
      title: '模板编号',
      dataIndex: 'templateNo',
      width: 140,
      fixed: 'left',
      render: (value: string) => <span className="font-bold text-primary">{value}</span>,
    },
    { title: '模板名称', dataIndex: 'templateName', width: 180 },
    { title: '分类', dataIndex: 'category', width: 120 },
    {
      title: '适用行业', dataIndex: 'applicableIndustry', width: 200,
      render: (value: string[]) => <IndustryTagList industries={value ?? []} />,
    },
    { title: '版本', dataIndex: 'version', width: 80 },
    {
      title: '状态', dataIndex: 'status', width: 80,
      render: (value: ContractTemplateStatus) => (
        <StatusBadge tone={value === '启用' ? 'success' : 'neutral'}>{value}</StatusBadge>
      ),
    },
    {
      title: '创建时间', dataIndex: 'createdAt', width: 140,
      render: (value: string) => dayjs(value).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      fixed: 'right',
      render: (_: unknown, record: ContractTemplate) => (
        <div className="flex flex-wrap items-center gap-1">
          <ActionLink onClick={() => setDetailId(record.id)}>详情</ActionLink>
          <ActionLink onClick={() => void handleApply(record)}>套用</ActionLink>
          <ActionLink onClick={() => { setEditing(record); setFormOpen(true); }}>编辑</ActionLink>
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

  const hasSelection: boolean = selectedKeys.length > 0;

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-8 px-8 py-8">
      {/* 页头 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.15em] text-primary">
            Contract Templates
          </div>
          <h1 className="text-2xl font-black text-foreground">合同模板管理</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button data-ai-section-type="button" onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4" />
            新建模板
          </Button>
          <Button
            variant="outline"
            disabled={!hasSelection}
            onClick={() => void handleBatchToggle('启用')}
          >
            批量启用
          </Button>
          <Button
            variant="outline"
            disabled={!hasSelection}
            onClick={() => void handleBatchToggle('停用')}
          >
            批量停用
          </Button>
        </div>
      </div>

      <ReportCard>
        <SectionHeader
          no="10"
          label="TEMPLATES"
          subtitle="模板维护 / 行业适配 / 快速套用"
        />
        {/* 筛选区 */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Input
            className="w-48 rounded-none"
            placeholder="搜索模板编号 / 名称"
            value={draftKeyword}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setDraftKeyword(event.target.value)}
          />
          <Select
            value={category}
            onValueChange={(value: string) => { setCategory(value); setPage(1); }}
          >
            <SelectTrigger className="w-36 rounded-none"><SelectValue placeholder="分类" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={TEMPLATE_FILTER_ALL}>全部分类</SelectItem>
              {TEMPLATE_CATEGORY_OPTIONS.map((option: string) => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={status}
            onValueChange={(value: string) => { setStatus(value); setPage(1); }}
          >
            <SelectTrigger className="w-32 rounded-none"><SelectValue placeholder="状态" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={TEMPLATE_FILTER_ALL}>全部状态</SelectItem>
              {TEMPLATE_STATUS_OPTIONS.map((option: ContractTemplateStatus) => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={industry}
            onValueChange={(value: string) => { setIndustry(value); setPage(1); }}
          >
            <SelectTrigger className="w-36 rounded-none"><SelectValue placeholder="适用行业" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={TEMPLATE_FILTER_ALL}>全部行业</SelectItem>
              {TEMPLATE_INDUSTRY_OPTIONS.map((option: string) => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" className="rounded-none" onClick={handleReset}>
            <RotateCcw className="h-3.5 w-3.5" />
            重置
          </Button>
        </div>
        {/* 操作区 */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
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
        <Table<ContractTemplate>
          columns={visibleColumns}
          dataSource={items}
          loading={loading}
          rowKey="id"
          scroll={{ x: 1200, y: 500 }}
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
      <ContractTemplateFormDialog
        open={formOpen}
        editing={editing}
        onSaved={refresh}
        onOpenChange={setFormOpen}
      />

      {/* 详情预览弹窗 */}
      <ContractTemplateDetailDialog
        open={detailId !== null}
        templateId={detailId}
        onOpenChange={(open: boolean) => { if (!open) setDetailId(null); }}
      />

      {/* 套用模板 → 新建合同弹窗（initial props 由并行任务为 ContractCreateDialog 添加） */}
      <ContractCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => undefined}
        initial={applyInitial ?? undefined}
      />

      {/* 删除二次确认 */}
      <AdsConfirmDialog
        open={deletingItem !== null}
        title="确认删除？"
        description={`即将删除合同模板「${deletingItem?.templateName ?? ''}（${
          deletingItem?.templateNo ?? ''
        }）」，删除后不可恢复。`}
        confirmText="确认删除"
        destructive
        onOpenChange={(open: boolean) => { if (!open) setDeletingItem(null); }}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}
