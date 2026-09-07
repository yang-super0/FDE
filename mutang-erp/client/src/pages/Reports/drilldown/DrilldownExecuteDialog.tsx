import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type { CustomReportRecord, DrilldownPathItem } from '@shared/api.interface';
import { fetchCustomReports } from '@client/src/api/report-center/custom-reports';
import { Button } from '@client/src/components/ui/button';
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
import { DRILLDOWN_LEVELS, RC_FILTER_ALL, toRcErrorText } from '../report-center-constants';
import { DrilldownRunner } from './DrilldownRunner';

interface DrilldownExecuteDialogProps {
  open: boolean;
  onClose: () => void;
}

/**
 * 下钻执行弹窗：第一步选择报表/起始层级/维度/维度值执行，
 * 之后进入多级下钻交互（面包屑截断、返回上一级、导出明细）。
 */
const DrilldownExecuteDialog: React.FC<DrilldownExecuteDialogProps> = ({ open, onClose }) => {
  const [reports, setReports] = useState<CustomReportRecord[]>([]);
  const [reportId, setReportId] = useState<string>('');
  const [level, setLevel] = useState<string>(DRILLDOWN_LEVELS[0]);
  const [dimension, setDimension] = useState<string>('');
  const [value, setValue] = useState<string>('');
  const [path, setPath] = useState<DrilldownPathItem[]>([]);

  useEffect(() => {
    if (!open) return;
    setReportId('');
    setLevel(DRILLDOWN_LEVELS[0]);
    setDimension('');
    setValue('');
    setPath([]);
    fetchCustomReports({ page: '1', pageSize: '100' })
      .then((res) => setReports(res.items))
      .catch((error: unknown) => {
        logger.error('获取报表列表失败', error);
        toast.error(error instanceof Error ? error.message : toRcErrorText(error));
      });
  }, [open]);

  const selectedReport: CustomReportRecord | null =
    reports.find((r: CustomReportRecord) => String(r.id) === reportId) ?? null;

  const handleReportChange = (next: string): void => {
    setReportId(next);
    setPath([]);
    const nextReport: CustomReportRecord | undefined = reports.find(
      (r: CustomReportRecord) => String(r.id) === next,
    );
    setDimension(nextReport?.dimensions[0] ?? '');
  };

  const handleExecute = (): void => {
    if (!reportId || !dimension || !value.trim()) {
      toast.error('请选择报表、维度并输入维度值');
      return;
    }
    setPath([{ level, dimension, value: value.trim() }]);
  };

  return (
    <Dialog open={open} onOpenChange={(next: boolean) => { if (!next) onClose(); }}>
      <DialogContent className="max-h-[85vh] max-w-5xl overflow-y-auto rounded-none">
        <DialogHeader>
          <DialogTitle>执行下钻</DialogTitle>
          <DialogDescription>
            选择报表与起始维度，逐层下钻查看分组与单据明细
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">报表</label>
            <Select value={reportId || RC_FILTER_ALL} onValueChange={handleReportChange}>
              <SelectTrigger className="w-[200px] rounded-none">
                <SelectValue placeholder="选择报表" />
              </SelectTrigger>
              <SelectContent className="rounded-none">
                <SelectItem value={RC_FILTER_ALL}>请选择报表</SelectItem>
                {reports.map((r: CustomReportRecord) => (
                  <SelectItem key={r.id} value={String(r.id)}>
                    {r.reportName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">起始层级</label>
            <Select value={level} onValueChange={(v: string) => setLevel(v)}>
              <SelectTrigger className="w-[110px] rounded-none">
                <SelectValue placeholder="层级" />
              </SelectTrigger>
              <SelectContent className="rounded-none">
                {DRILLDOWN_LEVELS.map((opt: string) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">维度</label>
            <Select value={dimension} onValueChange={(v: string) => setDimension(v)}>
              <SelectTrigger className="w-[120px] rounded-none">
                <SelectValue placeholder="维度" />
              </SelectTrigger>
              <SelectContent className="rounded-none">
                {(selectedReport?.dimensions ?? []).map((opt: string) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">维度值</label>
            <Input
              className="w-[160px] rounded-none"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="如：华东大区"
            />
          </div>
          <Button className="rounded-none" onClick={handleExecute}>
            执行下钻
          </Button>
        </div>
        {path.length > 0 ? (
          <DrilldownRunner
            reportId={Number(reportId)}
            reportName={selectedReport?.reportName ?? ''}
            path={path}
            onPathChange={setPath}
          />
        ) : (
          <div className="py-6 text-center text-sm text-muted-foreground">
            选择报表与维度后执行下钻，结果将在此展示，支持多级下钻与返回
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" className="rounded-none" onClick={onClose}>
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export { DrilldownExecuteDialog };
