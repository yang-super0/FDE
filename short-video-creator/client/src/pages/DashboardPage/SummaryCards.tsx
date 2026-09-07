import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Film, MessageSquare, Play, ThumbsUp } from 'lucide-react';
import type { DashboardSummary } from '@shared/dashboard';
import {
  Card,
  CardContent,
} from '@client/src/components/ui/card';

interface SummaryCardsProps {
  summary: DashboardSummary;
}

interface SummaryCardConfig {
  key: string;
  label: string;
  icon: LucideIcon;
  getValue: (summary: DashboardSummary) => number;
}

const CARD_CONFIGS: SummaryCardConfig[] = [
  {
    key: 'totalCount',
    label: '素材总数',
    icon: Film,
    getValue: (summary: DashboardSummary) => summary.totalCount,
  },
  {
    key: 'totalPlayCount',
    label: '总播放量',
    icon: Play,
    getValue: (summary: DashboardSummary) => summary.totalPlayCount,
  },
  {
    key: 'totalLikeCount',
    label: '总点赞数',
    icon: ThumbsUp,
    getValue: (summary: DashboardSummary) => summary.totalLikeCount,
  },
  {
    key: 'totalCommentCount',
    label: '总评论数',
    icon: MessageSquare,
    getValue: (summary: DashboardSummary) => summary.totalCommentCount,
  },
];

const formatNumber = (value: number): string =>
  Number.isFinite(value) ? value.toLocaleString('zh-CN') : '0';

const SummaryCards: React.FC<SummaryCardsProps> = ({
  summary,
}: SummaryCardsProps) => {
  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {CARD_CONFIGS.map((config: SummaryCardConfig) => {
        const Icon: LucideIcon = config.icon;
        return (
          <Card key={config.key} className="rounded-sm shadow-none">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-sm bg-accent text-accent-foreground">
                <Icon className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">
                  {config.label}
                </p>
                <p className="truncate font-mono text-3xl font-semibold tabular-nums text-foreground">
                  {formatNumber(config.getValue(summary))}
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default SummaryCards;
