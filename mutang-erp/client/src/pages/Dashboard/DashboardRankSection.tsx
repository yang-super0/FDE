import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Table, type TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import { ReportCard } from '@client/src/components/blueprint';
import { Button } from '@client/src/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import type {
  GroupRankItem,
  IndustryRankItem,
  NewAccountRankItem,
  PortRankItem,
  RankListResult,
  RankPortFilter,
  RankTimeRange,
  SalespersonRankItem,
} from '@shared/api.interface';
import {
  listGroupRank,
  listIndustryRank,
  listNewAccountRank,
  listPortRank,
  listSalespersonRank,
  syncConsumption,
} from '@client/src/api/workbench-enhance';
import { useI18n } from '@client/src/i18n';

const TIME_RANGE_OPTIONS: RankTimeRange[] = ['今日', '本周', '本月', '本年'];
const PORT_OPTIONS: RankPortFilter[] = ['全部', '内部', '外部', '集团'];
const NEW_ACCOUNT_DIMENSIONS: string[] = ['商务', '客户', '端口'];
const RANK_TABS: { key: string; label: string }[] = [
  { key: '商务', label: 'dashboard.rank.tabs.salesperson' },
  { key: '集团', label: 'dashboard.rank.tabs.group' },
  { key: '端口', label: 'dashboard.rank.tabs.port' },
  { key: '行业', label: 'dashboard.rank.tabs.industry' },
  { key: '新开', label: 'dashboard.rank.tabs.newAccount' },
];

export const formatRankAmount = (value: number): string =>
  value.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const RankCell = ({ rank }: { rank: number }) =>
  rank <= 3 ? (
    <span className="inline-flex items-center justify-center size-6 bg-primary text-primary-foreground text-xs font-black">
      {rank}
    </span>
  ) : (
    <span className="text-sm font-mono text-muted-foreground">{rank}</span>
  );

export const DashboardRankSection = () => {
  const { t, tEnum, formatDate } = useI18n();
  const [tab, setTab] = useState<string>('商务');
  const [timeRange, setTimeRange] = useState<RankTimeRange>('本月');
  const [port, setPort] = useState<RankPortFilter>('全部');
  const [dimension, setDimension] = useState<string>('商务');
  const [result, setResult] = useState<RankListResult>({ items: [], lastSyncedAt: null });
  const [loading, setLoading] = useState<boolean>(false);
  const [syncing, setSyncing] = useState<boolean>(false);

  const loadRank = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const params = { timeRange, port };
      let data: RankListResult;
      if (tab === '商务') {
        data = await listSalespersonRank(params);
      } else if (tab === '集团') {
        data = await listGroupRank(params);
      } else if (tab === '端口') {
        data = await listPortRank(params);
      } else if (tab === '行业') {
        data = await listIndustryRank(params);
      } else {
        data = await listNewAccountRank(params, dimension);
      }
      setResult(data);
    } catch (error) {
      logger.error('排行榜数据加载失败', error);
      toast.error(t('dashboard.rank.loadFailedToast'));
    } finally {
      setLoading(false);
    }
  }, [tab, timeRange, port, dimension, t]);

  useEffect(() => {
    void loadRank();
  }, [loadRank]);

  const handleSync = async (): Promise<void> => {
    setSyncing(true);
    try {
      const syncResult = await syncConsumption();
      toast.success(
        t('dashboard.rank.syncedToast', {
          count: String(syncResult.inserted),
        }),
      );
      await loadRank();
    } catch (error) {
      logger.error('日消耗汇总同步失败', error);
      toast.error(t('dashboard.rank.syncFailedToast'));
    } finally {
      setSyncing(false);
    }
  };

  const salespersonColumns: TableColumnsType<SalespersonRankItem> = [
    { title: t('dashboard.rank.columns.rank'), dataIndex: 'rank', width: 70, render: (rank: number) => <RankCell rank={rank} /> },
    { title: t('dashboard.rank.columns.salespersonName'), dataIndex: 'salesperson' },
    {
      title: t('dashboard.rank.columns.totalConsumption'),
      dataIndex: 'totalConsumption',
      align: 'right',
      render: (value: number) => <span className="font-mono">{formatRankAmount(value)}</span>,
    },
    {
      title: t('dashboard.rank.columns.internalConsumption'),
      dataIndex: 'internalConsumption',
      align: 'right',
      render: (value: number) => <span className="font-mono">{formatRankAmount(value)}</span>,
    },
    {
      title: t('dashboard.rank.columns.externalConsumption'),
      dataIndex: 'externalConsumption',
      align: 'right',
      render: (value: number) => <span className="font-mono">{formatRankAmount(value)}</span>,
    },
  ];

  const groupColumns: TableColumnsType<GroupRankItem> = [
    { title: t('dashboard.rank.columns.rank'), dataIndex: 'rank', width: 70, render: (rank: number) => <RankCell rank={rank} /> },
    { title: t('dashboard.rank.columns.groupName'), dataIndex: 'groupName' },
    {
      title: t('dashboard.rank.columns.totalConsumption'),
      dataIndex: 'totalConsumption',
      align: 'right',
      render: (value: number) => <span className="font-mono">{formatRankAmount(value)}</span>,
    },
    {
      title: t('dashboard.rank.columns.deltaConsumption'),
      dataIndex: 'deltaConsumption',
      align: 'right',
      render: (value: number) => (
        <span className={`font-mono ${value >= 0 ? 'text-[#0B8A6B]' : 'text-[#DC2626]'}`}>
          {value >= 0 ? '+' : ''}
          {formatRankAmount(value)}
        </span>
      ),
    },
    {
      title: t('dashboard.rank.columns.growthRate'),
      dataIndex: 'growthRate',
      align: 'right',
      width: 110,
      render: (value: number) => (
        <span className={`font-mono ${value >= 0 ? 'text-[#0B8A6B]' : 'text-[#DC2626]'}`}>
          {value >= 0 ? '+' : ''}
          {value.toFixed(2)}%
        </span>
      ),
    },
  ];

  const portColumns: TableColumnsType<PortRankItem> = [
    { title: t('dashboard.rank.columns.rank'), dataIndex: 'rank', width: 70, render: (rank: number) => <RankCell rank={rank} /> },
    { title: t('dashboard.rank.columns.portName'), dataIndex: 'port' },
    {
      title: t('dashboard.rank.columns.totalConsumption'),
      dataIndex: 'totalConsumption',
      align: 'right',
      render: (value: number) => <span className="font-mono">{formatRankAmount(value)}</span>,
    },
  ];

  const industryColumns: TableColumnsType<IndustryRankItem> = [
    { title: t('dashboard.rank.columns.rank'), dataIndex: 'rank', width: 70, render: (rank: number) => <RankCell rank={rank} /> },
    { title: t('dashboard.rank.columns.industryName'), dataIndex: 'industry' },
    {
      title: t('dashboard.rank.columns.totalConsumption'),
      dataIndex: 'totalConsumption',
      align: 'right',
      render: (value: number) => <span className="font-mono">{formatRankAmount(value)}</span>,
    },
  ];

  const newAccountColumns: TableColumnsType<NewAccountRankItem> = [
    { title: t('dashboard.rank.columns.rank'), dataIndex: 'rank', width: 70, render: (rank: number) => <RankCell rank={rank} /> },
    { title: dimension === '商务' ? t('dashboard.rank.columns.salespersonName') : dimension === '客户' ? t('dashboard.rank.columns.customerName') : t('dashboard.rank.columns.portName'), dataIndex: 'dimension' },
    {
      title: t('dashboard.rank.columns.newAccountCount'),
      dataIndex: 'newAccountCount',
      align: 'right',
      render: (value: number) => <span className="font-mono font-bold text-primary">{value}</span>,
    },
    {
      title: t('dashboard.rank.columns.consumption'),
      dataIndex: 'consumption',
      align: 'right',
      render: (value: number) => <span className="font-mono">{formatRankAmount(value)}</span>,
    },
  ];

  const renderTable = (): React.ReactNode => {
    if (tab === '商务') {
      return <Table columns={salespersonColumns} dataSource={result.items as SalespersonRankItem[]} rowKey="rank" loading={loading} scroll={{ y: 400 }} pagination={false} />;
    }
    if (tab === '集团') {
      return <Table columns={groupColumns} dataSource={result.items as GroupRankItem[]} rowKey="rank" loading={loading} scroll={{ y: 400 }} pagination={false} />;
    }
    if (tab === '端口') {
      return <Table columns={portColumns} dataSource={result.items as PortRankItem[]} rowKey="rank" loading={loading} scroll={{ y: 400 }} pagination={false} />;
    }
    if (tab === '行业') {
      return <Table columns={industryColumns} dataSource={result.items as IndustryRankItem[]} rowKey="rank" loading={loading} scroll={{ y: 400 }} pagination={false} />;
    }
    return <Table columns={newAccountColumns} dataSource={result.items as NewAccountRankItem[]} rowKey="rank" loading={loading} scroll={{ y: 400 }} pagination={false} />;
  };

  return (
    <ReportCard>
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
        <div className="flex flex-wrap gap-1">
          {RANK_TABS.map((item: { key: string; label: string }): React.ReactNode => (
            <button
              key={item.key}
              type="button"
              onClick={(): void => setTab(item.key)}
              className={`px-3 py-1.5 text-xs font-bold tracking-wide border-b-2 transition-colors ${
                tab === item.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t(item.label)}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {tab === '新开' ? (
            <Select value={dimension} onValueChange={(value: string): void => setDimension(value)}>
              <SelectTrigger className="w-[110px] h-8 rounded-none text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-none">
                {NEW_ACCOUNT_DIMENSIONS.map((item: string): React.ReactNode => (
                  <SelectItem key={item} value={item}>{tEnum(item)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          <Select value={timeRange} onValueChange={(value: string): void => setTimeRange(value as RankTimeRange)}>
            <SelectTrigger className="w-[100px] h-8 rounded-none text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-none">
              {TIME_RANGE_OPTIONS.map((item: RankTimeRange): React.ReactNode => (
                <SelectItem key={item} value={item}>{tEnum(item)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={port} onValueChange={(value: string): void => setPort(value as RankPortFilter)}>
            <SelectTrigger className="w-[100px] h-8 rounded-none text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-none">
              {PORT_OPTIONS.map((item: RankPortFilter): React.ReactNode => (
                <SelectItem key={item} value={item}>{tEnum(item)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="rounded-none h-8" disabled={syncing} onClick={(): Promise<void> => handleSync()}>
            <RefreshCw className="size-3.5 mr-1" />
            {t('dashboard.rank.sync')}
          </Button>
        </div>
      </div>
      <div className="pb-3 text-[10px] font-bold tracking-[0.15em] uppercase text-muted-foreground">
        {t('dashboard.rank.lastSyncedAt')}：
        {result.lastSyncedAt ? formatDate(new Date(result.lastSyncedAt)) : t('common.none')}
      </div>
      {renderTable()}
    </ReportCard>
  );
};
