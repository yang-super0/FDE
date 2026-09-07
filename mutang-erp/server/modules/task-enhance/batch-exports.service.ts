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
  isNull,
  lt,
  type SQL,
} from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';
import { batchExports } from '@server/database/schema';
import type {
  BatchExport,
  BatchExportCreateDto,
  BatchExportFinishDto,
  BatchExportListParams,
  TaskEnhanceListResponse,
} from '@shared/api.interface';
import { insertWithSeqNo } from '../finance-core/fin-seq.util';
import {
  assertTaskEnhanceEnum,
  assertTaskEnhanceNonNegativeInt,
  assertTaskEnhanceRequired,
  castTaskEnhanceRecord,
  castTaskEnhanceStringArray,
  resolveTaskEnhanceDateRange,
  resolveTaskEnhancePagination,
  resolveTaskEnhanceSortColumn,
  resolveTaskEnhanceSortOrder,
  toIsoOrNull,
} from './task-enhance-shared.util';

type ExportRow = typeof batchExports.$inferSelect;
type ExportInsert = typeof batchExports.$inferInsert;

const EXPORT_NO_PREFIX: string = 'DC';
const BATCH_EXPORT_TYPES: string[] = [
  '客户',
  '供应商',
  '商品',
  '订单',
  '财务',
  '员工',
  '自定义',
];
const EXPORT_STATUS_PENDING: string = '待处理';
const EXPORT_STATUS_RUNNING: string = '处理中';
const EXPORT_STATUS_DONE: string = '已完成';
const EXPORT_STATUS_FAILED: string = '失败';
const EXPORT_DEFAULT_EXPIRE_DAYS: number = 7;
const TASK_ENHANCE_DAY_MS: number = 86400000;

/** 已完成且已过期的导出 → expired = true */
function isExportExpired(status: string, expireAt: Date | null): boolean {
  if (status !== EXPORT_STATUS_DONE || !expireAt) return false;
  return expireAt.getTime() < Date.now();
}

function mapExport(row: ExportRow): BatchExport {
  return {
    id: row.id,
    exportNo: row.exportNo,
    exportType: row.exportType,
    exportName: row.exportName,
    filters: castTaskEnhanceRecord(row.filters),
    fields: castTaskEnhanceStringArray(row.fields),
    totalCount: row.totalCount,
    fileUrl: row.fileUrl,
    status: row.status,
    expired: isExportExpired(row.status, row.expireAt),
    createdAt: toIsoOrNull(row.createdAt) ?? '',
    createdBy: row.createdBy,
    completedAt: toIsoOrNull(row.completedAt),
    expireAt: toIsoOrNull(row.expireAt),
    remark: row.remark,
  };
}

@Injectable()
export class BatchExportsService {
  private readonly logger = new Logger(BatchExportsService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
  ) {}

  async list(
    params: BatchExportListParams,
  ): Promise<TaskEnhanceListResponse<BatchExport>> {
    const { page, pageSize, offset } = resolveTaskEnhancePagination(
      params.page,
      params.pageSize,
    );
    const conditions: SQL[] = [isNull(batchExports.deletedAt)];
    if (params.exportType) {
      conditions.push(eq(batchExports.exportType, params.exportType));
    }
    if (params.status) {
      conditions.push(eq(batchExports.status, params.status));
    }
    const range = resolveTaskEnhanceDateRange(params.dateFrom, params.dateTo);
    if (range.from) conditions.push(gte(batchExports.createdAt, range.from));
    if (range.to) conditions.push(lt(batchExports.createdAt, range.to));
    const where = and(...conditions);
    const sortColumn: PgColumn =
      resolveTaskEnhanceSortColumn(params.sortBy, {
        exportNo: batchExports.exportNo,
        totalCount: batchExports.totalCount,
        expireAt: batchExports.expireAt,
        completedAt: batchExports.completedAt,
      }) ?? batchExports.createdAt;
    const orderBy =
      resolveTaskEnhanceSortOrder(params.sortOrder) === 'asc'
        ? asc(sortColumn)
        : desc(sortColumn);
    const totalRows: { count: number | string }[] = await this.db
      .select({ count: count() })
      .from(batchExports)
      .where(where);
    const rows: ExportRow[] = await this.db
      .select()
      .from(batchExports)
      .where(where)
      .orderBy(orderBy)
      .limit(pageSize)
      .offset(offset);
    return {
      items: rows.map((row: ExportRow) => mapExport(row)),
      total: Number(totalRows[0]?.count ?? 0),
      page,
      pageSize,
    };
  }

  async create(
    dto: BatchExportCreateDto,
    userId: string,
  ): Promise<BatchExport> {
    const exportType: string = assertTaskEnhanceEnum(
      dto?.exportType,
      BATCH_EXPORT_TYPES,
      '导出类型',
    );
    const exportName: string = assertTaskEnhanceRequired(
      dto?.exportName,
      '导出名称',
    );
    const expireDays: number =
      dto?.expireDays === undefined
        ? EXPORT_DEFAULT_EXPIRE_DAYS
        : Number(dto.expireDays);
    if (!Number.isInteger(expireDays) || expireDays < 1) {
      throw new BadRequestException('有效期天数必须为不小于1的整数');
    }
    const totalCount: number = assertTaskEnhanceNonNegativeInt(
      dto?.totalCount ?? 0,
      '总条数',
    );
    const expireAt: Date = new Date(Date.now() + expireDays * TASK_ENHANCE_DAY_MS);
    const { row } = await insertWithSeqNo<ExportRow>({
      db: this.db,
      table: batchExports,
      noColumn: batchExports.exportNo,
      prefix: EXPORT_NO_PREFIX,
      insert: (no: string) =>
        this.db
          .insert(batchExports)
          .values({
            exportNo: no,
            exportType,
            exportName,
            filters: dto?.filters ? JSON.stringify(dto.filters) : null,
            fields: dto?.fields ? JSON.stringify(dto.fields) : null,
            totalCount,
            status: EXPORT_STATUS_PENDING,
            expireAt,
            remark: dto?.remark ?? null,
            createdBy: userId,
            updatedBy: userId,
          } satisfies ExportInsert)
          .returning(),
    });
    this.logger.log(
      `批量导出创建成功 id=${String(row.id)} no=${row.exportNo}`,
    );
    return mapExport(row);
  }

  async findById(id: number): Promise<BatchExport> {
    const existing: ExportRow = await this.findExportOrThrow(id);
    return mapExport(existing);
  }

  async start(id: number, userId: string): Promise<BatchExport> {
    const existing: ExportRow = await this.findExportOrThrow(id);
    if (existing.status !== EXPORT_STATUS_PENDING) {
      throw new BadRequestException('仅待处理的导出任务可以开始');
    }
    const updated: ExportRow[] = await this.db
      .update(batchExports)
      .set({
        status: EXPORT_STATUS_RUNNING,
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(
        and(
          eq(batchExports.id, id),
          eq(batchExports.status, EXPORT_STATUS_PENDING),
          isNull(batchExports.deletedAt),
        ),
      )
      .returning();
    if (updated.length === 0) {
      throw new ConflictException('导出任务状态已变更，请刷新后重试');
    }
    return mapExport(updated[0]);
  }

  async finish(
    id: number,
    dto: BatchExportFinishDto,
    userId: string,
  ): Promise<BatchExport> {
    const existing: ExportRow = await this.findExportOrThrow(id);
    if (existing.status !== EXPORT_STATUS_RUNNING) {
      throw new BadRequestException('仅处理中的导出任务可以完成');
    }
    const totalCount: number =
      dto?.totalCount !== undefined
        ? assertTaskEnhanceNonNegativeInt(dto.totalCount, '总条数')
        : existing.totalCount;
    const failed: boolean = dto?.failed === true;
    const patch: Partial<ExportInsert> = {
      status: failed ? EXPORT_STATUS_FAILED : EXPORT_STATUS_DONE,
      totalCount,
      completedAt: new Date(),
      updatedAt: new Date(),
      updatedBy: userId,
    };
    if (!failed) {
      patch.fileUrl =
        dto?.fileUrl ?? `https://files.example.com/exports/${existing.exportNo}.xlsx`;
    }
    const updated: ExportRow[] = await this.db
      .update(batchExports)
      .set(patch)
      .where(
        and(
          eq(batchExports.id, id),
          eq(batchExports.status, EXPORT_STATUS_RUNNING),
          isNull(batchExports.deletedAt),
        ),
      )
      .returning();
    if (updated.length === 0) {
      throw new ConflictException('导出任务状态已变更，请刷新后重试');
    }
    this.logger.log(
      `批量导出完成 id=${String(id)} status=${patch.status ?? ''}`,
    );
    return mapExport(updated[0]);
  }

  async remove(id: number, userId: string): Promise<{ success: boolean }> {
    const existing: ExportRow = await this.findExportOrThrow(id);
    if (existing.status === EXPORT_STATUS_RUNNING) {
      throw new ConflictException('处理中的导出任务不能删除');
    }
    const updated: { id: number }[] = await this.db
      .update(batchExports)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(and(eq(batchExports.id, id), isNull(batchExports.deletedAt)))
      .returning({ id: batchExports.id });
    if (updated.length === 0) throw new NotFoundException('导出记录不存在');
    return { success: true };
  }

  private async findExportOrThrow(id: number): Promise<ExportRow> {
    const rows: ExportRow[] = await this.db
      .select()
      .from(batchExports)
      .where(and(eq(batchExports.id, id), isNull(batchExports.deletedAt)));
    if (rows.length === 0) throw new NotFoundException('导出记录不存在');
    return rows[0];
  }
}
