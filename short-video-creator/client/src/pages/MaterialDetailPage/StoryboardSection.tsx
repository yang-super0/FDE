import React from 'react';
import type {
  StoryboardPromptGroup,
  VideoMaterialDetail,
} from '@shared/video-material';
import { Card, CardContent, CardHeader, CardTitle } from '@client/src/components/ui/card';
import { Image } from '@client/src/components/ui/image';

export interface StoryboardSectionProps {
  material: VideoMaterialDetail;
}

interface ImageRowProps {
  title: string;
  urls: string[];
}

const ImageRow: React.FC<ImageRowProps> = ({ title, urls }) => {
  if (urls.length === 0) {
    return null;
  }
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-medium text-muted-foreground">{title}</h3>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {urls.map((url: string, idx: number) => (
          <Image
            key={`${url}-${idx}`}
            src={url}
            alt={`${title} ${idx + 1}`}
            sizes="160px"
            className="h-24 w-40 shrink-0 rounded-sm border object-cover"
          />
        ))}
      </div>
    </div>
  );
};

export const StoryboardSection: React.FC<StoryboardSectionProps> = ({
  material,
}) => {
  const hasContent: boolean =
    Boolean(material.storyboardScript) ||
    material.storyboardPrompts.length > 0 ||
    material.styleReferenceImages.length > 0 ||
    material.characterReferenceImages.length > 0;
  if (!hasContent) {
    return null;
  }

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground">分镜脚本</h2>

      {material.storyboardScript && (
        <Card className="rounded-sm shadow-none">
          <CardHeader className="space-y-0 p-4 pb-2">
            <CardTitle className="text-sm font-semibold">分镜脚本全文</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
              {material.storyboardScript}
            </p>
          </CardContent>
        </Card>
      )}

      {material.storyboardPrompts.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {material.storyboardPrompts.map((group: StoryboardPromptGroup) => (
            <Card key={group.index} className="rounded-sm shadow-none">
              <CardHeader className="space-y-0 p-3 pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground">
                  分镜 {group.index}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 p-3 pt-0">
                {group.prompt && (
                  <p className="whitespace-pre-wrap text-xs leading-relaxed text-foreground/90">
                    {group.prompt}
                  </p>
                )}
                {group.images.map((url: string, idx: number) => (
                  <Image
                    key={`${url}-${idx}`}
                    src={url}
                    alt={`分镜 ${group.index} 图 ${idx + 1}`}
                    sizes="(max-width: 1024px) 50vw, 300px"
                    className="aspect-video w-full rounded-sm border object-cover"
                  />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="space-y-3">
        <ImageRow title="风格参考图" urls={material.styleReferenceImages} />
        <ImageRow title="角色参考图" urls={material.characterReferenceImages} />
      </div>
    </section>
  );
};
