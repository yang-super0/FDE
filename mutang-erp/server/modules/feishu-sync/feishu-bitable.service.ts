import { Injectable } from '@nestjs/common';
import { AppType, Client, Domain } from '@larksuiteoapi/node-sdk';
import type { SyncFieldMappingItem } from '@shared/api.interface';
import type { SyncFieldValues } from './sync-tables.constants';

// 凭证常量（平台约束：禁止 process.env，必须源码常量）
// 注意：开源版本已脱敏，部署时请替换为真实凭证
const FEISHU_APP_ID = 'YOUR_FEISHU_APP_ID';
const FEISHU_APP_SECRET = 'YOUR_FEISHU_APP_SECRET';
const FEISHU_BASE_TOKEN = 'YOUR_FEISHU_BASE_TOKEN';

const CREDENTIAL_CACHE_MS = 5 * 60 * 1000;
const CREDENTIAL_TIMEOUT_MS = 5000;
const BATCH_SIZE = 500;
const BATCH_INTERVAL_MS = 300;
const PAGE_SIZE = 100;

/** 多维表格字段类型编码：text=1, number=2, date=5, checkbox=7 */
const FIELD_TYPE_CODES: Record<string, number> = {
  text: 1,
  number: 2,
  date: 5,
  checkbox: 7,
};

export interface BitableRecordUpdate {
  recordId: string;
  fields: SyncFieldValues;
}

interface FeishuTokenResponse {
  code?: number;
  msg?: string;
  tenant_access_token?: string;
}

interface BitableTableCreateResponse {
  code?: number;
  msg?: string;
  data?: { table_id?: string };
}

@Injectable()
export class FeishuBitableService {
  private readonly client: Client = new Client({
    appId: FEISHU_APP_ID,
    appSecret: FEISHU_APP_SECRET,
    appType: AppType.SelfBuild,
    domain: Domain.Feishu,
    logger: {
      trace: (): void => {},
      debug: (): void => {},
      info: (): void => {},
      warn: (): void => {},
      error: (): void => {},
    },
  });

  private credentialsValid: boolean | null = null;
  private credentialsCheckedAt = 0;

  /**
   * 检测飞书凭证是否有效（结果缓存 5 分钟）。
   * 使用 Node 22 全局 fetch + AbortController 超时控制。
   */
  async testCredentials(): Promise<boolean> {
    const now: number = Date.now();
    if (
      this.credentialsValid !== null &&
      now - this.credentialsCheckedAt < CREDENTIAL_CACHE_MS
    ) {
      return this.credentialsValid;
    }
    let valid = false;
    try {
      const controller = new AbortController();
      const timer = setTimeout((): void => {
        controller.abort();
      }, CREDENTIAL_TIMEOUT_MS);
      try {
        const res = await fetch(
          'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              app_id: FEISHU_APP_ID,
              app_secret: FEISHU_APP_SECRET,
            }),
            signal: controller.signal,
          },
        );
        if (res.ok) {
          const json = (await res.json()) as FeishuTokenResponse;
          valid =
            json.code === 0 &&
            typeof json.tenant_access_token === 'string' &&
            json.tenant_access_token.length > 0;
        }
      } finally {
        clearTimeout(timer);
      }
    } catch {
      valid = false;
    }
    this.credentialsValid = valid;
    this.credentialsCheckedAt = Date.now();
    return valid;
  }

  /**
   * 在多维表格中创建数据表，首字段固定为 `id`（多行文本，主字段）。
   * 返回新建表的 table_id。
   */
  async createTable(
    name: string,
    fields: SyncFieldMappingItem[],
  ): Promise<string> {
    await this.ensureCredentials();
    const tableFields: Array<{ field_name: string; type: number }> = [
      { field_name: 'id', type: FIELD_TYPE_CODES['text'] ?? 1 },
    ];
    for (const field of fields) {
      if (field.fieldName === 'id') continue;
      tableFields.push({
        field_name: field.fieldName,
        type: FIELD_TYPE_CODES[field.fieldType] ?? FIELD_TYPE_CODES['text'] ?? 1,
      });
    }
    const res = await this.client.request<BitableTableCreateResponse>({
      method: 'POST',
      url: `/open-apis/bitable/v1/apps/${FEISHU_BASE_TOKEN}/tables`,
      data: {
        table: {
          name,
          default_view_name: '默认视图',
          fields: tableFields,
        },
      },
    });
    this.checkResponse(res.code, res.msg);
    const tableId: string | undefined = res.data?.table_id;
    if (!tableId) {
      throw new Error('飞书API错误:创建数据表未返回table_id');
    }
    return tableId;
  }

  /** 分批（500 条）批量新增记录，批间 300ms 频控间隔 */
  async batchCreateRecords(
    tableId: string,
    rows: SyncFieldValues[],
  ): Promise<void> {
    await this.ensureCredentials();
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const chunk: SyncFieldValues[] = rows.slice(i, i + BATCH_SIZE);
      const res = await this.client.bitable.appTableRecord.batchCreate({
        path: { app_token: FEISHU_BASE_TOKEN, table_id: tableId },
        data: {
          records: chunk.map(
            (fields: SyncFieldValues): { fields: SyncFieldValues } => ({
              fields,
            }),
          ),
        },
      });
      this.checkResponse(res.code, res.msg);
      if (i + BATCH_SIZE < rows.length) {
        await this.sleep(BATCH_INTERVAL_MS);
      }
    }
  }

  /** 分批批量更新记录 */
  async batchUpdateRecords(
    tableId: string,
    updates: BitableRecordUpdate[],
  ): Promise<void> {
    await this.ensureCredentials();
    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
      const chunk: BitableRecordUpdate[] = updates.slice(i, i + BATCH_SIZE);
      const res = await this.client.bitable.appTableRecord.batchUpdate({
        path: { app_token: FEISHU_BASE_TOKEN, table_id: tableId },
        data: {
          records: chunk.map(
            (update: BitableRecordUpdate): {
              record_id: string;
              fields: SyncFieldValues;
            } => ({ record_id: update.recordId, fields: update.fields }),
          ),
        },
      });
      this.checkResponse(res.code, res.msg);
      if (i + BATCH_SIZE < updates.length) {
        await this.sleep(BATCH_INTERVAL_MS);
      }
    }
  }

  /** 分批批量删除记录 */
  async batchDeleteRecords(
    tableId: string,
    recordIds: string[],
  ): Promise<void> {
    await this.ensureCredentials();
    for (let i = 0; i < recordIds.length; i += BATCH_SIZE) {
      const chunk: string[] = recordIds.slice(i, i + BATCH_SIZE);
      const res = await this.client.bitable.appTableRecord.batchDelete({
        path: { app_token: FEISHU_BASE_TOKEN, table_id: tableId },
        data: { records: chunk },
      });
      this.checkResponse(res.code, res.msg);
      if (i + BATCH_SIZE < recordIds.length) {
        await this.sleep(BATCH_INTERVAL_MS);
      }
    }
  }

  /** 按 `id` 字段值查找记录，返回 record_id 或 null */
  async searchByRecordKey(
    tableId: string,
    key: string,
  ): Promise<string | null> {
    await this.ensureCredentials();
    const res = await this.client.bitable.appTableRecord.search({
      path: { app_token: FEISHU_BASE_TOKEN, table_id: tableId },
      data: {
        field_names: ['id'],
        filter: {
          conjunction: 'and',
          conditions: [{ field_name: 'id', operator: 'is', value: [key] }],
        },
      },
      params: { page_size: 10 },
    });
    this.checkResponse(res.code, res.msg);
    const items = res.data?.items ?? [];
    if (items.length === 0) return null;
    return items[0].record_id ?? null;
  }

  /** 分页拉取数据表全部记录的 record_id */
  async listAllRecordIds(tableId: string): Promise<string[]> {
    await this.ensureCredentials();
    const recordIds: string[] = [];
    let pageToken: string | undefined;
    do {
      const requestParams: { page_size: number; page_token?: string } = {
        page_size: PAGE_SIZE,
      };
      if (pageToken !== undefined) {
        requestParams.page_token = pageToken;
      }
      const res = await this.client.bitable.appTableRecord.search({
        path: { app_token: FEISHU_BASE_TOKEN, table_id: tableId },
        data: { field_names: ['id'] },
        params: requestParams,
      });
      this.checkResponse(res.code, res.msg);
      const items = res.data?.items ?? [];
      for (const item of items) {
        if (item.record_id) recordIds.push(item.record_id);
      }
      const hasMore: boolean = res.data?.has_more ?? false;
      pageToken = hasMore ? res.data?.page_token : undefined;
    } while (pageToken !== undefined);
    return recordIds;
  }

  private async ensureCredentials(): Promise<void> {
    const valid: boolean = await this.testCredentials();
    if (!valid) {
      throw new Error('飞书凭证未配置或无效');
    }
  }

  private checkResponse(code: number | undefined, msg: string | undefined): void {
    if (code !== 0) {
      throw new Error(`飞书API错误[${code ?? 'unknown'}]:${msg ?? ''}`);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise<void>(
      (resolve: () => void): void => {
        setTimeout(resolve, ms);
      },
    );
  }
}
