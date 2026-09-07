import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';
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
import type {
  VideoCoreProject, VideoCoreProjectListParams, VideoCoreProjectStatus,
} from '@shared/api.interface';
import {
  advanceVideoCoreProjectStatus, deleteVideoCoreProject, fetchVideoCoreProjects,
} from '@client/src/api/video-core/projects';
import { AdsConfirmDialog } from '@client/src/pages/AdsBusiness/AdsConfirmDialog';
import { AdsDatePickerButton } from '@client/src/pages/AdsBusiness/AdsDatePickerButton';
import { exportRowsToExcel } from '@client/src/pages/AdsBusiness/ads-excel';
import { VideoCoreTabs } from './VideoCoreTabs';
import { ProjectDetailDialog, ProjectFormDialog } from './VideoProjectDialogs';
import { DeliverableManageDialog, NodeManageDialog } from './VideoProjectNodeDialog';
import {
  PROJECT_STATUS_OPTIONS, VIDEO_FILTER_ALL, VideoStatusBadge, toVideoErrorText,
} from './video-constants';

const PAGE_SIZE: number = 10;

const reportError = (context: string, error: unknown): void => {
  logger.error(`${context}: ${toVideoErrorText(error)}`);
  toast.error(toVideoErrorText(error));
};

const nextProjectStatus = (status: string): VideoCoreProjectStatus | null => {
  const index: number = PROJECT_STATUS_OPTIONS.indexOf(status);
  if (index < 0 || index >= PROJECT_STATUS_OPTIONS.length - 1) return null;
  return PROJECT_STATUS_OPTIONS[index + 1] as VideoCoreProjectStatus;
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

export default function VideoProjectsPage() {
  /* 筛选草稿（点击查询后生效） */
  const [draftNo, setDraftNo] = useState<string>('');
  const [draftName, setDraftName] = useState<string>('');
  const [draftCustomer, setDraftCustomer] = useState<string>('');
  const [draftManager, setDraftManager] = useState<string>('');
  const [draftStatus, setDraftStatus] = useState<string>(VIDEO_FILTER_ALL);
  const [draftStart, setDraftStart] = useState<Date | undefined>(undefined);
  const [draftEnd, setDraftEnd] = useState<Date | undefined>(undefined);
  /* 已提交筛选条件 */
  const [query, setQuery] = useState<VideoCoreProjectListParams>({});
  const [page, setPage] = useState<number>(1);
  const [items, setItems] = useState<VideoCoreProject[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  /* 弹窗状态 */
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [editing, setEditing] = useState<VideoCoreProject | null>(null);
  const [detailItem, setDetailItem] = useState<VideoCoreProject | null>(null);
  const [nodeItem, setNodeItem] = useState<VideoCoreProject | null>(null);
  const [deliverableItem, setDeliverableItem] = useState<VideoCoreProject | null>(null);
  const [deletingItem, setDeletingItem] = useState<VideoCoreProject | null>(null);
  const [advancingItem, setAdvancingItem] = useState<VideoCoreProject | null>(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchVideoCoreProjects({ ...query, page, pageSize: PAGE_SIZE });
      setItems(result.items);
      setTotal(result.total);
    } catch (error: unknown) {
      reportError('加载项目列表失败', error);
    } finally {
      setLoading(false);
    }
  }, [query, page]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const refresh = useCallback((): void => {
    void loadList();
  }, [loadList]);

  const handleSearch = (): void => {
    setQuery({
      projectNo: draftNo.trim() || undefined,
      projectName: draftName.trim() || undefined,
      customerName: draftCustomer.trim() || undefined,
      status: draftStatus === VIDEO_FILTER_ALL ? undefined : draftStatus,
      projectManager: draftManager.trim() || undefined,
      startDate: draftStart ? dayjs(draftStart).format('YYYY-MM-DD') : undefined,
      endDate: draftEnd ? dayjs(draftEnd).format('YYYY-MM-DD') : undefined,
    });
    setPage(1);
  };

  const handleReset = (): void => {
    setDraftNo('');
    setDraftName('');
    setDraftCustomer('');
    setDraftManager('');
    setDraftStatus(VIDEO_FILTER_ALL);
    setDraftStart(undefined);
    setDraftEnd(undefined);
    setQuery({});
    setPage(1);
  };

  const openCreate = (): void => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (item: VideoCoreProject): void => {
    setEditing(item);
    setFormOpen(true);
  };

  const handleDelete = async (): Promise<void> => {
    if (!deletingItem) return;
    try {
      await deleteVideoCoreProject(deletingItem.id);
      toast.success('项目已删除');
      setDeletingItem(null);
      refresh();
    } catch (error: unknown) {
      reportError('删除项目失败', error);
    }
  };

  const handleAdvance = async (): Promise<void> => {
    if (!advancingItem) return;
    const next: VideoCoreProjectStatus | null = nextProjectStatus(advancingItem.status);
    if (next === null) return;
    try {
      await advanceVideoCoreProjectStatus(advancingItem.id, next);
      toast.success(`项目已推进为「${next}」`);
      setAdvancingItem(null);
      refresh();
    } catch (error: unknown) {
      reportError('推进状态失败', error);
    }
  };

  const handleExport = async (): Promise<void> => {
    try {
      const rows: Record<string, string>[] = items.map((item: VideoCoreProject) => ({
        项目号: item.projectNo,
        项目名称: item.projectName,
        关联订单号: item.orderNo,
        客户名称: item.customerName,
        项目类型: item.projectType,
        状态: item.status,
        项目负责人: item.projectManager,
        开始日期: item.startDate,
        结束日期: item.endDate,
        进度: `${item.progress}%`,
      }));
      const headers: string[] = [
        '项目号', '项目名称', '关联订单号', '客户名称', '项目类型',
        '状态', '项目负责人', '开始日期', '结束日期', '进度',
      ];
      const count: number = await exportRowsToExcel(rows, headers, '视频项目', '视频项目');
      toast.success(`已导出 ${count} 条项目记录`);
    } catch (error: unknown) {
      reportError('导出失败', error);
    }
  };

  const columns = useMemo((): TableColumnsType<VideoCoreProject> => [
    {
      title: '项目号',
      dataIndex: 'projectNo',
      width: 150,
      fixed: 'left',
      render: (value: string) => <span className="font-bold text-primary">{value}</span>,
    },
    { title: '项目名称', dataIndex: 'projectName', width: 160 },
    { title: '关联订单号', dataIndex: 'orderNo', width: 140, render: (value: string) => value || '—' },
    { title: '客户', dataIndex: 'customerName', width: 120, render: (value: string) => value || '—' },
    { title: '类型', dataIndex: 'projectType', width: 90, render: (value: string) => value || '—' },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (value: string) => <VideoStatusBadge status={value} />,
    },
    { title: '负责人', dataIndex: 'projectManager', width: 90, render: (value: string) => value || '—' },
    { title: '开始日期', dataIndex: 'startDate', width: 105, render: (value: string) => value || '—' },
    { title: '结束日期', dataIndex: 'endDate', width: 105, render: (value: string) => value || '—' },
    {
      title: '进度',
      dataIndex: 'progress',
      width: 130,
      render: (value: number) => (
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-16 bg-accent">
            <div className="h-full bg-primary" style={{ width: `${value}%` }} />
          </div>
          <span className="font-mono text-xs">{value}%</span>
        </div>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 300,
      fixed: 'right',
      render: (_: unknown, record: VideoCoreProject) => {
        const next: VideoCoreProjectStatus | null = nextProjectStatus(record.status);
        return (
          <div className="flex flex-wrap items-center gap-1">
            <ActionLink onClick={() => setNodeItem(record)}>节点</ActionLink>
            <ActionLink onClick={() => setDeliverableItem(record)}>交付物</ActionLink>
            <ActionLink onClick={() => setDetailItem(record)}>详情</ActionLink>
            <ActionLink onClick={() => openEdit(record)}>编辑</ActionLink>
            {next !== null ? (
              <ActionLink onClick={() => setAdvancingItem(record)}>{next}</ActionLink>
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

  const filterTexts: Array<{ placeholder: string; width: string; value: string; set: (value: string) => void }> = [
    { placeholder: '项目号', width: 'w-32', value: draftNo, set: setDraftNo },
    { placeholder: '项目名称', width: 'w-36', value: draftName, set: setDraftName },
    { placeholder: '客户名称', width: 'w-32', value: draftCustomer, set: setDraftCustomer },
    { placeholder: '项目负责人', width: 'w-28', value: draftManager, set: setDraftManager },
  ];

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-8 px-8 py-8">
      <VideoCoreTabs active="projects" />
      <ReportCard>
        <SectionHeader no="03" label="PROJECTS" subtitle="视频项目 / 节点 / 交付物" />
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
            value={draftStatus}
            placeholder="状态"
            allLabel="全部状态"
            options={PROJECT_STATUS_OPTIONS}
            onChange={(value: string) => setDraftStatus(value)}
          />
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">开始日期</span>
            <AdsDatePickerButton
              value={draftStart}
              placeholder="开始日期"
              onChange={(date: Date | undefined) => setDraftStart(date)}
            />
            <span className="text-xs text-muted-foreground">至</span>
            <AdsDatePickerButton
              value={draftEnd}
              placeholder="结束日期"
              onChange={(date: Date | undefined) => setDraftEnd(date)}
            />
          </div>
          <Button variant="outline" size="sm" className="rounded-none" onClick={handleSearch}>
            <Search className="h-3.5 w-3.5" />
            查询
          </Button>
          <Button variant="ghost" size="sm" className="rounded-none" onClick={handleReset}>
            <RotateCcw className="h-3.5 w-3.5" />
            重置
          </Button>
        </div>
        {/* 操作区 */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Button data-ai-section-type="button" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            新建项目
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
        <Table<VideoCoreProject>
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
      <ProjectFormDialog
        open={formOpen}
        editing={editing}
        onSaved={refresh}
        onOpenChange={setFormOpen}
      />

      {/* 节点管理弹窗 */}
      <NodeManageDialog
        open={nodeItem !== null}
        project={nodeItem}
        onSaved={refresh}
        onOpenChange={(open: boolean) => {
          if (!open) setNodeItem(null);
        }}
      />

      {/* 交付物管理弹窗 */}
      <DeliverableManageDialog
        open={deliverableItem !== null}
        project={deliverableItem}
        onSaved={refresh}
        onOpenChange={(open: boolean) => {
          if (!open) setDeliverableItem(null);
        }}
      />

      {/* 详情弹窗 */}
      <ProjectDetailDialog
        open={detailItem !== null}
        project={detailItem}
        onOpenChange={(open: boolean) => {
          if (!open) setDetailItem(null);
        }}
      />

      {/* 状态推进确认 */}
      <AdsConfirmDialog
        open={advancingItem !== null}
        title="确认推进状态？"
        description={`即将把项目「${advancingItem?.projectNo ?? ''}」的状态由「${advancingItem?.status ?? ''}」推进为「${nextProjectStatus(advancingItem?.status ?? '') ?? ''}」。`}
        confirmText="确认推进"
        onOpenChange={(open: boolean) => {
          if (!open) setAdvancingItem(null);
        }}
        onConfirm={() => void handleAdvance()}
      />

      {/* 删除二次确认 */}
      <AdsConfirmDialog
        open={deletingItem !== null}
        title="确认删除？"
        description={`即将删除项目「${deletingItem?.projectNo ?? ''} ${deletingItem?.projectName ?? ''}」，删除后不可恢复。`}
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
