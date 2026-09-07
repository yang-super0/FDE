import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  isNull,
  lte,
  sql,
  type SQL,
} from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';
import type {
  IndustryTrendAlertItem,
  IndustryTrendComparisonItem,
  IndustryTrendCreateDto,
  IndustryTrendListParams,
  IndustryTrendPoint,
  IndustryTrendRecord,
  IndustryTrendStats,
  IndustryTrendUpdateDto,
} from '@shared/api.interface';
import { industryTrends } from '@server/database/schema';
import { insertWithSeqNo } from '@server/modules/finance-core/fin-seq.util';
import {
  assertSupportEnhanceDate,
  resolveSupportEnhancePagination,
  resolveSupportEnhanceSortColumn,
  resolveSupportEnhanceSortOrder,
  toSupportEnhanceIso,
  toSupportEnhanceNumber,
} from './support-enhance-shared.util';
import { publishSyncEvent } from '@server/modules/feishu-sync/sync-event.publisher';

type TrendRow = typeof industryTrends.$inferSelect;
type TrendInsert = typeof industryTrends.$inferInsert;

export interface IndustryTrendListResponse {
  items: IndustryTrendRecord[];
  total: number;
  page: number;
  pageSize: number;
}

const TREND_NO_PREFIX: string = 'DP';
const TREND_DATA_SOURCE_DEFAULT: string = '平台公开';
const TREND_GRANULARITIES: string[] = ['日', '周', '月', '季', '年'];
const GRANULARITY_DEFAULT: string = '日';
const ALERT_MAX_COUNT: number = 20;
const CPC_CHANGE_THRESHOLD: number = 10;
const CPM_CHANGE_THRESHOLD: number = 10;
const CONSUMPTION_GROWTH_THRESHOLD: number = 20;

const TREND_SORT_COLUMNS: Record<string, PgColumn> = {
  statDate: industryTrends.statDate,
  createdAt: industryTrends.createdAt,
  totalConsumption: industryTrends.totalConsumption,
};

/** 数值列写入转换：numeric 列 insert 侧为 string，null 透传 */
function toNumericString(
  value: number | string | null | undefined,
): string | null {
  const num: number | null = toSupportEnhanceNumber(value);
  return num === null ? null : String(num);
}

function mapTrendRow(row: TrendRow): IndustryTrendRecord {
  return {
    id: row.id,
    trendNo: row.trendNo,
    industry: row.industry,
    subIndustry: row.subIndustry,
    platform: row.platform,
    statDate: row.statDate,
    totalConsumption: toSupportEnhanceNumber(row.totalConsumption),
    consumptionGrowth: toSupportEnhanceNumber(row.consumptionGrowth),
    avgCpc: toSupportEnhanceNumber(row.avgCpc),
    cpcChange: toSupportEnhanceNumber(row.cpcChange),
    avgCpm: toSupportEnhanceNumber(row.avgCpm),
    cpmChange: toSupportEnhanceNumber(row.cpmChange),
    avgConversionRate: toSupportEnhanceNumber(row.avgConversionRate),
    conversionChange: toSupportEnhanceNumber(row.conversionChange),
    activeAdvertisers: row.activeAdvertisers,
    advertiserGrowth: toSupportEnhanceNumber(row.advertiserGrowth),
    trafficIndex: toSupportEnhanceNumber(row.trafficIndex),
    competitionIndex: toSupportEnhanceNumber(row.competitionIndex),
    dataSource: row.dataSource,
    remark: row.remark,
    createdAt: toSupportEnhanceIso(row.createdAt),
    updatedAt: toSupportEnhanceIso(row.updatedAt),
  };
}

@Injectable()
export class IndustryTrendsService {
  private readonly logger = new Logger(IndustryTrendsService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async list(
    params: IndustryTrendListParams,
  ): Promise<IndustryTrendListResponse> {
    const { page, pageSize, offset } = resolveSupportEnhancePagination(
      params.page,
      params.pageSize,
    );
    const conditions: SQL[] = [isNull(industryTrends.deletedAt)];
    if (params.industry) {
      conditions.push(eq(industryTrends.industry, params.industry));
    }
    if (params.platform) {
      conditions.push(eq(industryTrends.platform, params.platform));
    }
    if (params.dateFrom) {
      conditions.push(
        gte(
          industryTrends.statDate,
          assertSupportEnhanceDate(params.dateFrom, '开始日期'),
        ),
      );
    }
    if (params.dateTo) {
      conditions.push(
        lte(
          industryTrends.statDate,
          assertSupportEnhanceDate(params.dateTo, '结束日期'),
        ),
      );
    }
    const where: SQL = and(...conditions);

    const totalRows: { count: number }[] = await this.db
      .select({ count: count() })
      .from(industryTrends)
      .where(where);
    const total: number = Number(totalRows[0]?.count ?? 0);

    const sortColumn: PgColumn =
      resolveSupportEnhanceSortColumn(params.sortBy, TREND_SORT_COLUMNS) ??
      industryTrends.statDate;
    const sortOrder: 'asc' | 'desc' = resolveSupportEnhanceSortOrder(
      params.sortOrder,
    );
    const rows: TrendRow[] = await this.db
      .select()
      .from(industryTrends)
      .where(where)
      .orderBy(sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn))
      .limit(pageSize)
      .offset(offset);
    return {
      items: rows.map((row: TrendRow) => mapTrendRow(row)),
      total,
      page,
      pageSize,
    };
  }

  async stats(): Promise<IndustryTrendStats> {
    const aggRows: {
      totalRecords: string | number;
      industryCount: string | number;
      totalConsumption: string | null;
      avgCpc: string | null;
      avgCpm: string | null;
      avgConversionRate: string | null;
    }[] = await this.db
      .select({
        totalRecords: sql<string | number>`count(*)`,
        industryCount: sql<
          string | number
        >`count(distinct ${industryTrends.industry})`,
        totalConsumption: sql<
          string | null
        >`coalesce(sum(${industryTrends.totalConsumption}), 0)`,
        avgCpc: sql<string | null>`avg(${industryTrends.avgCpc})`,
        avgCpm: sql<string | null>`avg(${industryTrends.avgCpm})`,
        avgConversionRate: sql<
          string | null
        >`avg(${industryTrends.avgConversionRate})`,
      })
      .from(industryTrends)
      .where(isNull(industryTrends.deletedAt));
    const agg = aggRows[0];

    const alertRows: {
      industry: string;
      statDate: string;
      cpcChange: string | null;
      cpmChange: string | null;
      consumptionGrowth: string | null;
    }[] = await this.db
      .select({
        industry: industryTrends.industry,
        statDate: industryTrends.statDate,
        cpcChange: industryTrends.cpcChange,
        cpmChange: industryTrends.cpmChange,
        consumptionGrowth: industryTrends.consumptionGrowth,
      })
      .from(industryTrends)
      .where(isNull(industryTrends.deletedAt))
      .orderBy(desc(industryTrends.statDate));

    const alerts: IndustryTrendAlertItem[] = [];
    for (
      let index: number = 0;
      index < alertRows.length && alerts.length < ALERT_MAX_COUNT;
      index += 1
    ) {
      const row = alertRows[index];
      const cpcChange: number | null = toSupportEnhanceNumber(row.cpcChange);
      const cpmChange: number | null = toSupportEnhanceNumber(row.cpmChange);
      const consumptionGrowth: number | null = toSupportEnhanceNumber(
        row.consumptionGrowth,
      );
      if (cpcChange !== null && Math.abs(cpcChange) > CPC_CHANGE_THRESHOLD) {
        alerts.push({
          industry: row.industry,
          alertType: 'CPC大幅变化',
          message: `CPC变化幅度 ${String(cpcChange)}%，超过阈值 ${String(
            CPC_CHANGE_THRESHOLD,
          )}%`,
          statDate: row.statDate,
        });
      }
      if (
        alerts.length < ALERT_MAX_COUNT &&
        cpmChange !== null &&
        Math.abs(cpmChange) > CPM_CHANGE_THRESHOLD
      ) {
        alerts.push({
          industry: row.industry,
          alertType: 'CPM大幅变化',
          message: `CPM变化幅度 ${String(cpmChange)}%，超过阈值 ${String(
            CPM_CHANGE_THRESHOLD,
          )}%`,
          statDate: row.statDate,
        });
      }
      if (
        alerts.length < ALERT_MAX_COUNT &&
        consumptionGrowth !== null &&
        Math.abs(consumptionGrowth) > CONSUMPTION_GROWTH_THRESHOLD
      ) {
        alerts.push({
          industry: row.industry,
          alertType: '消耗异常波动',
          message: `消耗环比波动 ${String(
            consumptionGrowth,
          )}%，超过阈值 ${String(CONSUMPTION_GROWTH_THRESHOLD)}%`,
          statDate: row.statDate,
        });
      }
    }

    return {
      totalRecords: Number(agg?.totalRecords ?? 0),
      industryCount: Number(agg?.industryCount ?? 0),
      totalConsumption: toSupportEnhanceNumber(agg?.totalConsumption) ?? 0,
      avgCpc: toSupportEnhanceNumber(agg?.avgCpc) ?? 0,
      avgCpm: toSupportEnhanceNumber(agg?.avgCpm) ?? 0,
      avgConversionRate: toSupportEnhanceNumber(agg?.avgConversionRate) ?? 0,
      alerts,
    };
  }

  async series(
    industry: string | undefined,
    platform: string | undefined,
    granularity: string | undefined,
  ): Promise<IndustryTrendPoint[]> {
    if (!industry) {
      throw new BadRequestException('行业为必填参数');
    }
    const granularityValue: string =
      granularity && TREND_GRANULARITIES.includes(granularity)
        ? granularity
        : GRANULARITY_DEFAULT;

    const groupExpr: SQL<string> =
      granularityValue === '日'
        ? sql<string>`to_char(${industryTrends.statDate}, 'YYYY-MM-DD')`
        : granularityValue === '周'
          ? sql<string>`to_char(date_trunc('week', ${industryTrends.statDate}), 'YYYY-MM-DD')`
          : granularityValue === '月'
            ? sql<string>`to_char(${industryTrends.statDate}, 'YYYY-MM')`
            : granularityValue === '季'
              ? sql<string>`to_char(${industryTrends.statDate}, 'YYYY-"Q"Q')`
              : sql<string>`to_char(${industryTrends.statDate}, 'YYYY')`;

    const conditions: SQL[] = [
      isNull(industryTrends.deletedAt),
      eq(industryTrends.industry, industry),
    ];
    if (platform) {
      conditions.push(eq(industryTrends.platform, platform));
    }

    const rows: {
      statDate: string;
      totalConsumption: string | null;
      avgCpc: string | null;
      avgCpm: string | null;
      avgConversionRate: string | null;
      activeAdvertisers: string | null;
      trafficIndex: string | null;
      competitionIndex: string | null;
    }[] = await this.db
      .select({
        statDate: groupExpr,
        totalConsumption: sql<
          string | null
        >`coalesce(sum(${industryTrends.totalConsumption}), 0)`,
        avgCpc: sql<string | null>`coalesce(avg(${industryTrends.avgCpc}), 0)`,
        avgCpm: sql<string | null>`coalesce(avg(${industryTrends.avgCpm}), 0)`,
        avgConversionRate: sql<
          string | null
        >`coalesce(avg(${industryTrends.avgConversionRate}), 0)`,
        activeAdvertisers: sql<
          string | null
        >`coalesce(avg(${industryTrends.activeAdvertisers}), 0)`,
        trafficIndex: sql<
          string | null
        >`coalesce(avg(${industryTrends.trafficIndex}), 0)`,
        competitionIndex: sql<
          string | null
        >`coalesce(avg(${industryTrends.competitionIndex}), 0)`,
      })
      .from(industryTrends)
      .where(and(...conditions))
      .groupBy(groupExpr)
      .orderBy(asc(groupExpr));

    return rows.map(
      (
        row: {
          statDate: string;
          totalConsumption: string | null;
          avgCpc: string | null;
          avgCpm: string | null;
          avgConversionRate: string | null;
          activeAdvertisers: string | null;
          trafficIndex: string | null;
          competitionIndex: string | null;
        },
      ): IndustryTrendPoint => ({
        statDate: row.statDate,
        totalConsumption: toSupportEnhanceNumber(row.totalConsumption) ?? 0,
        avgCpc: toSupportEnhanceNumber(row.avgCpc) ?? 0,
        avgCpm: toSupportEnhanceNumber(row.avgCpm) ?? 0,
        avgConversionRate: toSupportEnhanceNumber(row.avgConversionRate) ?? 0,
        activeAdvertisers: toSupportEnhanceNumber(row.activeAdvertisers) ?? 0,
        trafficIndex: toSupportEnhanceNumber(row.trafficIndex) ?? 0,
        competitionIndex: toSupportEnhanceNumber(row.competitionIndex) ?? 0,
      }),
    );
  }

  async comparisonByIndustry(
    platform: string | undefined,
  ): Promise<IndustryTrendComparisonItem[]> {
    const conditions: SQL[] = [isNull(industryTrends.deletedAt)];
    if (platform) {
      conditions.push(eq(industryTrends.platform, platform));
    }
    const rows: {
      industry: string;
      totalConsumption: string | null;
      avgCpc: string | null;
      avgCpm: string | null;
      avgConversionRate: string | null;
    }[] = await this.db
      .select({
        industry: industryTrends.industry,
        totalConsumption: sql<
          string | null
        >`coalesce(sum(${industryTrends.totalConsumption}), 0)`,
        avgCpc: sql<string | null>`coalesce(avg(${industryTrends.avgCpc}), 0)`,
        avgCpm: sql<string | null>`coalesce(avg(${industryTrends.avgCpm}), 0)`,
        avgConversionRate: sql<
          string | null
        >`coalesce(avg(${industryTrends.avgConversionRate}), 0)`,
      })
      .from(industryTrends)
      .where(and(...conditions))
      .groupBy(industryTrends.industry);
    return rows.map(
      (
        row: {
          industry: string;
          totalConsumption: string | null;
          avgCpc: string | null;
          avgCpm: string | null;
          avgConversionRate: string | null;
        },
      ): IndustryTrendComparisonItem => ({
        industry: row.industry,
        totalConsumption: toSupportEnhanceNumber(row.totalConsumption) ?? 0,
        avgCpc: toSupportEnhanceNumber(row.avgCpc) ?? 0,
        avgCpm: toSupportEnhanceNumber(row.avgCpm) ?? 0,
        avgConversionRate: toSupportEnhanceNumber(row.avgConversionRate) ?? 0,
      }),
    );
  }

  async comparisonByPlatform(
    industry: string | undefined,
  ): Promise<IndustryTrendComparisonItem[]> {
    const conditions: SQL[] = [isNull(industryTrends.deletedAt)];
    if (industry) {
      conditions.push(eq(industryTrends.industry, industry));
    }
    const rows: {
      platform: string | null;
      totalConsumption: string | null;
      avgCpc: string | null;
      avgCpm: string | null;
      avgConversionRate: string | null;
    }[] = await this.db
      .select({
        platform: industryTrends.platform,
        totalConsumption: sql<
          string | null
        >`coalesce(sum(${industryTrends.totalConsumption}), 0)`,
        avgCpc: sql<string | null>`coalesce(avg(${industryTrends.avgCpc}), 0)`,
        avgCpm: sql<string | null>`coalesce(avg(${industryTrends.avgCpm}), 0)`,
        avgConversionRate: sql<
          string | null
        >`coalesce(avg(${industryTrends.avgConversionRate}), 0)`,
      })
      .from(industryTrends)
      .where(and(...conditions))
      .groupBy(industryTrends.platform);
    return rows.map(
      (
        row: {
          platform: string | null;
          totalConsumption: string | null;
          avgCpc: string | null;
          avgCpm: string | null;
          avgConversionRate: string | null;
        },
      ): IndustryTrendComparisonItem => ({
        industry: row.platform ?? '',
        totalConsumption: toSupportEnhanceNumber(row.totalConsumption) ?? 0,
        avgCpc: toSupportEnhanceNumber(row.avgCpc) ?? 0,
        avgCpm: toSupportEnhanceNumber(row.avgCpm) ?? 0,
        avgConversionRate: toSupportEnhanceNumber(row.avgConversionRate) ?? 0,
      }),
    );
  }

  private async findRowOrThrow(id: number): Promise<TrendRow> {
    const rows: TrendRow[] = await this.db
      .select()
      .from(industryTrends)
      .where(
        and(
          eq(industryTrends.id, id),
          isNull(industryTrends.deletedAt),
        ),
      );
    if (rows.length === 0) {
      throw new NotFoundException('行业大盘记录不存在');
    }
    return rows[0];
  }

  async findById(id: number): Promise<IndustryTrendRecord> {
    const row: TrendRow = await this.findRowOrThrow(id);
    return mapTrendRow(row);
  }

  async create(
    dto: IndustryTrendCreateDto,
    userId: string,
  ): Promise<IndustryTrendRecord> {
    if (!dto?.industry || !dto?.statDate) {
      throw new BadRequestException('行业与统计日期为必填项');
    }
    const statDate: string = assertSupportEnhanceDate(
      dto.statDate,
      '统计日期',
    );
    const { row } = await insertWithSeqNo<TrendRow>({
      db: this.db,
      table: industryTrends,
      noColumn: industryTrends.trendNo,
      prefix: TREND_NO_PREFIX,
      insert: (no: string) =>
        this.db
          .insert(industryTrends)
          .values({
            trendNo: no,
            industry: dto.industry,
            subIndustry: dto.subIndustry ?? null,
            platform: dto.platform ?? null,
            statDate,
            totalConsumption: toNumericString(dto.totalConsumption),
            consumptionGrowth: toNumericString(dto.consumptionGrowth),
            avgCpc: toNumericString(dto.avgCpc),
            cpcChange: toNumericString(dto.cpcChange),
            avgCpm: toNumericString(dto.avgCpm),
            cpmChange: toNumericString(dto.cpmChange),
            avgConversionRate: toNumericString(dto.avgConversionRate),
            conversionChange: toNumericString(dto.conversionChange),
            activeAdvertisers: dto.activeAdvertisers ?? null,
            advertiserGrowth: toNumericString(dto.advertiserGrowth),
            trafficIndex: toNumericString(dto.trafficIndex),
            competitionIndex: toNumericString(dto.competitionIndex),
            dataSource: dto.dataSource ?? TREND_DATA_SOURCE_DEFAULT,
            remark: dto.remark ?? null,
            createdBy: userId,
            updatedBy: userId,
          })
          .returning(),
    });
    publishSyncEvent('industry_trends', row.id, 'create');
    this.logger.log(
      `行业大盘记录创建成功 id=${String(row.id)} trendNo=${row.trendNo}`,
    );
    return mapTrendRow(row);
  }

  async update(
    id: number,
    dto: IndustryTrendUpdateDto,
    userId: string,
  ): Promise<IndustryTrendRecord> {
    const patch: Partial<TrendInsert> = {};
    if (dto?.industry !== undefined) patch.industry = dto.industry;
    if (dto?.subIndustry !== undefined) {
      patch.subIndustry = dto.subIndustry;
    }
    if (dto?.platform !== undefined) patch.platform = dto.platform;
    if (dto?.statDate !== undefined) {
      patch.statDate = assertSupportEnhanceDate(dto.statDate, '统计日期');
    }
    if (dto?.totalConsumption !== undefined) {
      patch.totalConsumption = toNumericString(dto.totalConsumption);
    }
    if (dto?.consumptionGrowth !== undefined) {
      patch.consumptionGrowth = toNumericString(dto.consumptionGrowth);
    }
    if (dto?.avgCpc !== undefined) {
      patch.avgCpc = toNumericString(dto.avgCpc);
    }
    if (dto?.cpcChange !== undefined) {
      patch.cpcChange = toNumericString(dto.cpcChange);
    }
    if (dto?.avgCpm !== undefined) {
      patch.avgCpm = toNumericString(dto.avgCpm);
    }
    if (dto?.cpmChange !== undefined) {
      patch.cpmChange = toNumericString(dto.cpmChange);
    }
    if (dto?.avgConversionRate !== undefined) {
      patch.avgConversionRate = toNumericString(dto.avgConversionRate);
    }
    if (dto?.conversionChange !== undefined) {
      patch.conversionChange = toNumericString(dto.conversionChange);
    }
    if (dto?.activeAdvertisers !== undefined) {
      patch.activeAdvertisers = dto.activeAdvertisers;
    }
    if (dto?.advertiserGrowth !== undefined) {
      patch.advertiserGrowth = toNumericString(dto.advertiserGrowth);
    }
    if (dto?.trafficIndex !== undefined) {
      patch.trafficIndex = toNumericString(dto.trafficIndex);
    }
    if (dto?.competitionIndex !== undefined) {
      patch.competitionIndex = toNumericString(dto.competitionIndex);
    }
    if (dto?.dataSource !== undefined) patch.dataSource = dto.dataSource;
    if (dto?.remark !== undefined) patch.remark = dto.remark;
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }
    patch.updatedAt = new Date();
    patch.updatedBy = userId;
    const updated: TrendRow[] = await this.db
      .update(industryTrends)
      .set(patch)
      .where(
        and(eq(industryTrends.id, id), isNull(industryTrends.deletedAt)),
      )
      .returning();
    if (updated.length === 0) {
      throw new NotFoundException('行业大盘记录不存在');
    }
    publishSyncEvent('industry_trends', id, 'update');
    return mapTrendRow(updated[0]);
  }

  async remove(id: number, userId: string): Promise<{ deleted: boolean }> {
    const updated: { id: number }[] = await this.db
      .update(industryTrends)
      .set({ deletedAt: new Date(), updatedBy: userId })
      .where(
        and(eq(industryTrends.id, id), isNull(industryTrends.deletedAt)),
      )
      .returning({ id: industryTrends.id });
    if (updated.length === 0) {
      throw new NotFoundException('行业大盘记录不存在');
    }
    publishSyncEvent('industry_trends', id, 'delete');
    return { deleted: true };
  }
}
