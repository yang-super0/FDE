import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  ScheduledPreviewResponse,
  ScheduledReportRecord,
} from '@shared/api.interface';
import { previewSchedule } from '@client/src/api/report-center/schedules';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import {
  Table as ShadTable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@client/src/components/ui/table';
import { ReportChart } from '../custom/ReportChart';
import {
  WEEK_DAY_OPTIONS,
  formatAmount,
  toRcErrorText,
} from '../report-center-constants';

interface PreviewDialogProps {
  open: boolean;
  schedule: ScheduledReportRecord | null;
  onClose: () => void;
}

const cycleText = (record: ScheduledReportRecord): string => {
  if (record.frequency === '每周' && record.dayOfWeek !== null) {
    return WEEK_DAY_OPTIONS.find((o) => o.value === String(record.dayOfWeek))?.label ?? '—';
  }
  if (record.frequency === '每月' && record.dayOfMonth !== null) {
    return `每月${record.dayOfMonth}日`;
  }
  return '—';
};

const PreviewDialog: React.FC<PreviewDialogProps> = ({ open, schedule, onClose }) => {
  const [data, setData] = useState<ScheduledPreviewResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!open || !schedule) {
      setData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    previewSchedule(schedule.id)
      .then((res: ScheduledPreviewResponse) => {
        if (!cancelled) setData(res);
      })
      .catch((error: unknown) => {
        logger.error('预览定时任务失败', error);
        toast.error(error instanceof Error ? error.message : toRcErrorText(error));
        if (!cancelled) onClose();
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, schedule, onClose]);

  return (
    <Dialog open={open} onOpenChange={(next: boolean) => { if (!next) onClose(); }}>
      <DialogContent className="max-h-[85vh] max-w-4xl overflow-y-auto rounded-none">
        <DialogHeader>
          <DialogTitle>任务预览</DialogTitle>
          <DialogDescription>
            「{schedule?.scheduleName ?? ''}」当前数据结果预览
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">加载中...</div>
        ) : data ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-x-6 gap-y-1 border border-border bg-accent px-3 py-2 text-xs text-muted-foreground">
              <span>频率：{data.schedule.frequency}</span>
              <span>周期：{cycleText(data.schedule)}</span>
              <span>推送时间：{data.schedule.scheduleTime}</span>
              <span>
                推送目标：{data.schedule.targetType}
                {data.schedule.targetName ? ` · ${data.schedule.targetName}` : ''}
              </span>
              <span>
                文件格式：{data.schedule.fileFormat}
                {data.schedule.includeChart ? '（含图表）' : ''}
              </span>
            </div>
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span>数据周期：{data.result.timeRange}</span>
              <span>区间：{data.result.rangeStart} ~ {data.result.rangeEnd}</span>
              <span>图表类型：{data.result.chartType}</span>
            </div>
            <ReportChart result={data.result} />
            <ShadTable>
              <TableHeader>
                <TableRow>
                  {data.result.dimensions.map((dim: string) => (
                    <TableHead key={dim}>{dim}</TableHead>
                  ))}
                  {data.result.metrics.map((metric: string) => (
                    <TableHead key={metric} className="text-right">{metric}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.result.rows.map((row) => (
                  <TableRow key={row.key}>
                    {data.result.dimensions.map((dim: string) => (
                      <TableCell key={dim}>{row.dims[dim] ?? '—'}</TableCell>
                    ))}
                    {data.result.metrics.map((metric: string) => (
                      <TableCell key={metric} className="text-right font-mono">
                        {formatAmount(row.values[metric] ?? 0)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
                <TableRow className="bg-accent font-bold">
                  <TableCell>合计</TableCell>
                  {data.result.dimensions.slice(1).map((dim: string) => (
                    <TableCell key={dim} />
                  ))}
                  {data.result.metrics.map((metric: string) => (
                    <TableCell key={metric} className="text-right font-mono">
                      {formatAmount(data.result.totals[metric] ?? 0)}
                    </TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </ShadTable>
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-muted-foreground">暂无预览数据</div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export { PreviewDialog };
