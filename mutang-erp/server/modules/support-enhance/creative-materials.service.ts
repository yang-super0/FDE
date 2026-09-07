import {
  BadRequestException,
  ConflictException,
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
  inArray,
  isNull,
  like,
  sql,
  type SQL,
} from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import {
  creativeMaterials,
  materialPerformanceRecords,
} from '@server/database/schema';
import type {
  CreativeMaterial,
  MaterialCreateDto,
  MaterialListParams,
  MaterialPerformancePoint,
  MaterialPerformanceRecord,
  MaterialRankItem,
  MaterialRecommendItem,
  MaterialStats,
  MaterialUpdateDto,
  PerformanceRecordCreateDto,
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
import { publishSyncEvent } from '@server/modules/feishu-sync/sync-event.publisher';

type MaterialRow = typeof creativeMaterials.$inferSelect;
type MaterialInsert = typeof creativeMaterials.$inferInsert;
type PerformanceRow = typeof materialPerformanceRecords.$inferSelect;
type PerformanceInsert = typeof materialPerformanceRecords.$inferInsert;

export interface CreativeMaterialPage {
  items: CreativeMaterial[];
  total: number;
  page: number;
  pageSize: number;
}

export interface MaterialBatchTagsBody {
  ids: number[];
  tags: string[];
  mode: string;
}

export interface MaterialBatchArchiveBody {
  ids: number[];
}

const MATERIAL_NO_PREFIX: string = 'SC';
const RECORD_NO_PREFIX: string = 'XG';
const DEFAULT_MATERIAL_TYPE: string = '图片';
const DEFAULT_MATERIAL_SOURCE: string = '自制';
const DEFAULT_MATERIAL_STATUS: string = '启用';
const MATERIAL_STATUS_ACTIVE: string = '启用';
const MATERIAL_STATUS_ARCHIVED: string = '归档';
const MATERIAL_STATUS_OPTIONS: string[] = ['启用', '停用', '归档'];
const DEFAULT_RATING: number = 3;
const RANKING_LIMIT_DEFAULT: number = 10;
const RANKING_LIMIT_MAX: number = 50;

const MATERIAL_SORT_COLUMNS: Record<string, AnyPgColumn> = {
  createdAt: creativeMaterials.createdAt,
  totalConsumption: creativeMaterials.totalConsumption,
  avgRoi: creativeMaterials.avgRoi,
  usageCount: creativeMaterials.usageCount,
  rating: creativeMaterials.rating,
};

const mapStringArray = (value: unknown): string[] | null => {
  if (!Array.isArray(value)) {
    return null;
  }
  return value.filter((item: unknown): item is string => typeof item === 'string');
};

const parseLimitParam = (value: string | undefined): number => {
  const parsed: number = parseInt(value ?? '', 10);
  if (Number.isNaN(parsed) || parsed < 1) {
    return RANKING_LIMIT_DEFAULT;
  }
  return Math.min(parsed, RANKING_LIMIT_MAX);
};

const parseMaterialIds = (value: unknown): number[] => {
  if (!Array.isArray(value) || value.length === 0) {
    throw new BadRequestException('请提供要处理的素材 ID');
  }
  const ids: number[] = [];
  for (const item of value) {
    const parsed: number = Number(item);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new BadRequestException('素材 ID 无效');
    }
    ids.push(parsed);
  }
  return ids;
};

const parseStringTags = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    throw new BadRequestException('标签必须为字符串数组');
  }
  const tags: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') {
      throw new BadRequestException('标签必须为字符串数组');
    }
    tags.push(item);
  }
  return tags;
};

const assertRatingValue = (rating: unknown): number => {
  const parsed: number = Number(rating);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 5) {
    throw new BadRequestException('评分必须为 1-5 的整数');
  }
  return parsed;
};

export function mapCreativeMaterial(row: MaterialRow): CreativeMaterial {
  return {
    id: row.id,
    materialNo: row.materialNo,
    materialName: row.materialName,
    materialType: row.materialType,
    industry: row.industry,
    platform: row.platform,
    fileUrl: row.fileUrl,
    thumbnailUrl: row.thumbnailUrl,
    fileSize: row.fileSize,
    duration: row.duration,
    resolution: row.resolution,
    tags: mapStringArray(row.tags),
    description: row.description,
    targetAudience: row.targetAudience,
    sellingPoints: mapStringArray(row.sellingPoints),
    creativeStyle: row.creativeStyle,
    author: row.author,
    source: row.source,
    usageCount: row.usageCount,
    totalConsumption: toSupportEnhanceNumber(row.totalConsumption) ?? 0,
    totalConversions: row.totalConversions,
    avgRoi: toSupportEnhanceNumber(row.avgRoi) ?? 0,
    avgCtr: toSupportEnhanceNumber(row.avgCtr) ?? 0,
    avgConversionRate: toSupportEnhanceNumber(row.avgConversionRate) ?? 0,
    rating: row.rating,
    status: row.status,
    remark: row.remark,
    createdAt: toSupportEnhanceIso(row.createdAt),
    updatedAt: toSupportEnhanceIso(row.updatedAt),
  };
}

export function mapPerformanceRecord(
  row: PerformanceRow,
): MaterialPerformanceRecord {
  return {
    id: row.id,
    recordNo: row.recordNo,
    materialId: row.materialId,
    platform: row.platform,
    statDate: row.statDate,
    consumption: toSupportEnhanceNumber(row.consumption),
    conversions: row.conversions,
    roi: toSupportEnhanceNumber(row.roi),
    ctr: toSupportEnhanceNumber(row.ctr),
    conversionRate: toSupportEnhanceNumber(row.conversionRate),
    createdAt: toSupportEnhanceIso(row.createdAt),
  };
}

@Injectable()
export class CreativeMaterialsService {
  private readonly logger = new Logger(CreativeMaterialsService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
  ) {}

  async list(params: MaterialListParams): Promise<CreativeMaterialPage> {
    const pagination = resolveSupportEnhancePagination(
      params.page,
      params.pageSize,
    );
    const conditions: (SQL | undefined)[] = [
      isNull(creativeMaterials.deletedAt),
    ];
    if (params.materialName) {
      conditions.push(
        like(creativeMaterials.materialName, `%${params.materialName}%`),
      );
    }
    if (params.materialType) {
      conditions.push(eq(creativeMaterials.materialType, params.materialType));
    }
    if (params.industry) {
      conditions.push(eq(creativeMaterials.industry, params.industry));
    }
    if (params.platform) {
      conditions.push(eq(creativeMaterials.platform, params.platform));
    }
    if (params.status) {
      conditions.push(eq(creativeMaterials.status, params.status));
    }
    if (params.tag) {
      conditions.push(
        sql`${creativeMaterials.tags} @> ${JSON.stringify([params.tag])}::jsonb`,
      );
    }
    if (params.rating !== undefined && params.rating !== '') {
      conditions.push(
        eq(creativeMaterials.rating, assertRatingValue(params.rating)),
      );
    }
    const where: SQL | undefined = and(...conditions);

    const totalRows: { count: number | string }[] = await this.db
      .select({ count: count() })
      .from(creativeMaterials)
      .where(where);
    const sortColumn: AnyPgColumn =
      resolveSupportEnhanceSortColumn(
        params.sortBy,
        MATERIAL_SORT_COLUMNS,
      ) ?? creativeMaterials.createdAt;
    const rows: MaterialRow[] = await this.db
      .select()
      .from(creativeMaterials)
      .where(where)
      .orderBy(
        resolveSupportEnhanceSortOrder(params.sortOrder) === 'asc'
          ? asc(sortColumn)
          : desc(sortColumn),
      )
      .limit(pagination.pageSize)
      .offset(pagination.offset);
    return {
      items: rows.map((row: MaterialRow) => mapCreativeMaterial(row)),
      total: Number(totalRows[0]?.count ?? 0),
      page: pagination.page,
      pageSize: pagination.pageSize,
    };
  }

  async getStats(): Promise<MaterialStats> {
    const aggRows: {
      totalMaterials: number | string;
      activeMaterials: number | string;
      archivedMaterials: number | string;
      totalConsumption: string | null;
      totalConversions: string | null;
      avgRoi: string | null;
      avgCtr: string | null;
      avgConversionRate: string | null;
    }[] = await this.db
      .select({
        totalMaterials: count(),
        activeMaterials: sql<
          number | string
        >`count(*) filter (where ${creativeMaterials.status} = ${MATERIAL_STATUS_ACTIVE})`,
        archivedMaterials: sql<
          number | string
        >`count(*) filter (where ${creativeMaterials.status} = ${MATERIAL_STATUS_ARCHIVED})`,
        totalConsumption: sql<
          string | null
        >`coalesce(sum(${creativeMaterials.totalConsumption}), 0)`,
        totalConversions: sql<
          string | null
        >`coalesce(sum(${creativeMaterials.totalConversions}), 0)`,
        avgRoi: sql<string | null>`coalesce(avg(${creativeMaterials.avgRoi}), 0)`,
        avgCtr: sql<string | null>`coalesce(avg(${creativeMaterials.avgCtr}), 0)`,
        avgConversionRate: sql<
          string | null
        >`coalesce(avg(${creativeMaterials.avgConversionRate}), 0)`,
      })
      .from(creativeMaterials)
      .where(isNull(creativeMaterials.deletedAt));
    const agg = aggRows[0];

    const typeRows: {
      materialType: string;
      count: number | string;
    }[] = await this.db
      .select({
        materialType: creativeMaterials.materialType,
        count: count(),
      })
      .from(creativeMaterials)
      .where(isNull(creativeMaterials.deletedAt))
      .groupBy(creativeMaterials.materialType);

    return {
      totalMaterials: Number(agg?.totalMaterials ?? 0),
      activeMaterials: Number(agg?.activeMaterials ?? 0),
      archivedMaterials: Number(agg?.archivedMaterials ?? 0),
      totalConsumption: toSupportEnhanceNumber(agg?.totalConsumption) ?? 0,
      totalConversions: toSupportEnhanceNumber(agg?.totalConversions) ?? 0,
      avgRoi: toSupportEnhanceNumber(agg?.avgRoi) ?? 0,
      avgCtr: toSupportEnhanceNumber(agg?.avgCtr) ?? 0,
      avgConversionRate: toSupportEnhanceNumber(agg?.avgConversionRate) ?? 0,
      byType: typeRows.map(
        (row: { materialType: string; count: number | string }) => ({
          name: row.materialType,
          count: Number(row.count),
        }),
      ),
    };
  }

  async getRanking(
    sortBy?: string,
    limit?: string,
  ): Promise<MaterialRankItem[]> {
    const max: number = parseLimitParam(limit);
    const sortColumn: AnyPgColumn =
      sortBy === 'roi'
        ? creativeMaterials.avgRoi
        : sortBy === 'conversionRate'
          ? creativeMaterials.avgConversionRate
          : sortBy === 'usageCount'
            ? creativeMaterials.usageCount
            : creativeMaterials.totalConsumption;
    const rows: {
      materialNo: string;
      materialName: string;
      materialType: string;
      totalConsumption: string;
      avgRoi: string;
      avgConversionRate: string;
      usageCount: number;
      rating: number;
    }[] = await this.db
      .select({
        materialNo: creativeMaterials.materialNo,
        materialName: creativeMaterials.materialName,
        materialType: creativeMaterials.materialType,
        totalConsumption: creativeMaterials.totalConsumption,
        avgRoi: creativeMaterials.avgRoi,
        avgConversionRate: creativeMaterials.avgConversionRate,
        usageCount: creativeMaterials.usageCount,
        rating: creativeMaterials.rating,
      })
      .from(creativeMaterials)
      .where(isNull(creativeMaterials.deletedAt))
      .orderBy(desc(sortColumn))
      .limit(max);
    return rows.map(
      (row): MaterialRankItem => ({
        materialNo: row.materialNo,
        materialName: row.materialName,
        materialType: row.materialType,
        totalConsumption: toSupportEnhanceNumber(row.totalConsumption) ?? 0,
        avgRoi: toSupportEnhanceNumber(row.avgRoi) ?? 0,
        avgConversionRate:
          toSupportEnhanceNumber(row.avgConversionRate) ?? 0,
        usageCount: row.usageCount,
        rating: row.rating,
      }),
    );
  }

  async getRecommendations(
    limit?: string,
  ): Promise<MaterialRecommendItem[]> {
    const max: number = parseLimitParam(limit);
    const scoreExpr: SQL = sql`(${creativeMaterials.rating} * 20 + ${creativeMaterials.avgRoi} * 10)`;
    const rows: {
      materialNo: string;
      materialName: string;
      materialType: string;
      totalConsumption: string;
      avgRoi: string;
      avgConversionRate: string;
      usageCount: number;
      rating: number;
    }[] = await this.db
      .select({
        materialNo: creativeMaterials.materialNo,
        materialName: creativeMaterials.materialName,
        materialType: creativeMaterials.materialType,
        totalConsumption: creativeMaterials.totalConsumption,
        avgRoi: creativeMaterials.avgRoi,
        avgConversionRate: creativeMaterials.avgConversionRate,
        usageCount: creativeMaterials.usageCount,
        rating: creativeMaterials.rating,
      })
      .from(creativeMaterials)
      .where(
        and(
          isNull(creativeMaterials.deletedAt),
          eq(creativeMaterials.status, MATERIAL_STATUS_ACTIVE),
        ),
      )
      .orderBy(desc(scoreExpr))
      .limit(max);
    return rows.map((row): MaterialRecommendItem => {
      const avgRoiNum: number = toSupportEnhanceNumber(row.avgRoi) ?? 0;
      return {
        materialNo: row.materialNo,
        materialName: row.materialName,
        materialType: row.materialType,
        totalConsumption: toSupportEnhanceNumber(row.totalConsumption) ?? 0,
        avgRoi: avgRoiNum,
        avgConversionRate:
          toSupportEnhanceNumber(row.avgConversionRate) ?? 0,
        usageCount: row.usageCount,
        rating: row.rating,
        recommendScore:
          Math.round((row.rating * 20 + avgRoiNum * 10) * 100) / 100,
      };
    });
  }

  async compare(ids?: string): Promise<CreativeMaterial[]> {
    if (!ids || ids.trim() === '') {
      throw new BadRequestException('请提供要对比的素材 ID');
    }
    const idList: number[] = ids
      .split(',')
      .map((item: string): number => Number(item.trim()))
      .filter((item: number): boolean => Number.isInteger(item) && item > 0);
    if (idList.length === 0) {
      throw new BadRequestException('素材 ID 格式不正确');
    }
    const rows: MaterialRow[] = await this.db
      .select()
      .from(creativeMaterials)
      .where(
        and(
          inArray(creativeMaterials.id, idList),
          isNull(creativeMaterials.deletedAt),
        ),
      );
    return rows.map((row: MaterialRow) => mapCreativeMaterial(row));
  }

  async getById(id: number): Promise<CreativeMaterial> {
    const rows: MaterialRow[] = await this.db
      .select()
      .from(creativeMaterials)
      .where(
        and(eq(creativeMaterials.id, id), isNull(creativeMaterials.deletedAt)),
      )
      .limit(1);
    if (rows.length === 0) {
      throw new NotFoundException('素材不存在');
    }
    return mapCreativeMaterial(rows[0]);
  }

  async create(
    dto: MaterialCreateDto,
    userId: string,
  ): Promise<CreativeMaterial> {
    const materialName: string = (dto?.materialName ?? '').trim();
    if (materialName === '') {
      throw new BadRequestException('素材名称不能为空');
    }
    const rating: number =
      dto?.rating !== undefined && dto.rating !== null
        ? assertRatingValue(dto.rating)
        : DEFAULT_RATING;
    const values: Omit<MaterialInsert, 'materialNo'> = {
      materialName,
      materialType: dto?.materialType ?? DEFAULT_MATERIAL_TYPE,
      industry: dto?.industry ?? null,
      platform: dto?.platform ?? null,
      fileUrl: dto?.fileUrl ?? null,
      thumbnailUrl: dto?.thumbnailUrl ?? null,
      fileSize: dto?.fileSize ?? null,
      duration: dto?.duration ?? null,
      resolution: dto?.resolution ?? null,
      tags: dto?.tags ?? null,
      description: dto?.description ?? null,
      targetAudience: dto?.targetAudience ?? null,
      sellingPoints: dto?.sellingPoints ?? null,
      creativeStyle: dto?.creativeStyle ?? null,
      author: dto?.author ?? null,
      source: dto?.source ?? DEFAULT_MATERIAL_SOURCE,
      rating,
      status: dto?.status ?? DEFAULT_MATERIAL_STATUS,
      remark: dto?.remark ?? null,
    };
    const { row } = await insertWithSeqNo<MaterialRow>({
      db: this.db,
      table: creativeMaterials,
      noColumn: creativeMaterials.materialNo,
      prefix: MATERIAL_NO_PREFIX,
      insert: (materialNo: string): Promise<MaterialRow[]> =>
        this.db
          .insert(creativeMaterials)
          .values({ ...values, materialNo })
          .returning(),
    });
    publishSyncEvent('creative_materials', row.id, 'create');
    this.logger.log(
      `创建素材 ${row.materialNo}，操作人 ${userId === '' ? '未知' : userId}`,
    );
    return mapCreativeMaterial(row);
  }

  async update(
    id: number,
    dto: MaterialUpdateDto,
    userId: string,
  ): Promise<CreativeMaterial> {
    const patch: Partial<MaterialInsert> = {};
    if (dto?.materialName !== undefined) {
      const materialName: string = dto.materialName.trim();
      if (materialName === '') {
        throw new BadRequestException('素材名称不能为空');
      }
      patch.materialName = materialName;
    }
    if (dto?.materialType !== undefined) {
      patch.materialType = dto.materialType;
    }
    if (dto?.industry !== undefined) {
      patch.industry = dto.industry;
    }
    if (dto?.platform !== undefined) {
      patch.platform = dto.platform;
    }
    if (dto?.fileUrl !== undefined) {
      patch.fileUrl = dto.fileUrl;
    }
    if (dto?.thumbnailUrl !== undefined) {
      patch.thumbnailUrl = dto.thumbnailUrl;
    }
    if (dto?.fileSize !== undefined) {
      patch.fileSize = dto.fileSize;
    }
    if (dto?.duration !== undefined) {
      patch.duration = dto.duration;
    }
    if (dto?.resolution !== undefined) {
      patch.resolution = dto.resolution;
    }
    if (dto?.tags !== undefined) {
      patch.tags = dto.tags;
    }
    if (dto?.description !== undefined) {
      patch.description = dto.description;
    }
    if (dto?.targetAudience !== undefined) {
      patch.targetAudience = dto.targetAudience;
    }
    if (dto?.sellingPoints !== undefined) {
      patch.sellingPoints = dto.sellingPoints;
    }
    if (dto?.creativeStyle !== undefined) {
      patch.creativeStyle = dto.creativeStyle;
    }
    if (dto?.author !== undefined) {
      patch.author = dto.author;
    }
    if (dto?.source !== undefined) {
      patch.source = dto.source;
    }
    if (dto?.rating !== undefined) {
      patch.rating = assertRatingValue(dto.rating);
    }
    if (dto?.status !== undefined) {
      patch.status = dto.status;
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
      .update(creativeMaterials)
      .set(patch)
      .where(
        and(eq(creativeMaterials.id, id), isNull(creativeMaterials.deletedAt)),
      )
      .returning({ id: creativeMaterials.id });
    if (updated.length === 0) {
      throw new NotFoundException('素材不存在');
    }
    publishSyncEvent('creative_materials', id, 'update');
    return this.getById(id);
  }

  async remove(id: number, userId: string): Promise<{ success: boolean }> {
    const relatedRows: { count: number | string }[] = await this.db
      .select({ count: count() })
      .from(materialPerformanceRecords)
      .where(
        and(
          eq(materialPerformanceRecords.materialId, id),
          isNull(materialPerformanceRecords.deletedAt),
        ),
      );
    if (Number(relatedRows[0]?.count ?? 0) > 0) {
      throw new ConflictException('素材存在效果记录，禁止删除');
    }
    const updated: { id: number }[] = await this.db
      .update(creativeMaterials)
      .set({ deletedAt: new Date(), updatedAt: new Date(), updatedBy: userId })
      .where(
        and(eq(creativeMaterials.id, id), isNull(creativeMaterials.deletedAt)),
      )
      .returning({ id: creativeMaterials.id });
    if (updated.length === 0) {
      throw new NotFoundException('素材不存在');
    }
    this.logger.log(`删除素材 ${String(id)}`);
    publishSyncEvent('creative_materials', id, 'delete');
    return { success: true };
  }

  async updateRating(
    id: number,
    rating: number,
    userId: string,
  ): Promise<{ updated: boolean }> {
    const ratingValue: number = assertRatingValue(rating);
    const updated: { id: number }[] = await this.db
      .update(creativeMaterials)
      .set({ rating: ratingValue, updatedAt: new Date(), updatedBy: userId })
      .where(
        and(eq(creativeMaterials.id, id), isNull(creativeMaterials.deletedAt)),
      )
      .returning({ id: creativeMaterials.id });
    if (updated.length === 0) {
      throw new NotFoundException('素材不存在');
    }
    publishSyncEvent('creative_materials', id, 'update');
    return { updated: true };
  }

  async updateStatus(
    id: number,
    status: string,
    userId: string,
  ): Promise<{ updated: boolean }> {
    if (!MATERIAL_STATUS_OPTIONS.includes(status)) {
      throw new BadRequestException('状态必须为 启用、停用 或 归档');
    }
    const updated: { id: number }[] = await this.db
      .update(creativeMaterials)
      .set({ status, updatedAt: new Date(), updatedBy: userId })
      .where(
        and(eq(creativeMaterials.id, id), isNull(creativeMaterials.deletedAt)),
      )
      .returning({ id: creativeMaterials.id });
    if (updated.length === 0) {
      throw new NotFoundException('素材不存在');
    }
    publishSyncEvent('creative_materials', id, 'update');
    return { updated: true };
  }

  async batchTags(
    body: MaterialBatchTagsBody,
    userId: string,
  ): Promise<{ updated: number }> {
    const ids: number[] = parseMaterialIds(body?.ids);
    const tags: string[] = parseStringTags(body?.tags);
    const mode: string = body?.mode ?? '';
    if (mode !== 'add' && mode !== 'replace') {
      throw new BadRequestException('标签更新模式必须为 add 或 replace');
    }
    let updated: number = 0;
    await this.db.transaction(async (tx) => {
      for (const id of ids) {
        let nextTags: string[];
        if (mode === 'add') {
          const existingRows: { tags: unknown }[] = await tx
            .select({ tags: creativeMaterials.tags })
            .from(creativeMaterials)
            .where(
              and(
                eq(creativeMaterials.id, id),
                isNull(creativeMaterials.deletedAt),
              ),
            )
            .limit(1);
          const existing: string[] =
            mapStringArray(existingRows[0]?.tags) ?? [];
          nextTags = Array.from(new Set([...existing, ...tags]));
        } else {
          nextTags = tags;
        }
        const result: { id: number }[] = await tx
          .update(creativeMaterials)
          .set({ tags: nextTags, updatedAt: new Date(), updatedBy: userId })
          .where(
            and(
              eq(creativeMaterials.id, id),
              isNull(creativeMaterials.deletedAt),
            ),
          )
          .returning({ id: creativeMaterials.id });
        updated += result.length;
        publishSyncEvent('creative_materials', id, 'update');
      }
    });
    this.logger.log(
      `批量更新素材标签，命中 ${String(updated)} 条，模式 ${mode}`,
    );
    return { updated };
  }

  async batchArchive(
    body: MaterialBatchArchiveBody,
    userId: string,
  ): Promise<{ updated: number }> {
    const ids: number[] = parseMaterialIds(body?.ids);
    const updated: { id: number }[] = await this.db
      .update(creativeMaterials)
      .set({
        status: MATERIAL_STATUS_ARCHIVED,
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(
        and(
          inArray(creativeMaterials.id, ids),
          isNull(creativeMaterials.deletedAt),
        ),
      )
      .returning({ id: creativeMaterials.id });
    for (const row of updated) {
      publishSyncEvent('creative_materials', row.id, 'update');
    }
    return { updated: updated.length };
  }

  async listRecords(id: number): Promise<MaterialPerformanceRecord[]> {
    const rows: PerformanceRow[] = await this.db
      .select()
      .from(materialPerformanceRecords)
      .where(
        and(
          eq(materialPerformanceRecords.materialId, id),
          isNull(materialPerformanceRecords.deletedAt),
        ),
      )
      .orderBy(desc(materialPerformanceRecords.statDate));
    return rows.map((row: PerformanceRow) => mapPerformanceRecord(row));
  }

  async createRecord(
    id: number,
    dto: PerformanceRecordCreateDto,
    userId: string,
  ): Promise<MaterialPerformanceRecord> {
    const statDate: string = assertSupportEnhanceDate(
      dto?.statDate,
      '统计日期',
    );
    return this.db.transaction(async (tx) => {
      const materialRows: { id: number }[] = await tx
        .select({ id: creativeMaterials.id })
        .from(creativeMaterials)
        .where(
          and(
            eq(creativeMaterials.id, id),
            isNull(creativeMaterials.deletedAt),
          ),
        )
        .limit(1);
      if (materialRows.length === 0) {
        throw new NotFoundException('素材不存在');
      }

      const values: Omit<PerformanceInsert, 'recordNo'> = {
        materialId: id,
        platform: dto?.platform ?? null,
        statDate,
        consumption:
          dto?.consumption !== undefined
            ? String(dto.consumption)
            : null,
        conversions: dto?.conversions ?? null,
        roi: dto?.roi !== undefined ? String(dto.roi) : null,
        ctr: dto?.ctr !== undefined ? String(dto.ctr) : null,
        conversionRate:
          dto?.conversionRate !== undefined
            ? String(dto.conversionRate)
            : null,
      };
      const { row } = await insertWithSeqNo<PerformanceRow>({
        db: tx,
        table: materialPerformanceRecords,
        noColumn: materialPerformanceRecords.recordNo,
        prefix: RECORD_NO_PREFIX,
        insert: (recordNo: string): Promise<PerformanceRow[]> =>
          tx
            .insert(materialPerformanceRecords)
            .values({ ...values, recordNo })
            .returning(),
      });

      const aggRows: {
        recCount: number | string;
        totalConsumption: string | null;
        totalConversions: string | null;
        avgRoi: string | null;
        avgCtr: string | null;
        avgConversionRate: string | null;
      }[] = await tx
        .select({
          recCount: count(),
          totalConsumption: sql<
            string | null
          >`coalesce(sum(${materialPerformanceRecords.consumption}), 0)`,
          totalConversions: sql<
            string | null
          >`coalesce(sum(${materialPerformanceRecords.conversions}), 0)`,
          avgRoi: sql<
            string | null
          >`coalesce(avg(${materialPerformanceRecords.roi}), 0)`,
          avgCtr: sql<
            string | null
          >`coalesce(avg(${materialPerformanceRecords.ctr}), 0)`,
          avgConversionRate: sql<
            string | null
          >`coalesce(avg(${materialPerformanceRecords.conversionRate}), 0)`,
        })
        .from(materialPerformanceRecords)
        .where(
          and(
            eq(materialPerformanceRecords.materialId, id),
            isNull(materialPerformanceRecords.deletedAt),
          ),
        );
      const agg = aggRows[0];

      const updatedMaterial: { id: number }[] = await tx
        .update(creativeMaterials)
        .set({
          totalConsumption: (
            toSupportEnhanceNumber(agg?.totalConsumption) ?? 0
          ).toFixed(2),
          totalConversions: toSupportEnhanceNumber(
            agg?.totalConversions,
          ) ?? 0,
          avgRoi: (toSupportEnhanceNumber(agg?.avgRoi) ?? 0).toFixed(2),
          avgCtr: (toSupportEnhanceNumber(agg?.avgCtr) ?? 0).toFixed(4),
          avgConversionRate: (
            toSupportEnhanceNumber(agg?.avgConversionRate) ?? 0
          ).toFixed(4),
          usageCount: Number(agg?.recCount ?? 0),
          updatedAt: new Date(),
          updatedBy: userId,
        })
        .where(eq(creativeMaterials.id, id))
        .returning({ id: creativeMaterials.id });
      if (updatedMaterial.length === 0) {
        throw new NotFoundException('素材不存在');
      }
      this.logger.log(
        `素材 ${String(id)} 新增效果记录 ${row.recordNo} 并重算聚合`,
      );
      publishSyncEvent('creative_materials', id, 'update');
      return mapPerformanceRecord(row);
    });
  }

  async getPerformance(id: number): Promise<MaterialPerformancePoint[]> {
    const rows: PerformanceRow[] = await this.db
      .select()
      .from(materialPerformanceRecords)
      .where(
        and(
          eq(materialPerformanceRecords.materialId, id),
          isNull(materialPerformanceRecords.deletedAt),
        ),
      )
      .orderBy(
        asc(materialPerformanceRecords.statDate),
        asc(materialPerformanceRecords.id),
      );
    return rows.map(
      (row: PerformanceRow): MaterialPerformancePoint => ({
        statDate: row.statDate,
        consumption: toSupportEnhanceNumber(row.consumption) ?? 0,
        conversions: row.conversions ?? 0,
        roi: toSupportEnhanceNumber(row.roi) ?? 0,
        ctr: toSupportEnhanceNumber(row.ctr) ?? 0,
        conversionRate: toSupportEnhanceNumber(row.conversionRate) ?? 0,
      }),
    );
  }
}
