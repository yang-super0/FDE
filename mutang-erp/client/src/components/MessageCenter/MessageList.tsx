import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCheck, Inbox, ScrollText } from 'lucide-react';
import { toast } from 'sonner';

import { logger } from '@lark-apaas/client-toolkit/logger';

import {
  getMyMessages,
  getUnreadCount,
  markAllRead,
  markRead,
} from '@client/src/api/message-notification';
import { Button } from '@client/src/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@client/src/components/ui/tabs';
import type {
  MessageNotificationItem,
  MessageNotificationListParams,
} from '@shared/api.interface';

import { MessageItemRow } from './MessageItemRow';
import { PushLogsDialog } from './PushLogsDialog';
import {
  MESSAGE_STATUS_OPTIONS,
  MESSAGE_STATUS_READ,
  MESSAGE_STATUS_UNREAD,
  MESSAGE_TYPE_ALL,
  MESSAGE_TYPE_TABS,
  resolveRelatedRoute,
} from './constants';

const PAGE_SIZE = 10;

export interface MessageListProps {
  onUnreadCountChange: (count: number) => void;
  onRequestClose: () => void;
}

const MessageList: React.FC<MessageListProps> = ({
  onUnreadCountChange,
  onRequestClose,
}) => {
  const navigate = useNavigate();
  const [typeTab, setTypeTab] = useState<string>(MESSAGE_TYPE_ALL);
  const [statusFilter, setStatusFilter] = useState<string>(MESSAGE_TYPE_ALL);
  const [items, setItems] = useState<MessageNotificationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [pushLogsOpen, setPushLogsOpen] = useState(false);

  const syncUnreadCount = useCallback(async () => {
    try {
      const res = await getUnreadCount();
      onUnreadCountChange(res.unreadCount);
    } catch (error) {
      logger.error('刷新未读消息数失败', error);
    }
  }, [onUnreadCountChange]);

  const fetchPage = useCallback(
    async (nextPage: number, append: boolean) => {
      const params: MessageNotificationListParams = {
        page: String(nextPage),
        pageSize: String(PAGE_SIZE),
      };
      if (typeTab !== MESSAGE_TYPE_ALL) params.msgType = typeTab;
      if (statusFilter !== MESSAGE_TYPE_ALL) params.status = statusFilter;
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      try {
        const res = await getMyMessages(params);
        setItems((prev: MessageNotificationItem[]) =>
          append ? [...prev, ...res.items] : res.items,
        );
        setTotal(res.total);
        setPage(nextPage);
        onUnreadCountChange(res.unreadCount);
      } catch (error) {
        logger.error('获取消息列表失败', error);
        toast.error('获取消息列表失败');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [typeTab, statusFilter, onUnreadCountChange],
  );

  useEffect(() => {
    void fetchPage(1, false);
  }, [fetchPage]);

  const markItemRead = useCallback(
    async (item: MessageNotificationItem) => {
      if (item.status !== MESSAGE_STATUS_UNREAD) return;
      try {
        await markRead(item.id);
        setItems((prev: MessageNotificationItem[]) =>
          prev.map((it: MessageNotificationItem) =>
            it.id === item.id
              ? { ...it, status: MESSAGE_STATUS_READ }
              : it,
          ),
        );
        void syncUnreadCount();
      } catch (error) {
        logger.error('标记已读失败', error);
        toast.error('标记已读失败');
      }
    },
    [syncUnreadCount],
  );

  const handleItemClick = (item: MessageNotificationItem) => {
    void markItemRead(item);
    const route = resolveRelatedRoute(item.relatedModule);
    if (route) {
      onRequestClose();
      navigate(route);
      return;
    }
    setExpandedId((prev: number | null) =>
      prev === item.id ? null : item.id,
    );
  };

  const handleMarkAll = async () => {
    try {
      const res = await markAllRead();
      setItems((prev: MessageNotificationItem[]) =>
        prev.map((it: MessageNotificationItem) => ({
          ...it,
          status: MESSAGE_STATUS_READ,
        })),
      );
      onUnreadCountChange(0);
      toast.success(`已全部标记为已读，共 ${res.updated} 条`);
    } catch (error) {
      logger.error('全部已读操作失败', error);
      toast.error('全部已读操作失败');
    }
  };

  const handleLoadMore = () => {
    if (loadingMore || items.length >= total) return;
    void fetchPage(page + 1, true);
  };

  const handleDataChanged = useCallback(() => {
    void fetchPage(1, false);
  }, [fetchPage]);

  return (
    <div className="flex max-h-[70vh] flex-col">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Tabs value={typeTab} onValueChange={setTypeTab}>
          <TabsList className="rounded-none bg-muted">
            {MESSAGE_TYPE_TABS.map(
              (opt: { value: string; label: string }) => (
                <TabsTrigger
                  key={opt.value}
                  value={opt.value}
                  className="rounded-none px-2 text-xs"
                >
                  {opt.label}
                </TabsTrigger>
              ),
            )}
          </TabsList>
        </Tabs>
        <Select
          value={statusFilter}
          onValueChange={(value: string) => setStatusFilter(value)}
        >
          <SelectTrigger size="sm" className="ml-auto w-[110px] rounded-none">
            <SelectValue placeholder="状态" />
          </SelectTrigger>
          <SelectContent className="rounded-none">
            {MESSAGE_STATUS_OPTIONS.map(
              (opt: { value: string; label: string }) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">
            加载中...
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-muted-foreground">
            <Inbox className="size-6" />
            <span className="text-sm">暂无消息</span>
          </div>
        ) : (
          items.map((item: MessageNotificationItem) => (
            <MessageItemRow
              key={item.id}
              item={item}
              expanded={expandedId === item.id}
              onClick={handleItemClick}
            />
          ))
        )}
        {!loading && items.length > 0 && items.length < total && (
          <div className="p-3 text-center">
            <Button
              variant="outline"
              size="sm"
              className="rounded-none"
              disabled={loadingMore}
              onClick={handleLoadMore}
            >
              {loadingMore ? '加载中...' : '加载更多'}
            </Button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-border px-4 py-2">
        <span className="text-xs text-muted-foreground">
          共 {total} 条 / 已加载 {items.length} 条
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="rounded-none"
            onClick={() => void handleMarkAll()}
          >
            <CheckCheck className="size-4" />
            全部已读
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-none"
            onClick={() => setPushLogsOpen(true)}
          >
            <ScrollText className="size-4" />
            推送日志
          </Button>
        </div>
      </div>

      <PushLogsDialog
        open={pushLogsOpen}
        onOpenChange={setPushLogsOpen}
        onDataChanged={handleDataChanged}
      />
    </div>
  );
};

export { MessageList };
