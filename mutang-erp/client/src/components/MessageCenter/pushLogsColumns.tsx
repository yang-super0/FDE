import React from 'react';
import { RotateCcw } from 'lucide-react';

import { type TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';

import { Button } from '@client/src/components/ui/button';
import type { MessageNotificationItem } from '@shared/api.interface';

import { MsgTypeBadge, PushStatusBadge } from './MessageBadges';
import { PUSH_RETRY_MAX_ATTEMPTS, PUSH_STATUS_FAILED } from './constants';
import { formatDateTime } from './time';

export interface PushLogsColumnsHandlers {
  onRetry: (id: number) => void;
  retryingId: number | null;
}

export function createPushLogsColumns({
  onRetry,
  retryingId,
}: PushLogsColumnsHandlers): TableColumnsType<MessageNotificationItem> {
  return [
    {
      title: '消息',
      dataIndex: 'title',
      width: 220,
      render: (_: unknown, record: MessageNotificationItem) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {record.title}
          </p>
          <p className="text-xs text-muted-foreground">{record.msgNo}</p>
        </div>
      ),
    },
    {
      title: '类型',
      dataIndex: 'msgType',
      width: 100,
      render: (value: string) => <MsgTypeBadge msgType={value} />,
    },
    {
      title: '推送状态',
      dataIndex: 'pushStatus',
      width: 100,
      render: (value: string) => <PushStatusBadge pushStatus={value} />,
    },
    {
      title: '推送时间',
      dataIndex: 'pushAt',
      width: 150,
      render: (value: string | null) => (
        <span className="font-mono text-xs">{formatDateTime(value)}</span>
      ),
    },
    {
      title: '重试次数',
      dataIndex: 'pushAttempts',
      width: 90,
      render: (value: number) => (
        <span className="font-mono text-sm">{value}</span>
      ),
    },
    {
      title: '错误信息',
      dataIndex: 'pushError',
      render: (value: string | null) => (
        <span
          className="block max-w-56 truncate text-xs text-destructive"
          title={value ?? undefined}
        >
          {value ?? '-'}
        </span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 90,
      render: (_: unknown, record: MessageNotificationItem) =>
        record.pushStatus === PUSH_STATUS_FAILED &&
        record.pushAttempts < PUSH_RETRY_MAX_ATTEMPTS ? (
          <Button
            variant="outline"
            size="sm"
            className="rounded-none"
            disabled={retryingId === record.id}
            onClick={() => onRetry(record.id)}
          >
            <RotateCcw className="size-3.5" />
            {retryingId === record.id ? '重试中' : '重试'}
          </Button>
        ) : null,
    },
  ];
}
