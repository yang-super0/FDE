import { Injectable, Logger } from '@nestjs/common';
import * as lark from '@larksuiteoapi/node-sdk';

// 注意：开源版本已脱敏，部署时请替换为真实凭证
const FEISHU_APP_ID = 'YOUR_FEISHU_APP_ID';
const FEISHU_APP_SECRET = 'YOUR_FEISHU_APP_SECRET';
const TOKEN_ENDPOINT =
  'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal';
const TOKEN_REFRESH_AHEAD_MS = 5 * 60 * 1000;

@Injectable()
export class FeishuService {
  private readonly client: lark.Client;
  private readonly logger = new Logger(FeishuService.name);
  private cachedToken: string | null = null;
  private tokenExpireAt: number = 0;

  constructor() {
    this.client = new lark.Client({
      appId: FEISHU_APP_ID,
      appSecret: FEISHU_APP_SECRET,
      appType: lark.AppType.SelfBuild,
      domain: lark.Domain.Feishu,
    });
  }

  getClient(): lark.Client {
    return this.client;
  }

  async getTenantAccessToken(): Promise<string> {
    const now: number = Date.now();
    if (this.cachedToken && now < this.tokenExpireAt - TOKEN_REFRESH_AHEAD_MS) {
      return this.cachedToken;
    }
    const response: Response = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        app_id: FEISHU_APP_ID,
        app_secret: FEISHU_APP_SECRET,
      }),
    });
    const payload: {
      code?: number;
      msg?: string;
      tenant_access_token?: string;
      expire?: number;
    } = await response.json();
    if (payload.code !== 0 || !payload.tenant_access_token) {
      throw new Error(
        `获取 tenant_access_token 失败: code=${payload.code} msg=${payload.msg ?? ''}`,
      );
    }
    this.cachedToken = payload.tenant_access_token;
    this.tokenExpireAt = now + (payload.expire ?? 7200) * 1000;
    this.logger.log('tenant_access_token 已刷新');
    return this.cachedToken;
  }
}
