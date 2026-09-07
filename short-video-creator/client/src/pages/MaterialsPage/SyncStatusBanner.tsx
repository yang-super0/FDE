import React, { useEffect, useState } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { RefreshCw } from 'lucide-react';
import dayjs from 'dayjs';
import type { SyncStatusResponse } from '@shared/video-material';
import { getSyncStatus } from '@client/src/api/video-material';

export interface SyncStatusBannerProps {
  dataSource: 'bitable' | 'local' | null;
  loading: boolean;
}

const POLL_INTERVAL_MS: number = 30000;

export const SyncStatusBanner: React.FC<SyncStatusBannerProps> = ({
  dataSource,
  loading,
}) => {
  const [status, setStatus] = useState<SyncStatusResponse | null>(null);
  const [fetching, setFetching] = useState<boolean>(false);

  useEffect(() => {
    let cancelled: boolean = false;
    const fetchStatus = (): void => {
      setFetching(true);
      getSyncStatus()
        .then((result: SyncStatusResponse) => {
          if (!cancelled) {
            setStatus(result);
          }
        })
        .catch((err: unknown) => {
          logger.error('获取同步状态失败', err);
        })
        .finally(() => {
          if (!cancelled) {
            setFetching(false);
          }
        });
    };
    fetchStatus();
    const timer: ReturnType<typeof setInterval> = setInterval(
      fetchStatus,
      POLL_INTERVAL_MS,
    );
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const lastSuccessAt: string | null = status?.lastSuccessAt ?? null;
  const lastError: string | null = status?.lastError ?? null;

  return (
    <div className="flex items-center gap-3 rounded-sm border bg-card px-3 py-1.5 text-xs">
      {dataSource === 'bitable' && (
        <span className="flex shrink-0 items-center gap-1.5 text-muted-foreground">
          <span className="size-1.5 rounded-full bg-[hsl(152_60%_42%)]" />
          实时同步 · 多维表格
        </span>
      )}
      {dataSource === 'local' && (
        <span className="flex shrink-0 items-center gap-1.5 text-muted-foreground">
          <span className="size-1.5 rounded-full bg-[hsl(38_85%_50%)]" />
          本地缓存 · 多维表格暂不可达
        </span>
      )}
      <span className="shrink-0 font-mono tabular-nums text-muted-foreground">
        {lastSuccessAt
          ? `最近同步 ${dayjs(lastSuccessAt).format('MM-DD HH:mm')}`
          : '暂无同步记录'}
      </span>
      <span className="flex min-w-0 flex-1 items-center justify-end gap-2">
        {lastError && (
          <span
            className="max-w-[280px] truncate text-[hsl(4_75%_52%)]"
            title={lastError}
          >
            {lastError}
          </span>
        )}
        {(loading || fetching) && (
          <RefreshCw className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
        )}
      </span>
    </div>
  );
};
