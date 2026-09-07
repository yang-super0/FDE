export interface VideoMaterialListItem {
  id: string;
  baseRecordId: string | null;
  videoCopyText: string | null;
  originalCopy: string | null;
  videoType: string | null;
  targetPlatform: string | null;
  processStatus: string | null;
  playCount: string | null;
  likeCount: string | null;
  commentCount: string | null;
  createTime: string | null;
}

export interface VideoMaterialListParams {
  keyword?: string;
  videoType?: string;
  targetPlatform?: string;
  processStatus?: string;
  page: number;
  pageSize: number;
}

export interface VideoMaterialListResponse {
  items: VideoMaterialListItem[];
  total: number;
  dataSource: 'bitable' | 'local';
}

export interface VideoMaterialOptions {
  videoTypes: string[];
  targetPlatforms: string[];
  processStatuses: string[];
}

export interface StoryboardPromptGroup {
  index: number;
  prompt: string | null;
  images: string[];
}

export interface GeneratedVideo {
  index: number;
  urls: string[];
}

export interface VideoMaterialDetail {
  id: string;
  baseRecordId: string | null;
  videoLink: string | null;
  originalCopy: string | null;
  videoCopyText: string | null;
  hitStructureAnalysis: string | null;
  storyboardScript: string | null;
  storyboardPrompts: StoryboardPromptGroup[];
  styleReferenceImages: string[];
  characterReferenceImages: string[];
  sceneSetting: string | null;
  protagonistSetting: string | null;
  subtitleStyle: string | null;
  cameraMovementPreference: string[];
  colorAtmosphere: string | null;
  visualStyle: string | null;
  aspectRatio: string | null;
  storyboardFineness: string | null;
  generatedVideos: GeneratedVideo[];
  playCount: string | null;
  likeCount: string | null;
  commentCount: string | null;
  processStatus: string | null;
  createTime: string | null;
}

export type TopOrderBy = 'playCount' | 'likeCount';

export interface TopMaterialItem {
  id: string;
  videoCopyText: string | null;
  playCount: string | null;
  likeCount: string | null;
  commentCount: string | null;
}

export interface TopMaterialsResponse {
  items: TopMaterialItem[];
}

export const VIDEO_MATERIAL_STATUS = {
  PENDING: '待处理',
  GENERATING: '生成中',
  STORYBOARD_DONE: '分镜已生成',
  FAILED: '生成失败',
} as const;

export interface CreateVideoMaterialRequest {
  videoLink: string;
}

export interface CreateVideoMaterialResponse {
  id: string;
}

export interface StartGenerateResponse {
  id: string;
  processStatus: string;
}

export interface UpdateVideoMaterialRequest {
  videoLink?: string;
  videoType?: string;
  targetPlatform?: string;
  sceneSetting?: string;
  protagonistSetting?: string;
  subtitleStyle?: string;
  cameraMovementPreference?: string;
  colorAtmosphere?: string;
  visualStyle?: string;
  aspectRatio?: string;
  storyboardFineness?: string;
}

export interface UpdateVideoMaterialResponse {
  id: string;
  bitableSynced: boolean;
}

export interface DeleteVideoMaterialResponse {
  id: string;
  bitableSynced: boolean;
}

export interface SyncStatusItem {
  id: string;
  direction: string;
  status: string;
  message: string | null;
  recordCount: number;
  syncedAt: string;
}

export interface SyncStatusResponse {
  items: SyncStatusItem[];
  lastSuccessAt: string | null;
  lastError: string | null;
}

export interface BitableSelectOptions {
  videoTypes: string[];
  targetPlatforms: string[];
  subtitleStyles: string[];
  cameraMovements: string[];
  colorAtmospheres: string[];
  visualStyles: string[];
  aspectRatios: string[];
  storyboardFinenessOptions: string[];
}
