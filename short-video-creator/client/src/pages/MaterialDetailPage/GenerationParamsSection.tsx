import React from 'react';
import type { VideoMaterialDetail } from '@shared/video-material';
import { Badge } from '@client/src/components/ui/badge';

export interface GenerationParamsSectionProps {
  material: VideoMaterialDetail;
}

export const GenerationParamsSection: React.FC<GenerationParamsSectionProps> = ({
  material,
}) => {
  const kvEntries: Array<{ label: string; value: string | null }> = [
    { label: '场景设定', value: material.sceneSetting },
    { label: '主角设定', value: material.protagonistSetting },
    { label: '字幕风格', value: material.subtitleStyle },
    { label: '色彩氛围', value: material.colorAtmosphere },
    { label: '视觉风格', value: material.visualStyle },
    { label: '画面比例', value: material.aspectRatio },
  ];
  const visibleEntries: Array<{ label: string; value: string }> = kvEntries
    .filter((entry: { label: string; value: string | null }) => Boolean(entry.value))
    .map((entry) => ({ label: entry.label, value: entry.value as string }));

  const hasContent: boolean =
    visibleEntries.length > 0 || material.cameraMovementPreference.length > 0;
  if (!hasContent) {
    return null;
  }

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground">生成参数</h2>

      {visibleEntries.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visibleEntries.map((entry: { label: string; value: string }) => (
            <div key={entry.label} className="rounded-sm border bg-card p-3">
              <p className="text-xs text-muted-foreground">{entry.label}</p>
              <p className="mt-1 text-sm leading-relaxed text-foreground">
                {entry.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {material.cameraMovementPreference.length > 0 && (
        <div className="rounded-sm border bg-card p-3">
          <p className="text-xs text-muted-foreground">运镜偏好</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {material.cameraMovementPreference.map((pref: string) => (
              <Badge
                key={pref}
                variant="secondary"
                className="rounded-sm bg-muted font-normal text-muted-foreground"
              >
                {pref}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
