import { useState } from 'react';
import dayjs from 'dayjs';
import { Download, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type { CustomReportRecord } from '@shared/api.interface';
import {
  Table,
  type TableColumnsType,
} from '@lark-apaas/client-toolkit/antd-table';
import { ReportCard } from '@client/src/components/blueprint';
import { ColumnSettingsButton } from '@client/src/components/column-settings-button';
import { useColumnSettings } from '@client/src/hooks/useColumnSettings';
import { Button } from '@client/src/components/ui/button';
import { Checkbox } from '@client/src/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import { Input } from '@client/src/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import { Switch } from '@client/src/components/ui/switch';
import { AdsConfirmDialog } from '@client/src/pages/AdsBusiness/AdsConfirmDialog';
import { cn } from '@client/src/lib/utils';
import {
  copyCustomReport,
  deleteCustomReport,
  shareCustomReport,
} from '@client/src/api/report-center/custom-reports';
import {
  ChartTypeBadge,
  REPORT_TYPES,
  ReportTypeBadge,
  formatDateTime,
  toRcErrorText,
} from '../report-center-constants';
import { ReportConfigDialog } from './ReportConfigDialog';
import { ReportRunDialog } from './ReportRunDialog';
import { useCustomReportsList } from './useCustomReportsList';
import { exportReportExcelRows } from '../report-export';

const SHARE_ROLE_OPTIONS: string[] = ['管理员', '财务', '业务', '人资', '行政'];

function toggleValue(list: string[], value: string): string[] {
  return list.includes(value)
    ? list.filter((v: string) => v !== value)
    : [...list, value];
}

function previewFields(values: string[]): string {
  if (values.length === 0) return '—';
  const head: string = values.slice(0, 2).join('、');
  return values.length > 2 ? `${head} 等 ${values.length} 项` : head;
}

const PublicFlagBadge = ({ isPublic }: { isPublic: boolean }) => (
  <span
    className={cn(
      'inline-flex items-center rounded-[2px] px-2 py-0.5 text-[10px] font-bold',
      isPublic
        ? 'bg-[#ECFDF5] text-[#10B981]'
        : 'bg-slate-100 text-slate-500',
    )}
  >
    {isPublic ? '公开' : '私有'}
  </span>
);

export const CustomReportsPanel: React.FC = () => {
  const list = useCustomReportsList();
  const [configOpen, setConfigOpen] = useState<boolean>(false);
  const [configRecord, setConfigRecord] = useState<CustomReportRecord | null>(null);
  const [runRecord, setRunRecord] = useState<CustomReportRecord | null>(null);
  const [copyRecord, setCopyRecord] = useState<CustomReportRecord | null>(null);
  const [deleteRecord, setDeleteRecord] = useState<CustomReportRecord | null>(null);
  const [shareRecord, setShareRecord] = useState<CustomReportRecord | null>(null);
  const [sharePublic, setSharePublic] = useState<boolean>(false);
  const [shareRoles, setShareRoles] = useState<string[]>([]);
  const [shareSubmitting, setShareSubmitting] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);

  const openShare = (record: CustomReportRecord): void => {
    setSharePublic(record.isPublic);
    setShareRoles(record.sharedWith);
    setShareRecord(record);
  };

  const handleCopy = async (): Promise<void> => {
    if (!copyRecord) return;
    try {
      await copyCustomReport(copyRecord.id);
      toast.success(`已复制报表「${copyRecord.reportName}」`);
      setCopyRecord(null);
      list.reload();
    } catch (error) {
      logger.error('复制报表失败', error);
      toast.error(toRcErrorText(error));
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!deleteRecord) return;
    try {
      await deleteCustomReport(deleteRecord.id);
      toast.success('报表已删除');
      setDeleteRecord(null);
      list.reload();
    } catch (error) {
      logger.error('删除报表失败', error);
      toast.error(toRcErrorText(error));
    }
  };

  const handleShare = async (): Promise<void> => {
    if (!shareRecord) return;
    setShareSubmitting(true);
    try {
      await shareCustomReport(shareRecord.id, {
        isPublic: sharePublic,
        sharedWith: shareRoles,
      });
      toast.success('分享设置已保存');
      setShareRecord(null);
      list.reload();
    } catch (error) {
      logger.error('保存分享设置失败', error);
      toast.error(toRcErrorText(error));
    } finally {
      setShareSubmitting(false);
    }
  };

  const handleExportList = async (): Promise<void> => {
    if (list.items.length === 0) {
      toast.error('当前无数据可导出');
      return;
    }
    setExporting(true);
    try {
      const headers: string[] = [
        '报表编号',
        '报表名称',
        '类型',
        '图表类型',
        '时间范围',
        '是否公开',
        '创建人',
        '创建时间',
      ];
      const rows: (string | number)[][] = list.items.map(
        (item: CustomReportRecord): (string | number)[] => [
          item.reportNo,
          item.reportName,
          item.reportType,
          item.chartType,
          item.timeRange,
          item.isPublic ? '是' : '否',
          item.createdBy ?? '',
          dayjs(item.createdAt).format('YYYY-MM-DD HH:mm'),
        ],
      );
      await exportReportExcelRows('自定义报表', headers, rows);
      toast.success(`已导出 ${rows.length} 条报表`);
    } catch (error) {
      logger.error('导出报表列表失败', error);
      toast.error(toRcErrorText(error));
    } finally {
      setExporting(false);
    }
  };

  const columns: TableColumnsType<CustomReportRecord> = [
    { title: '编号', dataIndex: 'reportNo', width: 130, fixed: 'left' },
    {
      title: '报表名称',
      dataIndex: 'reportName',
      width: 220,
      render: (v: string, record: CustomReportRecord) => (
        <div className="min-w-0">
          <div className="truncate font-bold text-primary">{v}</div>
          <div className="truncate text-[10px] text-muted-foreground">
            维度：{previewFields(record.dimensions)} · 指标：
            {previewFields(record.metrics)}
          </div>
        </div>
      ),
    },
    {
      title: '类型',
      dataIndex: 'reportType',
      width: 80,
      render: (v: string) => <ReportTypeBadge type={v} />,
    },
    {
      title: '图表',
      dataIndex: 'chartType',
      width: 90,
      render: (v: string) => <ChartTypeBadge type={v} />,
    },
    { title: '时间范围', dataIndex: 'timeRange', width: 100 },
    {
      title: '公开',
      dataIndex: 'isPublic',
      width: 70,
      render: (v: boolean) => <PublicFlagBadge isPublic={v} />,
    },
    {
      title: '创建人',
      dataIndex: 'createdBy',
      width: 90,
      render: (v: string | null) => v || '—',
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 140,
      render: (v: string) => (
        <span className="font-mono text-xs">{formatDateTime(v)}</span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 280,
      render: (_: unknown, record: CustomReportRecord) => (
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="rounded-none"
            onClick={() => setRunRecord(record)}
          >
            预览
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="rounded-none"
            onClick={() => {
              setConfigRecord(record);
              setConfigOpen(true);
            }}
          >
            编辑
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="rounded-none"
            onClick={() => setCopyRecord(record)}
          >
            复制
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="rounded-none"
            onClick={() => openShare(record)}
          >
            分享
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="rounded-none text-destructive hover:text-destructive"
            onClick={() => setDeleteRecord(record)}
          >
            删除
          </Button>
        </div>
      ),
    },
  ];

  const {
    visibleColumns,
    columnMetas,
    hiddenIds,
    toggleColumn,
    resetColumns,
    setAllColumns,
  } = useColumnSettings(columns);

  return (
    <div className="space-y-6">
      <ReportCard>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={list.typeFilter}
              onValueChange={(v: string) => list.setTypeFilter(v)}
            >
              <SelectTrigger className="w-[130px] rounded-none">
                <SelectValue placeholder="类型" />
              </SelectTrigger>
              <SelectContent className="rounded-none">
                <SelectItem value="__all__">全部类型</SelectItem>
                {REPORT_TYPES.map((opt: string) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              className="w-[200px] rounded-none"
              value={list.keyword}
              onChange={(e) => list.setKeyword(e.target.value)}
              placeholder="报表名称/编号关键字"
            />
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={list.publicOnly}
                onCheckedChange={(checked: boolean | 'indeterminate') =>
                  list.setPublicOnly(checked === true)
                }
              />
              仅看公开
            </label>
            <Button variant="outline" className="rounded-none" onClick={list.handleSearch}>
              查询
            </Button>
            <Button variant="outline" className="rounded-none" onClick={list.handleReset}>
              重置
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              className="rounded-none"
              disabled={exporting}
              onClick={() => void handleExportList()}
            >
              <Download className="h-4 w-4" />
              {exporting ? '导出中...' : '导出Excel'}
            </Button>
            <Button
              data-ai-section-type="button"
              className="rounded-none"
              onClick={() => {
                setConfigRecord(null);
                setConfigOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              新建报表
            </Button>
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex justify-end">
            <ColumnSettingsButton
              columnMetas={columnMetas}
              hiddenIds={hiddenIds}
              onToggle={toggleColumn}
              onReset={resetColumns}
              onSetAll={setAllColumns}
            />
          </div>
          <Table
            columns={visibleColumns}
            dataSource={list.items}
            loading={list.loading}
            rowKey="id"
            scroll={{ x: 1400, y: 500 }}
            locale={{ emptyText: '暂无自定义报表' }}
            pagination={{
              current: list.page,
              pageSize: list.pageSize,
              total: list.total,
              showSizeChanger: false,
              onChange: list.handlePageChange,
            }}
          />
        </div>
      </ReportCard>
      <ReportConfigDialog
        open={configOpen}
        onClose={() => setConfigOpen(false)}
        onSaved={list.reload}
        initial={configRecord}
      />
      <ReportRunDialog
        open={runRecord !== null}
        onClose={() => setRunRecord(null)}
        report={runRecord}
      />
      <AdsConfirmDialog
        open={copyRecord !== null}
        title="复制报表"
        description={`确认为「${copyRecord?.reportName ?? ''}」（${copyRecord?.reportNo ?? ''}）创建副本吗？`}
        confirmText="复制"
        onOpenChange={(open: boolean) => {
          if (!open) setCopyRecord(null);
        }}
        onConfirm={() => void handleCopy()}
      />
      <AdsConfirmDialog
        open={deleteRecord !== null}
        title="删除报表"
        description={`确认删除「${deleteRecord?.reportName ?? ''}」（${deleteRecord?.reportNo ?? ''}）吗？删除后不可恢复。`}
        confirmText="删除"
        destructive
        onOpenChange={(open: boolean) => {
          if (!open) setDeleteRecord(null);
        }}
        onConfirm={() => void handleDelete()}
      />
      <Dialog
        open={shareRecord !== null}
        onOpenChange={(open: boolean) => {
          if (!open) setShareRecord(null);
        }}
      >
        <DialogContent className="rounded-none max-w-lg">
          <DialogHeader>
            <DialogTitle>分享报表</DialogTitle>
            <DialogDescription>设置公开状态与共享角色</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">公开报表</span>
              <Switch
                checked={sharePublic}
                onCheckedChange={(checked: boolean | 'indeterminate') =>
                  setSharePublic(checked === true)
                }
              />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">共享角色</div>
              <div className="flex flex-wrap gap-3">
                {SHARE_ROLE_OPTIONS.map((role: string) => (
                  <label key={role} className="flex items-center gap-1.5 text-sm">
                    <Checkbox
                      checked={shareRoles.includes(role)}
                      onCheckedChange={() =>
                        setShareRoles((prev: string[]) => toggleValue(prev, role))
                      }
                    />
                    {role}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-none"
              onClick={() => setShareRecord(null)}
            >
              取消
            </Button>
            <Button
              data-ai-section-type="button"
              className="rounded-none"
              disabled={shareSubmitting}
              onClick={() => void handleShare()}
            >
              {shareSubmitting ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
