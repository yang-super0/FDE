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
  gte,
  isNotNull,
  isNull,
  lt,
  lte,
  sql,
  type SQL,
} from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';
import type {
  IndustryRoiBenchmark,
  IndustryRoiComparisonItem,
  IndustryRoiCorrectDto,
  IndustryRoiCreateDto,
  IndustryRoiImportResult,
  IndustryRoiImportRow,
  IndustryRoiListParams,
  IndustryRoiUpdateDto,
} from '@shared/api.interface';
import { industryRoiBenchmarks } from '@server/database/schema';
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

type RoiRow = typeof industryRoiBenchmarks.$inferSelect;
type RoiInsert = typeof industryRoiBenchmarks.$inferInsert;

export interface IndustryRoiListResponse {
  items: IndustryRoiBenchmark[];
  total: number;
  page: number;
  pageSize: number;
}

const ROI_NO_PREFIX: string = 'ROI';
const ROI_STATUS_ENABLED: string = '启用';
const ROI_STATUS_EXPIRED: string = '已过期';
const IMPORT_DATE_PATTERN: RegExp = /^\d{4}-\d{2}-\d{2}$/u;

const ROI_SORT_COLUMNS: Record<string, PgColumn> = {
  effectiveDate: industryRoiBenchmarks.effectiveDate,
  createdAt: industryRoiBenchmarks.createdAt,
  roiBenchmark: industryRoiBenchmarks.roiBenchmark,
  version: industryRoiBenchmarks.version,
};

/** 数值列写入转换：numeric 列 insert 侧为 string，null 透传 */
function toNumericString(
  value: number | string | null | undefined,
): string | null {
  const num: number | null = toSupportEnhanceNumber(value);
  return num === null ? null : String(num);
}

function mapRoiRow(row: RoiRow): IndustryRoiBenchmark {
  return {
    id: row.id,
    roiNo: row.roiNo,
    industry: row.industry,
    subIndustry: row.subIndustry,
    platform: row.platform,
    roiBenchmark: toSupportEnhanceNumber(row.roiBenchmark) ?? 0,
    roiMin: toSupportEnhanceNumber(row.roiMin),
    roiMax: toSupportEnhanceNumber(row.roiMax),
    cpcBenchmark: toSupportEnhanceNumber(row.cpcBenchmark),
    cpmBenchmark: toSupportEnhanceNumber(row.cpmBenchmark),
    conversionRate: toSupportEnhanceNumber(row.conversionRate),
    effectiveDate: row.effectiveDate,
    expireDate: row.expireDate,
    status: row.status,
    version: row.version,
    parentId: row.parentId,
    isCurrent: row.isCurrent,
    correctReason: row.correctReason,
    remark: row.remark,
    createdAt: toSupportEnhanceIso(row.createdAt),
    updatedAt: toSupportEnhanceIso(row.updatedAt),
  };
}

@Injectable()
export class IndustryRoiService {
  private readonly logger = new Logger(IndustryRoiService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  /** 入口自动过期：启用中且失效日期早于今天的记录置为已过期 */
  private async expireOutdated(): Promise<void> {
    await this.db
      .update(industryRoiBenchmarks)
      .set({ status: ROI_STATUS_EXPIRED })
      .where(
        and(
          isNull(industryRoiBenchmarks.deletedAt),
          eq(industryRoiBenchmarks.status, ROI_STATUS_ENABLED),
          isNotNull(industryRoiBenchmarks.expireDate),
          lt(industryRoiBenchmarks.expireDate, sql`CURRENT_DATE`),
        ),
      );
  }

  async list(params: IndustryRoiListParams): Promise<IndustryRoiListResponse> {
    await this.expireOutdated();
    const { page, pageSize, offset } = resolveSupportEnhancePagination(
      params.page,
      params.pageSize,
    );
    const conditions: SQL[] = [isNull(industryRoiBenchmarks.deletedAt)];
    if (params.industry) {
      conditions.push(
        eq(industryRoiBenchmarks.industry, params.industry),
      );
    }
    if (params.platform) {
      conditions.push(
        eq(industryRoiBenchmarks.platform, params.platform),
      );
    }
    if (params.status) {
      conditions.push(eq(industryRoiBenchmarks.status, params.status));
    }
    if (params.dateFrom) {
      conditions.push(
        gte(
          industryRoiBenchmarks.effectiveDate,
          assertSupportEnhanceDate(params.dateFrom, '开始日期'),
        ),
      );
    }
    if (params.dateTo) {
      conditions.push(
        lte(
          industryRoiBenchmarks.effectiveDate,
          assertSupportEnhanceDate(params.dateTo, '结束日期'),
        ),
      );
    }
    if (params.onlyCurrent !== '0') {
      conditions.push(eq(industryRoiBenchmarks.isCurrent, true));
    }
    const where: SQL = and(...conditions);

    const totalRows: { count: number }[] = await this.db
      .select({ count: count() })
      .from(industryRoiBenchmarks)
      .where(where);
    const total: number = Number(totalRows[0]?.count ?? 0);

    const sortColumn: PgColumn =
      resolveSupportEnhanceSortColumn(params.sortBy, ROI_SORT_COLUMNS) ??
      industryRoiBenchmarks.createdAt;
    const sortOrder: 'asc' | 'desc' = resolveSupportEnhanceSortOrder(
      params.sortOrder,
    );
    const rows: RoiRow[] = await this.db
      .select()
      .from(industryRoiBenchmarks)
      .where(where)
      .orderBy(
        sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn),
      )
      .limit(pageSize)
      .offset(offset);
    return {
      items: rows.map((row: RoiRow) => mapRoiRow(row)),
      total,
      page,
      pageSize,
    };
  }

  async comparisonByIndustry(): Promise<IndustryRoiComparisonItem[]> {
    const rows: {
      industry: string;
      avgRoiBenchmark: string | null;
      avgCpcBenchmark: string | null;
      avgCpmBenchmark: string | null;
      benchmarkCount: string | number;
    }[] = await this.db
      .select({
        industry: industryRoiBenchmarks.industry,
        avgRoiBenchmark: sql<string | null>`avg(${industryRoiBenchmarks.roiBenchmark})`,
        avgCpcBenchmark: sql<
          string | null
        >`avg(${industryRoiBenchmarks.cpcBenchmark})`,
        avgCpmBenchmark: sql<
          string | null
        >`avg(${industryRoiBenchmarks.cpmBenchmark})`,
        benchmarkCount: sql<string | number>`count(*)`,
      })
      .from(industryRoiBenchmarks)
      .where(
        and(
          isNull(industryRoiBenchmarks.deletedAt),
          eq(industryRoiBenchmarks.isCurrent, true),
        ),
      )
      .groupBy(industryRoiBenchmarks.industry);
    return rows.map(
      (
        row: {
          industry: string;
          avgRoiBenchmark: string | null;
          avgCpcBenchmark: string | null;
          avgCpmBenchmark: string | null;
          benchmarkCount: string | number;
        },
      ): IndustryRoiComparisonItem => ({
        industry: row.industry,
        platform: '',
        avgRoiBenchmark: toSupportEnhanceNumber(row.avgRoiBenchmark) ?? 0,
        avgCpcBenchmark: toSupportEnhanceNumber(row.avgCpcBenchmark) ?? 0,
        avgCpmBenchmark: toSupportEnhanceNumber(row.avgCpmBenchmark) ?? 0,
        benchmarkCount: Number(row.benchmarkCount),
      }),
    );
  }

  async comparisonByPlatform(): Promise<IndustryRoiComparisonItem[]> {
    const rows: {
      platform: string;
      avgRoiBenchmark: string | null;
      avgCpcBenchmark: string | null;
      avgCpmBenchmark: string | null;
      benchmarkCount: string | number;
    }[] = await this.db
      .select({
        platform: industryRoiBenchmarks.platform,
        avgRoiBenchmark: sql<string | null>`avg(${industryRoiBenchmarks.roiBenchmark})`,
        avgCpcBenchmark: sql<
          string | null
        >`avg(${industryRoiBenchmarks.cpcBenchmark})`,
        avgCpmBenchmark: sql<
          string | null
        >`avg(${industryRoiBenchmarks.cpmBenchmark})`,
        benchmarkCount: sql<string | number>`count(*)`,
      })
      .from(industryRoiBenchmarks)
      .where(
        and(
          isNull(industryRoiBenchmarks.deletedAt),
          eq(industryRoiBenchmarks.isCurrent, true),
        ),
      )
      .groupBy(industryRoiBenchmarks.platform);
    return rows.map(
      (
        row: {
          platform: string;
          avgRoiBenchmark: string | null;
          avgCpcBenchmark: string | null;
          avgCpmBenchmark: string | null;
          benchmarkCount: string | number;
        },
      ): IndustryRoiComparisonItem => ({
        industry: '',
        platform: row.platform,
        avgRoiBenchmark: toSupportEnhanceNumber(row.avgRoiBenchmark) ?? 0,
        avgCpcBenchmark: toSupportEnhanceNumber(row.avgCpcBenchmark) ?? 0,
        avgCpmBenchmark: toSupportEnhanceNumber(row.avgCpmBenchmark) ?? 0,
        benchmarkCount: Number(row.benchmarkCount),
      }),
    );
  }

  /** 导入行校验：返回错误原因，合法返回 null */
  private validateImportRow(row: IndustryRoiImportRow): string | null {
    if (!row?.industry) return '行业为必填项';
    if (!row?.platform) return '平台为必填项';
    if (!row?.effectiveDate) return '生效日期为必填项';
    if (!IMPORT_DATE_PATTERN.test(row.effectiveDate)) {
      return '生效日期必须为 YYYY-MM-DD 格式';
    }
    const roiBenchmark: number | null = toSupportEnhanceNumber(
      row.roiBenchmark,
    );
    if (roiBenchmark === null) return 'ROI基准值必须为有效数字';
    if (row.expireDate && !IMPORT_DATE_PATTERN.test(row.expireDate)) {
      return '失效日期必须为 YYYY-MM-DD 格式';
    }
    return null;
  }

  async importRows(
    rows: IndustryRoiImportRow[],
  ): Promise<IndustryRoiImportResult> {
    let created: number = 0;
    let failed: number = 0;
    const errors: string[] = [];
    const list: IndustryRoiImportRow[] = Array.isArray(rows) ? rows : [];
    for (let index: number = 0; index < list.length; index += 1) {
      const row: IndustryRoiImportRow = list[index];
      const lineNo: number = index + 1;
      const error: string | null = this.validateImportRow(row);
      if (error) {
        failed += 1;
        errors.push(`第${String(lineNo)}行：${error}`);
        continue;
      }
      try {
        const { row: insertedRow } = await insertWithSeqNo<RoiRow>({
          db: this.db,
          table: industryRoiBenchmarks,
          noColumn: industryRoiBenchmarks.roiNo,
          prefix: ROI_NO_PREFIX,
          insert: (no: string) =>
            this.db
              .insert(industryRoiBenchmarks)
              .values({
                roiNo: no,
                industry: row.industry,
                subIndustry: row.subIndustry ?? null,
                platform: row.platform,
                roiBenchmark: String(
                  toSupportEnhanceNumber(row.roiBenchmark) ?? 0,
                ),
                roiMin: toNumericString(row.roiMin),
                roiMax: toNumericString(row.roiMax),
                cpcBenchmark: toNumericString(row.cpcBenchmark),
                cpmBenchmark: toNumericString(row.cpmBenchmark),
                conversionRate: toNumericString(row.conversionRate),
                effectiveDate: row.effectiveDate,
                expireDate: row.expireDate ?? null,
                status: ROI_STATUS_ENABLED,
                version: 1,
                isCurrent: true,
                remark: row.remark ?? null,
              })
              .returning(),
        });
        publishSyncEvent('industry_roi_benchmarks', insertedRow.id, 'create');
        created += 1;
      } catch (insertError: unknown) {
        failed += 1;
        const message: string =
          insertError instanceof Error
            ? insertError.message
            : '创建失败';
        errors.push(`第${String(lineNo)}行：${message}`);
        this.logger.error(
          `行业ROI基准导入失败 line=${String(lineNo)} error=${JSON.stringify(
            insertError instanceof Error ? insertError.message : insertError,
          )}`,
        );
      }
    }
    return { created, failed, errors };
  }

  private async findRowOrThrow(id: number): Promise<RoiRow> {
    const rows: RoiRow[] = await this.db
      .select()
      .from(industryRoiBenchmarks)
      .where(
        and(
          eq(industryRoiBenchmarks.id, id),
          isNull(industryRoiBenchmarks.deletedAt),
        ),
      );
    if (rows.length === 0) {
      throw new NotFoundException('ROI基准不存在');
    }
    return rows[0];
  }

  private async findRowOrThrowTx(
    tx: PostgresJsDatabase,
    id: number,
  ): Promise<RoiRow> {
    const rows: RoiRow[] = await tx
      .select()
      .from(industryRoiBenchmarks)
      .where(
        and(
          eq(industryRoiBenchmarks.id, id),
          isNull(industryRoiBenchmarks.deletedAt),
        ),
      );
    if (rows.length === 0) {
      throw new NotFoundException('ROI基准不存在');
    }
    return rows[0];
  }

  private async deactivateCurrent(
    tx: PostgresJsDatabase,
    id: number,
  ): Promise<void> {
    const updated: { id: number }[] = await tx
      .update(industryRoiBenchmarks)
      .set({ isCurrent: false })
      .where(
        and(
          eq(industryRoiBenchmarks.id, id),
          isNull(industryRoiBenchmarks.deletedAt),
        ),
      )
      .returning({ id: industryRoiBenchmarks.id });
    if (updated.length === 0) {
      throw new NotFoundException('ROI基准不存在');
    }
  }

  /** 事务内插入下一版本（version+1，parentId 指向旧行，isCurrent=true） */
  private async insertNextVersion(
    tx: PostgresJsDatabase,
    oldRow: RoiRow,
    values: Omit<
      RoiInsert,
      'roiNo' | 'version' | 'parentId' | 'isCurrent' | 'createdBy' | 'updatedBy'
    >,
    userId: string,
  ): Promise<RoiRow> {
    const { row } = await insertWithSeqNo<RoiRow>({
      db: tx,
      table: industryRoiBenchmarks,
      noColumn: industryRoiBenchmarks.roiNo,
      prefix: ROI_NO_PREFIX,
      insert: (no: string) =>
        tx
          .insert(industryRoiBenchmarks)
          .values({
            ...values,
            roiNo: no,
            version: oldRow.version + 1,
            parentId: oldRow.id,
            isCurrent: true,
            createdBy: userId,
            updatedBy: userId,
          })
          .returning(),
    });
    return row;
  }

  async findById(id: number): Promise<IndustryRoiBenchmark> {
    const row: RoiRow = await this.findRowOrThrow(id);
    return mapRoiRow(row);
  }

  async create(
    dto: IndustryRoiCreateDto,
    userId: string,
  ): Promise<IndustryRoiBenchmark> {
    if (!dto?.industry || !dto?.platform) {
      throw new BadRequestException('行业与平台为必填项');
    }
    const roiBenchmark: number = Number(dto?.roiBenchmark);
    if (!Number.isFinite(roiBenchmark)) {
      throw new BadRequestException('ROI基准值必须为有效数字');
    }
    const effectiveDate: string = assertSupportEnhanceDate(
      dto?.effectiveDate,
      '生效日期',
    );
    const expireDate: string | null = dto?.expireDate
      ? assertSupportEnhanceDate(dto.expireDate, '失效日期')
      : null;
    const { row } = await insertWithSeqNo<RoiRow>({
      db: this.db,
      table: industryRoiBenchmarks,
      noColumn: industryRoiBenchmarks.roiNo,
      prefix: ROI_NO_PREFIX,
      insert: (no: string) =>
        this.db
          .insert(industryRoiBenchmarks)
          .values({
            roiNo: no,
            industry: dto.industry,
            subIndustry: dto.subIndustry ?? null,
            platform: dto.platform,
            roiBenchmark: String(roiBenchmark),
            roiMin: toNumericString(dto.roiMin),
            roiMax: toNumericString(dto.roiMax),
            cpcBenchmark: toNumericString(dto.cpcBenchmark),
            cpmBenchmark: toNumericString(dto.cpmBenchmark),
            conversionRate: toNumericString(dto.conversionRate),
            effectiveDate,
            expireDate,
            status: dto.status ?? ROI_STATUS_ENABLED,
            version: 1,
            isCurrent: true,
            remark: dto.remark ?? null,
            createdBy: userId,
            updatedBy: userId,
          })
          .returning(),
    });
    publishSyncEvent('industry_roi_benchmarks', row.id, 'create');
    this.logger.log(
      `行业ROI基准创建成功 id=${String(row.id)} roiNo=${row.roiNo}`,
    );
    return mapRoiRow(row);
  }

  async update(
    id: number,
    dto: IndustryRoiUpdateDto,
    userId: string,
  ): Promise<IndustryRoiBenchmark> {
    if (!dto?.industry || !dto?.platform) {
      throw new BadRequestException('行业与平台为必填项');
    }
    const roiBenchmark: number = Number(dto?.roiBenchmark);
    if (!Number.isFinite(roiBenchmark)) {
      throw new BadRequestException('ROI基准值必须为有效数字');
    }
    const effectiveDate: string = assertSupportEnhanceDate(
      dto?.effectiveDate,
      '生效日期',
    );
    const expireDate: string | null = dto?.expireDate
      ? assertSupportEnhanceDate(dto.expireDate, '失效日期')
      : null;
    return this.db.transaction(
      async (tx: PostgresJsDatabase): Promise<IndustryRoiBenchmark> => {
        const oldRow: RoiRow = await this.findRowOrThrowTx(tx, id);
        await this.deactivateCurrent(tx, id);
        const newRow: RoiRow = await this.insertNextVersion(
          tx,
          oldRow,
          {
            industry: dto.industry,
            subIndustry: dto.subIndustry ?? null,
            platform: dto.platform,
            roiBenchmark: String(roiBenchmark),
            roiMin: toNumericString(dto.roiMin),
            roiMax: toNumericString(dto.roiMax),
            cpcBenchmark: toNumericString(dto.cpcBenchmark),
            cpmBenchmark: toNumericString(dto.cpmBenchmark),
            conversionRate: toNumericString(dto.conversionRate),
            effectiveDate,
            expireDate,
            status: dto.status ?? ROI_STATUS_ENABLED,
            correctReason: null,
            remark: dto.remark ?? null,
          },
          userId,
        );
        publishSyncEvent('industry_roi_benchmarks', newRow.id, 'create');
        publishSyncEvent('industry_roi_benchmarks', oldRow.id, 'update');
        return mapRoiRow(newRow);
      },
    );
  }

  async correct(
    id: number,
    dto: IndustryRoiCorrectDto,
    userId: string,
  ): Promise<IndustryRoiBenchmark> {
    if (!dto?.correctReason) {
      throw new BadRequestException('修正原因为必填项');
    }
    const roiBenchmark: number = Number(dto?.roiBenchmark);
    if (!Number.isFinite(roiBenchmark)) {
      throw new BadRequestException('ROI基准值必须为有效数字');
    }
    const expireDate: string | null = dto?.expireDate
      ? assertSupportEnhanceDate(dto.expireDate, '失效日期')
      : null;
    return this.db.transaction(
      async (tx: PostgresJsDatabase): Promise<IndustryRoiBenchmark> => {
        const oldRow: RoiRow = await this.findRowOrThrowTx(tx, id);
        await this.deactivateCurrent(tx, id);
        const newRow: RoiRow = await this.insertNextVersion(
          tx,
          oldRow,
          {
            industry: oldRow.industry,
            subIndustry: oldRow.subIndustry,
            platform: oldRow.platform,
            roiBenchmark: String(roiBenchmark),
            roiMin:
              dto.roiMin !== undefined
                ? toNumericString(dto.roiMin)
                : oldRow.roiMin,
            roiMax:
              dto.roiMax !== undefined
                ? toNumericString(dto.roiMax)
                : oldRow.roiMax,
            cpcBenchmark:
              dto.cpcBenchmark !== undefined
                ? toNumericString(dto.cpcBenchmark)
                : oldRow.cpcBenchmark,
            cpmBenchmark:
              dto.cpmBenchmark !== undefined
                ? toNumericString(dto.cpmBenchmark)
                : oldRow.cpmBenchmark,
            conversionRate:
              dto.conversionRate !== undefined
                ? toNumericString(dto.conversionRate)
                : oldRow.conversionRate,
            effectiveDate: oldRow.effectiveDate,
            expireDate: expireDate ?? oldRow.expireDate,
            status: oldRow.status,
            correctReason: dto.correctReason,
            remark: oldRow.remark,
          },
          userId,
        );
        publishSyncEvent('industry_roi_benchmarks', newRow.id, 'create');
        publishSyncEvent('industry_roi_benchmarks', oldRow.id, 'update');
        return mapRoiRow(newRow);
      },
    );
  }

  async remove(id: number, userId: string): Promise<{ deleted: boolean }> {
    await this.findRowOrThrow(id);
    const childRows: { count: number }[] = await this.db
      .select({ count: count() })
      .from(industryRoiBenchmarks)
      .where(
        and(
          eq(industryRoiBenchmarks.parentId, id),
          isNull(industryRoiBenchmarks.deletedAt),
        ),
      );
    if (Number(childRows[0]?.count ?? 0) > 0) {
      throw new ConflictException('存在历史版本关联，禁止删除');
    }
    const updated: { id: number }[] = await this.db
      .update(industryRoiBenchmarks)
      .set({ deletedAt: new Date(), updatedBy: userId })
      .where(
        and(
          eq(industryRoiBenchmarks.id, id),
          isNull(industryRoiBenchmarks.deletedAt),
        ),
      )
      .returning({ id: industryRoiBenchmarks.id });
    if (updated.length === 0) {
      throw new NotFoundException('ROI基准不存在');
    }
    publishSyncEvent('industry_roi_benchmarks', id, 'delete');
    return { deleted: true };
  }

  async versions(id: number): Promise<IndustryRoiBenchmark[]> {
    const existing: RoiRow = await this.findRowOrThrow(id);
    const rows: RoiRow[] = await this.db
      .select()
      .from(industryRoiBenchmarks)
      .where(
        and(
          eq(industryRoiBenchmarks.industry, existing.industry),
          existing.subIndustry === null
            ? isNull(industryRoiBenchmarks.subIndustry)
            : eq(industryRoiBenchmarks.subIndustry, existing.subIndustry),
          eq(industryRoiBenchmarks.platform, existing.platform),
        ),
      )
      .orderBy(desc(industryRoiBenchmarks.version));
    return rows.map((row: RoiRow) => mapRoiRow(row));
  }
}
