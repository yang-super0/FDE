import React from 'react';
import { Copy, ExternalLink, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { UniversalLink } from '@lark-apaas/client-toolkit/components/UniversalLink';
import { Button } from '@client/src/components/ui/button';
import {
  parseVideoEmbed,
  type VideoEmbedResult,
} from './video-embed';

export interface VideoPlayerEmbedProps {
  videoLink: string | null;
}

const EmbedFrame: React.FC<{ platform: string; embedUrl: string }> = ({
  platform,
  embedUrl,
}) => (
  <div className="space-y-1.5">
    <p className="text-xs text-muted-foreground">来源：{platform}</p>
    <iframe
      src={embedUrl}
      title={`${platform}视频播放器`}
      allowFullScreen
      allow="autoplay; encrypted-media; picture-in-picture"
      referrerPolicy="no-referrer"
      className="aspect-video w-full rounded-sm border bg-black"
    />
  </div>
);

const FallbackCard: React.FC<{ platform: string; videoLink: string }> = ({
  platform,
  videoLink,
}) => {
  const handleCopy = (): void => {
    navigator.clipboard
      .writeText(videoLink)
      .then(() => {
        toast.success('视频链接已复制');
      })
      .catch(() => {
        toast.error('复制失败，请手动复制链接');
      });
  };

  return (
    <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-sm border border-dashed bg-card px-6">
      <Link2 className="size-6 text-muted-foreground" />
      <p className="text-sm font-medium">{platform}</p>
      <p className="max-w-full break-all text-center text-xs text-muted-foreground">
        {videoLink}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <UniversalLink to={videoLink} target="_blank" rel="noreferrer">
          <Button size="sm" variant="outline">
            <ExternalLink className="size-4" />
            打开视频
          </Button>
        </UniversalLink>
        <Button size="sm" variant="ghost" onClick={handleCopy}>
          <Copy className="size-4" />
          复制链接
        </Button>
      </div>
    </div>
  );
};

export const VideoPlayerEmbed: React.FC<VideoPlayerEmbedProps> = ({
  videoLink,
}) => {
  if (!videoLink) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-sm border border-dashed bg-card">
        <p className="text-sm text-muted-foreground">暂无视频链接</p>
      </div>
    );
  }

  const result: VideoEmbedResult = parseVideoEmbed(videoLink);
  if (result.kind === 'embed') {
    return (
      <EmbedFrame platform={result.platform} embedUrl={result.embedUrl} />
    );
  }
  return <FallbackCard platform={result.platform} videoLink={videoLink} />;
};
