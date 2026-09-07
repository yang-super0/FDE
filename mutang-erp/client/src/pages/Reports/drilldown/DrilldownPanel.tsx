import { useCallback, useEffect, useState } from 'react';
import { ChevronRight, Download, Play } from 'lucide-react';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Table, type TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import { ReportCard } from '@client/src/components/blueprint';
import { Button } from '@client/src/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  Table as ShadTable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@client/src/components/ui/table';
import { exportRowsToExcel } from '@client/src/pages/AdsBusiness/ads-excel';
import type {
  CustomReportRecord,
  DrilldownConfigResponse,
  DrilldownListParams,
  DrilldownRecord,
} from '@shared/api.interface';
import {
  fetchDrilldownConfig,
  fetchDrilldowns,
} from '@client/src/api/report-center/drilldowns';
import { fetchCustomReports } from '@client/src/api/report-center/custom-reports';
import { RC_FILTER_ALL, formatDateTime, toRcErrorText } from '../report-center-constants';
import { DrilldownExecuteDialog } from './DrilldownExecuteDialog';

const DEFAULT_PAGE_SIZE = 20;

const toErrText = (error: unknown): string =>
  error instanceof Error ? error.message : toRcErrorText(error);

const DrilldownPanel: React.FC = () => {
  const [config, setConfig] = useState<DrilldownConfigResponse | null>(null);
  const [configLoading, setConfigLoading] = useState<boolean>(false);
  const [reports, setReports] = useState<CustomReportRecord[]>([]);
  const [reportFilter, setReportFilter] = useState<string>(RC_FILTER_ALL);
  const [items, setItems] = useState<DrilldownRecord[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [loading, setLoading] = useState<boolean>(false);
  const [executeOpen, setExecuteOpen] = useState<boolean>(false);
  const [pathRecord, setPathRecord] = useState<DrilldownRecord | null>(null);

  const loadConfig = useCallback(async (): Promise<void> => {
    setConfigLoading(true);
    try {
      const res = await fetchDrilldownConfig();
      setConfig(res);
    } catch (error) {
      logger.error('获取下钻配置失败', error);
      toast.error(toErrText(error));
    } finally {
      setConfigLoading(false);
    }
  }, []);

  const loadReports = useCallback(async (): Promise<void> => {
    try {
      const res = await fetchCustomReports({ page: '1', pageSize: '100' });
      setReports(res.items);
    } catch (error) {
      logger.error('获取报表列表失败', error);
      toast.error(toErrText(error));
    }
  }, []);

  const loadList = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const params: DrilldownListParams = {
        page: String(page),
        pageSize: String(pageSize),
        reportId: reportFilter === RC_FILTER_ALL ? undefined : reportFilter,
      };
      const res = await fetchDrilldowns(params);
      setItems(res.items);
      setTotal(res.total);
    } catch (error) {
      logger.error('获取下钻执行记录失败', error);
      toast.error(toErrText(error));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, reportFilter]);

  useEffect(() => {
    void loadConfig();
    void loadReports();
  }, [loadConfig, loadReports]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const handleExport = async (): Promise<void> => {
    if (items.length === 0) {
      toast.error('当前无数据可导出');
      return;
    }
    const headers: string[] = [
      '编号', '报表ID', '源层级', '源维度', '源值', '目标层级', '目标表', '执行时间',
    ];
    const rows: Record<string, string>[] = items.map((r: DrilldownRecord) => ({
      编号: r.drilldownNo,
      报表ID: String(r.reportId),
      源层级: r.sourceLevel ?? '—',
      源维度: r.sourceDimension ?? '—',
      源值: r.sourceValue ?? '—',
      目标层级: r.targetLevel ?? '—',
      目标表: r.targetTable ?? '—',
      执行时间: dayjs(r.createdAt).format('YYYY-MM-DD HH:mm'),
    }));
    try {
      const count = await exportRowsToExcel(rows, headers, '下钻执行记录', '下钻执行记录');
      toast.success(`已导出 ${count} 条记录`);
    } catch {
      toast.error('导出失败');
    }
  };

  const columns: TableColumnsType<DrilldownRecord> = [
    { title: '编号', dataIndex: 'drilldownNo', width: 140, fixed: 'left' },
    {
      title: '报表ID', dataIndex: 'reportId', width: 90,
      render: (v: number) => (
        <span className="font-mono text-xs font-bold text-primary">#{v}</span>
      ),
    },
    {
      title: '源层级', dataIndex: 'sourceLevel', width: 90,
      render: (v: string | null) => v ?? '—',
    },
    {
      title: '源维度', dataIndex: 'sourceDimension', width: 100,
      render: (v: string | null) => v ?? '—',
    },
    {
      title: '源值', dataIndex: 'sourceValue', width: 120,
      render: (v: string | null) => (
        <span className="text-xs" title={v ?? ''}>{v ?? '—'}</span>
      ),
    },
    {
      title: '目标层级', dataIndex: 'targetLevel', width: 90,
      render: (v: string | null) => v ?? '—',
    },
    {
      title: '目标表', dataIndex: 'targetTable', width: 130,
      render: (v: string | null) => v ?? '—',
    },
    {
      title: '执行时间', dataIndex: 'createdAt', width: 150,
      render: (v: string) => (
        <span className="font-mono text-xs">{formatDateTime(v)}</span>
      ),
    },
    {
      title: '操作', key: 'action', fixed: 'right', width: 100,
      render: (_: unknown, record: DrilldownRecord) => (
        <Button
          size="sm" variant="ghost" className="rounded-none"
          onClick={() => setPathRecord(record)}
        >
          查看路径
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <ReportCard>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-sm font-black text-foreground">下钻配置</h3>
          <span className="text-xs text-muted-foreground">
            各维度可下钻至的目标明细表映射
          </span>
        </div>
        {configLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">加载中...</div>
        ) : config && config.dimensionTargets.length > 0 ? (
          <ShadTable>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[160px]">维度</TableHead>
                <TableHead className="w-[200px]">目标明细表</TableHead>
                <TableHead>说明</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {config.dimensionTargets.map(
                (target: { dimension: string; targetTable: string; targetLabel: string }) => (
                  <TableRow key={`${target.dimension}-${target.targetTable}`}>
                    <TableCell className="font-bold text-primary">{target.dimension}</TableCell>
                    <TableCell className="font-mono text-xs">{target.targetTable}</TableCell>
                    <TableCell className="text-muted-foreground">{target.targetLabel}</TableCell>
                  </TableRow>
                ),
              )}
            </TableBody>
          </ShadTable>
        ) : (
          <div className="py-8 text-center text-sm text-muted-foreground">暂无下钻配置</div>
        )}
      </ReportCard>

      <ReportCard>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={reportFilter}
              onValueChange={(v: string) => { setReportFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[180px] rounded-none">
                <SelectValue placeholder="报表" />
              </SelectTrigger>
              <SelectContent className="rounded-none">
                <SelectItem value={RC_FILTER_ALL}>全部报表</SelectItem>
                {reports.map((r: CustomReportRecord) => (
                  <SelectItem key={r.id} value={String(r.id)}>
                    {r.reportName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" className="rounded-none"
              onClick={() => { setReportFilter(RC_FILTER_ALL); setPage(1); }}>
              重置
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="rounded-none"
              onClick={() => void handleExport()}>
              <Download className="h-4 w-4" />导出
            </Button>
            <Button data-ai-section-type="button" className="rounded-none"
              onClick={() => setExecuteOpen(true)}>
              <Play className="h-4 w-4" />执行下钻
            </Button>
          </div>
        </div>
        <Table
          columns={columns}
          dataSource={items}
          loading={loading}
          rowKey="id"
          scroll={{ x: 1100, y: 500 }}
          locale={{ emptyText: '暂无下钻执行记录' }}
          pagination={{
            current: page, pageSize, total, showSizeChanger: true,
            onChange: (nextPage: number, nextPageSize: number) => {
              setPage(nextPage); setPageSize(nextPageSize);
            },
          }}
        />
      </ReportCard>

      <DrilldownExecuteDialog
        open={executeOpen}
        onClose={() => {
          setExecuteOpen(false);
          void loadList();
        }}
      />

      <Dialog open={pathRecord !== null}
        onOpenChange={(open: boolean) => { if (!open) setPathRecord(null); }}>
        <DialogContent className="max-w-2xl rounded-none">
          <DialogHeader>
            <DialogTitle>下钻路径</DialogTitle>
            <DialogDescription>
              「{pathRecord?.drilldownNo ?? ''}」的逐层下钻路径
            </DialogDescription>
          </DialogHeader>
          {pathRecord && pathRecord.drilldownPath.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1 border border-border bg-accent px-3 py-3 text-sm">
              {pathRecord.drilldownPath.map(
                (item, index: number) => (
                  <span
                    key={`${item.dimension}-${item.value}-${index}`}
                    className="flex items-center gap-1"
                  >
                    {index > 0 ? (
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : null}
                    <span className="rounded-[2px] bg-card px-2 py-1 shadow-xs">
                      <span className="text-[10px] font-bold text-muted-foreground">
                        {item.level}
                      </span>
                      <span className="ml-1 font-bold text-primary">
                        {item.dimension}={item.value}
                      </span>
                    </span>
                  </span>
                ),
              )}
            </div>
          ) : (
            <div className="py-6 text-center text-sm text-muted-foreground">暂无路径数据</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export { DrilldownPanel };
