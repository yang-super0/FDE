import React from 'react';
import type { VideoMaterialDetail } from '@shared/video-material';
import { Card, CardContent, CardHeader, CardTitle } from '@client/src/components/ui/card';
import { VideoPlayerEmbed } from './VideoPlayerEmbed';

export interface VideoAndCopySectionProps {
  material: VideoMaterialDetail;
}

interface TextBlockProps {
  title: string;
  content: string | null;
}

const TextBlock: React.FC<TextBlockProps> = ({ title, content }) => {
  if (!content) {
    return null;
  }
  return (
    <Card className="rounded-sm shadow-none">
      <CardHeader className="space-y-0 p-4 pb-2">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
          {content}
        </p>
      </CardContent>
    </Card>
  );
};

export const VideoAndCopySection: React.FC<VideoAndCopySectionProps> = ({
  material,
}) => {
  const hasContent: boolean = Boolean(
    material.videoLink ||
      material.originalCopy ||
      material.videoCopyText ||
      material.hitStructureAnalysis,
  );
  if (!hasContent) {
    return null;
  }

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground">视频与文案</h2>
      <VideoPlayerEmbed videoLink={material.videoLink} />
      <div className="space-y-3">
        <TextBlock title="原始文案" content={material.originalCopy} />
        <TextBlock title="视频文案" content={material.videoCopyText} />
        <TextBlock title="爆款结构分析" content={material.hitStructureAnalysis} />
      </div>
    </section>
  );
};
