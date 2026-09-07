import type { CreativeMaterial } from '@shared/api.interface';
import { ReportCard } from '@client/src/components/blueprint';
import { Badge } from '@client/src/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import {
  formatSeAmount,
  formatSeNumber,
  SeStatusBadge,
} from '../support-enhance-constants';

interface MaterialDetailDialogProps {
  open: boolean;
  record: CreativeMaterial | null;
  onOpenChange: (open: boolean) => void;
}

interface InfoItem {
  label: string;
  value: string;
}

const MaterialDetailDialog = ({
  open,
  record,
  onOpenChange,
}: MaterialDetailDialogProps) => {
  if (!record) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="rounded-none" />
      </Dialog>
    );
  }
  const tags: string[] = record.tags ?? [];
  const sellingPoints: string[] = record.sellingPoints ?? [];
  const infoItems: InfoItem[] = [
    { label: '素材编号', value: record.materialNo },
    { label: '类型', value: record.materialType },
    { label: '行业', value: record.industry || '—' },
    { label: '平台', value: record.platform || '—' },
    { label: '来源', value: record.source },
    { label: '作者', value: record.author || '—' },
    { label: '创意风格', value: record.creativeStyle || '—' },
    { label: '目标人群', value: record.targetAudience || '—' },
  ];
  const perfItems: InfoItem[] = [
    { label: '使用次数', value: formatSeNumber(record.usageCount, 0) },
    { label: '累计消耗', value: formatSeAmount(record.totalConsumption) },
    { label: '累计转化', value: formatSeNumber(record.totalConversions, 0) },
    { label: '平均ROI', value: formatSeNumber(record.avgRoi) },
    { label: '平均CTR', value: formatSeNumber(record.avgCtr) },
    { label: '平均转化率', value: formatSeNumber(record.avgConversionRate) },
    { label: '评分', value: '★'.repeat(Math.max(0, Math.min(5, record.rating))) },
    { label: '状态', value: record.status },
  ];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto rounded-none sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>素材详情 · {record.materialName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="text-[11px] font-black uppercase tracking-[0.15em] text-primary">
              基本信息
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 md:grid-cols-4">
              {infoItems.map((item: InfoItem) => (
                <div key={item.label} className="space-y-0.5">
                  <div className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">
                    {item.label}
                  </div>
                  <div className="text-sm font-mono">{item.value}</div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3 pt-1">
              <span className="text-xs text-muted-foreground">状态：</span>
              <SeStatusBadge status={record.status} />
            </div>
            {tags.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-xs text-muted-foreground">标签：</span>
                {tags.map((tag: string) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="rounded-[2px] border-primary/40 text-primary"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            ) : null}
            {sellingPoints.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-xs text-muted-foreground">卖点：</span>
                {sellingPoints.map((point: string) => (
                  <Badge
                    key={point}
                    variant="outline"
                    className="rounded-[2px] border-border text-foreground/80"
                  >
                    {point}
                  </Badge>
                ))}
              </div>
            ) : null}
            {record.description ? (
              <p className="text-sm text-muted-foreground pt-1">
                描述：{record.description}
              </p>
            ) : null}
          </div>
          <div className="space-y-3">
            <div className="text-[11px] font-black uppercase tracking-[0.15em] text-primary">
              PERFORMANCE · 效果数据
            </div>
            <ReportCard className="p-4">
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 md:grid-cols-4">
                {perfItems.map((item: InfoItem) => (
                  <div key={item.label} className="space-y-0.5">
                    <div className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">
                      {item.label}
                    </div>
                    <div className="text-sm font-mono">{item.value}</div>
                  </div>
                ))}
              </div>
            </ReportCard>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MaterialDetailDialog;
