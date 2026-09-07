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
import {
  and,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  like,
  lte,
  type SQL,
} from 'drizzle-orm';
import type {
  CustomReportCreateInput,
  CustomReportListParams,
  CustomReportListResponse,
  CustomReportRecord,
  CustomReportShareInput,
  CustomReportUpdateInput,
  ReportRunParams,
  ReportRunResult,
  ReportTemplateCreateInput,
  ReportTemplateRecord,
} from '@shared/api.interface';
import {
  customReports,
  scheduledReports,
} from '@server/database/schema';
import { insertWithSeqNo } from '@server/modules/finance-core/fin-seq.util';
import { OperationLogService } from '@server/modules/operation-log/operation-log.service';
import { runReport } from './report-engine.util';
import { toFilterArray, toStringArray, truncateText } from './scheduled-reports.util';
import { ReportTemplatesService } from './report-templates.service';

type ReportRow = typeof customReports.$inferSelect;
type ReportInsert = typeof customReports.$inferInsert;

export interface CustomReportBatchDeleteResult {
  deletedIds: number[];
  failedIds: number[];
}

const REPORT_NO_PREFIX: string = 'BB';
const REPORT_NAME_MAX_LENGTH: number = 200;
const OPERATION_MODULE: string = '报表中心';
const ISO_DATE_PATTERN: RegExp = /^\d{4}-\d{2}-\d{2}$/u;

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

function parseBoundary(
  value: string | undefined,
  endOfDay: boolean,
): Date | null {
  if (!value) return null;
  const date: Date = ISO_DATE_PATTERN.test(value)
    ? new Date(
        `${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}+08:00`,
      )
    : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

@Injectable()
export class CustomReportsService {
  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly templatesService: ReportTemplatesService,
    private readonly operationLog: OperationLogService,
  ) {}

  async list(
    params: CustomReportListParams,
  ): Promise<CustomReportListResponse> {
    const page: number = Math.max(Number(params.page) || 1, 1);
    const pageSize: number = Math.min(
      Math.max(Number(params.pageSize) || 20, 1),
      100,
    );
    const conditions: SQL[] = [isNull(customReports.deletedAt)];
    if (params.reportType) {
      conditions.push(eq(customReports.reportType, params.reportType));
    }
    if (params.keyword) {
      conditions.push(
        like(customReports.reportName, `%${params.keyword}%`),
      );
    }
    if (params.createdBy) {
      conditions.push(eq(customReports.createdBy, params.createdBy));
    }
    if (params.publicOnly === 'true') {
      conditions.push(eq(customReports.isPublic, true));
    }
    const fromBoundary: Date | null = parseBoundary(params.from, false);
    if (fromBoundary) {
      conditions.push(gte(customReports.createdAt, fromBoundary));
    }
    const toBoundary: Date | null = parseBoundary(params.to, true);
    if (toBoundary) {
      conditions.push(lte(customReports.createdAt, toBoundary));
    }
    const where: SQL = and(...conditions);

    const totalRows: { count: number | string }[] = await this.db
      .select({ count: count() })
      .from(customReports)
      .where(where);
    const rows: ReportRow[] = await this.db
      .select()
      .from(customReports)
      .where(where)
      .orderBy(desc(customReports.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    return {
      items: rows.map((row: ReportRow): CustomReportRecord => mapReportRow(row)),
      total: Number(totalRows[0]?.count ?? 0),
    };
  }

  async create(
    dto: CustomReportCreateInput,
    userId: string,
  ): Promise<CustomReportRecord> {
    if (!dto?.reportName || dto.reportName.trim().length === 0) {
      throw new BadRequestException('报表名称不能为空');
    }
    if (!Array.isArray(dto.dimensions) || dto.dimensions.length === 0) {
      throw new BadRequestException('分析维度不能为空');
    }
    if (!Array.isArray(dto.metrics) || dto.metrics.length === 0) {
      throw new BadRequestException('分析指标不能为空');
    }
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
            reportName: dto.reportName,
            reportType: dto.reportType ?? '自定义',
            dimensions: JSON.stringify(dto.dimensions),
            metrics: JSON.stringify(dto.metrics),
            chartType: dto.chartType ?? '表格',
            filters: JSON.stringify(dto.filters ?? []),
            timeRange: dto.timeRange ?? '本月',
            customStartDate: dto.customStartDate ?? null,
            customEndDate: dto.customEndDate ?? null,
            groupBy: dto.groupBy ?? null,
            sortBy: dto.sortBy ?? null,
            sortOrder: dto.sortOrder ?? '降序',
            isPublic: dto.isPublic ?? false,
            sharedWith: JSON.stringify(dto.sharedWith ?? []),
            remark: dto.remark ?? null,
            createdBy: userId,
          })
          .returning(),
    });
    await this.operationLog.record({
      module: OPERATION_MODULE,
      actionType: '创建报表',
      target: truncateText(`${row.reportNo} ${row.reportName}`, 255),
      operatorId: userId,
    });
    return mapReportRow(row);
  }

  async findById(id: number): Promise<CustomReportRecord> {
    const row: ReportRow = await this.findRow(id);
    return mapReportRow(row);
  }

  async update(
    id: number,
    dto: CustomReportUpdateInput,
    userId: string,
  ): Promise<CustomReportRecord> {
    const existing: ReportRow = await this.findRow(id);
    const patch: Partial<ReportInsert> = {};
    if (dto.reportName !== undefined) {
      if (!dto.reportName || dto.reportName.trim().length === 0) {
        throw new BadRequestException('报表名称不能为空');
      }
      patch.reportName = dto.reportName;
    }
    if (dto.reportType !== undefined) patch.reportType = dto.reportType;
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
    if (dto.filters !== undefined) {
      patch.filters = JSON.stringify(dto.filters);
    }
    if (dto.timeRange !== undefined) patch.timeRange = dto.timeRange;
    if (dto.customStartDate !== undefined) {
      patch.customStartDate = dto.customStartDate;
    }
    if (dto.customEndDate !== undefined) {
      patch.customEndDate = dto.customEndDate;
    }
    if (dto.groupBy !== undefined) patch.groupBy = dto.groupBy;
    if (dto.sortBy !== undefined) patch.sortBy = dto.sortBy;
    if (dto.sortOrder !== undefined) patch.sortOrder = dto.sortOrder;
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
    const updated: ReportRow[] = await this.db
      .update(customReports)
      .set(patch)
      .where(and(eq(customReports.id, id), isNull(customReports.deletedAt)))
      .returning();
    if (updated.length === 0) throw new NotFoundException('报表不存在');
    await this.operationLog.record({
      module: OPERATION_MODULE,
      actionType: '更新报表',
      target: truncateText(
        `${existing.reportNo} ${updated[0].reportName}`,
        255,
      ),
      operatorId: userId,
    });
    return mapReportRow(updated[0]);
  }

  async remove(id: number, userId: string): Promise<{ success: boolean }> {
    const existing: ReportRow = await this.findRow(id);
    const refs: { count: number | string }[] = await this.db
      .select({ count: count() })
      .from(scheduledReports)
      .where(
        and(
          eq(scheduledReports.reportId, id),
          isNull(scheduledReports.deletedAt),
        ),
      );
    if (Number(refs[0]?.count ?? 0) > 0) {
      throw new ConflictException('报表已被定时推送任务引用，无法删除');
    }
    const deleted: { id: number }[] = await this.db
      .update(customReports)
      .set({ deletedAt: new Date(), updatedAt: new Date(), updatedBy: userId })
      .where(and(eq(customReports.id, id), isNull(customReports.deletedAt)))
      .returning({ id: customReports.id });
    if (deleted.length === 0) throw new NotFoundException('报表不存在');
    await this.operationLog.record({
      module: OPERATION_MODULE,
      actionType: '删除报表',
      target: truncateText(`${existing.reportNo} ${existing.reportName}`, 255),
      operatorId: userId,
    });
    return { success: true };
  }

  async copy(id: number, userId: string): Promise<CustomReportRecord> {
    const existing: ReportRow = await this.findRow(id);
    const copiedName: string = truncateText(
      `${existing.reportName}-副本`,
      REPORT_NAME_MAX_LENGTH,
    );
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
            reportName: copiedName,
            reportType: existing.reportType,
            dimensions: JSON.stringify(toStringArray(existing.dimensions)),
            metrics: JSON.stringify(toStringArray(existing.metrics)),
            chartType: existing.chartType,
            filters: JSON.stringify(toFilterArray(existing.filters)),
            timeRange: existing.timeRange,
            customStartDate: existing.customStartDate,
            customEndDate: existing.customEndDate,
            groupBy: existing.groupBy,
            sortBy: existing.sortBy,
            sortOrder: existing.sortOrder,
            isPublic: false,
            sharedWith: JSON.stringify([]),
            remark: existing.remark,
            createdBy: userId,
          })
          .returning(),
    });
    await this.operationLog.record({
      module: OPERATION_MODULE,
      actionType: '复制报表',
      target: truncateText(`${row.reportNo} ${row.reportName}`, 255),
      operatorId: userId,
    });
    return mapReportRow(row);
  }

  async share(
    id: number,
    dto: CustomReportShareInput,
    userId: string,
  ): Promise<CustomReportRecord> {
    const existing: ReportRow = await this.findRow(id);
    const patch: Partial<ReportInsert> = {
      isPublic: dto.isPublic,
      updatedAt: new Date(),
      updatedBy: userId,
    };
    if (dto.sharedWith !== undefined) {
      patch.sharedWith = JSON.stringify(dto.sharedWith);
    }
    const updated: ReportRow[] = await this.db
      .update(customReports)
      .set(patch)
      .where(and(eq(customReports.id, id), isNull(customReports.deletedAt)))
      .returning();
    if (updated.length === 0) throw new NotFoundException('报表不存在');
    await this.operationLog.record({
      module: OPERATION_MODULE,
      actionType: '分享报表',
      target: truncateText(
        `${existing.reportNo} ${updated[0].reportName} ${
          dto.isPublic ? '公开' : '私有'
        }`,
        255,
      ),
      operatorId: userId,
    });
    return mapReportRow(updated[0]);
  }

  async saveAsTemplate(
    id: number,
    dto: ReportTemplateCreateInput,
    userId: string,
  ): Promise<ReportTemplateRecord> {
    await this.findRow(id);
    return this.templatesService.create(dto, userId);
  }

  async run(
    id: number,
    params?: ReportRunParams,
  ): Promise<ReportRunResult> {
    const row: ReportRow = await this.findRow(id);
    const dimensions: string[] =
      params?.dimensions ?? toStringArray(row.dimensions);
    const metrics: string[] = params?.metrics ?? toStringArray(row.metrics);
    return runReport(this.db, {
      dimensions,
      metrics,
      chartType: params?.chartType ?? row.chartType,
      timeRange: params?.timeRange ?? row.timeRange,
      customStartDate: params?.customStartDate ?? row.customStartDate,
      customEndDate: params?.customEndDate ?? row.customEndDate,
      filters: toFilterArray(row.filters),
      sortBy: params?.sortBy ?? row.sortBy,
      sortOrder: params?.sortOrder ?? row.sortOrder,
      page: Number(params?.page) || 1,
      pageSize: Number(params?.pageSize) || 20,
    });
  }

  async preview(id: number): Promise<ReportRunResult> {
    return this.run(id);
  }

  async batchDelete(
    ids: number[],
    userId: string,
  ): Promise<CustomReportBatchDeleteResult> {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new BadRequestException('未提供待删除的报表 ID');
    }
    const existingRows: { id: number }[] = await this.db
      .select({ id: customReports.id })
      .from(customReports)
      .where(
        and(inArray(customReports.id, ids), isNull(customReports.deletedAt)),
      );
    const existingIds: Set<number> = new Set(
      existingRows.map((row: { id: number }): number => row.id),
    );
    const refRows: { reportId: number | null }[] = await this.db
      .select({ reportId: scheduledReports.reportId })
      .from(scheduledReports)
      .where(
        and(
          inArray(scheduledReports.reportId, ids),
          isNull(scheduledReports.deletedAt),
        ),
      );
    const referencedIds: Set<number> = new Set(
      refRows
        .map(
          (row: { reportId: number | null }): number | null => row.reportId,
        )
        .filter((value: number | null): value is number => value !== null),
    );
    const deletable: number[] = ids.filter(
      (id: number): boolean =>
        existingIds.has(id) && !referencedIds.has(id),
    );
    const failedIds: number[] = ids.filter(
      (id: number): boolean =>
        !existingIds.has(id) || referencedIds.has(id),
    );
    if (deletable.length > 0) {
      await this.db
        .update(customReports)
        .set({ deletedAt: new Date(), updatedAt: new Date(), updatedBy: userId })
        .where(
          and(
            inArray(customReports.id, deletable),
            isNull(customReports.deletedAt),
          ),
        );
      await this.operationLog.record({
        module: OPERATION_MODULE,
        actionType: '批量删除报表',
        target: truncateText(deletable.join(','), 255),
        operatorId: userId,
      });
    }
    return { deletedIds: deletable, failedIds };
  }

  private async findRow(id: number): Promise<ReportRow> {
    const rows: ReportRow[] = await this.db
      .select()
      .from(customReports)
      .where(and(eq(customReports.id, id), isNull(customReports.deletedAt)));
    if (rows.length === 0) throw new NotFoundException('报表不存在');
    return rows[0];
  }
}
