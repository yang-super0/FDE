import React from 'react';
import dayjs from 'dayjs';
import type { GeneratedVideo, VideoMaterialDetail } from '@shared/video-material';
import { Badge } from '@client/src/components/ui/badge';
import { useBitableVideoUrls } from '@client/src/hooks/useBitableVideoUrls';

export interface GeneratedVideosSectionProps {
  material: VideoMaterialDetail;
}

function getStatusBadgeClass(status: string | null): string {
  if (!status) {
    return 'bg-muted text-muted-foreground';
  }
  if (status.includes('完成') || status.includes('已发布')) {
    return 'bg-[hsl(152_60%_42%)]/10 text-[hsl(152_60%_26%)]';
  }
  if (status.includes('进行') || status.includes('处理')) {
    return 'bg-[hsl(38_85%_50%)]/15 text-[hsl(28_80%_30%)]';
  }
  return 'bg-muted text-muted-foreground';
}

function formatCount(value: string | null): string {
  if (!value) {
    return '-';
  }
  const num: number = Number(value);
  return Number.isFinite(num) ? num.toLocaleString('zh-CN') : '-';
}

const VideoPlayer: React.FC<{ url: string }> = ({ url }) => {
  const [failed, setFailed] = React.useState<boolean>(false);
  if (failed) {
    return (
      <div className="flex aspect-video w-full flex-col items-center justify-center gap-1 rounded-sm border bg-muted/40 px-4 text-center">
        <p className="text-xs text-muted-foreground">视频预览暂不可用</p>
        <p className="text-[11px] text-muted-foreground/70">
          成片视频无法加载，请确认多维表格附件权限或稍后重试
        </p>
      </div>
    );
  }
  return (
    <video
      controls
      src={url}
      onError={() => setFailed(true)}
      className="aspect-video w-full rounded-sm border bg-black"
    />
  );
};

export const GeneratedVideosSection: React.FC<GeneratedVideosSectionProps> = ({
  material,
}) => {
  const bitableVideos = useBitableVideoUrls(material.baseRecordId);
  const hasData: boolean = Boolean(
    material.playCount || material.likeCount || material.commentCount,
  );
  const hasContent: boolean = material.generatedVideos.length > 0 || hasData;
  if (!hasContent) {
    return null;
  }

  const resolveVideoUrls = (group: GeneratedVideo): string[] => {
    const pluginUrls: string[] | undefined = bitableVideos.urlsByIndex?.[group.index];
    return pluginUrls && pluginUrls.length > 0 ? pluginUrls : group.urls;
  };

  const stats: Array<{ label: string; value: string | null }> = [
    { label: '播放量', value: material.playCount },
    { label: '点赞数', value: material.likeCount },
    { label: '评论数', value: material.commentCount },
  ];

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground">成片与数据</h2>

      {material.generatedVideos.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {material.generatedVideos.map((group: GeneratedVideo) => {
            const urls: string[] = resolveVideoUrls(group);
            const waitingPlugin: boolean =
              bitableVideos.loading && !bitableVideos.urlsByIndex;
            return (
              <div key={group.index} className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">
                  成片 {group.index}
                </p>
                {waitingPlugin && urls.length === 0 ? (
                  <div className="flex aspect-video w-full items-center justify-center rounded-sm border bg-muted/40 text-xs text-muted-foreground">
                    视频加载中...
                  </div>
                ) : (
                  urls.map((url: string, idx: number) => (
                    <VideoPlayer key={`${group.index}-${url}-${idx}`} url={url} />
                  ))
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="rounded-sm border bg-card p-4">
        <div className="grid grid-cols-3 gap-4">
          {stats.map((stat: { label: string; value: string | null }) => (
            <div key={stat.label}>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="mt-1 font-mono text-2xl tabular-nums text-foreground">
                {formatCount(stat.value)}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t pt-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            处理状态
            <Badge
              variant="secondary"
              className={`rounded-sm font-normal ${getStatusBadgeClass(material.processStatus)}`}
            >
              {material.processStatus || '未知状态'}
            </Badge>
          </span>
          <span className="inline-flex items-center gap-1.5">
            创建时间
            <span className="font-mono tabular-nums text-foreground">
              {material.createTime
                ? dayjs(material.createTime).format('YYYY-MM-DD')
                : '-'}
            </span>
          </span>
        </div>
      </div>
    </section>
  );
};
