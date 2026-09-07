import type { UpdateVideoMaterialRequest } from '@shared/video-material';

// 多维表格中文字段名 → videoMaterial 本地属性名
// 排除：视频文案（not_support 禁止读写）、创建时间（created_at 自动字段，写入禁止）
export const BITABLE_TO_LOCAL: Record<string, string> = {
  爆款结构分析: 'hitStructureAnalysis',
  视频类型: 'videoType',
  分镜提示词1: 'storyboardPrompt1',
  分镜提示词2: 'storyboardPrompt2',
  分镜提示词3: 'storyboardPrompt3',
  分镜提示词4: 'storyboardPrompt4',
  分镜精细度: 'storyboardFineness',
  评论数: 'commentCount',
  画面比例: 'aspectRatio',
  分镜图片1: 'storyboardImage1',
  分镜图片2: 'storyboardImage2',
  分镜图片3: 'storyboardImage3',
  分镜图片4: 'storyboardImage4',
  视觉风格: 'visualStyle',
  色调氛围: 'colorAtmosphere',
  点赞数: 'likeCount',
  分镜脚本: 'storyboardScript',
  场景设定: 'sceneSetting',
  '视频文案.文本': 'videoCopyText',
  视频链接: 'videoLink',
  播放数: 'playCount',
  生成视频1: 'generatedVideo1',
  生成视频2: 'generatedVideo2',
  生成视频3: 'generatedVideo3',
  生成视频4: 'generatedVideo4',
  人物参考图: 'characterReferenceImage',
  风格参考图: 'styleReferenceImage',
  目标平台: 'targetPlatform',
  字幕样式: 'subtitleStyle',
  主角设定: 'protagonistSetting',
  运镜偏好: 'cameraMovementPreference',
  原创文案: 'originalCopy',
  处理状态: 'processStatus',
};

const NUMBER_FIELDS: ReadonlySet<string> = new Set([
  '评论数',
  '点赞数',
  '播放数',
]);

const ATTACHMENT_FIELDS: ReadonlySet<string> = new Set([
  '分镜图片1',
  '分镜图片2',
  '分镜图片3',
  '分镜图片4',
  '生成视频1',
  '生成视频2',
  '生成视频3',
  '生成视频4',
  '人物参考图',
  '风格参考图',
]);

// select 单值映射到本地 text().array() 列，需要包成数组
const ARRAY_WRAP_FIELDS: ReadonlySet<string> = new Set(['运镜偏好']);

// 应用状态 → 多维表格「处理状态」选项
export const PROCESS_STATUS_TO_BITABLE: Record<string, string> = {
  待处理: '待提取',
  生成中: '处理中',
  分镜已生成: '已完成',
  生成失败: '失败',
};

// 多维表格「处理状态」选项 → 应用状态（反向映射）
export const BITABLE_STATUS_TO_LOCAL: Record<string, string> = {
  已完成: '分镜已生成',
  失败: '生成失败',
  处理中: '生成中',
  待提取: '待处理',
  已提取: '待处理',
};

// 编辑 DTO 属性 → 多维表格中文字段名
const EDIT_FIELD_MAPPING: Record<string, string> = {
  videoLink: '视频链接',
  videoType: '视频类型',
  targetPlatform: '目标平台',
  sceneSetting: '场景设定',
  protagonistSetting: '主角设定',
  subtitleStyle: '字幕样式',
  cameraMovementPreference: '运镜偏好',
  colorAtmosphere: '色调氛围',
  visualStyle: '视觉风格',
  aspectRatio: '画面比例',
  storyboardFineness: '分镜精细度',
};

function extractText(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number') {
    return String(value);
  }
  if (Array.isArray(value)) {
    const parts: string[] = [];
    (value as unknown[]).forEach((segment: unknown) => {
      if (typeof segment === 'string') {
        parts.push(segment);
        return;
      }
      if (segment && typeof segment === 'object') {
        const text: unknown = (segment as { text?: unknown }).text;
        if (typeof text === 'string') {
          parts.push(text);
        }
      }
    });
    return parts.length > 0 ? parts.join('') : null;
  }
  if (typeof value === 'object') {
    const text: unknown = (value as { text?: unknown }).text;
    return typeof text === 'string' ? text : null;
  }
  return null;
}

// 飞书云盘附件下载链接（file_token 位于路径中）
export const MEDIA_URL_PATTERN =
  /\/open-apis\/drive\/v1\/medias\/([A-Za-z0-9]+)\//u;

// 换取附件临时直链所需的条目：字段 ID + 记录 ID + 文件 token
export interface MediaTokenEntry {
  fieldId: string;
  recordId: string;
  fileToken: string;
}

// 从多维表格记录原始 fields 中收集附件条目；
// 部分附件字段（如生成视频）以 JSON 字符串形式存储，需先解析
export function collectAttachmentEntries(
  fields: Record<string, unknown>,
  fieldIdByName: Map<string, string>,
  recordId: string,
): MediaTokenEntry[] {
  const entries: MediaTokenEntry[] = [];
  Object.entries(fields).forEach(([fieldName, value]: [string, unknown]) => {
    const fieldId: string | undefined = fieldIdByName.get(fieldName);
    if (!fieldId) {
      return;
    }
    let items: unknown[] | null = null;
    if (Array.isArray(value)) {
      items = value;
    } else if (typeof value === 'string' && value.trim().startsWith('[')) {
      try {
        const parsed: unknown = JSON.parse(value);
        if (Array.isArray(parsed)) {
          items = parsed;
        }
      } catch {
        items = null;
      }
    }
    if (!items) {
      return;
    }
    items.forEach((item: unknown) => {
      if (!item || typeof item !== 'object') {
        return;
      }
      const fileToken: unknown = (item as { file_token?: unknown }).file_token;
      if (typeof fileToken === 'string' && fileToken) {
        entries.push({ fieldId, recordId, fileToken });
      }
    });
  });
  return entries;
}

// 从本地库行中收集附件条目（URL 反解 file_token）
export function collectEntriesFromLocalRow(
  row: Record<string, unknown>,
  fieldIdByName: Map<string, string>,
  recordId: string,
): MediaTokenEntry[] {
  const entries: MediaTokenEntry[] = [];
  Object.keys(BITABLE_TO_LOCAL).forEach((bitableName: string) => {
    if (!ATTACHMENT_FIELDS.has(bitableName)) {
      return;
    }
    const localKey: string | undefined = BITABLE_TO_LOCAL[bitableName];
    const fieldId: string | undefined = fieldIdByName.get(bitableName);
    const value: unknown = localKey ? row[localKey] : undefined;
    if (!fieldId || !Array.isArray(value)) {
      return;
    }
    (value as unknown[]).forEach((url: unknown) => {
      if (typeof url !== 'string') {
        return;
      }
      const matched: RegExpMatchArray | null = url.match(MEDIA_URL_PATTERN);
      if (matched && matched[1]) {
        entries.push({ fieldId, recordId, fileToken: matched[1] });
      }
    });
  });
  return entries;
}

function extractAttachments(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const urls: string[] = [];
  (value as unknown[]).forEach((item: unknown) => {
    if (!item || typeof item !== 'object') {
      return;
    }
    const file: { url?: unknown; tmp_url?: unknown } = item as {
      url?: unknown;
      tmp_url?: unknown;
    };
    const url: unknown = file.url ?? file.tmp_url;
    if (typeof url === 'string' && url) {
      urls.push(url);
    }
  });
  return urls;
}

// 多维表格记录 fields → 可直接写入 videoMaterial 的对象
export function toLocalFields(
  fields: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  Object.entries(fields).forEach(([fieldName, value]: [string, unknown]) => {
    const localKey: string | undefined = BITABLE_TO_LOCAL[fieldName];
    if (!localKey || value === undefined || value === null) {
      return;
    }
    if (NUMBER_FIELDS.has(fieldName)) {
      result[localKey] =
        typeof value === 'number' ? String(value) : extractText(value);
      return;
    }
    if (ATTACHMENT_FIELDS.has(fieldName)) {
      result[localKey] = extractAttachments(value);
      return;
    }
    const textValue: string | null = extractText(value);
    if (ARRAY_WRAP_FIELDS.has(fieldName)) {
      result[localKey] = textValue ? [textValue] : [];
      return;
    }
    result[localKey] = textValue;
  });
  return result;
}

// 编辑 DTO → 多维表格 fields（中文 key；空字符串 / undefined 跳过）
export function toBitableEditFields(
  dto: UpdateVideoMaterialRequest,
): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  (
    Object.keys(EDIT_FIELD_MAPPING) as Array<keyof UpdateVideoMaterialRequest>
  ).forEach((key: keyof UpdateVideoMaterialRequest) => {
    const value: string | undefined = dto[key];
    if (value === undefined || value === '') {
      return;
    }
    fields[EDIT_FIELD_MAPPING[key]] = value;
  });
  return fields;
}

// created_at 毫秒时间戳 → 业务时区自然日 'YYYY-MM-DD'
export function bitableDayFromMillis(value: unknown): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
  }).format(new Date(value));
}

// 组装可直接 insert 到 videoMaterial 的值（含 baseRecordId、状态反向映射、创建日期）
export function buildLocalInsertValues(
  recordId: string,
  fields: Record<string, unknown>,
): Record<string, unknown> {
  const local: Record<string, unknown> = toLocalFields(fields);
  const rawStatus: unknown = local.processStatus;
  if (typeof rawStatus === 'string') {
    local.processStatus = BITABLE_STATUS_TO_LOCAL[rawStatus] ?? rawStatus;
  }
  const createTime: string | null = bitableDayFromMillis(fields['创建时间']);
  if (createTime) {
    local.createTime = createTime;
  }
  local.baseRecordId = recordId;
  return local;
}
