import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, MessageCircle, Play, ThumbsUp } from 'lucide-react';
import type { VideoMaterialListItem } from '@shared/video-material';
import { Badge } from '@client/src/components/ui/badge';

export interface MaterialListProps {
  items: VideoMaterialListItem[];
}

function getStatusBadgeClass(status: string | null): string {
  if (!status) {
    return 'bg-muted text-muted-foreground';
  }
  if (status.includes('完成') || status.includes('已发布')) {
    return 'bg-[hsl(152_60%_42%)]/10 text-[hsl(152_60%_26%)]';
  }
  if (status.includes('进行') || status.includes('处理')) {
    return 'bg-[hsl(38_85%_50%)]/15 text-[hsl(28_80%_30%)]';
  }
  return 'bg-muted text-muted-foreground';
}

function formatCount(value: string | null): string {
  if (!value) {
    return '-';
  }
  const num: number = Number(value);
  return Number.isFinite(num) ? num.toLocaleString('zh-CN') : '-';
}

function firstLine(text: string | null): string {
  if (!text) {
    return '';
  }
  const line: string | undefined = text.split('\n').find((l: string) => l.trim() !== '');
  return (line ?? '').trim();
}

export const MaterialList: React.FC<MaterialListProps> = ({ items }) => {
  const navigate = useNavigate();

  const maxPlayCount: number = items.reduce(
    (max: number, item: VideoMaterialListItem) => {
      const num: number = Number(item.playCount);
      return Number.isFinite(num) && num > max ? num : max;
    },
    0,
  );

  const isHot = (item: VideoMaterialListItem): boolean => {
    const num: number = Number(item.playCount);
    return maxPlayCount > 0 && num > 0 && num >= maxPlayCount * 0.5;
  };

  return (
    <div className="space-y-2">
      {items.map((item: VideoMaterialListItem) => {
        const copy: string =
          firstLine(item.videoCopyText) || firstLine(item.originalCopy) || '（无文案）';
        return (
          <article
            key={item.id}
            role="button"
            tabIndex={0}
            onClick={() => navigate(`/materials/${item.id}`)}
            onKeyDown={(event: React.KeyboardEvent<HTMLElement>) => {
              if (event.key === 'Enter') {
                navigate(`/materials/${item.id}`);
              }
            }}
            className="cursor-pointer rounded-sm border bg-card p-4 transition-colors duration-150 hover:bg-accent/40"
          >
            <div className="flex items-start gap-2">
              <p className="min-w-0 flex-1 text-sm font-medium leading-snug text-foreground line-clamp-2">
                {copy}
              </p>
              {isHot(item) && (
                <Badge
                  variant="secondary"
                  className="shrink-0 gap-1 rounded-sm bg-highlight/15 text-highlight"
                >
                  <Flame className="size-3" />
                  爆款
                </Badge>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {item.videoType && (
                <Badge
                  variant="secondary"
                  className="rounded-sm bg-muted font-normal text-muted-foreground"
                >
                  {item.videoType}
                </Badge>
              )}
              {item.targetPlatform && (
                <Badge
                  variant="secondary"
                  className="rounded-sm bg-muted font-normal text-muted-foreground"
                >
                  {item.targetPlatform}
                </Badge>
              )}
              <Badge
                variant="secondary"
                className={`rounded-sm font-normal ${getStatusBadgeClass(item.processStatus)}`}
              >
                {item.processStatus || '未知状态'}
              </Badge>
            </div>
            <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Play className="size-3.5" />
                <span className="font-mono tabular-nums">
                  {formatCount(item.playCount)}
                </span>
              </span>
              <span className="inline-flex items-center gap-1">
                <ThumbsUp className="size-3.5" />
                <span className="font-mono tabular-nums">
                  {formatCount(item.likeCount)}
                </span>
              </span>
              <span className="inline-flex items-center gap-1">
                <MessageCircle className="size-3.5" />
                <span className="font-mono tabular-nums">
                  {formatCount(item.commentCount)}
                </span>
              </span>
            </div>
          </article>
        );
      })}
    </div>
  );
};
