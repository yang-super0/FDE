import React, { useEffect, useState } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import { Link2, LoaderCircle, Sparkles } from 'lucide-react';
import {
  VIDEO_MATERIAL_STATUS,
  type VideoMaterialDetail,
} from '@shared/video-material';
import {
  getVideoMaterialDetail,
  startVideoMaterialGenerate,
} from '@client/src/api/video-material';
import { Button } from '@client/src/components/ui/button';
import { UniversalLink } from '@lark-apaas/client-toolkit/components/UniversalLink';

export interface GenerationConfigSectionProps {
  material: VideoMaterialDetail;
  onRefresh: (detail: VideoMaterialDetail) => void;
}

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 180_000;

export const GenerationConfigSection: React.FC<GenerationConfigSectionProps> =
  ({ material, onRefresh }) => {
    const [starting, setStarting] = useState<boolean>(false);
    const generating: boolean =
      material.processStatus === VIDEO_MATERIAL_STATUS.GENERATING;
    const failed: boolean =
      material.processStatus === VIDEO_MATERIAL_STATUS.FAILED;

    useEffect(() => {
      if (!generating) {
        return;
      }
      let cancelled: boolean = false;
      const startedAt: number = Date.now();
      let timer: ReturnType<typeof setTimeout>;
      const poll = async (): Promise<void> => {
        if (cancelled) {
          return;
        }
        if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
          toast.error('生成超时，请刷新页面查看最新状态');
          return;
        }
        try {
          const detail: VideoMaterialDetail = await getVideoMaterialDetail(
            material.id,
          );
          if (!cancelled) {
            onRefresh(detail);
          }
        } catch (err) {
          logger.error('轮询生成进度失败', err);
        }
        if (!cancelled) {
          timer = setTimeout(() => void poll(), POLL_INTERVAL_MS);
        }
      };
      timer = setTimeout(() => void poll(), POLL_INTERVAL_MS);
      return () => {
        cancelled = true;
        clearTimeout(timer);
      };
    }, [generating, material.id, onRefresh]);

    const handleStart = async (): Promise<void> => {
      setStarting(true);
      try {
        await startVideoMaterialGenerate(material.id);
        onRefresh({
          ...material,
          processStatus: VIDEO_MATERIAL_STATUS.GENERATING,
        });
      } catch (err) {
        logger.error('开始生成失败', err);
        const message: string =
          (err as { response?: { data?: { message?: string } } })?.response
            ?.data?.message ?? '开始生成失败，请稍后重试';
        toast.error(message);
      } finally {
        setStarting(false);
      }
    };

    const paramEntries: Array<{ label: string; value: string }> = [
      { label: '画面比例', value: material.aspectRatio ?? '' },
      { label: '视觉风格', value: material.visualStyle ?? '' },
      { label: '场景设定', value: material.sceneSetting ?? '' },
    ].filter(
      (entry: { label: string; value: string }) => entry.value.trim() !== '',
    );

    return (
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">
          生成配置
        </h2>
        <div className="space-y-3 rounded-sm border bg-card p-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Link2 className="size-4 shrink-0 text-muted-foreground" />
            <span className="shrink-0 text-muted-foreground">视频链接：</span>
            {material.videoLink ? (
              <UniversalLink
                to={material.videoLink}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 flex-1 truncate text-primary hover:underline"
              >
                {material.videoLink}
              </UniversalLink>
            ) : (
              <span className="text-muted-foreground">无</span>
            )}
          </div>

          {paramEntries.length > 0 && (
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
              {paramEntries.map((entry: { label: string; value: string }) => (
                <span key={entry.label}>
                  {entry.label}：
                  <span className="text-foreground">{entry.value}</span>
                </span>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 border-t pt-3">
            <Button
              size="sm"
              className="rounded-sm"
              disabled={generating || starting}
              onClick={() => void handleStart()}
            >
              {generating ? (
                <>
                  <LoaderCircle className="animate-spin" />
                  生成中…
                </>
              ) : (
                <>
                  <Sparkles />
                  {failed ? '重新生成' : '开始生成'}
                </>
              )}
            </Button>
            {generating && (
              <p className="text-xs text-muted-foreground">
                正在生成分镜脚本，完成后将自动展示结果
              </p>
            )}
            {failed && (
              <p className="text-xs text-[hsl(4_75%_52%)]">
                上次生成失败，可重新尝试
              </p>
            )}
          </div>
        </div>
      </section>
    );
  };
