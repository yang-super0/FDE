import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Table, type TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import type { SyncConfigItem, SyncLogItem, SyncLogListParams } from '@shared/api.interface';
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
import { listSyncLogs, toFeishuSyncErrorText } from '@client/src/api/feishu-sync';
import {
  SYNC_FILTER_ALL,
  SYNC_LOG_STATUS_OPTIONS,
  SYNC_OPERATION_OPTIONS,
  SyncOperationBadge,
  SyncStatusBadge,
  formatSyncTime,
} from './sync-shared';

const SYNC_LOG_PAGE_SIZE: number = 10;

export interface SyncLogsDialogProps {
  open: boolean;
  configs: SyncConfigItem[];
  initialTableName?: string;
  onOpenChange: (open: boolean) => void;
}

const SyncLogsDialog: React.FC<SyncLogsDialogProps> = ({
  open,
  configs,
  initialTableName,
  onOpenChange,
}) => {
  const [tableName, setTableName] = useState<string>(
    initialTableName ?? SYNC_FILTER_ALL,
  );
  const [status, setStatus] = useState<string>(SYNC_FILTER_ALL);
  const [operation, setOperation] = useState<string>(SYNC_FILTER_ALL);
  const [page, setPage] = useState<number>(1);
  const [items, setItems] = useState<SyncLogItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  const loadLogs = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const params: SyncLogListParams = {
        page: String(page),
        pageSize: String(SYNC_LOG_PAGE_SIZE),
      };
      if (tableName !== SYNC_FILTER_ALL) params.tableName = tableName;
      if (status !== SYNC_FILTER_ALL) params.status = status;
      if (operation !== SYNC_FILTER_ALL) params.operation = operation;
      const result = await listSyncLogs(params);
      setItems(result.items);
      setTotal(result.total);
    } catch (error: unknown) {
      logger.error('加载同步日志失败', String(error));
      toast.error(toFeishuSyncErrorText(error));
    } finally {
      setLoading(false);
    }
  }, [tableName, status, operation, page]);

  useEffect(() => {
    if (!open) return;
    void loadLogs();
  }, [open, loadLogs]);

  const displayNameMap = useMemo((): Map<string, string> => {
    const map = new Map<string, string>();
    configs.forEach((config: SyncConfigItem) => {
      map.set(config.tableName, config.displayName);
    });
    return map;
  }, [configs]);

  const columns: TableColumnsType<SyncLogItem> = useMemo(
    () => [
      {
        title: '时间',
        dataIndex: 'createdAt',
        width: 140,
        fixed: 'left',
        render: (value: string) => formatSyncTime(value),
      },
      {
        title: '表名',
        dataIndex: 'tableName',
        width: 160,
        render: (value: string) =>
          displayNameMap.get(value) ?? (
            <span className="font-mono text-xs">{value}</span>
          ),
      },
      {
        title: '记录ID',
        dataIndex: 'recordId',
        width: 170,
        render: (value: string) => (
          <span className="block max-w-[160px] truncate font-mono text-xs" title={value}>
            {value}
          </span>
        ),
      },
      {
        title: '操作类型',
        dataIndex: 'operation',
        width: 90,
        render: (value: string) => <SyncOperationBadge operation={value} />,
      },
      {
        title: '状态',
        dataIndex: 'status',
        width: 90,
        render: (value: string) => <SyncStatusBadge status={value} />,
      },
      {
        title: '重试次数',
        dataIndex: 'retryCount',
        width: 90,
        render: (value: number) => <span className="font-mono">{value}</span>,
      },
      {
        title: '耗时(ms)',
        dataIndex: 'durationMs',
        width: 100,
        render: (value: number | null) => (
          <span className="font-mono">{value ?? '—'}</span>
        ),
      },
      {
        title: '错误信息',
        dataIndex: 'errorMessage',
        width: 220,
        render: (value: string | null) =>
          value ? (
            <span
              className="block max-w-[220px] truncate text-xs text-[#EF4444]"
              title={value}
            >
              {value}
            </span>
          ) : (
            '—'
          ),
      },
    ],
    [displayNameMap],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="font-black">同步日志</DialogTitle>
          <DialogDescription>
            飞书多维表格同步记录审计 · 失败与重试追踪
          </DialogDescription>
        </DialogHeader>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Select
            value={tableName}
            onValueChange={(value: string) => {
              setTableName(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-9 w-44 rounded-none">
              <SelectValue placeholder="全部表" />
            </SelectTrigger>
            <SelectContent className="rounded-none">
              <SelectItem value={SYNC_FILTER_ALL}>全部表</SelectItem>
              {configs.map((config: SyncConfigItem) => (
                <SelectItem key={config.tableName} value={config.tableName}>
                  {config.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={status}
            onValueChange={(value: string) => {
              setStatus(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-9 w-32 rounded-none">
              <SelectValue placeholder="全部状态" />
            </SelectTrigger>
            <SelectContent className="rounded-none">
              <SelectItem value={SYNC_FILTER_ALL}>全部状态</SelectItem>
              {SYNC_LOG_STATUS_OPTIONS.map(
                (option: { value: string; label: string }) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
          <Select
            value={operation}
            onValueChange={(value: string) => {
              setOperation(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-9 w-32 rounded-none">
              <SelectValue placeholder="全部操作" />
            </SelectTrigger>
            <SelectContent className="rounded-none">
              <SelectItem value={SYNC_FILTER_ALL}>全部操作</SelectItem>
              {SYNC_OPERATION_OPTIONS.map(
                (option: { value: string; label: string }) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
          <Button
            data-ai-section-type="button"
            variant="outline"
            size="sm"
            className="rounded-none"
            onClick={() => void loadLogs()}
            disabled={loading}
          >
            {loading ? '刷新中…' : '刷新'}
          </Button>
        </div>
        <Table<SyncLogItem>
          columns={columns}
          dataSource={items}
          loading={loading}
          rowKey="id"
          scroll={{ x: 1100, y: 500 }}
          locale={{ emptyText: '暂无同步日志' }}
          pagination={{
            current: page,
            pageSize: SYNC_LOG_PAGE_SIZE,
            total,
            showSizeChanger: false,
            onChange: (next: number) => setPage(next),
          }}
        />
      </DialogContent>
    </Dialog>
  );
};

export default SyncLogsDialog;
