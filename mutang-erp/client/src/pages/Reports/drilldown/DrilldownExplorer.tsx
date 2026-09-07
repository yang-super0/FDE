import { useEffect, useState } from 'react';
import { RotateCcw, X } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type { CustomReportRecord, DrilldownPathItem } from '@shared/api.interface';
import { fetchCustomReport } from '@client/src/api/report-center/custom-reports';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import { DRILLDOWN_LEVELS, toRcErrorText } from '../report-center-constants';
import { DrilldownRunner } from './DrilldownRunner';

interface DrilldownExplorerProps {
  reportId: number;
  onClose: () => void;
}

/**
 * 报表运行结果内的下钻探索器：选择起始层级/维度/维度值后开始逐层下钻。
 */
const DrilldownExplorer: React.FC<DrilldownExplorerProps> = ({ reportId, onClose }) => {
  const [report, setReport] = useState<CustomReportRecord | null>(null);
  const [path, setPath] = useState<DrilldownPathItem[]>([]);
  const [level, setLevel] = useState<string>(DRILLDOWN_LEVELS[0]);
  const [dimension, setDimension] = useState<string>('');
  const [value, setValue] = useState<string>('');

  useEffect(() => {
    fetchCustomReport(reportId)
      .then((res: CustomReportRecord) => {
        setReport(res);
        setDimension(res.dimensions[0] ?? '');
      })
      .catch((error: unknown) => {
        logger.error('获取报表信息失败', error);
        toast.error(error instanceof Error ? error.message : toRcErrorText(error));
      });
  }, [reportId]);

  const startDrilldown = (): void => {
    if (!dimension || !value.trim()) {
      toast.error('请选择维度并输入维度值');
      return;
    }
    setPath([{ level, dimension, value: value.trim() }]);
  };

  return (
    <div className="space-y-3 border-t border-border pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-black text-primary">
          {report?.reportName ?? `报表#${reportId}`}
          <span className="ml-2 text-xs font-normal text-muted-foreground">下钻分析</span>
        </span>
        <div className="flex items-center gap-2">
          {path.length > 0 ? (
            <Button
              size="sm"
              variant="outline"
              className="rounded-none"
              onClick={() => {
                setPath([]);
                setValue('');
              }}
            >
              <RotateCcw className="h-4 w-4" />
              重新开始
            </Button>
          ) : null}
          <Button size="sm" variant="outline" className="rounded-none" onClick={onClose}>
            <X className="h-4 w-4" />
            关闭
          </Button>
        </div>
      </div>
      {path.length === 0 ? (
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">起始层级</label>
            <Select value={level} onValueChange={(v: string) => setLevel(v)}>
              <SelectTrigger className="w-[120px] rounded-none">
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
              <SelectTrigger className="w-[130px] rounded-none">
                <SelectValue placeholder="维度" />
              </SelectTrigger>
              <SelectContent className="rounded-none">
                {(report?.dimensions ?? []).map((opt: string) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">维度值</label>
            <Input
              className="w-[180px] rounded-none"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="如：华东大区"
            />
          </div>
          <Button className="rounded-none" onClick={startDrilldown}>
            开始下钻
          </Button>
        </div>
      ) : (
        <DrilldownRunner
          reportId={reportId}
          reportName={report?.reportName ?? ''}
          path={path}
          onPathChange={setPath}
        />
      )}
    </div>
  );
};

export { DrilldownExplorer };
