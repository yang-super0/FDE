import React, { useCallback, useEffect, useState } from 'react';
import { Bell } from 'lucide-react';

import { logger } from '@lark-apaas/client-toolkit/logger';

import { getUnreadCount } from '@client/src/api/message-notification';
import { Button } from '@client/src/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@client/src/components/ui/popover';

import { MessageList } from './MessageList';

const POLL_INTERVAL_MS = 60_000;

const MessageBell: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = useCallback(async () => {
    try {
      const res = await getUnreadCount();
      setUnreadCount(res.unreadCount);
    } catch (error) {
      logger.error('获取未读消息数失败', error);
    }
  }, []);

  useEffect(() => {
    void refreshUnreadCount();
    const timer = window.setInterval(() => {
      void refreshUnreadCount();
    }, POLL_INTERVAL_MS);
    return () => {
      window.clearInterval(timer);
    };
  }, [refreshUnreadCount]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-none"
          aria-label="消息中心"
        >
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <span className="absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-none bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[420px] rounded-none p-0">
        <div className="border-b border-t-[3px] border-t-primary px-4 py-3">
          <p className="text-[10px] font-black tracking-[0.15em] text-muted-foreground uppercase">
            Message Center
          </p>
          <p className="text-sm font-bold text-foreground">
            消息中心
            {unreadCount > 0 && (
              <span className="ml-2 text-xs font-medium text-primary">
                {unreadCount > 99 ? '99+' : unreadCount} 条未读
              </span>
            )}
          </p>
        </div>
        <MessageList
          onUnreadCountChange={setUnreadCount}
          onRequestClose={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
};

export default MessageBell;
