import { FileClock, RefreshCw, Settings2 } from 'lucide-react';
import { Button } from '@client/src/components/ui/button';
import type { TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import type { SyncConfigItem } from '@shared/api.interface';
import { cn } from '@client/src/lib/utils';
import { SyncEnabledBadge, formatSyncTime } from './sync-shared';

export interface SyncConfigColumnHandlers {
  togglingId: number | null;
  syncingTableName: string | null;
  syncingAll: boolean;
  onToggle: (record: SyncConfigItem) => void;
  onSync: (record: SyncConfigItem) => void;
  onMapping: (record: SyncConfigItem) => void;
  onLogs: (record: SyncConfigItem) => void;
}

export function buildSyncConfigColumns(
  handlers: SyncConfigColumnHandlers,
): TableColumnsType<SyncConfigItem> {
  return [
    {
      title: '表名',
      dataIndex: 'displayName',
      width: 200,
      fixed: 'left',
      render: (_value: unknown, record: SyncConfigItem) => (
        <div className="min-w-0">
          <div className="truncate font-medium text-primary">
            {record.displayName}
          </div>
          <div className="truncate font-mono text-[10px] text-muted-foreground">
            {record.tableName}
          </div>
        </div>
      ),
    },
    {
      title: '飞书表格ID',
      dataIndex: 'bitableTableId',
      width: 190,
      render: (value: string | null) =>
        value ? (
          <span className="font-mono text-xs">{value}</span>
        ) : (
          <span className="text-xs text-muted-foreground">未创建</span>
        ),
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      width: 90,
      render: (_value: unknown, record: SyncConfigItem) => (
        <SyncEnabledBadge enabled={record.enabled} />
      ),
    },
    {
      title: '最后同步时间',
      dataIndex: 'lastSyncTime',
      width: 140,
      render: (value: string | null) => formatSyncTime(value),
    },
    {
      title: '同步次数',
      dataIndex: 'syncCount',
      width: 100,
      render: (value: number) => <span className="font-mono">{value}</span>,
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 330,
      render: (_value: unknown, record: SyncConfigItem) => (
        <div className="flex flex-wrap items-center gap-1">
          <Button
            data-ai-section-type="button"
            variant="outline"
            size="sm"
            className="h-7 rounded-none px-2"
            disabled={handlers.togglingId !== null}
            onClick={() => handlers.onToggle(record)}
          >
            {handlers.togglingId === record.id
              ? '处理中…'
              : record.enabled
                ? '禁用'
                : '启用'}
          </Button>
          <Button
            data-ai-section-type="button"
            variant="ghost"
            size="sm"
            className="h-7 rounded-none px-2"
            disabled={
              handlers.syncingTableName !== null || handlers.syncingAll
            }
            onClick={() => handlers.onSync(record)}
          >
            <RefreshCw
              className={cn(
                'h-3.5 w-3.5',
                handlers.syncingTableName === record.tableName && 'animate-spin',
              )}
            />
            {handlers.syncingTableName === record.tableName
              ? '同步中'
              : '全量同步'}
          </Button>
          <Button
            data-ai-section-type="button"
            variant="ghost"
            size="sm"
            className="h-7 rounded-none px-2"
            onClick={() => handlers.onMapping(record)}
          >
            <Settings2 className="h-3.5 w-3.5" />
            字段映射
          </Button>
          <Button
            data-ai-section-type="button"
            variant="ghost"
            size="sm"
            className="h-7 rounded-none px-2"
            onClick={() => handlers.onLogs(record)}
          >
            <FileClock className="h-3.5 w-3.5" />
            日志
          </Button>
        </div>
      ),
    },
  ];
}
