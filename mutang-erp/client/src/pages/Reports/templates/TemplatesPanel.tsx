import { useCallback, useEffect, useState } from 'react';
import { Download, Plus, Star } from 'lucide-react';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Table, type TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import { ReportCard } from '@client/src/components/blueprint';
import { ColumnSettingsButton } from '@client/src/components/column-settings-button';
import { useColumnSettings } from '@client/src/hooks/useColumnSettings';
import { Button } from '@client/src/components/ui/button';
import { Checkbox } from '@client/src/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@client/src/components/ui/dialog';
import { Input } from '@client/src/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@client/src/components/ui/select';
import { Switch } from '@client/src/components/ui/switch';
import { AdsConfirmDialog } from '@client/src/pages/AdsBusiness/AdsConfirmDialog';
import { exportRowsToExcel } from '@client/src/pages/AdsBusiness/ads-excel';
import type {
  ReportTemplateListParams, ReportTemplateRecord,
} from '@shared/api.interface';
import {
  applyReportTemplate, deleteReportTemplate, fetchReportTemplates,
  rateReportTemplate, shareReportTemplate,
} from '@client/src/api/report-center/templates';
import {
  RC_FILTER_ALL, TEMPLATE_CATEGORIES, toRcErrorText,
} from '../report-center-constants';
import { TemplateFormDialog } from './TemplateFormDialog';

const DEFAULT_PAGE_SIZE = 20;
const SHARE_ROLES: string[] = ['管理员', '财务', '业务', '人资', '行政'];

const toErrText = (error: unknown): string =>
  error instanceof Error ? error.message : toRcErrorText(error);

const PublicBadge = ({ isPublic }: { isPublic: boolean }) => (
  <span className={`inline-flex items-center rounded-[2px] px-2 py-0.5 text-[10px] font-bold ${
    isPublic ? 'bg-[#ECFDF5] text-[#10B981]' : 'bg-slate-100 text-slate-500'
  }`}>
    {isPublic ? '公开' : '私有'}
  </span>
);

interface TemplateFilters {
  category: string;
  system: string;
  publicOnly: boolean;
  keyword: string;
}

const EMPTY_FILTERS: TemplateFilters = {
  category: RC_FILTER_ALL, system: RC_FILTER_ALL, publicOnly: false, keyword: '',
};

const TemplatesPanel: React.FC = () => {
  const [items, setItems] = useState<ReportTemplateRecord[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [loading, setLoading] = useState<boolean>(false);
  const [draft, setDraft] = useState<TemplateFilters>({ ...EMPTY_FILTERS });
  const [applied, setApplied] = useState<TemplateFilters>({ ...EMPTY_FILTERS });
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [formRecord, setFormRecord] = useState<ReportTemplateRecord | null>(null);
  const [applyRecord, setApplyRecord] = useState<ReportTemplateRecord | null>(null);
  const [applyName, setApplyName] = useState<string>('');
  const [rateRecord, setRateRecord] = useState<ReportTemplateRecord | null>(null);
  const [ratingVal, setRatingVal] = useState<number>(5);
  const [shareRecord, setShareRecord] = useState<ReportTemplateRecord | null>(null);
  const [sharePublic, setSharePublic] = useState<boolean>(false);
  const [shareWith, setShareWith] = useState<string[]>([]);
  const [deleteRecord, setDeleteRecord] = useState<ReportTemplateRecord | null>(null);
  const [exporting, setExporting] = useState<boolean>(false);
  const [busy, setBusy] = useState<boolean>(false);

  const loadList = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const params: ReportTemplateListParams = {
        page: String(page),
        pageSize: String(pageSize),
        category: applied.category === RC_FILTER_ALL ? undefined : applied.category,
        keyword: applied.keyword.trim() || undefined,
        isSystem: applied.system === RC_FILTER_ALL ? undefined : applied.system,
        isPublic: applied.publicOnly ? 'true' : undefined,
      };
      const result = await fetchReportTemplates(params);
      setItems(result.items);
      setTotal(result.total);
    } catch (error) {
      logger.error('获取报表模板列表失败', error);
      toast.error(toErrText(error));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, applied]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const handleApply = async (): Promise<void> => {
    if (!applyRecord) return;
    setBusy(true);
    try {
      await applyReportTemplate(applyRecord.id, { reportName: applyName.trim() || undefined });
      toast.success('套用成功，可在自定义报表页查看生成结果');
      setApplyRecord(null);
      void loadList();
    } catch (error) {
      logger.error('套用报表模板失败', error);
      toast.error(toErrText(error));
    } finally {
      setBusy(false);
    }
  };

  const handleRate = async (): Promise<void> => {
    if (!rateRecord) return;
    setBusy(true);
    try {
      await rateReportTemplate(rateRecord.id, { rating: ratingVal });
      toast.success('评分已提交');
      setRateRecord(null);
      void loadList();
    } catch (error) {
      logger.error('评分失败', error);
      toast.error(toErrText(error));
    } finally {
      setBusy(false);
    }
  };

  const handleShare = async (): Promise<void> => {
    if (!shareRecord) return;
    setBusy(true);
    try {
      await shareReportTemplate(shareRecord.id, { isPublic: sharePublic, sharedWith: shareWith });
      toast.success('分享设置已保存');
      setShareRecord(null);
      void loadList();
    } catch (error) {
      logger.error('保存分享设置失败', error);
      toast.error(toErrText(error));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!deleteRecord) return;
    try {
      await deleteReportTemplate(deleteRecord.id);
      toast.success('模板已删除');
      setDeleteRecord(null);
      void loadList();
    } catch (error) {
      logger.error('删除报表模板失败', error);
      toast.error(toErrText(error));
    }
  };

  const handleExport = async (): Promise<void> => {
    setExporting(true);
    try {
      const rows: Record<string, string>[] = items.map((item: ReportTemplateRecord) => ({
        模板编号: item.templateNo,
        模板名称: item.templateName,
        分类: item.templateCategory,
        图表类型: item.chartType,
        使用次数: String(item.usageCount),
        评分: item.rating ? `${item.rating}星(${item.ratingCount}人)` : '暂无',
        系统内置: item.isSystem ? '是' : '否',
        公开: item.isPublic ? '是' : '否',
        创建时间: dayjs(item.createdAt).format('YYYY-MM-DD HH:mm'),
      }));
      const count = await exportRowsToExcel(rows, [
        '模板编号', '模板名称', '分类', '图表类型', '使用次数', '评分', '系统内置', '公开', '创建时间',
      ], '报表模板', '报表模板');
      toast.success(`已导出 ${count} 条模板`);
    } catch (error) {
      logger.error('导出报表模板失败', error);
      toast.error(toErrText(error));
    } finally {
      setExporting(false);
    }
  };

  const columns: TableColumnsType<ReportTemplateRecord> = [
    { title: '模板编号', dataIndex: 'templateNo', width: 130, fixed: 'left' },
    {
      title: '模板名称', dataIndex: 'templateName', width: 180,
      render: (v: string, record: ReportTemplateRecord) => (
        <span className="flex items-center gap-1.5">
          <span className="font-bold text-primary">{v}</span>
          {record.isSystem ? <span className="inline-flex items-center rounded-[2px] bg-[#EFF6FF] px-1.5 py-0.5 text-[10px] font-bold text-[#0033A0]">内置</span> : null}
        </span>
      ),
    },
    { title: '分类', dataIndex: 'templateCategory', width: 110 },
    { title: '图表类型', dataIndex: 'chartType', width: 100 },
    {
      title: '使用次数', dataIndex: 'usageCount', width: 90,
      render: (v: number) => <span className="font-mono">{v}</span>,
    },
    {
      title: '评分', dataIndex: 'rating', width: 110,
      render: (v: number, record: ReportTemplateRecord) =>
        v ? `${v}星(${record.ratingCount}人)` : '暂无',
    },
    {
      title: '公开', dataIndex: 'isPublic', width: 70,
      render: (v: boolean) => <PublicBadge isPublic={v} />,
    },
    {
      title: '创建时间', dataIndex: 'createdAt', width: 130,
      render: (v: string) => <span className="font-mono text-xs">{dayjs(v).format('YYYY-MM-DD HH:mm')}</span>,
    },
    {
      title: '操作', key: 'action', fixed: 'right', width: 300,
      render: (_: unknown, record: ReportTemplateRecord) => (
        <div className="flex flex-wrap gap-1">
          <Button size="sm" variant="ghost" className="rounded-none"
            onClick={() => { setApplyRecord(record); setApplyName(`${record.templateName}报表`); }}>套用</Button>
          <Button size="sm" variant="ghost" className="rounded-none"
            onClick={() => { setFormRecord(record); setFormOpen(true); }}>编辑</Button>
          <Button size="sm" variant="ghost" className="rounded-none"
            onClick={() => { setRateRecord(record); setRatingVal(record.rating > 0 ? record.rating : 5); }}>评分</Button>
          <Button size="sm" variant="ghost" className="rounded-none"
            onClick={() => { setShareRecord(record); setSharePublic(record.isPublic); setShareWith([...record.sharedWith]); }}>分享</Button>
          <Button size="sm" variant="ghost" className="rounded-none text-destructive hover:text-destructive"
            onClick={() => setDeleteRecord(record)}>删除</Button>
        </div>
      ),
    },
  ];

  const {
    visibleColumns, columnMetas, hiddenIds, toggleColumn, resetColumns, setAllColumns,
  } = useColumnSettings(columns);

  return (
    <div className="space-y-6">
      <ReportCard>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={draft.category} onValueChange={(v: string) => setDraft({ ...draft, category: v })}>
              <SelectTrigger className="w-[140px] rounded-none"><SelectValue placeholder="分类" /></SelectTrigger>
              <SelectContent className="rounded-none">
                <SelectItem value={RC_FILTER_ALL}>全部分类</SelectItem>
                {TEMPLATE_CATEGORIES.map((opt: string) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={draft.system} onValueChange={(v: string) => setDraft({ ...draft, system: v })}>
              <SelectTrigger className="w-[130px] rounded-none"><SelectValue placeholder="系统内置" /></SelectTrigger>
              <SelectContent className="rounded-none">
                <SelectItem value={RC_FILTER_ALL}>全部模板</SelectItem>
                <SelectItem value="true">仅系统内置</SelectItem>
                <SelectItem value="false">仅自建</SelectItem>
              </SelectContent>
            </Select>
            <Input className="w-[180px] rounded-none" value={draft.keyword}
              onChange={(e) => setDraft({ ...draft, keyword: e.target.value })}
              placeholder="模板名称/编号关键字" />
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={draft.publicOnly}
                onCheckedChange={(checked: boolean) => setDraft({ ...draft, publicOnly: checked })} />
              仅公开
            </label>
            <Button variant="outline" className="rounded-none"
              onClick={() => { setApplied({ ...draft }); setPage(1); }}>查询</Button>
            <Button variant="outline" className="rounded-none"
              onClick={() => {
                const empty: TemplateFilters = { ...EMPTY_FILTERS };
                setDraft(empty); setApplied(empty); setPage(1);
              }}>重置</Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="rounded-none" disabled={exporting} onClick={() => void handleExport()}>
              <Download className="h-4 w-4" />{exporting ? '导出中...' : 'Excel导出'}
            </Button>
            <Button data-ai-section-type="button" className="rounded-none"
              onClick={() => { setFormRecord(null); setFormOpen(true); }}>
              <Plus className="h-4 w-4" />新建模板
            </Button>
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex justify-end">
            <ColumnSettingsButton columnMetas={columnMetas} hiddenIds={hiddenIds}
              onToggle={toggleColumn} onReset={resetColumns} onSetAll={setAllColumns} />
          </div>
          <Table
            columns={visibleColumns}
            dataSource={items}
            loading={loading}
            rowKey="id"
            scroll={{ x: 1400, y: 500 }}
            locale={{ emptyText: '暂无报表模板数据' }}
            pagination={{
              current: page, pageSize, total, showSizeChanger: false,
              onChange: (nextPage: number, nextPageSize: number) => {
                setPage(nextPage); setPageSize(nextPageSize);
              },
            }}
          />
        </div>
      </ReportCard>

      <TemplateFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={() => void loadList()}
        initial={formRecord ?? undefined}
      />

      <Dialog open={applyRecord !== null}
        onOpenChange={(open: boolean) => { if (!open) setApplyRecord(null); }}>
        <DialogContent className="rounded-none max-w-md">
          <DialogHeader>
            <DialogTitle>套用模板</DialogTitle>
            <DialogDescription>将「{applyRecord?.templateName ?? ''}」套用为新的自定义报表</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">新报表名称 <span className="text-destructive">*</span></label>
            <Input className="rounded-none" value={applyName}
              onChange={(e) => setApplyName(e.target.value)} placeholder="请输入报表名称" />
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-none" onClick={() => setApplyRecord(null)}>取消</Button>
            <Button data-ai-section-type="button" className="rounded-none" disabled={busy}
              onClick={() => void handleApply()}>确认套用</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rateRecord !== null}
        onOpenChange={(open: boolean) => { if (!open) setRateRecord(null); }}>
        <DialogContent className="rounded-none max-w-md">
          <DialogHeader>
            <DialogTitle>模板评分</DialogTitle>
            <DialogDescription>为「{rateRecord?.templateName ?? ''}」打分</DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star: number) => (
              <button key={star} type="button" onClick={() => setRatingVal(star)}>
                <Star className={`h-6 w-6 ${star <= ratingVal ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
              </button>
            ))}
            <span className="ml-2 text-sm text-muted-foreground">{ratingVal} 星</span>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-none" onClick={() => setRateRecord(null)}>取消</Button>
            <Button data-ai-section-type="button" className="rounded-none" disabled={busy}
              onClick={() => void handleRate()}>提交评分</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={shareRecord !== null}
        onOpenChange={(open: boolean) => { if (!open) setShareRecord(null); }}>
        <DialogContent className="rounded-none max-w-md">
          <DialogHeader>
            <DialogTitle>分享模板</DialogTitle>
            <DialogDescription>设置「{shareRecord?.templateName ?? ''}」的可见范围</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={sharePublic}
                onCheckedChange={(checked: boolean) => setSharePublic(checked)} />
              公开模板（所有人可见）
            </label>
            <div className="space-y-2">
              <label className="text-sm font-medium">指定共享角色</label>
              <div className="flex flex-wrap gap-3">
                {SHARE_ROLES.map((role: string) => (
                  <label key={role} className="flex items-center gap-1.5 text-sm">
                    <Checkbox
                      checked={shareWith.includes(role)}
                      onCheckedChange={(checked: boolean | 'indeterminate') =>
                        setShareWith((prev: string[]) =>
                          checked ? [...prev, role] : prev.filter((r: string) => r !== role))}
                    />
                    {role}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-none" onClick={() => setShareRecord(null)}>取消</Button>
            <Button data-ai-section-type="button" className="rounded-none" disabled={busy}
              onClick={() => void handleShare()}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AdsConfirmDialog
        open={deleteRecord !== null}
        title="删除模板"
        description={`确认删除模板「${deleteRecord?.templateName ?? ''}（${deleteRecord?.templateNo ?? ''}）」吗？删除后不可恢复，系统内置模板不允许删除。`}
        confirmText="删除"
        destructive
        onOpenChange={(open: boolean) => { if (!open) setDeleteRecord(null); }}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
};

export { TemplatesPanel };
