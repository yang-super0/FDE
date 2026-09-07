import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { and, count, asc, eq, inArray, isNull, like, sql, type SQL } from 'drizzle-orm';
import type {
  CustomReportRecord,
  ReportTemplateApplyInput,
  ReportTemplateCreateInput,
  ReportTemplateListParams,
  ReportTemplateListResponse,
  ReportTemplateRatingInput,
  ReportTemplateRatingResponse,
  ReportTemplateRecord,
  ReportTemplateUpdateInput,
} from '@shared/api.interface';
import {
  customReports,
  reportTemplates,
  scheduledReports,
} from '@server/database/schema';
import { insertWithSeqNo } from '@server/modules/finance-core/fin-seq.util';
import { OperationLogService } from '@server/modules/operation-log/operation-log.service';
import { toFilterArray, toStringArray, truncateText } from './scheduled-reports.util';

type TemplateRow = typeof reportTemplates.$inferSelect;
type TemplateInsert = typeof reportTemplates.$inferInsert;
type ReportRow = typeof customReports.$inferSelect;

export interface ReportTemplateBatchDeleteResult {
  deletedIds: number[];
  failedIds: number[];
}

const TEMPLATE_NO_PREFIX: string = 'MB';
const REPORT_NO_PREFIX: string = 'BB';
const OPERATION_MODULE: string = '报表中心';

function mapTemplateRow(row: TemplateRow): ReportTemplateRecord {
  return {
    id: row.id,
    templateNo: row.templateNo,
    templateName: row.templateName,
    templateCategory: row.templateCategory,
    description: row.description,
    dimensions: toStringArray(row.dimensions),
    metrics: toStringArray(row.metrics),
    chartType: row.chartType,
    defaultFilters: toFilterArray(row.defaultFilters),
    isSystem: row.isSystem,
    isPublic: row.isPublic,
    sharedWith: toStringArray(row.sharedWith),
    usageCount: row.usageCount,
    rating: row.rating,
    ratingCount: row.ratingCount,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    remark: row.remark,
  };
}

function mapReportRow(row: ReportRow): CustomReportRecord {
  return {
    id: row.id,
    reportNo: row.reportNo,
    reportName: row.reportName,
    reportType: row.reportType,
    dimensions: toStringArray(row.dimensions),
    metrics: toStringArray(row.metrics),
    chartType: row.chartType,
    filters: toFilterArray(row.filters),
    timeRange: row.timeRange,
    customStartDate: row.customStartDate,
    customEndDate: row.customEndDate,
    groupBy: row.groupBy,
    sortBy: row.sortBy,
    sortOrder: row.sortOrder,
    isPublic: row.isPublic,
    sharedWith: toStringArray(row.sharedWith),
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    remark: row.remark,
  };
}

@Injectable()
export class ReportTemplatesService {
  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly operationLog: OperationLogService,
  ) {}

  async list(
    params: ReportTemplateListParams,
  ): Promise<ReportTemplateListResponse> {
    const page: number = Math.max(Number(params.page) || 1, 1);
    const pageSize: number = Math.min(
      Math.max(Number(params.pageSize) || 20, 1),
      100,
    );
    const conditions: SQL[] = [isNull(reportTemplates.deletedAt)];
    if (params.category) {
      conditions.push(
        eq(reportTemplates.templateCategory, params.category),
      );
    }
    if (params.keyword) {
      conditions.push(
        like(reportTemplates.templateName, `%${params.keyword}%`),
      );
    }
    if (params.isSystem === 'true' || params.isSystem === '1') {
      conditions.push(eq(reportTemplates.isSystem, true));
    }
    if (params.isSystem === 'false' || params.isSystem === '0') {
      conditions.push(eq(reportTemplates.isSystem, false));
    }
    if (params.isPublic === 'true' || params.isPublic === '1') {
      conditions.push(eq(reportTemplates.isPublic, true));
    }
    if (params.isPublic === 'false' || params.isPublic === '0') {
      conditions.push(eq(reportTemplates.isPublic, false));
    }
    const where: SQL = and(...conditions);

    const totalRows: { count: number | string }[] = await this.db
      .select({ count: count() })
      .from(reportTemplates)
      .where(where);
    const rows: TemplateRow[] = await this.db
      .select()
      .from(reportTemplates)
      .where(where)
      .orderBy(asc(reportTemplates.templateNo))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    return {
      items: rows.map((row: TemplateRow): ReportTemplateRecord => mapTemplateRow(row)),
      total: Number(totalRows[0]?.count ?? 0),
    };
  }

  async create(
    dto: ReportTemplateCreateInput,
    userId: string,
  ): Promise<ReportTemplateRecord> {
    if (!dto?.templateName || dto.templateName.trim().length === 0) {
      throw new BadRequestException('模板名称不能为空');
    }
    if (!Array.isArray(dto.dimensions) || dto.dimensions.length === 0) {
      throw new BadRequestException('分析维度不能为空');
    }
    if (!Array.isArray(dto.metrics) || dto.metrics.length === 0) {
      throw new BadRequestException('分析指标不能为空');
    }
    const { row } = await insertWithSeqNo<TemplateRow>({
      db: this.db,
      table: reportTemplates,
      noColumn: reportTemplates.templateNo,
      prefix: TEMPLATE_NO_PREFIX,
      insert: (no: string) =>
        this.db
          .insert(reportTemplates)
          .values({
            templateNo: no,
            templateName: dto.templateName,
            templateCategory: dto.templateCategory ?? '综合',
            description: dto.description ?? null,
            dimensions: JSON.stringify(dto.dimensions),
            metrics: JSON.stringify(dto.metrics),
            chartType: dto.chartType ?? '表格',
            defaultFilters: JSON.stringify(dto.defaultFilters ?? []),
            isSystem: false,
            isPublic: dto.isPublic ?? false,
            sharedWith: JSON.stringify(dto.sharedWith ?? []),
            usageCount: 0,
            rating: 0,
            ratingCount: 0,
            remark: dto.remark ?? null,
            createdBy: userId,
          })
          .returning(),
    });
    await this.operationLog.record({
      module: OPERATION_MODULE,
      actionType: '创建模板',
      target: truncateText(`${row.templateNo} ${row.templateName}`, 255),
      operatorId: userId,
    });
    return mapTemplateRow(row);
  }

  async findById(id: number): Promise<ReportTemplateRecord> {
    const row: TemplateRow = await this.findRow(id);
    return mapTemplateRow(row);
  }

  async update(
    id: number,
    dto: ReportTemplateUpdateInput,
    userId: string,
  ): Promise<ReportTemplateRecord> {
    const existing: TemplateRow = await this.findRow(id);
    if (existing.isSystem) {
      throw new ConflictException('系统内置模板禁止编辑');
    }
    const patch: Partial<TemplateInsert> = {};
    if (dto.templateName !== undefined) {
      if (!dto.templateName || dto.templateName.trim().length === 0) {
        throw new BadRequestException('模板名称不能为空');
      }
      patch.templateName = dto.templateName;
    }
    if (dto.templateCategory !== undefined) {
      patch.templateCategory = dto.templateCategory;
    }
    if (dto.description !== undefined) patch.description = dto.description;
    if (dto.dimensions !== undefined) {
      if (!Array.isArray(dto.dimensions) || dto.dimensions.length === 0) {
        throw new BadRequestException('分析维度不能为空');
      }
      patch.dimensions = JSON.stringify(dto.dimensions);
    }
    if (dto.metrics !== undefined) {
      if (!Array.isArray(dto.metrics) || dto.metrics.length === 0) {
        throw new BadRequestException('分析指标不能为空');
      }
      patch.metrics = JSON.stringify(dto.metrics);
    }
    if (dto.chartType !== undefined) patch.chartType = dto.chartType;
    if (dto.defaultFilters !== undefined) {
      patch.defaultFilters = JSON.stringify(dto.defaultFilters);
    }
    if (dto.isPublic !== undefined) patch.isPublic = dto.isPublic;
    if (dto.sharedWith !== undefined) {
      patch.sharedWith = JSON.stringify(dto.sharedWith);
    }
    if (dto.remark !== undefined) patch.remark = dto.remark;
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }
    patch.updatedAt = new Date();
    patch.updatedBy = userId;
    const updated: TemplateRow[] = await this.db
      .update(reportTemplates)
      .set(patch)
      .where(
        and(eq(reportTemplates.id, id), isNull(reportTemplates.deletedAt)),
      )
      .returning();
    if (updated.length === 0) throw new NotFoundException('模板不存在');
    await this.operationLog.record({
      module: OPERATION_MODULE,
      actionType: '更新模板',
      target: truncateText(
        `${existing.templateNo} ${updated[0].templateName}`,
        255,
      ),
      operatorId: userId,
    });
    return mapTemplateRow(updated[0]);
  }

  async remove(id: number, userId: string): Promise<{ success: boolean }> {
    const existing: TemplateRow = await this.findRow(id);
    if (existing.isSystem) {
      throw new ConflictException('系统内置模板不可删除');
    }
    const refs: { count: number | string }[] = await this.db
      .select({ count: count() })
      .from(scheduledReports)
      .where(
        and(
          eq(scheduledReports.reportTemplateId, id),
          isNull(scheduledReports.deletedAt),
        ),
      );
    if (Number(refs[0]?.count ?? 0) > 0) {
      throw new ConflictException('模板已被定时推送任务引用，无法删除');
    }
    const deleted: { id: number }[] = await this.db
      .update(reportTemplates)
      .set({ deletedAt: new Date(), updatedAt: new Date(), updatedBy: userId })
      .where(
        and(eq(reportTemplates.id, id), isNull(reportTemplates.deletedAt)),
      )
      .returning({ id: reportTemplates.id });
    if (deleted.length === 0) throw new NotFoundException('模板不存在');
    await this.operationLog.record({
      module: OPERATION_MODULE,
      actionType: '删除模板',
      target: truncateText(
        `${existing.templateNo} ${existing.templateName}`,
        255,
      ),
      operatorId: userId,
    });
    return { success: true };
  }

  async apply(
    id: number,
    dto: ReportTemplateApplyInput,
    userId: string,
  ): Promise<CustomReportRecord> {
    const existing: TemplateRow = await this.findRow(id);
    const reportName: string =
      dto?.reportName && dto.reportName.trim().length > 0
        ? dto.reportName.trim()
        : `${existing.templateName} 报表`;
    const incremented: { id: number }[] = await this.db
      .update(reportTemplates)
      .set({
        usageCount: sql`${reportTemplates.usageCount} + 1`,
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(
        and(eq(reportTemplates.id, id), isNull(reportTemplates.deletedAt)),
      )
      .returning({ id: reportTemplates.id });
    if (incremented.length === 0) throw new NotFoundException('模板不存在');
    const { row } = await insertWithSeqNo<ReportRow>({
      db: this.db,
      table: customReports,
      noColumn: customReports.reportNo,
      prefix: REPORT_NO_PREFIX,
      insert: (no: string) =>
        this.db
          .insert(customReports)
          .values({
            reportNo: no,
            reportName,
            reportType: '模板',
            dimensions: JSON.stringify(toStringArray(existing.dimensions)),
            metrics: JSON.stringify(toStringArray(existing.metrics)),
            chartType: existing.chartType,
            filters: JSON.stringify(toFilterArray(existing.defaultFilters)),
            timeRange: '本月',
            isPublic: false,
            sharedWith: JSON.stringify([]),
            createdBy: userId,
          })
          .returning(),
    });
    await this.operationLog.record({
      module: OPERATION_MODULE,
      actionType: '应用模板',
      target: truncateText(
        `${existing.templateNo} ${row.reportNo} ${reportName}`,
        255,
      ),
      operatorId: userId,
    });
    return mapReportRow(row);
  }

  async rating(
    id: number,
    dto: ReportTemplateRatingInput,
    userId: string,
  ): Promise<ReportTemplateRatingResponse> {
    if (
      typeof dto?.rating !== 'number' ||
      !Number.isInteger(dto.rating) ||
      dto.rating < 1 ||
      dto.rating > 5
    ) {
      throw new BadRequestException('评分必须为 1-5 的整数');
    }
    const existing: TemplateRow = await this.findRow(id);
    const ratingCount: number = existing.ratingCount + 1;
    const rating: number = Math.round(
      (existing.rating * existing.ratingCount + dto.rating) / ratingCount,
    );
    const updated: { rating: number; ratingCount: number }[] = await this.db
      .update(reportTemplates)
      .set({
        rating,
        ratingCount,
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(
        and(eq(reportTemplates.id, id), isNull(reportTemplates.deletedAt)),
      )
      .returning({
        rating: reportTemplates.rating,
        ratingCount: reportTemplates.ratingCount,
      });
    if (updated.length === 0) throw new NotFoundException('模板不存在');
    await this.operationLog.record({
      module: OPERATION_MODULE,
      actionType: '评分模板',
      target: truncateText(
        `${existing.templateNo} ${existing.templateName} ${dto.rating}星`,
        255,
      ),
      operatorId: userId,
    });
    return {
      rating: updated[0].rating,
      ratingCount: updated[0].ratingCount,
    };
  }

  async batchDelete(
    ids: number[],
    userId: string,
  ): Promise<ReportTemplateBatchDeleteResult> {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new BadRequestException('未提供待删除的模板 ID');
    }
    const existingRows: { id: number }[] = await this.db
      .select({ id: reportTemplates.id })
      .from(reportTemplates)
      .where(
        and(inArray(reportTemplates.id, ids), isNull(reportTemplates.deletedAt)),
      );
    const existingIds: Set<number> = new Set(
      existingRows.map((row: { id: number }): number => row.id),
    );
    const systemRows: { id: number }[] = await this.db
      .select({ id: reportTemplates.id })
      .from(reportTemplates)
      .where(
        and(
          inArray(reportTemplates.id, ids),
          isNull(reportTemplates.deletedAt),
          eq(reportTemplates.isSystem, true),
        ),
      );
    const systemIds: Set<number> = new Set(
      systemRows.map((row: { id: number }): number => row.id),
    );
    const refRows: { reportTemplateId: number | null }[] = await this.db
      .select({ reportTemplateId: scheduledReports.reportTemplateId })
      .from(scheduledReports)
      .where(
        and(
          inArray(scheduledReports.reportTemplateId, ids),
          isNull(scheduledReports.deletedAt),
        ),
      );
    const referencedIds: Set<number> = new Set(
      refRows
        .map((row: { reportTemplateId: number | null }): number | null => row.reportTemplateId)
        .filter((value: number | null): value is number => value !== null),
    );
    const deletable: number[] = ids.filter(
      (id: number): boolean =>
        existingIds.has(id) && !systemIds.has(id) && !referencedIds.has(id),
    );
    const failedIds: number[] = ids.filter(
      (id: number): boolean =>
        !existingIds.has(id) || systemIds.has(id) || referencedIds.has(id),
    );
    if (deletable.length > 0) {
      await this.db
        .update(reportTemplates)
        .set({ deletedAt: new Date(), updatedAt: new Date(), updatedBy: userId })
        .where(
          and(
            inArray(reportTemplates.id, deletable),
            isNull(reportTemplates.deletedAt),
          ),
        );
      await this.operationLog.record({
        module: OPERATION_MODULE,
        actionType: '批量删除模板',
        target: truncateText(deletable.join(','), 255),
        operatorId: userId,
      });
    }
    return { deletedIds: deletable, failedIds };
  }

  private async findRow(id: number): Promise<TemplateRow> {
    const rows: TemplateRow[] = await this.db
      .select()
      .from(reportTemplates)
      .where(
        and(eq(reportTemplates.id, id), isNull(reportTemplates.deletedAt)),
      );
    if (rows.length === 0) throw new NotFoundException('模板不存在');
    return rows[0];
  }
}
