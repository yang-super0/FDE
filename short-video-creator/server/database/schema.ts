/* eslint-disable */
/** auto generated, do not edit */
import { sql } from 'drizzle-orm';
import { date, index, integer, numeric, pgTable, text, uniqueIndex, uuid, varchar, customType } from "drizzle-orm/pg-core"

export const customTimestamptz = customType<{
  data: Date;
  driverData: string;
  config: { precision?: number };
}>({
  dataType(config) {
    const precision = typeof config?.precision !== 'undefined'
      ? ` (${config.precision})`
      : '';
    return `timestamptz${precision}`;
  },
  toDriver(value: Date | string | number) {
    if (value == null) return value as any;
    if (typeof value === 'number') return new Date(value).toISOString();
    if (typeof value === 'string') return value;
    if (value instanceof Date) return value.toISOString();
    throw new Error('Invalid timestamp value');
  },
  fromDriver(value: string | Date): Date {
    if (value instanceof Date) return value;
    return new Date(value);
  },
});

export const userProfile = customType<{
  data: string;
  driverData: string;
}>({
  dataType() {
    return 'user_profile';
  },
  toDriver(value: string) {
    return sql`ROW(${value})::user_profile`;
  },
  fromDriver(value: string) {
    const [userId] = value.slice(1, -1).split(',');
    return userId.trim();
  },
});

export type FileAttachment = {
  bucket_id: string;
  file_path: string;
};

export const fileAttachment = customType<{
  data: FileAttachment;
  driverData: string;
}>({
  dataType() {
    return 'file_attachment';
  },
  toDriver(value: FileAttachment) {
    return sql`ROW(${value.bucket_id},${value.file_path})::file_attachment`;
  },
  fromDriver(value: string): FileAttachment {
    const [bucketId, filePath] = value.slice(1, -1).split(',');
    return { bucket_id: bucketId.trim(), file_path: filePath.trim() };
  },
});

export function escapeLiteral(str: string): string {
  return "'" + str.replace(/'/g, "''") + "'";
}

export const userProfileArray = customType<{
  data: string[];
  driverData: string;
}>({
  dataType() {
    return 'user_profile[]';
  },
  toDriver(value: string[]) {
    if (!value || value.length === 0) {
      return sql`'{}'::user_profile[]`;
    }
    const elements = value.map(id => `ROW(${escapeLiteral(id)})::user_profile`).join(',');
    return sql.raw(`ARRAY[${elements}]::user_profile[]`);
  },
  fromDriver(value: string): string[] {
    if (!value || value === '{}') return [];
    const inner = value.slice(1, -1);
    const matches = inner.match(/\([^)]*\)/g) || [];
    return matches.map(m => m.slice(1, -1).split(',')[0].trim());
  },
});

export const fileAttachmentArray = customType<{
  data: FileAttachment[];
  driverData: string;
}>({
  dataType() {
    return 'file_attachment[]';
  },
  toDriver(value: FileAttachment[]) {
    if (!value || value.length === 0) {
      return sql`'{}'::file_attachment[]`;
    }
    const elements = value.map(f =>
      `ROW(${escapeLiteral(f.bucket_id)},${escapeLiteral(f.file_path)})::file_attachment`
    ).join(',');
    return sql.raw(`ARRAY[${elements}]::file_attachment[]`);
  },
  fromDriver(value: string): FileAttachment[] {
    if (!value || value === '{}') return [];
    const inner = value.slice(1, -1);
    const matches = inner.match(/\([^)]*\)/g) || [];
    return matches.map(m => {
      const [bucketId, filePath] = m.slice(1, -1).split(',');
      return { bucket_id: bucketId.trim(), file_path: filePath.trim() };
    });
  },
});

export const bitableSyncState = pgTable("bitable_sync_state", {
  id: uuid("id").primaryKey().defaultRandom(),
  direction: varchar("direction", { length: 32 }).notNull(),
  status: varchar("status", { length: 16 }).notNull(),
  message: text("message"),
  recordCount: integer("record_count").notNull().default(0),
  syncedAt: customTimestamptz("synced_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  index("idx_bitable_sync_state_synced_at").on(table.syncedAt),
]);

export const videoAiAnalysis = pgTable("video_ai_analysis", {
  id: uuid("id").primaryKey().defaultRandom(),
  materialId: uuid("material_id").notNull().unique(),
  platform: varchar("platform", { length: 50 }),
  videoTitle: text("video_title"),
  videoDescription: text("video_description"),
  viewCount: numeric("view_count"),
  likeCount: numeric("like_count"),
  commentCount: numeric("comment_count"),
  subtitleText: text("subtitle_text"),
  collectStatus: varchar("collect_status", { length: 50 }).notNull().default('pending'),
  copyQuality: text("copy_quality"),
  hitStructure: text("hit_structure"),
  reusableFormula: text("reusable_formula"),
  copyQualityStatus: varchar("copy_quality_status", { length: 50 }).notNull().default('pending'),
  hitStructureStatus: varchar("hit_structure_status", { length: 50 }).notNull().default('pending'),
  reusableFormulaStatus: varchar("reusable_formula_status", { length: 50 }).notNull().default('pending'),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("unq_video_ai_analysis_material").on(table.materialId),
]);

// Synced table: data is auto-synced from external source. Do not rename or delete this table.
export const videoMaterial = pgTable("video_material", {
  id: uuid("id").primaryKey().unique().defaultRandom(),
  // Synced field: auto-synced, do not modify or delete
  baseRecordId: varchar("base_record_id").unique(),
  // Synced field: auto-synced, do not modify or delete
  videoLink: text("video_link"),
  // Synced field: auto-synced, do not modify or delete
  videoCopyText: text("video_copy_text"),
  // Synced field: auto-synced, do not modify or delete
  hitStructureAnalysis: text("hit_structure_analysis"),
  // Synced field: auto-synced, do not modify or delete
  originalCopy: text("original_copy"),
  // Synced field: auto-synced, do not modify or delete
  storyboardScript: text("storyboard_script"),
  // Synced field: auto-synced, do not modify or delete
  sceneSetting: text("scene_setting"),
  // Synced field: auto-synced, do not modify or delete
  protagonistSetting: text("protagonist_setting"),
  // Synced field: auto-synced, do not modify or delete
  subtitleStyle: text("subtitle_style"),
  // Synced field: auto-synced, do not modify or delete
  cameraMovementPreference: text("camera_movement_preference").array(),
  // Synced field: auto-synced, do not modify or delete
  colorAtmosphere: text("color_atmosphere"),
  // Synced field: auto-synced, do not modify or delete
  visualStyle: text("visual_style"),
  // Synced field: auto-synced, do not modify or delete
  aspectRatio: text("aspect_ratio"),
  // Synced field: auto-synced, do not modify or delete
  styleReferenceImage: text("style_reference_image").array(),
  // Synced field: auto-synced, do not modify or delete
  targetPlatform: text("target_platform"),
  // Synced field: auto-synced, do not modify or delete
  videoType: text("video_type"),
  // Synced field: auto-synced, do not modify or delete
  characterReferenceImage: text("character_reference_image").array(),
  // Synced field: auto-synced, do not modify or delete
  storyboardPrompt1: text("storyboard_prompt_1"),
  // Synced field: auto-synced, do not modify or delete
  storyboardPrompt2: text("storyboard_prompt_2"),
  // Synced field: auto-synced, do not modify or delete
  storyboardPrompt3: text("storyboard_prompt_3"),
  // Synced field: auto-synced, do not modify or delete
  storyboardPrompt4: text("storyboard_prompt_4"),
  // Synced field: auto-synced, do not modify or delete
  storyboardFineness: text("storyboard_fineness"),
  // Synced field: auto-synced, do not modify or delete
  storyboardImage1: text("storyboard_image_1").array(),
  // Synced field: auto-synced, do not modify or delete
  storyboardImage2: text("storyboard_image_2").array(),
  // Synced field: auto-synced, do not modify or delete
  storyboardImage3: text("storyboard_image_3").array(),
  // Synced field: auto-synced, do not modify or delete
  storyboardImage4: text("storyboard_image_4").array(),
  // Synced field: auto-synced, do not modify or delete
  generatedVideo1: text("generated_video_1").array(),
  // Synced field: auto-synced, do not modify or delete
  generatedVideo2: text("generated_video_2").array(),
  // Synced field: auto-synced, do not modify or delete
  generatedVideo3: text("generated_video_3").array(),
  // Synced field: auto-synced, do not modify or delete
  generatedVideo4: text("generated_video_4").array(),
  // Synced field: auto-synced, do not modify or delete
  playCount: numeric("play_count"),
  // Synced field: auto-synced, do not modify or delete
  likeCount: numeric("like_count"),
  // Synced field: auto-synced, do not modify or delete
  commentCount: numeric("comment_count"),
  // Synced field: auto-synced, do not modify or delete
  processStatus: text("process_status"),
  // Synced field: auto-synced, do not modify or delete
  createTime: date("create_time"),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 6 }).notNull().default(sql`now()`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by"),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 6 }).notNull().default(sql`now()`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by"),
}, (table) => [
  uniqueIndex("unq_1875227206074474").on(table.id),
  uniqueIndex("unq_1875227206075546").on(table.baseRecordId),
]);

// table aliases
export const bitableSyncStateTable = bitableSyncState;
export const videoAiAnalysisTable = videoAiAnalysis;
export const videoMaterialTable = videoMaterial;
