import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Table, type TableProps } from '@lark-apaas/client-toolkit/antd-table';
import type { AdCampaign, CampaignStatus } from '@shared/api.interface';
import { Button } from '@client/src/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import {
  ReportCard,
  SectionHeader,
  StatusBadge,
  type StatusTone,
} from '@client/src/components/blueprint';
import {
  listCampaigns,
  updateCampaignStatus,
  type CampaignStatusAction,
} from '@client/src/api/advertising';
import AdvertisingFormDialog, {
  PLATFORM_OPTIONS,
} from './AdvertisingFormDialog';

const STATUS_OPTIONS: { value: CampaignStatus; label: string }[] = [
  { value: 'preparing', label: '准备中' },
  { value: 'running', label: '投放中' },
  { value: 'paused', label: '已暂停' },
  { value: 'finished', label: '已结束' },
];

const STATUS_LABEL: Record<CampaignStatus, string> = {
  preparing: '准备中',
  running: '投放中',
  paused: '已暂停',
  finished: '已结束',
};

const STATUS_TONE: Record<CampaignStatus, StatusTone> = {
  preparing: 'neutral',
  running: 'success',
  paused: 'warning',
  finished: 'info',
};

const FILTER_ALL: string = '__all__';

const formatDate = (value: string): string => (value ? value.slice(0, 10) : '-');

const Advertising = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<AdCampaign[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [status, setStatus] = useState<string>(FILTER_ALL);
  const [platform, setPlatform] = useState<string>(FILTER_ALL);
  const [loading, setLoading] = useState<boolean>(false);
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [actingId, setActingId] = useState<string>('');

  const fetchData = useCallback(
    async (nextPage: number, nextPageSize: number): Promise<void> => {
      setLoading(true);
      try {
        const result = await listCampaigns({
          status: status === FILTER_ALL ? undefined : status,
          platform: platform === FILTER_ALL ? undefined : platform,
          page: nextPage,
          pageSize: nextPageSize,
        });
        setItems(result.items ?? []);
        setTotal(result.total ?? 0);
      } catch (error) {
        logger.error('加载投放项目列表失败', error);
        toast.error('列表加载失败');
      } finally {
        setLoading(false);
      }
    },
    [status, platform],
  );

  useEffect(() => {
    fetchData(page, pageSize);
  }, [fetchData, page, pageSize]);

  const handleStatusAction = async (
    record: AdCampaign,
    action: CampaignStatusAction,
  ): Promise<void> => {
    setActingId(record.id);
    try {
      await updateCampaignStatus(record.id, action);
      toast.success(action === 'paused' ? '已暂停投放' : '已恢复投放');
      await fetchData(page, pageSize);
    } catch (error) {
      logger.error('状态更新失败', error);
      toast.error('操作失败，请重试');
    } finally {
      setActingId('');
    }
  };

  const columns: TableProps<AdCampaign>['columns'] = [
    {
      title: '项目名称',
      dataIndex: 'name',
      fixed: 'left',
      width: 200,
      render: (name: string) => (
        <span className="font-bold text-primary">{name}</span>
      ),
    },
    { title: '客户', dataIndex: 'customerName', width: 160 },
    { title: '投放平台', dataIndex: 'platform', width: 130 },
    {
      title: '预算（元）',
      dataIndex: 'budget',
      width: 140,
      render: (budget: number) => (
        <span className="font-mono">{budget.toLocaleString()}</span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 110,
      render: (s: CampaignStatus) => (
        <StatusBadge tone={STATUS_TONE[s]}>
          {STATUS_LABEL[s] ?? s}
        </StatusBadge>
      ),
    },
    {
      title: '起止时间',
      key: 'dateRange',
      width: 210,
      render: (_: unknown, record: AdCampaign) => (
        <span className="font-mono text-xs text-muted-foreground">
          {formatDate(record.startDate)} ~ {formatDate(record.endDate)}
        </span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 100,
      render: (_: unknown, record: AdCampaign) => (
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          {record.status === 'running' ? (
            <Button
              variant="ghost"
              size="sm"
              disabled={actingId === record.id}
              onClick={() => handleStatusAction(record, 'paused')}
            >
              暂停
            </Button>
          ) : null}
          {record.status === 'paused' ? (
            <Button
              variant="ghost"
              size="sm"
              disabled={actingId === record.id}
              onClick={() => handleStatusAction(record, 'running')}
            >
              恢复
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div className="max-w-[1280px] mx-auto px-8 py-8">
      <SectionHeader
        no="01"
        label="CAMPAIGN MANAGEMENT"
        subtitle="广告投放项目管控 · 投放状态与效果总览"
      />
      <ReportCard>
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <Select
            value={status}
            onValueChange={(value: string) => {
              setStatus(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="状态筛选" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={FILTER_ALL}>全部状态</SelectItem>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={platform}
            onValueChange={(value: string) => {
              setPlatform(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="平台筛选" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={FILTER_ALL}>全部平台</SelectItem>
              {PLATFORM_OPTIONS.map((p: string) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex-1" />
          <Button data-ai-section-type="button" onClick={() => setFormOpen(true)}>
            新建投放项目
          </Button>
        </div>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={items}
          loading={loading}
          scroll={{ x: 1100, y: 500 }}
          onRow={(record: AdCampaign) => ({
            onClick: () => navigate(`/advertising/${record.id}`),
            style: { cursor: 'pointer' },
          })}
          pagination={{
            current: page,
            pageSize,
            total,
            onChange: (nextPage: number, nextPageSize: number) => {
              setPage(nextPage);
              setPageSize(nextPageSize);
            },
          }}
        />
      </ReportCard>
      <AdvertisingFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onCreated={() => fetchData(1, pageSize)}
      />
    </div>
  );
};

export default Advertising;
