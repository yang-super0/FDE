import React, { useCallback, useEffect, useState } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { AlertTriangle } from 'lucide-react';
import type {
  DashboardDistributions,
  DashboardSummary,
} from '@shared/dashboard';
import {
  getDashboardDistributions,
  getDashboardSummary,
} from '@client/src/api/dashboard';
import { Button } from '@client/src/components/ui/button';
import SummaryCards from './SummaryCards';
import DistributionCharts from './DistributionCharts';
import TopMaterialsRank from './TopMaterialsRank';

type PageStatus = 'loading' | 'ready' | 'error';

const DashboardPage: React.FC = () => {
  const [status, setStatus] = useState<PageStatus>('loading');
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [distributions, setDistributions] =
    useState<DashboardDistributions | null>(null);
  const [reloadKey, setReloadKey] = useState<number>(0);

  useEffect(() => {
    let cancelled: boolean = false;
    setStatus('loading');
    Promise.all([getDashboardSummary(), getDashboardDistributions()])
      .then(
        ([summaryData, distributionData]: [
          DashboardSummary,
          DashboardDistributions,
        ]) => {
          if (cancelled) return;
          setSummary(summaryData);
          setDistributions(distributionData);
          setStatus('ready');
        },
      )
      .catch((error: unknown) => {
        logger.error('加载数据看板失败', error);
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const handleRetry = useCallback((): void => {
    setReloadKey((key: number) => key + 1);
  }, []);

  if (status === 'loading') {
    return (
      <div className="space-y-3 pb-6">
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_: unknown, index: number) => (
            <div
              key={index}
              className="h-20 animate-pulse rounded-sm border border-border bg-card"
            />
          ))}
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_: unknown, index: number) => (
            <div
              key={index}
              className="h-[360px] animate-pulse rounded-sm border border-border bg-card"
            />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-sm border border-border bg-card" />
      </div>
    );
  }

  if (status === 'error' || !summary || !distributions) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-sm border border-border bg-card">
        <AlertTriangle className="size-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          数据看板加载失败，请重试
        </p>
        <Button size="sm" onClick={handleRetry}>
          重新加载
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-6">
      <SummaryCards summary={summary} />
      <DistributionCharts distributions={distributions} />
      <TopMaterialsRank />
    </div>
  );
};

export default DashboardPage;
