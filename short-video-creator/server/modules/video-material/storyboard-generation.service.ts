import { Inject, Injectable, Logger } from '@nestjs/common';
import { CapabilityService } from '@lark-apaas/nestjs-capability';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { eq } from 'drizzle-orm';
import { videoMaterial } from '@server/database/schema';
import {
  BITABLE_FIELDS,
  BitableService,
} from '@server/modules/bitable/bitable.service';
import { VIDEO_MATERIAL_STATUS } from '@shared/video-material';
import { SyncStateService } from './sync-state.service';

type VideoMaterialRow = typeof videoMaterial.$inferSelect;

const STORYBOARD_PLUGIN_ID = 'hot_video_storyboard_generate_1';
const STORYBOARD_ACTION_KEY = 'textGenerate';

interface CapabilityHandle {
  call(
    actionKey: string,
    input: Record<string, unknown>,
  ): Promise<Record<string, unknown>>;
  callStream?: (
    actionKey: string,
    input: Record<string, unknown>,
  ) => unknown;
}

function isAsyncIterable(
  value: unknown,
): value is AsyncIterable<Record<string, unknown>> {
  return Boolean(
    value &&
      typeof (value as { [Symbol.asyncIterator]?: unknown })[
        Symbol.asyncIterator
      ] === 'function',
  );
}

function normalizeStream(
  resultOrStream: unknown,
): AsyncIterable<Record<string, unknown>> {
  if (isAsyncIterable(resultOrStream)) {
    return resultOrStream;
  }
  const wrapped: { output?: unknown } | null = resultOrStream as {
    output?: unknown;
  } | null;
  if (wrapped && isAsyncIterable(wrapped.output)) {
    return wrapped.output;
  }
  throw new Error('无法解析插件流式返回结构');
}

@Injectable()
export class StoryboardGenerationService {
  private readonly logger = new Logger(StoryboardGenerationService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    @Inject(CapabilityService)
    private readonly capabilityService: CapabilityService,
    private readonly bitableService: BitableService,
    private readonly syncState: SyncStateService,
  ) {}

  async runStoryboardGeneration(
    id: string,
    row: VideoMaterialRow,
    userId: string,
  ): Promise<void> {
    const prompt: string = this.buildStoryboardPrompt(row);
    try {
      const content: string = await this.generateStoryboardContent(prompt);
      if (!content.trim()) {
        throw new Error('AI 返回内容为空');
      }
      await this.db
        .update(videoMaterial)
        .set({
          storyboardScript: content,
          processStatus: VIDEO_MATERIAL_STATUS.STORYBOARD_DONE,
          updatedAt: new Date(),
          updatedBy: userId,
        })
        .where(eq(videoMaterial.id, id));
      const synced: boolean = await this.syncToBitable(row.baseRecordId, {
        [BITABLE_FIELDS.storyboardScript]: content,
        [BITABLE_FIELDS.processStatus]: VIDEO_MATERIAL_STATUS.STORYBOARD_DONE,
      });
      void this.syncState.record(
        'app_to_bitable',
        synced ? 'success' : 'failed',
        synced ? '分镜结果已同步多维表格' : '分镜结果同步多维表格失败',
        1,
      );
    } catch (error) {
      const errorMessage: string =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `分镜脚本生成失败 ${JSON.stringify({
          pluginInstanceId: STORYBOARD_PLUGIN_ID,
          actionKey: STORYBOARD_ACTION_KEY,
          outputMode: 'stream',
          inputKeys: ['prompt'],
          error: errorMessage,
        })}`,
      );
      await this.db
        .update(videoMaterial)
        .set({
          processStatus: VIDEO_MATERIAL_STATUS.FAILED,
          updatedAt: new Date(),
          updatedBy: userId,
        })
        .where(eq(videoMaterial.id, id))
        .catch((updateError: unknown) => {
          this.logger.error(
            `生成失败状态回写失败: ${
              updateError instanceof Error
                ? updateError.message
                : String(updateError)
            }`,
          );
        });
      await this.syncToBitable(row.baseRecordId, {
        [BITABLE_FIELDS.processStatus]: VIDEO_MATERIAL_STATUS.FAILED,
      });
      void this.syncState.record(
        'app_to_bitable',
        'failed',
        `分镜生成失败: ${errorMessage}`,
        1,
      );
    }
  }

  private async syncToBitable(
    recordId: string | null,
    fields: Record<string, unknown>,
  ): Promise<boolean> {
    if (!recordId) {
      return true;
    }
    try {
      await this.bitableService.updateRecord(recordId, fields);
      return true;
    } catch (error) {
      this.logger.error(
        `分镜结果同步飞书多维表格失败 ${recordId}: ${
          error instanceof Error ? error.stack ?? error.message : String(error)
        }`,
      );
      return false;
    }
  }

  private async generateStoryboardContent(prompt: string): Promise<string> {
    const handle: CapabilityHandle = this.capabilityService.load(
      STORYBOARD_PLUGIN_ID,
    ) as CapabilityHandle;
    if (typeof handle.callStream === 'function') {
      const stream: AsyncIterable<Record<string, unknown>> = normalizeStream(
        handle.callStream(STORYBOARD_ACTION_KEY, { prompt }),
      );
      let content: string = '';
      for await (const chunk of stream) {
        const delta: unknown = chunk.content;
        if (typeof delta === 'string') {
          content += delta;
        }
      }
      return content;
    }
    const output: Record<string, unknown> = await handle.call(
      STORYBOARD_ACTION_KEY,
      { prompt },
    );
    const text: unknown = output.content ?? output.response;
    return typeof text === 'string' ? text : '';
  }

  private buildStoryboardPrompt(row: VideoMaterialRow): string {
    const contextLines: string[] = [];
    if (row.originalCopy) {
      contextLines.push(`原始文案：${row.originalCopy}`);
    }
    if (row.videoCopyText) {
      contextLines.push(`视频口播文案：${row.videoCopyText}`);
    }
    if (row.hitStructureAnalysis) {
      contextLines.push(`爆款结构分析：${row.hitStructureAnalysis}`);
    }
    if (row.sceneSetting) {
      contextLines.push(`场景设定：${row.sceneSetting}`);
    }
    if (row.protagonistSetting) {
      contextLines.push(`主角设定：${row.protagonistSetting}`);
    }
    if (row.visualStyle) {
      contextLines.push(`视觉风格：${row.visualStyle}`);
    }
    if (row.colorAtmosphere) {
      contextLines.push(`色彩氛围：${row.colorAtmosphere}`);
    }
    if (row.aspectRatio) {
      contextLines.push(`画面比例：${row.aspectRatio}`);
    }
    const contextBlock: string =
      contextLines.length > 0
        ? `\n\n已有素材信息：\n${contextLines.join('\n')}`
        : '';
    return [
      '你是一名专业的短视频分镜编剧。请根据以下爆款视频链接，拆解其内容结构并生成一份可用于 AI 视频生成的分镜脚本。',
      `\n爆款视频链接：${row.videoLink ?? ''}${contextBlock}`,
      '\n输出要求：',
      '1. 生成 4-6 个分镜，使用 Markdown 表格呈现，列依次为：镜号、时长、景别、画面描述、运镜方式、台词或字幕、音效',
      '2. 画面描述要具体到主体、动作、场景与光线氛围，便于后续 AI 生图理解',
      '3. 整体节奏遵循爆款视频的钩子-冲突-反转-收尾结构，并在表格前用两三句话概述节奏设计思路',
      '4. 全文使用中文输出',
    ].join('\n');
  }
}
