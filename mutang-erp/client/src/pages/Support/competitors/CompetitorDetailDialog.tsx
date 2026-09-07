import type {
  CompetitorMonitoring,
} from '@shared/api.interface';
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

interface CompetitorDetailDialogProps {
  open: boolean;
  record: CompetitorMonitoring | null;
  onOpenChange: (open: boolean) => void;
}

interface InfoItem {
  label: string;
  value: string;
}

const InfoRow = ({ items }: { items: InfoItem[] }) => (
  <div className="grid grid-cols-2 gap-x-6 gap-y-2 md:grid-cols-4">
    {items.map((item: InfoItem) => (
      <div key={item.label} className="space-y-0.5">
        <div className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">
          {item.label}
        </div>
        <div className="text-sm font-mono">{item.value}</div>
      </div>
    ))}
  </div>
);

interface SwotItem {
  title: string;
  text: string;
  color: string;
}

const SwotCard = ({ title, text, color }: SwotItem) => (
  <ReportCard className="p-4">
    <div
      className="text-[11px] font-black uppercase tracking-[0.15em] mb-2"
      style={{ color }}
    >
      {title}
    </div>
    <p className="text-sm leading-relaxed text-foreground/80">
      {text || '—'}
    </p>
  </ReportCard>
);

const CompetitorDetailDialog = ({
  open,
  record,
  onOpenChange,
}: CompetitorDetailDialogProps) => {
  if (!record) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="rounded-none" />
      </Dialog>
    );
  }
  const keywords: string[] = record.keywords ?? [];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto rounded-none sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>竞品详情 · {record.competitorName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="text-[11px] font-black uppercase tracking-[0.15em] text-primary">
              基本信息
            </div>
            <InfoRow
              items={[
                { label: '监控编号', value: record.monitorNo },
                { label: '行业', value: record.competitorIndustry || '—' },
                { label: '平台', value: record.platform || '—' },
                { label: '监控日期', value: record.monitorDate },
                {
                  label: '预估消耗',
                  value: formatSeAmount(record.estimatedConsumption ?? 0),
                },
                {
                  label: '预估ROI',
                  value: formatSeNumber(record.estimatedRoi ?? 0),
                },
                { label: '广告数', value: formatSeNumber(record.adCount ?? 0, 0) },
                {
                  label: '素材数',
                  value: formatSeNumber(record.creativeCount ?? 0, 0),
                },
                { label: '主推产品', value: record.mainProducts || '—' },
                { label: '目标人群', value: record.targetAudience || '—' },
                { label: '落地页类型', value: record.landingPageType || '—' },
                { label: '数据来源', value: record.dataSource },
              ]}
            />
            <div className="flex items-center gap-3 pt-1">
              <span className="text-xs text-muted-foreground">可信度：</span>
              <SeStatusBadge status={record.confidence} />
            </div>
            {keywords.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-xs text-muted-foreground">关键词：</span>
                {keywords.map((kw: string) => (
                  <Badge
                    key={kw}
                    variant="outline"
                    className="rounded-[2px] border-primary/40 text-primary"
                  >
                    {kw}
                  </Badge>
                ))}
              </div>
            ) : null}
            {record.remark ? (
              <p className="text-sm text-muted-foreground pt-1">
                备注：{record.remark}
              </p>
            ) : null}
          </div>
          <div className="space-y-3">
            <div className="text-[11px] font-black uppercase tracking-[0.15em] text-primary">
              SWOT 分析
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <SwotCard title="S · 优势" text={record.strengths ?? ''} color="#0033A0" />
              <SwotCard title="W · 劣势" text={record.weaknesses ?? ''} color="#0047CC" />
              <SwotCard title="O · 机会点" text={record.opportunities ?? ''} color="#1A66E0" />
              <SwotCard title="T · 威胁点" text={record.threats ?? ''} color="#4D94FF" />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CompetitorDetailDialog;
