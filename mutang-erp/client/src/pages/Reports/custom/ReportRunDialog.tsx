import { useCallback, useEffect, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { Download, FileText, Play } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  CustomReportRecord,
  ReportRunParams,
  ReportRunResult,
  ReportRunRow,
} from '@shared/api.interface';
import {
  Table,
  type TableColumnsType,
} from '@lark-apaas/client-toolkit/antd-table';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import { cn } from '@client/src/lib/utils';
import { RcDatePicker } from '../report-center-constants';
import { runCustomReport } from '@client/src/api/report-center/custom-reports';
import {
  CHART_TYPES,
  REPORT_DIMENSIONS,
  REPORT_METRICS,
  TIME_RANGES,
  RcFormField,
  formatAmount,
  toRcErrorText,
} from '../report-center-constants';
import { DrilldownExplorer } from '../drilldown/DrilldownExplorer';
import { ReportChart } from './ReportChart';
import { exportReportExcelRows, exportReportPdf } from '../report-export';

const CUSTOM_TIME_RANGE = '自定义';

function toggleValue(list: string[], value: string): string[] {
  return list.includes(value)
    ? list.filter((v: string) => v !== value)
    : [...list, value];
}

interface ReportRunDialogProps {
  open: boolean;
  onClose: () => void;
  report: CustomReportRecord | null;
}

export const ReportRunDialog: React.FC<ReportRunDialogProps> = ({
  open,
  onClose,
  report,
}) => {
  const [selectedDims, setSelectedDims] = useState<string[]>([]);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [chartType, setChartType] = useState<string>('');
  const [timeRange, setTimeRange] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [result, setResult] = useState<ReportRunResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);
  const [drilldownOpen, setDrilldownOpen] = useState<boolean>(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const runReport = useCallback(
    async (
      dims: string[],
      metrics: string[],
      chart: string,
      range: string,
      rangeStart: string | undefined,
      rangeEnd: string | undefined,
    ): Promise<void> => {
      if (!report) return;
      setLoading(true);
      try {
        const params: ReportRunParams = {
          dimensions: dims,
          metrics,
          chartType: chart,
          timeRange: range,
          customStartDate: rangeStart,
          customEndDate: rangeEnd,
        };
        const res: ReportRunResult = await runCustomReport(report.id, params);
        setResult(res);
      } catch (error) {
        logger.error('运行报表失败', error);
        toast.error(toRcErrorText(error));
        setResult(null);
      } finally {
        setLoading(false);
      }
    },
    [report],
  );

  useEffect(() => {
    if (!open || !report) return;
    setSelectedDims(report.dimensions);
    setSelectedMetrics(report.metrics);
    setChartType(report.chartType);
    setTimeRange(report.timeRange);
    setStartDate(report.customStartDate ?? '');
    setEndDate(report.customEndDate ?? '');
    setResult(null);
    setDrilldownOpen(false);
    void runReport(
      report.dimensions,
      report.metrics,
      report.chartType,
      report.timeRange,
      report.customStartDate ?? undefined,
      report.customEndDate ?? undefined,
    );
  }, [open, report, runReport]);

  const handleRun = (): void => {
    if (selectedDims.length === 0) {
      toast.error('请至少选择一个维度');
      return;
    }
    if (selectedMetrics.length === 0) {
      toast.error('请至少选择一个指标');
      return;
    }
    if (timeRange === CUSTOM_TIME_RANGE && (!startDate || !endDate)) {
      toast.error('自定义时间范围需选择起止日期');
      return;
    }
    void runReport(
      selectedDims,
      selectedMetrics,
      chartType,
      timeRange,
      timeRange === CUSTOM_TIME_RANGE ? startDate || undefined : undefined,
      timeRange === CUSTOM_TIME_RANGE ? endDate || undefined : undefined,
    );
  };

  const handleExportExcel = async (): Promise<void> => {
    if (!result || !report) {
      toast.error('暂无可导出的结果');
      return;
    }
    setExporting(true);
    try {
      const headers: string[] = [...result.dimensions, ...result.metrics];
      const rows: (string | number)[][] = result.rows.map(
        (row: ReportRunRow): (string | number)[] => [
          ...result.dimensions.map((dim: string) => row.dims[dim] ?? ''),
          ...result.metrics.map((metric: string) => row.values[metric] ?? 0),
        ],
      );
      rows.push([
        ...result.dimensions.map((): string => '合计'),
        ...result.metrics.map((metric: string) => result.totals[metric] ?? 0),
      ]);
      await exportReportExcelRows(
        report.reportName || '报表数据',
        headers,
        rows,
      );
      toast.success('Excel 导出成功');
    } catch (error) {
      logger.error('导出报表 Excel 失败', error);
      toast.error(toRcErrorText(error));
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = async (): Promise<void> => {
    if (!resultRef.current || !report) {
      toast.error('暂无可导出的结果');
      return;
    }
    setExporting(true);
    try {
      await exportReportPdf(resultRef.current, report.reportName || '报表');
      toast.success('PDF 导出成功');
    } catch (error) {
      logger.error('导出报表 PDF 失败', error);
      toast.error(toRcErrorText(error));
    } finally {
      setExporting(false);
    }
  };

  const columns: TableColumnsType<ReportRunRow> = result
    ? [
        ...result.dimensions.map((dim: string) => ({
          title: dim,
          dataIndex: ['dims', dim] as (string | number)[],
          width: 120,
          render: (v: string) => (
            <span className="font-bold text-primary">{v}</span>
          ),
        })),
        ...result.metrics.map((metric: string) => ({
          title: metric,
          dataIndex: ['values', metric] as (string | number)[],
          width: 130,
          align: 'right' as const,
          render: (v: number) => (
            <span className="font-mono">{formatAmount(v)}</span>
          ),
        })),
        {
          title: '操作',
          key: 'drilldown',
          width: 80,
          render: (_: unknown, _row: ReportRunRow) => (
            <Button
              size="sm"
              variant="ghost"
              className="rounded-none"
              onClick={() => setDrilldownOpen(true)}
            >
              下钻
            </Button>
          ),
        },
      ]
    : [];

  return (
    <Dialog open={open} onOpenChange={(o: boolean) => { if (!o) onClose(); }}>
      <DialogContent className="rounded-none max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>运行报表 · {report?.reportName ?? ''}</DialogTitle>
          <DialogDescription>
            调整维度、指标、图表类型或时间范围后点击运行
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 rounded-none border border-t-[3px] border-t-[#0033A0] p-4 shadow-md">
          <RcFormField label="维度">
            <div className="flex flex-wrap gap-1.5">
              {REPORT_DIMENSIONS.map((dim: string) => (
                <label
                  key={dim}
                  className={cn(
                    'flex cursor-pointer items-center gap-1.5 border border-border px-2 py-1 text-xs',
                    selectedDims.includes(dim)
                      ? 'border-primary bg-[#EFF6FF] text-primary'
                      : 'text-muted-foreground',
                  )}
                >
                  <Checkbox
                    checked={selectedDims.includes(dim)}
                    onCheckedChange={() =>
                      setSelectedDims((prev: string[]) => toggleValue(prev, dim))
                    }
                  />
                  {dim}
                </label>
              ))}
            </div>
          </RcFormField>
          <RcFormField label="指标">
            <div className="flex flex-wrap gap-1.5">
              {REPORT_METRICS.map((metric: string) => (
                <label
                  key={metric}
                  className={cn(
                    'flex cursor-pointer items-center gap-1.5 border border-border px-2 py-1 text-xs',
                    selectedMetrics.includes(metric)
                      ? 'border-primary bg-[#EFF6FF] text-primary'
                      : 'text-muted-foreground',
                  )}
                >
                  <Checkbox
                    checked={selectedMetrics.includes(metric)}
                    onCheckedChange={() =>
                      setSelectedMetrics((prev: string[]) => toggleValue(prev, metric))
                    }
                  />
                  {metric}
                </label>
              ))}
            </div>
          </RcFormField>
          <div className="flex flex-wrap items-end gap-3">
            <RcFormField label="图表类型" className="min-w-[150px]">
              <Select value={chartType} onValueChange={(v: string) => setChartType(v)}>
                <SelectTrigger className="rounded-none">
                  <SelectValue placeholder="图表类型" />
                </SelectTrigger>
                <SelectContent className="rounded-none">
                  {CHART_TYPES.map((opt: string) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </RcFormField>
            <RcFormField label="时间范围" className="min-w-[150px]">
              <Select value={timeRange} onValueChange={(v: string) => setTimeRange(v)}>
                <SelectTrigger className="rounded-none">
                  <SelectValue placeholder="时间范围" />
                </SelectTrigger>
                <SelectContent className="rounded-none">
                  {TIME_RANGES.map((opt: string) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </RcFormField>
            {timeRange === CUSTOM_TIME_RANGE ? (
              <RcFormField label="开始日期" className="min-w-[170px]">
                <RcDatePicker
                  value={startDate}
                  onChange={(v: string) => setStartDate(v)}
                  placeholder="开始日期"
                />
              </RcFormField>
            ) : null}
            {timeRange === CUSTOM_TIME_RANGE ? (
              <RcFormField label="结束日期" className="min-w-[170px]">
                <RcDatePicker
                  value={endDate}
                  onChange={(v: string) => setEndDate(v)}
                  placeholder="结束日期"
                />
              </RcFormField>
            ) : null}
            <Button
              data-ai-section-type="button"
              className="rounded-none"
              disabled={loading}
              onClick={handleRun}
            >
              <Play className="h-4 w-4" />
              {loading ? '运行中...' : '运行'}
            </Button>
          </div>
        </div>
        {loading ? (
          <div className="flex h-[400px] items-center justify-center text-sm text-muted-foreground">
            运行中...
          </div>
        ) : !result || result.rows.length === 0 ? (
          <div className="flex h-[400px] items-center justify-center text-sm text-muted-foreground">
            暂无数据，请调整维度或时间范围
          </div>
        ) : (
          <div
            ref={resultRef}
            className="space-y-4 rounded-none border border-t-[3px] border-t-[#0033A0] bg-white p-4 shadow-md"
          >
            <ReportChart result={result} />
            <Table
              columns={columns}
              dataSource={result.rows}
              rowKey="key"
              size="small"
              scroll={{ y: 360 }}
              pagination={{ pageSize: 10, showSizeChanger: false }}
              locale={{ emptyText: '暂无数据' }}
            />
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 border border-t-0 border-border bg-accent px-4 py-2 text-xs">
              <span className="font-bold">合计</span>
              {result.metrics.map((metric: string) => (
                <span key={metric}>
                  {metric}：
                  <span className="font-mono font-bold">
                    {formatAmount(result.totals[metric] ?? 0)}
                  </span>
                </span>
              ))}
            </div>
            <div className="text-[10px] text-muted-foreground">
              数据范围：{result.rangeStart} ~ {result.rangeEnd}
            </div>
          </div>
        )}
        {drilldownOpen && report ? (
          <DrilldownExplorer
            reportId={report.id}
            onClose={() => setDrilldownOpen(false)}
          />
        ) : null}
        <DialogFooter>
          <Button
            variant="outline"
            className="rounded-none"
            disabled={exporting}
            onClick={() => void handleExportExcel()}
          >
            <Download className="h-4 w-4" />
            {exporting ? '导出中...' : '导出Excel'}
          </Button>
          <Button
            variant="outline"
            className="rounded-none"
            disabled={exporting}
            onClick={() => void handleExportPdf()}
          >
            <FileText className="h-4 w-4" />
            导出PDF
          </Button>
          <Button variant="outline" className="rounded-none" onClick={onClose}>
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
