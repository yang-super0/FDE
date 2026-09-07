import React from 'react';
import { ChevronDown } from 'lucide-react';

import type { MessageNotificationItem } from '@shared/api.interface';

import { MsgTypeBadge, PriorityBadge, StatusBadge } from './MessageBadges';
import { MESSAGE_STATUS_UNREAD } from './constants';
import { formatRelativeTime } from './time';

export interface MessageItemRowProps {
  item: MessageNotificationItem;
  expanded: boolean;
  onClick: (item: MessageNotificationItem) => void;
}

const MessageItemRow: React.FC<MessageItemRowProps> = ({
  item,
  expanded,
  onClick,
}) => (
  <div
    role="button"
    tabIndex={0}
    onClick={() => onClick(item)}
    onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onClick(item);
      }
    }}
    className="cursor-pointer border-b border-border px-4 py-3 transition-colors hover:bg-accent"
  >
    <div className="flex items-start justify-between gap-2">
      <span
        className={`truncate text-sm ${
          item.status === MESSAGE_STATUS_UNREAD
            ? 'font-bold text-primary'
            : 'font-medium text-foreground'
        }`}
      >
        {item.title}
      </span>
      <ChevronDown
        className={`mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform ${
          expanded ? 'rotate-180' : ''
        }`}
      />
    </div>
    <p
      className={`mt-1 text-xs text-muted-foreground ${
        expanded ? 'whitespace-pre-wrap' : 'line-clamp-1'
      }`}
    >
      {item.content}
    </p>
    <div className="mt-2 flex items-center gap-2">
      <MsgTypeBadge msgType={item.msgType} />
      <StatusBadge status={item.status} />
      <PriorityBadge priority={item.priority} />
      <span className="ml-auto text-[11px] text-muted-foreground">
        {formatRelativeTime(item.createdAt)}
      </span>
    </div>
  </div>
);

export { MessageItemRow };
