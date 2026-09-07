import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { and, asc, count, desc, eq, inArray } from 'drizzle-orm';
import {
  adCampaign,
  adPerformance,
  customer,
  sysConfig,
} from '@server/database/schema';
import type {
  AdCampaign,
  AdCampaignDetail,
  CampaignMetrics,
  CampaignStatus,
  PageResult,
  PerformanceDetailItem,
  PerformanceGranularity,
  PerformanceTrendItem,
} from '@shared/api.interface';

export interface ListCampaignsParams {
  status?: string;
  platform?: string;
  page: number;
  pageSize: number;
}

export interface CreateCampaignInput {
  name: string;
  customerId: string;
  platform: string;
  budget: number;
  startDate: string;
  endDate: string;
}

export type CampaignStatusAction = 'paused' | 'running' | 'finished';

const DEFAULT_COST_THRESHOLD: number = 5000;

const STATUS_TRANSITIONS: Record<CampaignStatus, CampaignStatus[]> = {
  preparing: ['running'],
  running: ['paused', 'finished'],
  paused: ['running'],
  finished: [],
};

@Injectable()
export class AdCampaignService {
  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
  ) {}

  async list(params: ListCampaignsParams): Promise<PageResult<AdCampaign>> {
    const page: number = Math.max(params.page, 1);
    const pageSize: number = Math.min(Math.max(params.pageSize, 1), 100);

    const conditions = [];
    if (params.status) conditions.push(eq(adCampaign.status, params.status));
    if (params.platform) {
      conditions.push(eq(adCampaign.platform, params.platform));
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = where
      ? await this.db
          .select()
          .from(adCampaign)
          .where(where)
          .orderBy(desc(adCampaign.createdAt))
          .limit(pageSize)
          .offset((page - 1) * pageSize)
      : await this.db
          .select()
          .from(adCampaign)
          .orderBy(desc(adCampaign.createdAt))
          .limit(pageSize)
          .offset((page - 1) * pageSize);

    const totalResult = where
      ? await this.db
          .select({ count: count() })
          .from(adCampaign)
          .where(where)
      : await this.db.select({ count: count() }).from(adCampaign);
    const total: number = Number(totalResult[0]?.count ?? 0);

    const nameMap: Map<string, string> = await this.buildCustomerNameMap(
      rows.map((row) => row.customerId),
    );

    const items: AdCampaign[] = rows.map((row) => ({
      id: row.id,
      name: row.name,
      customerId: row.customerId,
      customerName: nameMap.get(row.customerId) ?? '',
      platform: row.platform,
      budget: Number(row.budget),
      status: row.status as CampaignStatus,
      startDate: row.startDate ? row.startDate.toISOString() : '',
      endDate: row.endDate ? row.endDate.toISOString() : '',
    }));

    return { items, total };
  }

  async create(input: CreateCampaignInput): Promise<{ id: string }> {
    const inserted = await this.db
      .insert(adCampaign)
      .values({
        name: input.name,
        customerId: input.customerId,
        platform: input.platform,
        budget: String(input.budget),
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
      })
      .returning({ id: adCampaign.id });
    return { id: inserted[0].id };
  }

  async updateStatus(
    id: string,
    status: CampaignStatusAction,
  ): Promise<{ campaignName: string }> {
    const existing = await this.db
      .select({ id: adCampaign.id, name: adCampaign.name, status: adCampaign.status })
      .from(adCampaign)
      .where(eq(adCampaign.id, id));
    if (existing.length === 0) {
      throw new NotFoundException('投放项目不存在');
    }
    const current: CampaignStatus = existing[0].status as CampaignStatus;
    const allowed: CampaignStatus[] = STATUS_TRANSITIONS[current] ?? [];
    if (!allowed.includes(status)) {
      throw new BadRequestException(
        `当前状态「${current}」不允许变更为「${status}」`,
      );
    }

    const updated = await this.db
      .update(adCampaign)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(adCampaign.id, id), eq(adCampaign.status, current)))
      .returning({ id: adCampaign.id });
    if (updated.length === 0) {
      throw new BadRequestException('状态已发生变化，请刷新后重试');
    }
    return { campaignName: existing[0].name };
  }

  async getDetail(id: string): Promise<AdCampaignDetail> {
    const rows = await this.db
      .select()
      .from(adCampaign)
      .where(eq(adCampaign.id, id));
    if (rows.length === 0) {
      throw new NotFoundException('投放项目不存在');
    }
    const row = rows[0];
    const nameMap: Map<string, string> = await this.buildCustomerNameMap([
      row.customerId,
    ]);

    const perfRows = await this.db
      .select({
        impressions: adPerformance.impressions,
        clicks: adPerformance.clicks,
        conversions: adPerformance.conversions,
        cost: adPerformance.cost,
      })
      .from(adPerformance)
      .where(eq(adPerformance.campaignId, id));

    let impressions: number = 0;
    let clicks: number = 0;
    let conversions: number = 0;
    let cost: number = 0;
    for (const perf of perfRows) {
      impressions += perf.impressions;
      clicks += perf.clicks;
      conversions += perf.conversions;
      cost += Number(perf.cost);
    }
    const metrics: CampaignMetrics = {
      impressions,
      clicks,
      ctr: impressions > 0 ? Math.round((clicks / impressions) * 10000) / 100 : 0,
      conversions,
      cost: Math.round(cost * 100) / 100,
    };

    return {
      id: row.id,
      name: row.name,
      customerId: row.customerId,
      customerName: nameMap.get(row.customerId) ?? '',
      platform: row.platform,
      budget: Number(row.budget),
      status: row.status as CampaignStatus,
      startDate: row.startDate ? row.startDate.toISOString() : '',
      endDate: row.endDate ? row.endDate.toISOString() : '',
      metrics,
    };
  }

  async getPerformanceTrend(
    campaignId: string,
    granularity: PerformanceGranularity,
  ): Promise<{ items: PerformanceTrendItem[] }> {
    const rows = await this.db
      .select()
      .from(adPerformance)
      .where(eq(adPerformance.campaignId, campaignId))
      .orderBy(asc(adPerformance.statDate));

    const buckets: Map<string, PerformanceTrendItem> = new Map();
    for (const row of rows) {
      const period: string = this.toPeriodKey(row.statDate, granularity);
      const bucket: PerformanceTrendItem = buckets.get(period) ?? {
        period,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        cost: 0,
      };
      bucket.impressions += row.impressions;
      bucket.clicks += row.clicks;
      bucket.conversions += row.conversions;
      bucket.cost += Number(row.cost);
      buckets.set(period, bucket);
    }

    const items: PerformanceTrendItem[] = Array.from(buckets.values())
      .sort((a: PerformanceTrendItem, b: PerformanceTrendItem) =>
        a.period.localeCompare(b.period),
      )
      .map((item: PerformanceTrendItem) => ({
        ...item,
        cost: Math.round(item.cost * 100) / 100,
      }));
    return { items };
  }

  async getPerformanceDetails(
    campaignId: string,
    page: number,
    pageSize: number,
  ): Promise<PageResult<PerformanceDetailItem>> {
    const currentPage: number = Math.max(page, 1);
    const size: number = Math.min(Math.max(pageSize, 1), 100);

    const totalResult = await this.db
      .select({ count: count() })
      .from(adPerformance)
      .where(eq(adPerformance.campaignId, campaignId));
    const total: number = Number(totalResult[0]?.count ?? 0);

    const rows = await this.db
      .select()
      .from(adPerformance)
      .where(eq(adPerformance.campaignId, campaignId))
      .orderBy(desc(adPerformance.statDate))
      .limit(size)
      .offset((currentPage - 1) * size);

    const threshold: number = await this.getCostThreshold();

    const items: PerformanceDetailItem[] = rows.map((row) => {
      const cost: number = Number(row.cost);
      return {
        id: row.id,
        statDate: row.statDate.toISOString().slice(0, 10),
        impressions: row.impressions,
        clicks: row.clicks,
        ctr:
          row.impressions > 0
            ? Math.round((row.clicks / row.impressions) * 10000) / 100
            : 0,
        conversions: row.conversions,
        cost: Math.round(cost * 100) / 100,
        overThreshold: cost >= threshold,
      };
    });

    return { items, total };
  }

  private async buildCustomerNameMap(
    customerIds: string[],
  ): Promise<Map<string, string>> {
    const ids: string[] = Array.from(new Set(customerIds));
    const nameMap: Map<string, string> = new Map();
    if (ids.length === 0) {
      return nameMap;
    }
    const customers = await this.db
      .select({ id: customer.id, name: customer.name })
      .from(customer)
      .where(inArray(customer.id, ids));
    for (const c of customers) {
      nameMap.set(c.id, c.name);
    }
    return nameMap;
  }

  private async getCostThreshold(): Promise<number> {
    const rows = await this.db
      .select({ configValue: sysConfig.configValue })
      .from(sysConfig)
      .where(eq(sysConfig.configKey, 'ad_cost_threshold'));
    if (rows.length === 0) {
      return DEFAULT_COST_THRESHOLD;
    }
    const parsed: number = Number(rows[0].configValue);
    return Number.isFinite(parsed) ? parsed : DEFAULT_COST_THRESHOLD;
  }

  private toPeriodKey(
    date: Date,
    granularity: PerformanceGranularity,
  ): string {
    const year: number = date.getFullYear();
    const month: string = String(date.getMonth() + 1).padStart(2, '0');
    if (granularity === 'month') {
      return `${year}-${month}`;
    }
    const day: string = String(date.getDate()).padStart(2, '0');
    if (granularity === 'day') {
      return `${year}-${month}-${day}`;
    }
    return this.getIsoWeekKey(date);
  }

  private getIsoWeekKey(date: Date): string {
    const target: Date = new Date(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
    );
    const dayNum: number = target.getUTCDay() || 7;
    target.setUTCDate(target.getUTCDate() + 4 - dayNum);
    const yearStart: number = Date.UTC(target.getUTCFullYear(), 0, 1);
    const weekNo: number = Math.ceil(
      ((target.getTime() - yearStart) / 86400000 + 1) / 7,
    );
    return `${target.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
  }
}
