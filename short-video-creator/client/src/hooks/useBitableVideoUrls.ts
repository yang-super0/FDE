import { useEffect, useState } from 'react';
import { capabilityClient } from '@lark-apaas/client-toolkit';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type { FeishuBitableRecordReadOneGetrecordInput } from '@shared/plugin-types';

const PLUGIN_INSTANCE_ID: string = 'feishu_bitable_record_read_2';
const GENERATED_VIDEO_FIELD_PREFIX: string = '生成视频';
const GENERATED_VIDEO_FIELD_COUNT: number = 4;

interface BitableAttachmentItem {
  name: string;
  size: number;
  tmpUrl: string;
  type: string;
}

interface GetRecordOutput {
  id?: string;
  record?: Record<string, unknown>;
}

function extractAttachmentUrls(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const urls: string[] = [];
  for (const item of value as BitableAttachmentItem[]) {
    if (!item || typeof item !== 'object') {
      continue;
    }
    if (item.tmpUrl && item.tmpUrl.startsWith('http')) {
      urls.push(item.tmpUrl);
    }
  }
  return urls;
}

export interface BitableVideoUrlsState {
  urlsByIndex: Record<number, string[]> | null;
  loading: boolean;
  error: string | null;
}

export function useBitableVideoUrls(baseRecordId: string | null): BitableVideoUrlsState {
  const [state, setState] = useState<BitableVideoUrlsState>({
    urlsByIndex: null,
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (!baseRecordId) {
      return;
    }
    let cancelled: boolean = false;
    setState({ urlsByIndex: null, loading: true, error: null });

    const run = async (): Promise<void> => {
      try {
        const plugin = await capabilityClient.load(PLUGIN_INSTANCE_ID);
        const output: GetRecordOutput = await plugin.call('getRecord', {
          recordID: baseRecordId,
        } satisfies FeishuBitableRecordReadOneGetrecordInput);
        if (cancelled) {
          return;
        }
        const record: Record<string, unknown> = output.record ?? {};
        logger.info(`[bitable-video] record keys: ${JSON.stringify(Object.keys(record))}`);
        const urlsByIndex: Record<number, string[]> = {};
        for (let index: number = 1; index <= GENERATED_VIDEO_FIELD_COUNT; index += 1) {
          const fieldName: string = `${GENERATED_VIDEO_FIELD_PREFIX}${index}`;
          const urls: string[] = extractAttachmentUrls(record[fieldName]);
          if (urls.length > 0) {
            urlsByIndex[index] = urls;
          }
          if (record[fieldName] !== undefined) {
            logger.info(`[bitable-video] ${fieldName}: ${JSON.stringify(record[fieldName]).slice(0, 400)}`);
          }
        }
        setState({ urlsByIndex, loading: false, error: null });
      } catch (err) {
        logger.error(`[bitable-video] getRecord failed: ${JSON.stringify(err)}`);
        if (!cancelled) {
          setState({ urlsByIndex: null, loading: false, error: '加载失败' });
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [baseRecordId]);

  return state;
}
