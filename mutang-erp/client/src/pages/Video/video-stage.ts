import type { VideoStage } from '@shared/api.interface';

export const VIDEO_STAGES: VideoStage[] = [
  'script',
  'shooting',
  'post',
  'review',
  'delivered',
];

export const STAGE_LABELS: Record<VideoStage, string> = {
  script: '脚本',
  shooting: '拍摄',
  post: '后期',
  review: '审片',
  delivered: '交付',
};

/** 列表阶段徽章：已交付=深蓝(已完成)，其余=亮蓝(进行中) */
export function stageBadgeClass(stage: VideoStage): string {
  if (stage === 'delivered') {
    return 'bg-[#0033A0] text-white';
  }
  return 'bg-[#EFF6FF] text-[#0066FF]';
}

export type StageStepTone = 'done' | 'current' | 'todo';

/** 进度条节点状态：当前阶段之前=已完成，当前=进行中，之后=未开始 */
export function stageStepTone(
  stage: VideoStage,
  currentStage: VideoStage,
): StageStepTone {
  const index: number = VIDEO_STAGES.indexOf(stage);
  const currentIndex: number = VIDEO_STAGES.indexOf(currentStage);
  if (index < currentIndex) {
    return 'done';
  }
  if (index === currentIndex) {
    return 'current';
  }
  return 'todo';
}
