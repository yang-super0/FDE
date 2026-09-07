import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, FileClock, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Table } from '@lark-apaas/client-toolkit/antd-table';
import type {
  SyncConfigItem,
  SyncFullSyncResult,
  SyncStatsResponse,
} from '@shared/api.interface';
import { ReportCard, SectionHeader } from '@client/src/components/blueprint';
import { Button } from '@client/src/components/ui/button';
import {
  disableSyncConfig,
  enableSyncConfig,
  fullSyncAll,
  fullSyncTable,
  getSyncStats,
  listSyncConfigs,
  toFeishuSyncErrorText,
} from '@client/src/api/feishu-sync';
import { cn } from '@client/src/lib/utils';
import { SyncStatCard } from './sync-shared';
import { buildSyncConfigColumns } from './sync-config-columns';
import SyncLogsDialog from './SyncLogsDialog';
import FieldMappingDialog from './FieldMappingDialog';

const SYNC_PAGE_SIZE: number = 10;

const DataSyncPanel: React.FC = () => {
  const [configs, setConfigs] = useState<SyncConfigItem[]>([]);
  const [credentialsConfigured, setCredentialsConfigured] =
    useState<boolean>(true);
  const [stats, setStats] = useState<SyncStatsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [syncingTableName, setSyncingTableName] = useState<string | null>(null);
  const [syncingAll, setSyncingAll] = useState<boolean>(false);
  const [logsOpen, setLogsOpen] = useState<boolean>(false);
  const [logsTableName, setLogsTableName] = useState<string | undefined>(
    undefined,
  );
  const [mappingConfig, setMappingConfig] = useState<SyncConfigItem | null>(
    null,
  );

  const loadConfigs = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const result = await listSyncConfigs();
      setConfigs(result.items);
      setCredentialsConfigured(result.credentialsConfigured);
    } catch (error: unknown) {
      logger.error('加载同步配置失败', String(error));
      toast.error(toFeishuSyncErrorText(error));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStats = useCallback(async (): Promise<void> => {
    try {
      const result = await getSyncStats();
      setStats(result);
    } catch (error: unknown) {
      logger.error('加载同步统计失败', String(error));
      toast.error(toFeishuSyncErrorText(error));
    }
  }, []);

  const refresh = useCallback((): void => {
    void loadConfigs();
    void loadStats();
  }, [loadConfigs, loadStats]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleToggle = async (record: SyncConfigItem): Promise<void> => {
    setTogglingId(record.id);
    try {
      if (record.enabled) {
        await disableSyncConfig(record.id);
        toast.success(`「${record.displayName}」已禁用同步`);
      } else {
        await enableSyncConfig(record.id);
        toast.success(`「${record.displayName}」已启用同步`);
      }
      refresh();
    } catch (error: unknown) {
      logger.error('切换同步状态失败', String(error));
      toast.error(toFeishuSyncErrorText(error));
    } finally {
      setTogglingId(null);
    }
  };

  const handleSyncOne = async (record: SyncConfigItem): Promise<void> => {
    setSyncingTableName(record.tableName);
    try {
      const result = await fullSyncTable(record.tableName);
      if (result.skipped) {
        toast.warning(result.message ?? `「${record.displayName}」已跳过同步`);
      } else {
        toast.success(
          `「${record.displayName}」全量同步完成，共同步 ${result.synced} 条记录`,
        );
      }
      refresh();
    } catch (error: unknown) {
      logger.error('全量同步失败', String(error));
      toast.error(toFeishuSyncErrorText(error));
    } finally {
      setSyncingTableName(null);
    }
  };

  const handleSyncAll = async (): Promise<void> => {
    setSyncingAll(true);
    try {
      const results = await fullSyncAll();
      const syncedTotal: number = results.reduce(
        (sum: number, item: SyncFullSyncResult) => sum + item.synced,
        0,
      );
      toast.success(
        `全量同步完成：${results.length} 张表，共同步 ${syncedTotal} 条记录`,
      );
      const skippedMessages: string[] = results
        .filter(
          (item: SyncFullSyncResult) => item.skipped && item.message,
        )
        .map(
          (item: SyncFullSyncResult) =>
            `${item.tableName}：${item.message ?? ''}`,
        );
      if (skippedMessages.length > 0) {
        toast.warning(`部分表已跳过 — ${skippedMessages.join('；')}`);
      }
      refresh();
    } catch (error: unknown) {
      logger.error('全部表全量同步失败', String(error));
      toast.error(toFeishuSyncErrorText(error));
    } finally {
      setSyncingAll(false);
    }
  };

  const columns = buildSyncConfigColumns({
    togglingId,
    syncingTableName,
    syncingAll,
    onToggle: (record: SyncConfigItem) => void handleToggle(record),
    onSync: (record: SyncConfigItem) => void handleSyncOne(record),
    onMapping: (record: SyncConfigItem) => setMappingConfig(record),
    onLogs: (record: SyncConfigItem) => {
      setLogsTableName(record.tableName);
      setLogsOpen(true);
    },
  });

  const pagedItems: SyncConfigItem[] = configs.slice(
    (page - 1) * SYNC_PAGE_SIZE,
    page * SYNC_PAGE_SIZE,
  );

  return (
    <div className="space-y-6">
      <div className="rounded-none border border-border border-t-[3px] border-t-primary bg-card p-6 shadow-md">
        <SectionHeader
          no="01"
          label="SYNC OVERVIEW"
          subtitle="数据同步统计 · 飞书多维表格同步概览"
        />
        <div
          data-ai-section-type="card-stat"
          className="grid grid-cols-2 gap-4 lg:grid-cols-5"
        >
          <SyncStatCard
            label="TOTAL / 总同步次数"
            value={String(stats?.total ?? 0)}
          />
          <SyncStatCard
            label="SUCCESS / 成功次数"
            value={String(stats?.success ?? 0)}
          />
          <SyncStatCard
            label="FAILED / 失败次数"
            value={String(stats?.failed ?? 0)}
            emphasis={(stats?.failed ?? 0) > 0}
          />
          <SyncStatCard
            label="RATE / 成功率"
            value={stats ? `${stats.successRate.toFixed(1)}%` : '—'}
          />
          <SyncStatCard
            label="TODAY / 今日同步"
            value={String(stats?.todayCount ?? 0)}
          />
        </div>
      </div>

      {!credentialsConfigured ? (
        <div className="flex items-start gap-2 rounded-none border border-[#F59E0B]/40 bg-[#FFFBEB] px-4 py-3 text-sm text-[#B45309]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            飞书应用凭证未配置或无效，请配置 FEISHU_APP_ID / FEISHU_APP_SECRET
            后启用同步
          </span>
        </div>
      ) : null}

      <ReportCard>
        <SectionHeader
          no="02"
          label="BITABLE SYNC"
          subtitle="同步配置管理 · 表级启用与全量同步"
        />
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Button
            data-ai-section-type="button"
            disabled={syncingAll || syncingTableName !== null}
            onClick={() => void handleSyncAll()}
          >
            <RefreshCw
              className={cn('h-4 w-4', syncingAll && 'animate-spin')}
            />
            {syncingAll ? '同步中…' : '全部表全量同步'}
          </Button>
          <Button
            data-ai-section-type="button"
            variant="outline"
            onClick={() => {
              setLogsTableName(undefined);
              setLogsOpen(true);
            }}
          >
            <FileClock className="h-4 w-4" />
            查看日志
          </Button>
        </div>
        <Table<SyncConfigItem>
          columns={columns}
          dataSource={pagedItems}
          loading={loading}
          rowKey="id"
          scroll={{ x: 1150, y: 500 }}
          locale={{ emptyText: '暂无同步配置' }}
          pagination={{
            current: page,
            pageSize: SYNC_PAGE_SIZE,
            total: configs.length,
            showSizeChanger: false,
            onChange: (next: number) => setPage(next),
          }}
        />
      </ReportCard>

      {logsOpen ? (
        <SyncLogsDialog
          open
          configs={configs}
          initialTableName={logsTableName}
          onOpenChange={(next: boolean) => {
            if (!next) setLogsOpen(false);
          }}
        />
      ) : null}
      {mappingConfig ? (
        <FieldMappingDialog
          open
          config={mappingConfig}
          onOpenChange={(next: boolean) => {
            if (!next) setMappingConfig(null);
          }}
          onSaved={refresh}
        />
      ) : null}
    </div>
  );
};

export default DataSyncPanel;
