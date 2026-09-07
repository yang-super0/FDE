import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  AdCampaignDetail,
  CampaignStatus,
} from '@shared/api.interface';
import { Button } from '@client/src/components/ui/button';
import {
  ReportCard,
  SectionHeader,
  StatusBadge,
  type StatusTone,
} from '@client/src/components/blueprint';
import { getCampaignDetail } from '@client/src/api/advertising';
import AdvertisingTrendChart from './AdvertisingTrendChart';
import AdvertisingDetailTable from './AdvertisingDetailTable';

const STATUS_LABEL: Record<CampaignStatus, string> = {
  preparing: '准备中',
  running: '投放中',
  paused: '已暂停',
  finished: '已结束',
};

const STATUS_TONE: Record<CampaignStatus, StatusTone> = {
  preparing: 'neutral',
  running: 'success',
  paused: 'warning',
  finished: 'info',
};

interface MetricCardConfig {
  label: string;
  key: string;
  format: (detail: AdCampaignDetail) => string;
}

const METRIC_CARDS: MetricCardConfig[] = [
  {
    label: '曝光量',
    key: 'impressions',
    format: (detail: AdCampaignDetail) =>
      detail.metrics.impressions.toLocaleString(),
  },
  {
    label: '点击量',
    key: 'clicks',
    format: (detail: AdCampaignDetail) =>
      detail.metrics.clicks.toLocaleString(),
  },
  {
    label: '点击率',
    key: 'ctr',
    format: (detail: AdCampaignDetail) => `${detail.metrics.ctr}%`,
  },
  {
    label: '转化量',
    key: 'conversions',
    format: (detail: AdCampaignDetail) =>
      detail.metrics.conversions.toLocaleString(),
  },
  {
    label: '总消耗（元）',
    key: 'cost',
    format: (detail: AdCampaignDetail) =>
      detail.metrics.cost.toLocaleString(),
  },
];

const formatDate = (value: string): string => (value ? value.slice(0, 10) : '-');

const AdvertisingDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<AdCampaignDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const fetchDetail = useCallback(async (): Promise<void> => {
    if (!id) {
      setError('缺少项目 ID');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await getCampaignDetail(id);
      setDetail(result);
    } catch (err) {
      logger.error('加载投放项目详情失败', err);
      setError('详情加载失败，请重试');
      toast.error('详情加载失败');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  if (loading) {
    return (
      <div className="max-w-[1280px] mx-auto px-8 py-8 text-sm text-muted-foreground">
        加载中...
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="max-w-[1280px] mx-auto px-8 py-8">
        <div className="text-sm text-muted-foreground mb-4">
          {error || '项目不存在'}
        </div>
        <Button variant="outline" onClick={() => navigate('/advertising')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回列表
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-[1280px] mx-auto px-8 py-8">
      <SectionHeader
        no="02"
        label="CAMPAIGN DETAIL"
        subtitle="投放项目效果追踪与明细分析"
      />
      <Button
        variant="ghost"
        size="sm"
        className="mb-4"
        onClick={() => navigate('/advertising')}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        返回列表
      </Button>

      <ReportCard className="mb-8">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold">{detail.name}</h1>
              <StatusBadge tone={STATUS_TONE[detail.status]}>
                {STATUS_LABEL[detail.status] ?? detail.status}
              </StatusBadge>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
              <span>客户：{detail.customerName || '-'}</span>
              <span>平台：{detail.platform}</span>
              <span>
                预算：
                <span className="font-mono">
                  ¥{detail.budget.toLocaleString()}
                </span>
              </span>
              <span className="font-mono">
                {formatDate(detail.startDate)} ~ {formatDate(detail.endDate)}
              </span>
            </div>
          </div>
        </div>
      </ReportCard>

      <div
        data-ai-section-type="card-stat"
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8"
      >
        {METRIC_CARDS.map((card: MetricCardConfig) => (
          <ReportCard key={card.key} className="p-5">
            <div className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground mb-2">
              {card.label}
            </div>
            <div className="text-2xl font-bold font-mono">
              {card.format(detail)}
            </div>
          </ReportCard>
        ))}
      </div>

      <ReportCard className="mb-8">
        <AdvertisingTrendChart campaignId={detail.id} />
      </ReportCard>

      <ReportCard>
        <AdvertisingDetailTable
          campaignId={detail.id}
          campaignName={detail.name}
        />
      </ReportCard>
    </div>
  );
};

export default AdvertisingDetail;
