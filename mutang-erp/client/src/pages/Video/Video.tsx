import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { Plus } from 'lucide-react';
import {
  Table,
  type TableColumnsType,
} from '@lark-apaas/client-toolkit/antd-table';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  PageResult,
  VideoProject,
  VideoStage,
  VideoStageStat,
} from '@shared/api.interface';
import { Button } from '@client/src/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import { Skeleton } from '@client/src/components/ui/skeleton';
import {
  CHART_BLUE_PALETTE,
  ReportCard,
  SectionHeader,
} from '@client/src/components/blueprint';
import { UserDisplay } from '@client/src/components/business-ui/user-display';
import { cn } from '@client/src/lib/utils';
import {
  getVideoStageStats,
  listVideoProjects,
} from '@client/src/api/video';
import { STAGE_LABELS, VIDEO_STAGES, stageBadgeClass } from './video-stage';
import { VideoCreateDialog } from './VideoCreateDialog';

const Video = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<VideoStageStat[]>([]);
  const [statsLoading, setStatsLoading] = useState<boolean>(true);
  const [stageFilter, setStageFilter] = useState<VideoStage | ''>('');
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [data, setData] = useState<PageResult<VideoProject> | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState<boolean>(false);

  const fetchStats = useCallback(async (): Promise<void> => {
    setStatsLoading(true);
    try {
      const result = await getVideoStageStats();
      setStats(result.items);
    } catch (err) {
      logger.error('获取阶段统计失败', err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchList = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const result = await listVideoProjects({
        stage: stageFilter || undefined,
        page,
        pageSize,
      });
      setData(result);
    } catch (err) {
      logger.error('获取视频项目列表失败', err);
      setError('列表加载失败，请重试');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [stageFilter, page, pageSize]);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  const handleCreated = (): void => {
    setPage(1);
    void fetchList();
    void fetchStats();
  };

  const maxCount: number = Math.max(1, ...stats.map((s: VideoStageStat) => s.count));

  const columns: TableColumnsType<VideoProject> = [
    {
      title: '项目名称',
      dataIndex: 'name',
      fixed: 'left',
      width: 240,
      render: (name: string) => (
        <span className="font-bold text-primary">{name}</span>
      ),
    },
    {
      title: '关联客户',
      dataIndex: 'customerName',
      width: 180,
      render: (customerName: string) => customerName || '—',
    },
    { title: '视频类型', dataIndex: 'videoType', width: 140 },
    {
      title: '阶段',
      dataIndex: 'stage',
      width: 110,
      render: (stage: VideoStage) => (
        <span
          className={cn(
            'inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-[2px]',
            stageBadgeClass(stage),
          )}
        >
          {STAGE_LABELS[stage] ?? stage}
        </span>
      ),
    },
    {
      title: '负责人',
      dataIndex: 'assigneeId',
      width: 160,
      render: (assigneeId: string) =>
        assigneeId ? (
          <UserDisplay value={[assigneeId]} size="small" />
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      title: '截止日期',
      dataIndex: 'deadline',
      width: 140,
      render: (deadline: string) => (
        <span className="font-mono text-xs">
          {deadline ? dayjs(deadline).format('YYYY-MM-DD') : '—'}
        </span>
      ),
    },
  ];

  return (
    <div className="max-w-[1280px] mx-auto px-8 py-8 space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-black text-primary uppercase tracking-[0.15em] mb-1">
            VIDEO PRODUCTION
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            视频业务
          </h1>
        </div>
        <Button data-ai-section-type="button" onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          新建视频项目
        </Button>
      </div>

      <ReportCard>
        <SectionHeader
          no="01"
          label="阶段概览"
          subtitle="各阶段视频项目数量分布"
        />
        {statsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {VIDEO_STAGES.map((stage: VideoStage) => (
              <Skeleton key={stage} className="h-14 rounded-none" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {stats.map((item: VideoStageStat, index: number) => (
              <div key={item.stage}>
                <div className="flex items-baseline justify-between gap-2 mb-2">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.15em]">
                    {STAGE_LABELS[item.stage]}
                  </span>
                  <span className="font-mono text-2xl font-extrabold text-foreground">
                    {item.count}
                  </span>
                </div>
                <div className="h-2 bg-accent">
                  <div
                    className="h-full transition-all duration-300"
                    style={{
                      width: `${(item.count / maxCount) * 100}%`,
                      backgroundColor: CHART_BLUE_PALETTE[index % CHART_BLUE_PALETTE.length],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </ReportCard>

      <ReportCard>
        <SectionHeader
          no="02"
          label="项目列表"
          subtitle="点击行查看项目详情"
        />
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <Select
            value={stageFilter}
            onValueChange={(value: VideoStage | '') => {
              setStageFilter(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="全部阶段" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">全部阶段</SelectItem>
              {VIDEO_STAGES.map((stage: VideoStage) => (
                <SelectItem key={stage} value={stage}>
                  {STAGE_LABELS[stage]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {error && !loading ? (
          <div className="py-12 text-center">
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button variant="outline" onClick={() => void fetchList()}>
              重试
            </Button>
          </div>
        ) : (
          <Table<VideoProject>
            columns={columns}
            dataSource={data?.items ?? []}
            loading={loading}
            rowKey="id"
            scroll={{ x: 1000, y: 500 }}
            onRow={(record: VideoProject) => ({
              onClick: () => navigate(`/video/${record.id}`),
              className: 'cursor-pointer',
            })}
            pagination={{
              current: page,
              pageSize,
              total: data?.total ?? 0,
              showSizeChanger: true,
              onChange: (nextPage: number, nextPageSize: number) => {
                setPage(nextPage);
                setPageSize(nextPageSize);
              },
            }}
          />
        )}
      </ReportCard>

      <VideoCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleCreated}
      />
    </div>
  );
};

export default Video;
