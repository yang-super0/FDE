import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { Plus } from 'lucide-react';
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
  OutsourcingProject, OutsourcingProjectListParams, OutsourcingVendor,
  OutsourcingVendorListParams,
} from '@shared/api.interface';
import { fetchOutsourcingVendors, updateOutsourcingVendor } from '@client/src/api/video-core/vendors';
import {
  deleteOutsourcingProject, fetchOutsourcingProjects,
  setOutsourcingProjectStatus,
} from '@client/src/api/video-core/outsourcing';
import { AdsConfirmDialog } from '@client/src/pages/AdsBusiness/AdsConfirmDialog';
import { VideoCoreTabs } from './VideoCoreTabs';
import {
  ProjectApproveDialog, ProjectFormDialog, ProjectSettleDialog,
} from './VideoOutsourcingProjectDialogs';
import {
  ProjectDetailDialog, VendorDetailDialog, VendorFormDialog,
} from './VideoOutsourcingDialogs';
import {
  formatVideoAmount, toVideoErrorText, VIDEO_FILTER_ALL, VideoStatusBadge,
  VENDOR_TYPE_OPTIONS,
} from './video-constants';

const PAGE_SIZE: number = 10;
const VENDOR_STATUS_OPTIONS: string[] = ['合作中', '已停用'];
const PROJECT_STATUS_OPTIONS: string[] = [
  '待审批', '审批通过', '审批驳回', '进行中', '已完成', '已取消',
];
const SETTLE_STATUS_OPTIONS: string[] = ['未结算', '部分结算', '已结算'];
type ProjectTabKey = 'vendors' | 'projects';
type StatusTransition = '进行中' | '已完成' | '已取消';

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

/* ============ 供应商 Tab ============ */

function VendorSection() {
  const [draftName, setDraftName] = useState<string>('');
  const [vendorName, setVendorName] = useState<string>('');
  const [vendorType, setVendorType] = useState<string>(VIDEO_FILTER_ALL);
  const [status, setStatus] = useState<string>(VIDEO_FILTER_ALL);
  const [page, setPage] = useState<number>(1);
  const [items, setItems] = useState<OutsourcingVendor[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [editing, setEditing] = useState<OutsourcingVendor | null>(null);
  const [detailItem, setDetailItem] = useState<OutsourcingVendor | null>(null);
  const [stoppingItem, setStoppingItem] = useState<OutsourcingVendor | null>(null);

  useEffect(() => {
    const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
      setVendorName(draftName.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [draftName]);

  const filterParams = useMemo(
    (): OutsourcingVendorListParams => ({
      vendorName: vendorName || undefined,
      vendorType: vendorType === VIDEO_FILTER_ALL ? undefined : vendorType,
      status: status === VIDEO_FILTER_ALL ? undefined : status,
    }),
    [vendorName, vendorType, status],
  );

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchOutsourcingVendors({ ...filterParams, page, pageSize: PAGE_SIZE });
      setItems(result.items);
      setTotal(result.total);
    } catch (error: unknown) {
      reportError('加载供应商失败', error);
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

  const handleStop = async (): Promise<void> => {
    if (!stoppingItem) return;
    try {
      await updateOutsourcingVendor(stoppingItem.id, { status: '已停用' });
      toast.success(`已停用「${stoppingItem.vendorName}」`);
      setStoppingItem(null);
      refresh();
    } catch (error: unknown) {
      reportError('停用供应商失败', error);
    }
  };

  const columns = useMemo((): TableColumnsType<OutsourcingVendor> => [
    {
      title: '名称', dataIndex: 'vendorName', width: 160, fixed: 'left',
      render: (value: string) => <span className="font-bold text-primary">{value}</span>,
    },
    { title: '类型', dataIndex: 'vendorType', width: 100 },
    { title: '联系人', dataIndex: 'contactPerson', width: 100 },
    { title: '电话', dataIndex: 'phone', width: 130 },
    { title: '合作等级', dataIndex: 'cooperationLevel', width: 90 },
    { title: '结算方式', dataIndex: 'settlementMethod', width: 90 },
    {
      title: '状态', dataIndex: 'status', width: 90,
      render: (value: string) => <VideoStatusBadge status={value} />,
    },
    {
      title: '操作', key: 'actions', width: 160, fixed: 'right',
      render: (_: unknown, record: OutsourcingVendor) => (
        <div className="flex flex-wrap items-center gap-1">
          <ActionLink onClick={() => setDetailItem(record)}>详情</ActionLink>
          <ActionLink onClick={() => { setEditing(record); setFormOpen(true); }}>编辑</ActionLink>
          <ActionLink danger onClick={() => setStoppingItem(record)}>停用</ActionLink>
        </div>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], []);

  const {
    visibleColumns, columnMetas, hiddenIds,
    toggleColumn, resetColumns, setAllColumns,
  } = useColumnSettings(columns);

  return (
    <ReportCard>
      <SectionHeader no="05" label="VENDORS" subtitle="外包供应商 / 合作等级 / 结算方式" />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input className="w-36 rounded-none" placeholder="供应商名称" value={draftName}
          onChange={(event: ChangeEvent<HTMLInputElement>) => setDraftName(event.target.value)} />
        <FilterSelect value={vendorType} placeholder="类型" allLabel="全部类型"
          options={VENDOR_TYPE_OPTIONS}
          onChange={(value: string) => { setVendorType(value); setPage(1); }} />
        <FilterSelect value={status} placeholder="状态" allLabel="全部状态"
          options={VENDOR_STATUS_OPTIONS}
          onChange={(value: string) => { setStatus(value); setPage(1); }} />
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button data-ai-section-type="button"
          onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4" />
          新建供应商
        </Button>
        <ColumnSettingsButton
          columnMetas={columnMetas} hiddenIds={hiddenIds}
          onToggle={toggleColumn} onReset={resetColumns} onSetAll={setAllColumns}
        />
      </div>
      <Table<OutsourcingVendor>
        columns={visibleColumns}
        dataSource={items}
        loading={loading}
        rowKey="id"
        scroll={{ x: 1000, y: 500 }}
        pagination={{
          current: page,
          pageSize: PAGE_SIZE,
          total,
          onChange: (nextPage: number) => setPage(nextPage),
        }}
      />
      <VendorFormDialog open={formOpen} editing={editing} onSaved={refresh} onOpenChange={setFormOpen} />
      <VendorDetailDialog open={detailItem !== null} vendor={detailItem}
        onOpenChange={(open: boolean) => { if (!open) setDetailItem(null); }} />
      <AdsConfirmDialog
        open={stoppingItem !== null}
        title="确认停用？"
        description={`即将停用供应商「${stoppingItem?.vendorName ?? ''}」，停用后不可在项目中选用。`}
        confirmText="确认停用"
        destructive
        onOpenChange={(open: boolean) => { if (!open) setStoppingItem(null); }}
        onConfirm={() => void handleStop()}
      />
    </ReportCard>
  );
}

/* ============ 外包项目 Tab ============ */

function ProjectSection() {
  const [draftNo, setDraftNo] = useState<string>('');
  const [draftName, setDraftName] = useState<string>('');
  const [projectNo, setProjectNo] = useState<string>('');
  const [projectName, setProjectName] = useState<string>('');
  const [vendorId, setVendorId] = useState<string>(VIDEO_FILTER_ALL);
  const [status, setStatus] = useState<string>(VIDEO_FILTER_ALL);
  const [settleStatus, setSettleStatus] = useState<string>(VIDEO_FILTER_ALL);
  const [page, setPage] = useState<number>(1);
  const [items, setItems] = useState<OutsourcingProject[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [vendors, setVendors] = useState<OutsourcingVendor[]>([]);
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [detailItem, setDetailItem] = useState<OutsourcingProject | null>(null);
  const [approvingItem, setApprovingItem] = useState<OutsourcingProject | null>(null);
  const [settlingItem, setSettlingItem] = useState<OutsourcingProject | null>(null);
  const [deletingItem, setDeletingItem] = useState<OutsourcingProject | null>(null);
  const [statusTarget, setStatusTarget] = useState<{
    item: OutsourcingProject; next: StatusTransition;
  } | null>(null);

  useEffect(() => {
    const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
      setProjectNo(draftNo.trim());
      setProjectName(draftName.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [draftNo, draftName]);

  useEffect(() => {
    let cancelled: boolean = false;
    fetchOutsourcingVendors({ page: 1, pageSize: 200 })
      .then((result) => { if (!cancelled) setVendors(result.items); })
      .catch((error: unknown) => { if (!cancelled) reportError('加载供应商失败', error); });
    return () => { cancelled = true; };
  }, []);

  const filterParams = useMemo(
    (): OutsourcingProjectListParams => ({
      projectNo: projectNo || undefined,
      projectName: projectName || undefined,
      vendorId: vendorId === VIDEO_FILTER_ALL ? undefined : Number(vendorId),
      status: status === VIDEO_FILTER_ALL ? undefined : status,
      settlementStatus: settleStatus === VIDEO_FILTER_ALL ? undefined : settleStatus,
    }),
    [projectNo, projectName, vendorId, status, settleStatus],
  );

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchOutsourcingProjects({ ...filterParams, page, pageSize: PAGE_SIZE });
      setItems(result.items);
      setTotal(result.total);
    } catch (error: unknown) {
      reportError('加载外包项目失败', error);
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

  const handleDelete = async (): Promise<void> => {
    if (!deletingItem) return;
    try {
      await deleteOutsourcingProject(deletingItem.id);
      toast.success('外包项目已删除');
      setDeletingItem(null);
      refresh();
    } catch (error: unknown) {
      reportError('删除外包项目失败', error);
    }
  };

  const handleStatusChange = async (): Promise<void> => {
    if (!statusTarget) return;
    try {
      await setOutsourcingProjectStatus(statusTarget.item.id, { status: statusTarget.next });
      toast.success(`已更新为「${statusTarget.next}」`);
      setStatusTarget(null);
      refresh();
    } catch (error: unknown) {
      reportError('更新状态失败', error);
    }
  };

  const columns = useMemo((): TableColumnsType<OutsourcingProject> => [
    {
      title: '项目号', dataIndex: 'projectNo', width: 140, fixed: 'left',
      render: (value: string) => <span className="font-bold text-primary">{value}</span>,
    },
    { title: '项目名称', dataIndex: 'projectName', width: 160 },
    { title: '供应商', dataIndex: 'vendorName', width: 130 },
    { title: '关联内部项目号', dataIndex: 'relatedProjectNo', width: 130 },
    {
      title: '金额', dataIndex: 'amount', width: 120, align: 'right',
      render: (value: number) => <span className="font-mono">{formatVideoAmount(value ?? 0)}</span>,
    },
    {
      title: '状态', dataIndex: 'status', width: 90,
      render: (value: string) => <VideoStatusBadge status={value} />,
    },
    {
      title: '结算状态', dataIndex: 'settlementStatus', width: 90,
      render: (value: string) => <VideoStatusBadge status={value} />,
    },
    {
      title: '已结算金额', dataIndex: 'settledAmount', width: 120, align: 'right',
      render: (value: number) => <span className="font-mono">{formatVideoAmount(value ?? 0)}</span>,
    },
    {
      title: '操作', key: 'actions', width: 230, fixed: 'right',
      render: (_: unknown, record: OutsourcingProject) => (
        <div className="flex flex-wrap items-center gap-1">
          <ActionLink onClick={() => setDetailItem(record)}>详情</ActionLink>
          {record.status === '待审批' ? (
            <ActionLink onClick={() => setApprovingItem(record)}>审批</ActionLink>
          ) : null}
          {record.status === '审批通过' ? (
            <ActionLink onClick={() => setStatusTarget({ item: record, next: '进行中' })}>推进</ActionLink>
          ) : null}
          {record.status === '进行中' ? (
            <>
              <ActionLink onClick={() => setStatusTarget({ item: record, next: '已完成' })}>完成</ActionLink>
              <ActionLink danger onClick={() => setStatusTarget({ item: record, next: '已取消' })}>取消</ActionLink>
            </>
          ) : null}
          {record.settlementStatus !== '已结算' && record.status !== '已取消' ? (
            <ActionLink onClick={() => setSettlingItem(record)}>结算</ActionLink>
          ) : null}
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

  return (
    <ReportCard>
      <SectionHeader no="06" label="OUTSOURCING" subtitle="外包项目 / 审批 / 结算登记" />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input className="w-32 rounded-none" placeholder="项目号" value={draftNo}
          onChange={(event: ChangeEvent<HTMLInputElement>) => setDraftNo(event.target.value)} />
        <Input className="w-36 rounded-none" placeholder="项目名称" value={draftName}
          onChange={(event: ChangeEvent<HTMLInputElement>) => setDraftName(event.target.value)} />
        <Select value={vendorId} onValueChange={(value: string) => { setVendorId(value); setPage(1); }}>
          <SelectTrigger className="w-36 rounded-none"><SelectValue placeholder="供应商" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={VIDEO_FILTER_ALL}>全部供应商</SelectItem>
            {vendors.map((vendor: OutsourcingVendor) => (
              <SelectItem key={vendor.id} value={String(vendor.id)}>{vendor.vendorName}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FilterSelect value={status} placeholder="状态" allLabel="全部状态"
          options={PROJECT_STATUS_OPTIONS}
          onChange={(value: string) => { setStatus(value); setPage(1); }} />
        <FilterSelect value={settleStatus} placeholder="结算状态" allLabel="全部结算"
          options={SETTLE_STATUS_OPTIONS}
          onChange={(value: string) => { setSettleStatus(value); setPage(1); }} />
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button data-ai-section-type="button" onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" />
          新建外包项目
        </Button>
        <ColumnSettingsButton
          columnMetas={columnMetas} hiddenIds={hiddenIds}
          onToggle={toggleColumn} onReset={resetColumns} onSetAll={setAllColumns}
        />
      </div>
      <Table<OutsourcingProject>
        columns={visibleColumns}
        dataSource={items}
        loading={loading}
        rowKey="id"
        scroll={{ x: 1300, y: 500 }}
        pagination={{
          current: page,
          pageSize: PAGE_SIZE,
          total,
          onChange: (nextPage: number) => setPage(nextPage),
        }}
      />
      <ProjectFormDialog open={formOpen} onSaved={refresh} onOpenChange={setFormOpen} />
      <ProjectDetailDialog open={detailItem !== null} project={detailItem}
        onOpenChange={(open: boolean) => { if (!open) setDetailItem(null); }} />
      <ProjectApproveDialog open={approvingItem !== null} project={approvingItem}
        onDone={refresh}
        onOpenChange={(open: boolean) => { if (!open) setApprovingItem(null); }} />
      <ProjectSettleDialog open={settlingItem !== null} project={settlingItem}
        onDone={refresh}
        onOpenChange={(open: boolean) => { if (!open) setSettlingItem(null); }} />
      <AdsConfirmDialog
        open={deletingItem !== null}
        title="确认删除？"
        description={`即将删除外包项目「${deletingItem?.projectName ?? ''}」，删除后不可恢复。`}
        confirmText="确认删除"
        destructive
        onOpenChange={(open: boolean) => { if (!open) setDeletingItem(null); }}
        onConfirm={() => void handleDelete()}
      />
      <AdsConfirmDialog
        open={statusTarget !== null}
        title={`确认更新为「${statusTarget?.next ?? ''}」？`}
        description={`即将把外包项目「${statusTarget?.item.projectName ?? ''}」状态更新为「${statusTarget?.next ?? ''}」。`}
        confirmText="确认"
        onOpenChange={(open: boolean) => { if (!open) setStatusTarget(null); }}
        onConfirm={() => void handleStatusChange()}
      />
    </ReportCard>
  );
}

/* ============ 外包管理页（页内 Tab 切换） ============ */

export default function VideoOutsourcingPage() {
  const [tab, setTab] = useState<ProjectTabKey>('vendors');
  const tabs: Array<{ key: ProjectTabKey; label: string }> = [
    { key: 'vendors', label: '外包供应商' },
    { key: 'projects', label: '外包项目' },
  ];
  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-8 px-8 py-8">
      <VideoCoreTabs active="outsourcing" />
      <div className="flex flex-wrap items-center gap-1 border-b border-border">
        {tabs.map((item: { key: ProjectTabKey; label: string }) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={`border-b-2 px-4 py-2.5 text-sm font-bold transition-colors ${
              tab === item.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      {tab === 'vendors' ? <VendorSection /> : <ProjectSection />}
    </div>
  );
}
