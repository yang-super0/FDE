import { Injectable, Logger } from '@nestjs/common';
import type * as lark from '@larksuiteoapi/node-sdk';
import { FeishuService } from '../feishu/feishu.service';
import { MEDIA_URL_PATTERN, type MediaTokenEntry } from './bitable-mapping';

// 注意：开源版本已脱敏，部署时请替换为真实凭证
const BASE_TOKEN = 'YOUR_FEISHU_BASE_TOKEN';
const TABLE_ID = 'YOUR_TABLE_ID';

export const BITABLE_FIELDS = {
  videoLink: '视频链接',
  processStatus: '处理状态',
  storyboardScript: '分镜脚本',
  originalCopy: '原创文案',
  videoCopyText: '视频文案.文本',
  hitStructureAnalysis: '爆款结构分析',
} as const;

const PROCESS_STATUS_BITABLE_MAP: Record<string, string> = {
  待处理: '待提取',
  生成中: '处理中',
  分镜已生成: '已完成',
  生成失败: '失败',
};

export interface BitableRecordItem {
  record_id: string;
  fields: Record<string, unknown>;
}

export interface BitableSearchParams {
  filter?: unknown;
  sort?: Array<{ field_name: string; desc?: boolean }>;
  pageSize?: number;
  pageToken?: string;
  fieldNames?: string[];
}

export interface BitableSearchResult {
  items: BitableRecordItem[];
  total: number;
  hasMore: boolean;
  pageToken?: string;
}

interface BitableSearchRequest {
  path: { app_token: string; table_id: string };
  params?: { page_size?: number; page_token?: string };
  data?: {
    field_names?: string[];
    filter?: unknown;
    sort?: Array<{ field_name: string; desc?: boolean }>;
  };
}

interface BitableSearchRawResponse {
  code?: number;
  msg?: string;
  data?: {
    items?: Array<{ record_id?: string; fields?: Record<string, unknown> }>;
    total?: number;
    has_more?: boolean;
    page_token?: string;
  };
}

interface BitableFieldItem {
  field_name?: string;
  type?: number;
  property?: { options?: Array<{ name?: string }> };
}

interface BitableFieldListRequest {
  path: { app_token: string; table_id: string };
  params?: { page_size?: number; page_token?: string };
}

interface BitableFieldListRawResponse {
  code?: number;
  msg?: string;
  data?: {
    items?: BitableFieldItem[];
    has_more?: boolean;
    page_token?: string;
  };
}

type BitableSearchCall = (
  request: BitableSearchRequest,
) => Promise<BitableSearchRawResponse>;

type BitableFieldListCall = (
  request: BitableFieldListRequest,
) => Promise<BitableFieldListRawResponse>;

@Injectable()
export class BitableService {
  private readonly logger = new Logger(BitableService.name);

  constructor(private readonly feishuService: FeishuService) {}

  private cachedAttachmentFieldIds: Map<string, string> | null = null;

  // 附件字段名 → field_id（换取临时直链的 extra 鉴权需要），内存缓存仅成功时写入
  async getAttachmentFieldIds(): Promise<Map<string, string>> {
    if (this.cachedAttachmentFieldIds) {
      return this.cachedAttachmentFieldIds;
    }
    const token: string = await this.feishuService.getTenantAccessToken();
    const response: Response = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables/${TABLE_ID}/fields?page_size=100`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const payload: {
      code?: number;
      msg?: string;
      data?: { items?: Array<{ type?: number; field_name?: string; field_id?: string }> };
    } = await response.json();
    if (payload.code !== 0) {
      throw new Error(`获取多维表格字段列表失败 [${payload.code}]: ${payload.msg}`);
    }
    const map: Map<string, string> = new Map();
    (payload.data?.items ?? []).forEach(
      (field: { type?: number; field_name?: string; field_id?: string }): void => {
        if (field.type === 17 && field.field_name && field.field_id) {
          map.set(field.field_name, field.field_id);
        }
      },
    );
    this.cachedAttachmentFieldIds = map;
    return map;
  }

  // 临时直链缓存：file_token → { url, expireAt }，直链 24h 有效，提前 10 分钟失效；
  // 进程重启失效无害（重新换取即可）
  private readonly tmpUrlCache: Map<string, { url: string; expireAt: number }> =
    new Map();

  // 换取可匿名访问的临时下载直链 { file_token: url }；
  // 多维表格附件必须携带 extra(bitablePerm) 鉴权且一次只能传 1 个 token；
  // 频控严格（并发超限报 99991400），并发 2 + 频控重试一次；单个失败不中断整体，仅记录日志
  async getTmpDownloadUrls(
    entries: MediaTokenEntry[],
  ): Promise<Map<string, string>> {
    const result: Map<string, string> = new Map();
    const pending: MediaTokenEntry[] = [];
    const now: number = Date.now();
    entries.forEach((entry: MediaTokenEntry): void => {
      const cached: { url: string; expireAt: number } | undefined =
        this.tmpUrlCache.get(entry.fileToken);
      if (cached && cached.expireAt > now) {
        result.set(entry.fileToken, cached.url);
        return;
      }
      pending.push(entry);
    });
    if (pending.length === 0) {
      return result;
    }
    const token: string = await this.feishuService.getTenantAccessToken();
    const fetchOne = async (
      entry: MediaTokenEntry,
      attempt: number,
    ): Promise<void> => {
      const attachments: Record<string, Record<string, string[]>> = {
        [entry.fieldId]: { [entry.recordId]: [entry.fileToken] },
      };
      const extra: string = JSON.stringify({
        bitablePerm: { tableId: TABLE_ID, attachments },
      });
      const url: string =
        'https://open.feishu.cn/open-apis/drive/v1/medias/batch_get_tmp_download_url' +
        `?file_tokens=${entry.fileToken}&extra=${encodeURIComponent(extra)}`;
      try {
        const response: Response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const payload: {
          code?: number;
          msg?: string;
          data?: {
            tmp_download_urls?: Array<{
              file_token?: string;
              tmp_download_url?: string;
              expire_time?: number;
            }>;
          };
        } = await response.json();
        if (payload.code === 99991400 && attempt === 0) {
          await new Promise<void>((resolve): void => {
            setTimeout(resolve, 600);
          });
          return fetchOne(entry, 1);
        }
        if (payload.code !== 0) {
          this.logger.warn(
            `换取附件临时链接失败 [${payload.code}] token=${entry.fileToken}: ${payload.msg}`,
          );
          return;
        }
        const item: {
          file_token?: string;
          tmp_download_url?: string;
          expire_time?: number;
        } | undefined = payload.data?.tmp_download_urls?.[0];
        if (item?.file_token && item.tmp_download_url) {
          result.set(item.file_token, item.tmp_download_url);
          const expireAt: number = item.expire_time
            ? item.expire_time - 10 * 60 * 1000
            : now + 60 * 60 * 1000;
          this.tmpUrlCache.set(item.file_token, {
            url: item.tmp_download_url,
            expireAt,
          });
        }
      } catch (error) {
        this.logger.warn(
          `换取附件临时链接异常 token=${entry.fileToken}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    };
    const CONCURRENCY = 2;
    for (let i = 0; i < pending.length; i += CONCURRENCY) {
      await Promise.all(
        pending.slice(i, i + CONCURRENCY).map((entry: MediaTokenEntry) =>
          fetchOne(entry, 0),
        ),
      );
    }
    return result;
  }

  // 深度遍历对象/数组，把飞书附件链接原位替换为临时直链，未命中的保留原值；
  // 整体失败时返回原值不阻断主流程；pruneUnresolved=true 时未换取成功的附件字段置空数组（用于本地降级数据）
  async resolveMediaUrls<T>(
    value: T,
    entries: MediaTokenEntry[],
    pruneUnresolved = false,
  ): Promise<T> {
    if (entries.length === 0) {
      return value;
    }
    let mapping: Map<string, string>;
    try {
      mapping = await this.getTmpDownloadUrls(entries);
    } catch (error) {
      this.logger.warn(
        `附件临时链接换取失败: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return value;
    }
    const transform = (node: unknown): unknown => {
      if (typeof node === 'string') {
        const matched: RegExpMatchArray | null = node.match(MEDIA_URL_PATTERN);
        if (matched && matched[1]) {
          return mapping.get(matched[1]) ?? (pruneUnresolved ? null : node);
        }
        return node;
      }
      if (Array.isArray(node)) {
        return (node as unknown[])
          .map((item: unknown) => transform(item))
          .filter((item: unknown): boolean => item !== null);
      }
      if (node && typeof node === 'object') {
        const record: Record<string, unknown> = node as Record<string, unknown>;
        const next: Record<string, unknown> = {};
        Object.entries(record).forEach(([key, child]: [string, unknown]) => {
          next[key] = transform(child);
        });
        return next;
      }
      return node;
    };
    return transform(value) as T;
  }

  async createRecord(fields: Record<string, unknown>): Promise<string> {
    const client: lark.Client = this.feishuService.getClient();
    const payload: Record<string, unknown> = this.filterFields(fields);
    const res = await client.bitable.appTableRecord.create({
      path: { app_token: BASE_TOKEN, table_id: TABLE_ID },
      data: { fields: payload },
    });
    if (res.code !== 0) {
      throw new Error(
        `多维表格创建记录失败 [${res.code}]: ${res.msg}`,
      );
    }
    const recordId: string | undefined = res.data?.record?.record_id;
    if (!recordId) {
      throw new Error('多维表格创建记录成功但未返回 record_id');
    }
    return recordId;
  }

  async updateRecord(
    recordId: string,
    fields: Record<string, unknown>,
  ): Promise<void> {
    const client: lark.Client = this.feishuService.getClient();
    const payload: Record<string, unknown> = this.filterFields(fields);
    if (Object.keys(payload).length === 0) {
      return;
    }
    const res = await client.bitable.appTableRecord.update({
      path: {
        app_token: BASE_TOKEN,
        table_id: TABLE_ID,
        record_id: recordId,
      },
      data: { fields: payload },
    });
    if (res.code !== 0) {
      throw new Error(
        `多维表格更新记录失败 [${res.code}]: ${res.msg}`,
      );
    }
  }

  async deleteRecord(recordId: string): Promise<void> {
    const client: lark.Client = this.feishuService.getClient();
    const res = await client.bitable.appTableRecord.delete({
      path: {
        app_token: BASE_TOKEN,
        table_id: TABLE_ID,
        record_id: recordId,
      },
    });
    if (res.code !== 0) {
      throw new Error(
        `多维表格删除记录失败 [${res.code}]: ${res.msg}`,
      );
    }
  }

  async getRecord(recordId: string): Promise<Record<string, unknown>> {
    const client: lark.Client = this.feishuService.getClient();
    const res = await client.bitable.appTableRecord.get({
      path: {
        app_token: BASE_TOKEN,
        table_id: TABLE_ID,
        record_id: recordId,
      },
    });
    if (res.code !== 0) {
      throw new Error(
        `多维表格读取记录失败 [${res.code}]: ${res.msg}`,
      );
    }
    const fields: unknown = res.data?.record?.fields;
    if (!fields || typeof fields !== 'object') {
      throw new Error('多维表格记录读取成功但未返回 fields');
    }
    return fields as Record<string, unknown>;
  }

  async searchRecords(
    params: BitableSearchParams,
  ): Promise<BitableSearchResult> {
    const client: lark.Client = this.feishuService.getClient();
    const request: BitableSearchRequest = {
      path: { app_token: BASE_TOKEN, table_id: TABLE_ID },
      params: { page_size: params.pageSize ?? 20 },
      data: {},
    };
    if (params.pageToken) {
      request.params = { ...request.params, page_token: params.pageToken };
    }
    if (params.filter !== undefined) {
      request.data = { ...request.data, filter: params.filter };
    }
    if (params.sort && params.sort.length > 0) {
      request.data = { ...request.data, sort: params.sort };
    }
    if (params.fieldNames && params.fieldNames.length > 0) {
      request.data = { ...request.data, field_names: params.fieldNames };
    }
    const searchCall: BitableSearchCall =
      client.bitable.appTableRecord.search as BitableSearchCall;
    const res: BitableSearchRawResponse = await searchCall(request);
    if (res.code !== 0) {
      throw new Error(
        `多维表格检索记录失败 [${res.code}]: ${res.msg}`,
      );
    }
    const rawItems: Array<{
      record_id?: string;
      fields?: Record<string, unknown>;
    }> = res.data?.items ?? [];
    const items: BitableRecordItem[] = [];
    rawItems.forEach(
      (item: { record_id?: string; fields?: Record<string, unknown> }) => {
        if (!item.record_id) {
          return;
        }
        items.push({ record_id: item.record_id, fields: item.fields ?? {} });
      },
    );
    return {
      items,
      total: res.data?.total ?? items.length,
      hasMore: Boolean(res.data?.has_more),
      pageToken: res.data?.page_token,
    };
  }

  // 拉取全部字段，收集单选/多选字段的选项名称 { 字段中文名: [选项...] }
  async getSelectOptions(): Promise<Record<string, string[]>> {
    const client: lark.Client = this.feishuService.getClient();
    const listCall: BitableFieldListCall =
      client.bitable.appTableField.list as BitableFieldListCall;
    const result: Record<string, string[]> = {};
    let pageToken: string | undefined;
    for (let round = 0; round < 10; round += 1) {
      const request: BitableFieldListRequest = {
        path: { app_token: BASE_TOKEN, table_id: TABLE_ID },
        params: { page_size: 100 },
      };
      if (pageToken) {
        request.params = { page_size: 100, page_token: pageToken };
      }
      const res: BitableFieldListRawResponse = await listCall(request);
      if (res.code !== 0) {
        throw new Error(
          `多维表格读取字段失败 [${res.code}]: ${res.msg}`,
        );
      }
      const items: BitableFieldItem[] = res.data?.items ?? [];
      items.forEach((field: BitableFieldItem) => {
        if (!field.field_name) {
          return;
        }
        const fieldType: number = field.type ?? 0;
        // 3=单选 4=多选，均提供 options 名称
        if (fieldType !== 3 && fieldType !== 4) {
          return;
        }
        const options: Array<{ name?: string }> = field.property?.options ?? [];
        const names: string[] = [];
        options.forEach((option: { name?: string }) => {
          if (option.name) {
            names.push(option.name);
          }
        });
        if (names.length > 0) {
          result[field.field_name] = names;
        }
      });
      if (!res.data?.has_more || !res.data?.page_token) {
        break;
      }
      pageToken = res.data.page_token;
    }
    return result;
  }

  private filterFields(
    fields: Record<string, unknown>,
  ): Record<string, unknown> {
    const payload: Record<string, unknown> = {};
    Object.entries(fields).forEach(([name, value]) => {
      if (value === undefined || value === null || value === '') {
        return;
      }
      if (name === BITABLE_FIELDS.processStatus && typeof value === 'string') {
        payload[name] = PROCESS_STATUS_BITABLE_MAP[value] ?? value;
        return;
      }
      payload[name] = value;
    });
    return payload;
  }
}
