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
  inArray,
  isNull,
  like,
  lt,
  sql,
  type SQL,
} from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { competitorMonitoring } from '@server/database/schema';
import type {
  CompetitorAlertItem,
  CompetitorComparisonItem,
  CompetitorCreateDto,
  CompetitorListParams,
  CompetitorMonitoring,
  CompetitorMonitoringStats,
  CompetitorRankItem,
  CompetitorTrendPoint,
  CompetitorUpdateDto,
} from '@shared/api.interface';
import { insertWithSeqNo } from '../finance-core/fin-seq.util';
import {
  assertSupportEnhanceDate,
  toSupportEnhanceIso,
  toSupportEnhanceNumber,
  resolveSupportEnhancePagination,
  resolveSupportEnhanceSortColumn,
  resolveSupportEnhanceSortOrder,
} from './support-enhance-shared.util';

type CompetitorRow = typeof competitorMonitoring.$inferSelect;
type CompetitorInsert = typeof competitorMonitoring.$inferInsert;

export interface CompetitorMonitoringPage {
  items: CompetitorMonitoring[];
  total: number;
  page: number;
  pageSize: number;
}

const COMPETITOR_NO_PREFIX: string = 'JP';
const COMPETITOR_ALERT_MAX: number = 20;
const COMPETITOR_RANKING_MAX: number = 20;
const CONSUMPTION_ALERT_THRESHOLD: number = 30;
const ROI_ALERT_THRESHOLD: number = 0.5;
const DEFAULT_DATA_SOURCE: string = '人工估算';
const DEFAULT_CONFIDENCE: string = '中';

const COMPETITOR_SORT_COLUMNS: Record<string, AnyPgColumn> = {
  monitorDate: competitorMonitoring.monitorDate,
  createdAt: competitorMonitoring.createdAt,
  estimatedConsumption: competitorMonitoring.estimatedConsumption,
};

const mapStringArray = (value: unknown): string[] | null => {
  if (!Array.isArray(value)) {
    return null;
  }
  return value.filter((item: unknown): item is string => typeof item === 'string');
};

const addOneDay = (value: string): string => {
  const date: Date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
};

export function mapCompetitorMonitoring(row: CompetitorRow): CompetitorMonitoring {
  return {
    id: row.id,
    monitorNo: row.monitorNo,
    competitorName: row.competitorName,
    competitorIndustry: row.competitorIndustry,
    platform: row.platform,
    monitorDate: row.monitorDate,
    estimatedConsumption: toSupportEnhanceNumber(row.estimatedConsumption),
    estimatedRoi: toSupportEnhanceNumber(row.estimatedRoi),
    adCount: row.adCount,
    creativeCount: row.creativeCount,
    mainProducts: row.mainProducts,
    targetAudience: row.targetAudience,
    landingPageType: row.landingPageType,
    keywords: mapStringArray(row.keywords),
    strengths: row.strengths,
    weaknesses: row.weaknesses,
    opportunities: row.opportunities,
    threats: row.threats,
    dataSource: row.dataSource,
    confidence: row.confidence,
    remark: row.remark,
    createdAt: toSupportEnhanceIso(row.createdAt),
    updatedAt: toSupportEnhanceIso(row.updatedAt),
  };
}

@Injectable()
export class CompetitorMonitoringService {
  private readonly logger = new Logger(CompetitorMonitoringService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
  ) {}

  private buildListConditions(params: CompetitorListParams): SQL | undefined {
    const conditions: (SQL | undefined)[] = [
      isNull(competitorMonitoring.deletedAt),
    ];
    if (params.competitorName) {
      conditions.push(
        like(
          competitorMonitoring.competitorName,
          `%${params.competitorName}%`,
        ),
      );
    }
    if (params.competitorIndustry) {
      conditions.push(
        eq(
          competitorMonitoring.competitorIndustry,
          params.competitorIndustry,
        ),
      );
    }
    if (params.platform) {
      conditions.push(eq(competitorMonitoring.platform, params.platform));
    }
    if (params.confidence) {
      conditions.push(eq(competitorMonitoring.confidence, params.confidence));
    }
    if (params.dateFrom) {
      conditions.push(
        gte(
          competitorMonitoring.monitorDate,
          assertSupportEnhanceDate(params.dateFrom, '开始日期'),
        ),
      );
    }
    if (params.dateTo) {
      conditions.push(
        lt(
          competitorMonitoring.monitorDate,
          addOneDay(assertSupportEnhanceDate(params.dateTo, '结束日期')),
        ),
      );
    }
    return and(...conditions);
  }

  async list(params: CompetitorListParams): Promise<CompetitorMonitoringPage> {
    const pagination = resolveSupportEnhancePagination(
      params.page,
      params.pageSize,
    );
    const where: SQL | undefined = this.buildListConditions(params);
    const totalRows: { count: number | string }[] = await this.db
      .select({ count: count() })
      .from(competitorMonitoring)
      .where(where);
    const sortColumn: AnyPgColumn =
      resolveSupportEnhanceSortColumn(
        params.sortBy,
        COMPETITOR_SORT_COLUMNS,
      ) ?? competitorMonitoring.monitorDate;
    const rows: CompetitorRow[] = await this.db
      .select()
      .from(competitorMonitoring)
      .where(where)
      .orderBy(
        resolveSupportEnhanceSortOrder(params.sortOrder) === 'asc'
          ? asc(sortColumn)
          : desc(sortColumn),
      )
      .limit(pagination.pageSize)
      .offset(pagination.offset);
    return {
      items: rows.map((row: CompetitorRow) => mapCompetitorMonitoring(row)),
      total: Number(totalRows[0]?.count ?? 0),
      page: pagination.page,
      pageSize: pagination.pageSize,
    };
  }

  async getStats(): Promise<CompetitorMonitoringStats> {
    const aggRows: {
      totalMonitors: number | string;
      competitorCount: number | string;
      totalEstimatedConsumption: string | null;
      avgEstimatedRoi: string | null;
    }[] = await this.db
      .select({
        totalMonitors: count(),
        competitorCount: sql<number | string>`count(distinct ${competitorMonitoring.competitorName})`,
        totalEstimatedConsumption: sql<
          string | null
        >`coalesce(sum(${competitorMonitoring.estimatedConsumption}), 0)`,
        avgEstimatedRoi: sql<
          string | null
        >`coalesce(avg(${competitorMonitoring.estimatedRoi}), 0)`,
      })
      .from(competitorMonitoring)
      .where(isNull(competitorMonitoring.deletedAt));
    const agg = aggRows[0];

    const confidenceRows: {
      confidence: string;
      count: number | string;
    }[] = await this.db
      .select({
        confidence: competitorMonitoring.confidence,
        count: count(),
      })
      .from(competitorMonitoring)
      .where(isNull(competitorMonitoring.deletedAt))
      .groupBy(competitorMonitoring.confidence);

    const alertRows: {
      competitorName: string;
      monitorDate: string;
      estimatedConsumption: string | null;
      estimatedRoi: string | null;
    }[] = await this.db
      .select({
        competitorName: competitorMonitoring.competitorName,
        monitorDate: competitorMonitoring.monitorDate,
        estimatedConsumption: competitorMonitoring.estimatedConsumption,
        estimatedRoi: competitorMonitoring.estimatedRoi,
      })
      .from(competitorMonitoring)
      .where(isNull(competitorMonitoring.deletedAt))
      .orderBy(
        asc(competitorMonitoring.competitorName),
        asc(competitorMonitoring.monitorDate),
        asc(competitorMonitoring.id),
      );

    const byCompetitor = new Map<string, typeof alertRows>();
    for (const row of alertRows) {
      const list: typeof alertRows = byCompetitor.get(row.competitorName) ?? [];
      list.push(row);
      byCompetitor.set(row.competitorName, list);
    }

    const alerts: CompetitorAlertItem[] = [];
    for (const [name, records] of byCompetitor) {
      if (records.length < 2 || alerts.length >= COMPETITOR_ALERT_MAX) {
        continue;
      }
      const prev = records[records.length - 2];
      const curr = records[records.length - 1];
      const prevConsumption: number | null = toSupportEnhanceNumber(
        prev.estimatedConsumption,
      );
      const currConsumption: number | null = toSupportEnhanceNumber(
        curr.estimatedConsumption,
      );
      if (
        prevConsumption !== null &&
        prevConsumption > 0 &&
        currConsumption !== null
      ) {
        const growth: number =
          ((currConsumption - prevConsumption) / prevConsumption) * 100;
        if (growth > CONSUMPTION_ALERT_THRESHOLD) {
          alerts.push({
            competitorName: name,
            alertType: '消耗异常增长',
            message: `预估消耗由 ${String(prevConsumption)} 增长至 ${String(currConsumption)}，涨幅 ${growth.toFixed(1)}%`,
            monitorDate: curr.monitorDate,
          });
        }
      }
      const prevRoi: number | null = toSupportEnhanceNumber(
        prev.estimatedRoi,
      );
      const currRoi: number | null = toSupportEnhanceNumber(
        curr.estimatedRoi,
      );
      if (prevRoi !== null && currRoi !== null) {
        const delta: number = currRoi - prevRoi;
        if (Math.abs(delta) > ROI_ALERT_THRESHOLD) {
          alerts.push({
            competitorName: name,
            alertType: 'ROI异常变化',
            message: `预估 ROI 由 ${String(prevRoi)} 变化至 ${String(currRoi)}，变动 ${delta.toFixed(2)}`,
            monitorDate: curr.monitorDate,
          });
        }
      }
    }

    return {
      totalMonitors: Number(agg?.totalMonitors ?? 0),
      competitorCount: Number(agg?.competitorCount ?? 0),
      totalEstimatedConsumption:
        toSupportEnhanceNumber(agg?.totalEstimatedConsumption) ?? 0,
      avgEstimatedRoi: toSupportEnhanceNumber(agg?.avgEstimatedRoi) ?? 0,
      byConfidence: confidenceRows.map(
        (row: { confidence: string; count: number | string }) => ({
          name: row.confidence,
          count: Number(row.count),
        }),
      ),
      alerts: alerts.slice(0, COMPETITOR_ALERT_MAX),
    };
  }

  async getComparison(names?: string): Promise<CompetitorComparisonItem[]> {
    const nameList: string[] = (names ?? '')
      .split(',')
      .map((item: string): string => item.trim())
      .filter((item: string): boolean => item !== '');
    const conditions: SQL[] = [isNull(competitorMonitoring.deletedAt)];
    if (nameList.length > 0) {
      conditions.push(inArray(competitorMonitoring.competitorName, nameList));
    }
    const rows: {
      competitorName: string;
      monitorDate: string;
      estimatedConsumption: string | null;
      estimatedRoi: string | null;
      adCount: number | null;
      creativeCount: number | null;
    }[] = await this.db
      .select({
        competitorName: competitorMonitoring.competitorName,
        monitorDate: competitorMonitoring.monitorDate,
        estimatedConsumption: competitorMonitoring.estimatedConsumption,
        estimatedRoi: competitorMonitoring.estimatedRoi,
        adCount: competitorMonitoring.adCount,
        creativeCount: competitorMonitoring.creativeCount,
      })
      .from(competitorMonitoring)
      .where(and(...conditions))
      .orderBy(
        asc(competitorMonitoring.monitorDate),
        asc(competitorMonitoring.id),
      );

    const latestByName = new Map<string, (typeof rows)[number]>();
    const countByName = new Map<string, number>();
    for (const row of rows) {
      latestByName.set(row.competitorName, row);
      countByName.set(
        row.competitorName,
        (countByName.get(row.competitorName) ?? 0) + 1,
      );
    }

    const items: CompetitorComparisonItem[] = [];
    for (const [name, latest] of latestByName) {
      items.push({
        competitorName: name,
        estimatedConsumption:
          toSupportEnhanceNumber(latest.estimatedConsumption) ?? 0,
        estimatedRoi: toSupportEnhanceNumber(latest.estimatedRoi) ?? 0,
        adCount: latest.adCount ?? 0,
        creativeCount: latest.creativeCount ?? 0,
        monitorCount: countByName.get(name) ?? 0,
      });
    }
    return items;
  }

  async getTrend(name?: string): Promise<CompetitorTrendPoint[]> {
    const competitorName: string = (name ?? '').trim();
    if (competitorName === '') {
      throw new BadRequestException('竞品名称不能为空');
    }
    const rows: {
      monitorDate: string;
      estimatedConsumption: string | null;
      estimatedRoi: string | null;
    }[] = await this.db
      .select({
        monitorDate: competitorMonitoring.monitorDate,
        estimatedConsumption: competitorMonitoring.estimatedConsumption,
        estimatedRoi: competitorMonitoring.estimatedRoi,
      })
      .from(competitorMonitoring)
      .where(
        and(
          eq(competitorMonitoring.competitorName, competitorName),
          isNull(competitorMonitoring.deletedAt),
        ),
      )
      .orderBy(
        asc(competitorMonitoring.monitorDate),
        asc(competitorMonitoring.id),
      );
    return rows.map(
      (row): CompetitorTrendPoint => ({
        monitorDate: row.monitorDate,
        estimatedConsumption:
          toSupportEnhanceNumber(row.estimatedConsumption) ?? 0,
        estimatedRoi: toSupportEnhanceNumber(row.estimatedRoi) ?? 0,
      }),
    );
  }

  async getRanking(
    industry?: string,
    sortBy?: string,
  ): Promise<CompetitorRankItem[]> {
    const conditions: SQL[] = [isNull(competitorMonitoring.deletedAt)];
    if (industry) {
      conditions.push(
        eq(competitorMonitoring.competitorIndustry, industry),
      );
    }
    const rows: {
      competitorName: string;
      competitorIndustry: string | null;
      monitorDate: string;
      estimatedConsumption: string | null;
      estimatedRoi: string | null;
    }[] = await this.db
      .select({
        competitorName: competitorMonitoring.competitorName,
        competitorIndustry: competitorMonitoring.competitorIndustry,
        monitorDate: competitorMonitoring.monitorDate,
        estimatedConsumption: competitorMonitoring.estimatedConsumption,
        estimatedRoi: competitorMonitoring.estimatedRoi,
      })
      .from(competitorMonitoring)
      .where(and(...conditions))
      .orderBy(
        asc(competitorMonitoring.monitorDate),
        asc(competitorMonitoring.id),
      );

    const latestByName = new Map<string, (typeof rows)[number]>();
    for (const row of rows) {
      latestByName.set(row.competitorName, row);
    }
    const items: CompetitorRankItem[] = Array.from(
      latestByName.values(),
    ).map(
      (row): CompetitorRankItem => ({
        competitorName: row.competitorName,
        competitorIndustry: row.competitorIndustry,
        estimatedConsumption:
          toSupportEnhanceNumber(row.estimatedConsumption) ?? 0,
        estimatedRoi: toSupportEnhanceNumber(row.estimatedRoi) ?? 0,
      }),
    );
    const byRoi: boolean = sortBy === 'roi';
    items.sort(
      (a: CompetitorRankItem, b: CompetitorRankItem): number =>
        byRoi
          ? b.estimatedRoi - a.estimatedRoi
          : b.estimatedConsumption - a.estimatedConsumption,
    );
    return items.slice(0, COMPETITOR_RANKING_MAX);
  }

  async getById(id: number): Promise<CompetitorMonitoring> {
    const rows: CompetitorRow[] = await this.db
      .select()
      .from(competitorMonitoring)
      .where(
        and(eq(competitorMonitoring.id, id), isNull(competitorMonitoring.deletedAt)),
      )
      .limit(1);
    if (rows.length === 0) {
      throw new NotFoundException('竞品监控记录不存在');
    }
    return mapCompetitorMonitoring(rows[0]);
  }

  async create(
    dto: CompetitorCreateDto,
    userId: string,
  ): Promise<CompetitorMonitoring> {
    const competitorName: string = (dto?.competitorName ?? '').trim();
    if (competitorName === '') {
      throw new BadRequestException('竞品名称不能为空');
    }
    const monitorDate: string = assertSupportEnhanceDate(
      dto?.monitorDate,
      '监控日期',
    );
    const values: Omit<CompetitorInsert, 'monitorNo'> = {
      competitorName,
      competitorIndustry: dto?.competitorIndustry ?? null,
      platform: dto?.platform ?? null,
      monitorDate,
      estimatedConsumption:
        dto?.estimatedConsumption !== undefined
          ? String(dto.estimatedConsumption)
          : null,
      estimatedRoi:
        dto?.estimatedRoi !== undefined ? String(dto.estimatedRoi) : null,
      adCount: dto?.adCount ?? null,
      creativeCount: dto?.creativeCount ?? null,
      mainProducts: dto?.mainProducts ?? null,
      targetAudience: dto?.targetAudience ?? null,
      landingPageType: dto?.landingPageType ?? null,
      keywords: dto?.keywords ?? null,
      strengths: dto?.strengths ?? null,
      weaknesses: dto?.weaknesses ?? null,
      opportunities: dto?.opportunities ?? null,
      threats: dto?.threats ?? null,
      dataSource: dto?.dataSource ?? DEFAULT_DATA_SOURCE,
      confidence: dto?.confidence ?? DEFAULT_CONFIDENCE,
      remark: dto?.remark ?? null,
    };
    const { row } = await insertWithSeqNo<CompetitorRow>({
      db: this.db,
      table: competitorMonitoring,
      noColumn: competitorMonitoring.monitorNo,
      prefix: COMPETITOR_NO_PREFIX,
      insert: (monitorNo: string): Promise<CompetitorRow[]> =>
        this.db
          .insert(competitorMonitoring)
          .values({ ...values, monitorNo })
          .returning(),
    });
    this.logger.log(
      `创建竞品监控记录 ${row.monitorNo}，操作人 ${userId === '' ? '未知' : userId}`,
    );
    return mapCompetitorMonitoring(row);
  }

  async update(
    id: number,
    dto: CompetitorUpdateDto,
    userId: string,
  ): Promise<CompetitorMonitoring> {
    const patch: Partial<CompetitorInsert> = {};
    if (dto?.competitorName !== undefined) {
      const competitorName: string = dto.competitorName.trim();
      if (competitorName === '') {
        throw new BadRequestException('竞品名称不能为空');
      }
      patch.competitorName = competitorName;
    }
    if (dto?.competitorIndustry !== undefined) {
      patch.competitorIndustry = dto.competitorIndustry;
    }
    if (dto?.platform !== undefined) {
      patch.platform = dto.platform;
    }
    if (dto?.monitorDate !== undefined) {
      patch.monitorDate = assertSupportEnhanceDate(dto.monitorDate, '监控日期');
    }
    if (dto?.estimatedConsumption !== undefined) {
      patch.estimatedConsumption = String(dto.estimatedConsumption);
    }
    if (dto?.estimatedRoi !== undefined) {
      patch.estimatedRoi = String(dto.estimatedRoi);
    }
    if (dto?.adCount !== undefined) {
      patch.adCount = dto.adCount;
    }
    if (dto?.creativeCount !== undefined) {
      patch.creativeCount = dto.creativeCount;
    }
    if (dto?.mainProducts !== undefined) {
      patch.mainProducts = dto.mainProducts;
    }
    if (dto?.targetAudience !== undefined) {
      patch.targetAudience = dto.targetAudience;
    }
    if (dto?.landingPageType !== undefined) {
      patch.landingPageType = dto.landingPageType;
    }
    if (dto?.keywords !== undefined) {
      patch.keywords = dto.keywords;
    }
    if (dto?.strengths !== undefined) {
      patch.strengths = dto.strengths;
    }
    if (dto?.weaknesses !== undefined) {
      patch.weaknesses = dto.weaknesses;
    }
    if (dto?.opportunities !== undefined) {
      patch.opportunities = dto.opportunities;
    }
    if (dto?.threats !== undefined) {
      patch.threats = dto.threats;
    }
    if (dto?.dataSource !== undefined) {
      patch.dataSource = dto.dataSource;
    }
    if (dto?.confidence !== undefined) {
      patch.confidence = dto.confidence;
    }
    if (dto?.remark !== undefined) {
      patch.remark = dto.remark;
    }
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }
    patch.updatedAt = new Date();
    patch.updatedBy = userId;
    const updated: { id: number }[] = await this.db
      .update(competitorMonitoring)
      .set(patch)
      .where(
        and(eq(competitorMonitoring.id, id), isNull(competitorMonitoring.deletedAt)),
      )
      .returning({ id: competitorMonitoring.id });
    if (updated.length === 0) {
      throw new NotFoundException('竞品监控记录不存在');
    }
    return this.getById(id);
  }

  async remove(id: number): Promise<{ success: boolean }> {
    const updated: { id: number }[] = await this.db
      .update(competitorMonitoring)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(eq(competitorMonitoring.id, id), isNull(competitorMonitoring.deletedAt)),
      )
      .returning({ id: competitorMonitoring.id });
    if (updated.length === 0) {
      throw new NotFoundException('竞品监控记录不存在');
    }
    this.logger.log(`删除竞品监控记录 ${String(id)}`);
    return { success: true };
  }
}
