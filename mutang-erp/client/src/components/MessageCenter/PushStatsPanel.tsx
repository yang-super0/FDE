import React from 'react';

import type { MessageNotificationPushStatsResponse } from '@shared/api.interface';

import { getMessageTypeLabel } from './constants';

export interface PushStatsPanelProps {
  stats: MessageNotificationPushStatsResponse | null;
}

interface StatCardConfig {
  key: string;
  label: string;
  value: number;
  emphasis: 'primary' | 'success' | 'destructive' | 'muted';
}

const VALUE_CLS: Record<StatCardConfig['emphasis'], string> = {
  primary: 'text-primary',
  success: 'text-success',
  destructive: 'text-destructive',
  muted: 'text-foreground',
};

const PushStatsPanel: React.FC<PushStatsPanelProps> = ({ stats }) => {
  const cards: StatCardConfig[] = [
    { key: 'total', label: '总消息数', value: stats?.total ?? 0, emphasis: 'primary' },
    { key: 'pushed', label: '已推送', value: stats?.pushed ?? 0, emphasis: 'success' },
    { key: 'failed', label: '推送失败', value: stats?.failed ?? 0, emphasis: 'destructive' },
    { key: 'pending', label: '待推送', value: stats?.pending ?? 0, emphasis: 'muted' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((card: StatCardConfig) => (
          <div
            key={card.key}
            className="rounded-none border border-border border-t-[3px] border-t-primary bg-card px-4 py-3 shadow-md"
          >
            <p className="text-[10px] font-black tracking-[0.15em] text-muted-foreground uppercase">
              {card.label}
            </p>
            <p className={`mt-1 font-mono text-2xl font-bold ${VALUE_CLS[card.emphasis]}`}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-none border border-border bg-card shadow-md">
        <div className="border-b border-border px-4 py-2 text-xs font-bold text-foreground">
          按类型统计
        </div>
        {!stats || stats.byType.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">
            暂无分组数据
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-accent text-left text-xs text-muted-foreground">
                <th className="px-4 py-2 font-semibold">消息类型</th>
                <th className="px-4 py-2 text-right font-semibold">总数</th>
                <th className="px-4 py-2 text-right font-semibold">已推送</th>
                <th className="px-4 py-2 text-right font-semibold">失败</th>
              </tr>
            </thead>
            <tbody>
              {stats.byType.map(
                (row: {
                  msgType: string;
                  total: number;
                  pushed: number;
                  failed: number;
                }) => (
                  <tr key={row.msgType} className="border-b border-border last:border-b-0">
                    <td className="px-4 py-2 font-medium text-primary">
                      {getMessageTypeLabel(row.msgType)}
                    </td>
                    <td className="px-4 py-2 text-right font-mono">{row.total}</td>
                    <td className="px-4 py-2 text-right font-mono text-success">
                      {row.pushed}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-destructive">
                      {row.failed}
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export { PushStatsPanel };
