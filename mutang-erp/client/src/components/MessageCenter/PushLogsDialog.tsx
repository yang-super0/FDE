import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, ChevronDown, Megaphone } from 'lucide-react';
import { toast } from 'sonner';

import { logger } from '@lark-apaas/client-toolkit/logger';
import { Table } from '@lark-apaas/client-toolkit/antd-table';

import {
  getPushLogs,
  getPushStats,
  retryPush,
  runWarnings,
  type PushLogListParams,
} from '@client/src/api/message-notification';
import { Button } from '@client/src/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import type {
  MessageNotificationItem,
  MessageNotificationPushStatsResponse,
} from '@shared/api.interface';

import { PushStatsPanel } from './PushStatsPanel';
import { SendNotificationForm } from './SendNotificationForm';
import { createPushLogsColumns } from './pushLogsColumns';
import {
  MESSAGE_TYPE_ALL,
  MESSAGE_TYPE_TABS,
  PUSH_STATUS_OPTIONS,
} from './constants';

const PAGE_SIZE = 10;

export interface PushLogsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDataChanged?: () => void;
}

const PushLogsDialog: React.FC<PushLogsDialogProps> = ({
  open,
  onOpenChange,
  onDataChanged,
}) => {
  const [stats, setStats] = useState<MessageNotificationPushStatsResponse | null>(
    null,
  );
  const [logs, setLogs] = useState<MessageNotificationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [msgTypeFilter, setMsgTypeFilter] = useState<string>(MESSAGE_TYPE_ALL);
  const [pushStatusFilter, setPushStatusFilter] = useState<string>(
    MESSAGE_TYPE_ALL,
  );
  const [formVisible, setFormVisible] = useState(false);
  const [retryingId, setRetryingId] = useState<number | null>(null);
  const [runningWarnings, setRunningWarnings] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await getPushStats();
      setStats(res);
    } catch (error) {
      logger.error('获取推送统计失败', error);
      toast.error('获取推送统计失败');
    }
  }, []);

  const fetchLogs = useCallback(
    async (nextPage: number) => {
      const params: PushLogListParams = {
        page: String(nextPage),
        pageSize: String(PAGE_SIZE),
      };
      if (msgTypeFilter !== MESSAGE_TYPE_ALL) params.msgType = msgTypeFilter;
      if (pushStatusFilter !== MESSAGE_TYPE_ALL) {
        params.pushStatus = pushStatusFilter;
      }
      setLoading(true);
      try {
        const res = await getPushLogs(params);
        setLogs(res.items);
        setTotal(res.total);
        setPage(nextPage);
      } catch (error) {
        logger.error('获取推送日志失败', error);
        toast.error('获取推送日志失败');
      } finally {
        setLoading(false);
      }
    },
    [msgTypeFilter, pushStatusFilter],
  );

  useEffect(() => {
    if (!open) return;
    void fetchStats();
    void fetchLogs(1);
  }, [open, fetchStats, fetchLogs]);

  const handleRetry = async (id: number) => {
    setRetryingId(id);
    try {
      await retryPush(id);
      toast.success('已重新触发推送');
      await fetchStats();
      await fetchLogs(page);
      onDataChanged?.();
    } catch (error) {
      logger.error('重试推送失败', error);
      toast.error('重试推送失败');
    } finally {
      setRetryingId(null);
    }
  };

  const handleRunWarnings = async () => {
    setRunningWarnings(true);
    try {
      const res = await runWarnings();
      toast.success(`预警检查完成，新增 ${res.created} 条预警消息`);
      await fetchStats();
      await fetchLogs(1);
      onDataChanged?.();
    } catch (error) {
      logger.error('触发预警检查失败', error);
      toast.error('触发预警检查失败');
    } finally {
      setRunningWarnings(false);
    }
  };

  const columns = createPushLogsColumns({
    onRetry: (id: number) => void handleRetry(id),
    retryingId,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-4xl gap-0 overflow-y-auto rounded-none p-0">
        <DialogHeader className="border-b border-border px-6 pt-6 pb-4">
          <DialogTitle className="text-base">推送日志与统计</DialogTitle>
          <DialogDescription>
            消息推送情况总览、失败重试与系统通知下发
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-6 py-4">
          <PushStatsPanel stats={stats} />

          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={msgTypeFilter}
              onValueChange={(value: string) => setMsgTypeFilter(value)}
            >
              <SelectTrigger size="sm" className="w-[130px] rounded-none">
                <SelectValue placeholder="消息类型" />
              </SelectTrigger>
              <SelectContent className="rounded-none">
                {MESSAGE_TYPE_TABS.filter(
                  (opt: { value: string }) => opt.value !== MESSAGE_TYPE_ALL,
                ).map((opt: { value: string; label: string }) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={pushStatusFilter}
              onValueChange={(value: string) => setPushStatusFilter(value)}
            >
              <SelectTrigger size="sm" className="w-[130px] rounded-none">
                <SelectValue placeholder="推送状态" />
              </SelectTrigger>
              <SelectContent className="rounded-none">
                {PUSH_STATUS_OPTIONS.filter(
                  (opt: { value: string }) => opt.value !== MESSAGE_TYPE_ALL,
                ).map((opt: { value: string; label: string }) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              className="ml-auto rounded-none"
              disabled={runningWarnings}
              onClick={() => void handleRunWarnings()}
            >
              <AlertTriangle className="size-4" />
              {runningWarnings ? '检查中...' : '触发预警检查'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="rounded-none"
              onClick={() => setFormVisible((prev: boolean) => !prev)}
            >
              <Megaphone className="size-4" />
              发送系统通知
              <ChevronDown
                className={`size-3.5 transition-transform ${
                  formVisible ? 'rotate-180' : ''
                }`}
              />
            </Button>
          </div>

          {formVisible && (
            <SendNotificationForm
              onSent={() => {
                void fetchStats();
                void fetchLogs(1);
                onDataChanged?.();
              }}
            />
          )}

          <div className="rounded-none border border-border bg-card shadow-md">
            <Table
              columns={columns}
              dataSource={logs}
              loading={loading}
              rowKey="id"
              scroll={{ x: 900, y: 320 }}
              pagination={{
                current: page,
                pageSize: PAGE_SIZE,
                total,
                onChange: (nextPage: number) => void fetchLogs(nextPage),
              }}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export { PushLogsDialog };
