import { Fragment, useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { ArrowLeft, Check } from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import type { VideoProject, VideoStage } from '@shared/api.interface';
import { Button } from '@client/src/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import { Textarea } from '@client/src/components/ui/textarea';
import { Skeleton } from '@client/src/components/ui/skeleton';
import { ReportCard, SectionHeader } from '@client/src/components/blueprint';
import { UserDisplay } from '@client/src/components/business-ui/user-display';
import { cn } from '@client/src/lib/utils';
import {
  getVideoProject,
  updateVideoProjectStage,
} from '@client/src/api/video';
import {
  STAGE_LABELS,
  VIDEO_STAGES,
  stageBadgeClass,
  stageStepTone,
  type StageStepTone,
} from './video-stage';
import { VideoReviewComments } from './VideoReviewComments';

const STEP_DOT_CLASS: Record<StageStepTone, string> = {
  done: 'bg-[#0033A0] border-[#0033A0] text-white',
  current: 'bg-[#0066FF] border-[#0066FF] text-white ring-4 ring-[#0066FF]/20',
  todo: 'bg-white border-border text-muted-foreground',
};

const STEP_LABEL_CLASS: Record<StageStepTone, string> = {
  done: 'text-foreground font-bold',
  current: 'text-[#0066FF] font-bold',
  todo: 'text-muted-foreground',
};

const InfoItem = ({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) => (
  <div>
    <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground mb-1">
      {label}
    </div>
    <div className="text-sm text-foreground">{children}</div>
  </div>
);

const VideoDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<VideoProject | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [targetStage, setTargetStage] = useState<VideoStage | ''>('');
  const [remark, setRemark] = useState<string>('');
  const [updating, setUpdating] = useState<boolean>(false);

  const fetchProject = useCallback(async (): Promise<void> => {
    if (!id) {
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const result = await getVideoProject(id);
      setProject(result);
    } catch (err) {
      logger.error('获取视频项目详情失败', err);
      setLoadError('项目详情加载失败，请重试');
      setProject(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchProject();
  }, [fetchProject]);

  const handleUpdateStage = async (): Promise<void> => {
    if (!project) {
      return;
    }
    if (!targetStage) {
      toast.error('请选择目标阶段');
      return;
    }
    setUpdating(true);
    try {
      await updateVideoProjectStage(project.id, {
        stage: targetStage,
        remark,
      });
      toast.success('项目阶段已更新');
      setTargetStage('');
      setRemark('');
      await fetchProject();
    } catch (err) {
      logger.error('更新项目阶段失败', err);
      toast.error('更新失败，请重试');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-[1280px] mx-auto px-8 py-8 space-y-8">
        <Skeleton className="h-10 w-72 rounded-none" />
        <Skeleton className="h-48 rounded-none" />
        <Skeleton className="h-40 rounded-none" />
      </div>
    );
  }

  if (loadError || !project) {
    return (
      <div className="max-w-[1280px] mx-auto px-8 py-8">
        <Link
          to="/video"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="size-4" />
          返回视频业务
        </Link>
        <div className="py-16 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            {loadError ?? '项目不存在'}
          </p>
          <Button variant="outline" onClick={() => void fetchProject()}>
            重试
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1280px] mx-auto px-8 py-8 space-y-8">
      <div>
        <Link
          to="/video"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3"
        >
          <ArrowLeft className="size-4" />
          返回视频业务
        </Link>
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            {project.name}
          </h1>
          <span
            className={cn(
              'inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-[2px]',
              stageBadgeClass(project.stage),
            )}
          >
            {STAGE_LABELS[project.stage]}
          </span>
        </div>
      </div>

      <ReportCard>
        <SectionHeader no="01" label="项目信息" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          <InfoItem label="关联客户">
            {project.customerName || '—'}
          </InfoItem>
          <InfoItem label="视频类型">{project.videoType}</InfoItem>
          <InfoItem label="时长要求">
            {project.durationRequirement || '—'}
          </InfoItem>
          <InfoItem label="负责人">
            {project.assigneeId ? (
              <UserDisplay value={[project.assigneeId]} size="small" />
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </InfoItem>
          <InfoItem label="截止日期">
            <span className="font-mono">
              {project.deadline
                ? dayjs(project.deadline).format('YYYY-MM-DD')
                : '—'}
            </span>
          </InfoItem>
          <InfoItem label="当前阶段">
            {STAGE_LABELS[project.stage]}
          </InfoItem>
        </div>
        {project.stageRemark ? (
          <div className="mt-6 border-t border-border pt-4">
            <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground mb-1">
              阶段备注
            </div>
            <p className="text-sm text-foreground leading-relaxed break-words">
              {project.stageRemark}
            </p>
          </div>
        ) : null}
      </ReportCard>

      <ReportCard>
        <SectionHeader
          no="02"
          label="阶段进度"
          subtitle="脚本 → 拍摄 → 后期 → 审片 → 交付"
        />
        <div className="flex items-center py-2">
          {VIDEO_STAGES.map((stage: VideoStage, index: number) => {
            const tone: StageStepTone = stageStepTone(stage, project.stage);
            return (
              <Fragment key={stage}>
                {index > 0 ? (
                  <div
                    className={cn(
                      'flex-1 h-[2px]',
                      tone === 'todo' ? 'bg-border' : 'bg-[#0033A0]',
                    )}
                  />
                ) : null}
                <div className="flex flex-col items-center gap-2 px-2 min-w-[56px]">
                  <div
                    className={cn(
                      'flex size-9 items-center justify-center border text-xs font-bold transition-colors',
                      STEP_DOT_CLASS[tone],
                    )}
                  >
                    {tone === 'done' ? (
                      <Check className="size-4" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <span
                    className={cn('text-xs', STEP_LABEL_CLASS[tone])}
                  >
                    {STAGE_LABELS[stage]}
                  </span>
                </div>
              </Fragment>
            );
          })}
        </div>
      </ReportCard>

      <ReportCard>
        <SectionHeader no="03" label="更新阶段" subtitle="选择目标阶段并填写阶段备注" />
        <div className="flex flex-wrap items-start gap-4">
          <div className="w-full sm:w-56">
            <div className="text-xs font-bold text-foreground mb-2">
              目标阶段
            </div>
            <Select
              value={targetStage}
              onValueChange={(value: VideoStage) => setTargetStage(value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="请选择目标阶段" />
              </SelectTrigger>
              <SelectContent>
                {VIDEO_STAGES.map((stage: VideoStage) => (
                  <SelectItem key={stage} value={stage}>
                    {STAGE_LABELS[stage]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[240px]">
            <div className="text-xs font-bold text-foreground mb-2">
              阶段备注
            </div>
            <Textarea
              value={remark}
              onChange={(event) => setRemark(event.target.value)}
              placeholder="填写本阶段说明，如拍摄地点、交付要求等"
              rows={2}
            />
          </div>
          <div className="pt-7">
            <Button
              data-ai-section-type="button"
              onClick={() => void handleUpdateStage()}
              disabled={updating}
            >
              {updating ? '更新中...' : '更新阶段'}
            </Button>
          </div>
        </div>
      </ReportCard>

      <ReportCard>
        <SectionHeader no="04" label="审片意见" subtitle="记录审片过程中的修改意见" />
        <VideoReviewComments projectId={project.id} />
      </ReportCard>
    </div>
  );
};

export default VideoDetail;
