import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { MessageSquare, Play, ThumbsUp } from 'lucide-react';
import type { TopMaterialItem, TopOrderBy } from '@shared/video-material';
import { getTopVideoMaterials } from '@client/src/api/video-material';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@client/src/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@client/src/components/ui/tabs';

const TOP_LIMIT: number = 10;
const TOP_RANK_COUNT: number = 3;

type RankStatus = 'loading' | 'ready' | 'error';

interface OrderOption {
  value: TopOrderBy;
  label: string;
}

const ORDER_OPTIONS: OrderOption[] = [
  { value: 'playCount', label: '按播放量' },
  { value: 'likeCount', label: '按点赞数' },
];

const formatNumber = (value: string | null): string => {
  const num: number = Number(value ?? 0);
  return Number.isFinite(num) ? num.toLocaleString('zh-CN') : '0';
};

interface MetricCellProps {
  icon: React.ComponentType<{ className?: string }>;
  value: string | null;
}

const MetricCell: React.FC<MetricCellProps> = ({
  icon: Icon,
  value,
}: MetricCellProps) => {
  return (
    <span className="flex w-20 shrink-0 items-center justify-end gap-1 font-mono text-xs tabular-nums text-muted-foreground sm:w-24">
      <Icon className="size-3.5 shrink-0" />
      <span className="truncate">{formatNumber(value)}</span>
    </span>
  );
};

const TopMaterialsRank: React.FC = () => {
  const navigate = useNavigate();
  const [orderBy, setOrderBy] = useState<TopOrderBy>('playCount');
  const [items, setItems] = useState<TopMaterialItem[]>([]);
  const [status, setStatus] = useState<RankStatus>('loading');

  useEffect(() => {
    let cancelled: boolean = false;
    setStatus('loading');
    getTopVideoMaterials(orderBy, TOP_LIMIT)
      .then((data: TopMaterialItem[]) => {
        if (cancelled) return;
        setItems(data);
        setStatus('ready');
      })
      .catch((error: unknown) => {
        logger.error('加载爆款榜单失败', error);
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [orderBy]);

  const handleTabChange = (value: string): void => {
    const next: TopOrderBy = value === 'likeCount' ? 'likeCount' : 'playCount';
    setOrderBy(next);
  };

  const handleRowClick = (id: string): void => {
    navigate(`/materials/${id}`);
  };

  return (
    <Card className="rounded-sm shadow-none">
      <CardHeader className="flex-row items-center justify-between space-y-0 p-4 pb-2">
        <CardTitle className="text-sm font-medium">爆款榜单 TOP{TOP_LIMIT}</CardTitle>
        <Tabs value={orderBy} onValueChange={handleTabChange}>
          <TabsList className="h-8">
            {ORDER_OPTIONS.map((option: OrderOption) => (
              <TabsTrigger key={option.value} value={option.value} className="text-xs">
                {option.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {status === 'loading' && (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_: unknown, index: number) => (
              <div
                key={index}
                className="h-9 animate-pulse rounded-sm bg-muted/60"
              />
            ))}
          </div>
        )}
        {status === 'error' && (
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
            榜单加载失败，请刷新重试
          </div>
        )}
        {status === 'ready' && items.length === 0 && (
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
            暂无素材数据
          </div>
        )}
        {status === 'ready' && items.length > 0 && (
          <div className="divide-y divide-border">
            {items.map((item: TopMaterialItem, index: number) => {
              const isTop: boolean = index < TOP_RANK_COUNT;
              return (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleRowClick(item.id)}
                  onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) => {
                    if (event.key === 'Enter') handleRowClick(item.id);
                  }}
                  className="flex cursor-pointer items-center gap-3 rounded-sm px-2 py-2 transition-colors duration-150 ease-out hover:bg-accent/40"
                >
                  <span
                    className={`flex size-6 shrink-0 items-center justify-center rounded-sm font-mono text-xs font-semibold tabular-nums ${
                      isTop
                        ? 'bg-highlight/15 text-highlight'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                    {item.videoCopyText || '未命名素材'}
                  </span>
                  <MetricCell icon={Play} value={item.playCount} />
                  <MetricCell icon={ThumbsUp} value={item.likeCount} />
                  <span className="hidden sm:flex">
                    <MetricCell icon={MessageSquare} value={item.commentCount} />
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TopMaterialsRank;
