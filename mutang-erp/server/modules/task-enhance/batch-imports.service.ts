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
import { batchImports } from '@server/database/schema';
import type {
  BatchImport,
  BatchImportCreateDto,
  BatchImportFinishDto,
  BatchImportListParams,
  TaskEnhanceListResponse,
} from '@shared/api.interface';
import { insertWithSeqNo } from '../finance-core/fin-seq.util';
import {
  assertTaskEnhanceEnum,
  assertTaskEnhanceNonNegativeInt,
  assertTaskEnhanceRequired,
  resolveTaskEnhanceDateRange,
  resolveTaskEnhancePagination,
  resolveTaskEnhanceSortColumn,
  resolveTaskEnhanceSortOrder,
  toIsoOrNull,
} from './task-enhance-shared.util';

type ImportRow = typeof batchImports.$inferSelect;
type ImportInsert = typeof batchImports.$inferInsert;

const IMPORT_NO_PREFIX: string = 'DR';
const BATCH_IMPORT_TYPES: string[] = [
  '客户',
  '供应商',
  '商品',
  '订单',
  '财务',
  '员工',
  '其他',
];
const IMPORT_STATUS_PENDING: string = '待处理';
const IMPORT_STATUS_RUNNING: string = '处理中';
const IMPORT_STATUS_DONE: string = '已完成';
const IMPORT_STATUS_FAILED: string = '失败';
const IMPORT_STATUS_PARTIAL: string = '部分失败';

function mapImport(row: ImportRow): BatchImport {
  return {
    id: row.id,
    importNo: row.importNo,
    importType: row.importType,
    fileName: row.fileName,
    fileUrl: row.fileUrl,
    totalCount: row.totalCount,
    successCount: row.successCount,
    failCount: row.failCount,
    status: row.status,
    errorLog: row.errorLog,
    remark: row.remark,
    createdBy: row.createdBy,
    createdAt: toIsoOrNull(row.createdAt) ?? '',
    completedAt: toIsoOrNull(row.completedAt),
  };
}

@Injectable()
export class BatchImportsService {
  private readonly logger = new Logger(BatchImportsService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
  ) {}

  async list(
    params: BatchImportListParams,
  ): Promise<TaskEnhanceListResponse<BatchImport>> {
    const { page, pageSize, offset } = resolveTaskEnhancePagination(
      params.page,
      params.pageSize,
    );
    const conditions: SQL[] = [isNull(batchImports.deletedAt)];
    if (params.importType) {
      conditions.push(eq(batchImports.importType, params.importType));
    }
    if (params.status) {
      conditions.push(eq(batchImports.status, params.status));
    }
    const range = resolveTaskEnhanceDateRange(params.dateFrom, params.dateTo);
    if (range.from) conditions.push(gte(batchImports.createdAt, range.from));
    if (range.to) conditions.push(lt(batchImports.createdAt, range.to));
    const where = and(...conditions);
    const sortColumn: PgColumn =
      resolveTaskEnhanceSortColumn(params.sortBy, {
        importNo: batchImports.importNo,
        totalCount: batchImports.totalCount,
        successCount: batchImports.successCount,
        failCount: batchImports.failCount,
        completedAt: batchImports.completedAt,
      }) ?? batchImports.createdAt;
    const orderBy =
      resolveTaskEnhanceSortOrder(params.sortOrder) === 'asc'
        ? asc(sortColumn)
        : desc(sortColumn);
    const totalRows: { count: number | string }[] = await this.db
      .select({ count: count() })
      .from(batchImports)
      .where(where);
    const rows: ImportRow[] = await this.db
      .select()
      .from(batchImports)
      .where(where)
      .orderBy(orderBy)
      .limit(pageSize)
      .offset(offset);
    return {
      items: rows.map((row: ImportRow) => mapImport(row)),
      total: Number(totalRows[0]?.count ?? 0),
      page,
      pageSize,
    };
  }

  async create(
    dto: BatchImportCreateDto,
    userId: string,
  ): Promise<BatchImport> {
    const importType: string = assertTaskEnhanceEnum(
      dto?.importType,
      BATCH_IMPORT_TYPES,
      '导入类型',
    );
    const fileName: string = assertTaskEnhanceRequired(dto?.fileName, '文件名');
    const totalCount: number = assertTaskEnhanceNonNegativeInt(
      dto?.totalCount,
      '总条数',
    );
    const { row } = await insertWithSeqNo<ImportRow>({
      db: this.db,
      table: batchImports,
      noColumn: batchImports.importNo,
      prefix: IMPORT_NO_PREFIX,
      insert: (no: string) =>
        this.db
          .insert(batchImports)
          .values({
            importNo: no,
            importType,
            fileName,
            fileUrl: dto?.fileUrl ?? null,
            totalCount,
            status: IMPORT_STATUS_PENDING,
            remark: dto?.remark ?? null,
            createdBy: userId,
            updatedBy: userId,
          } satisfies ImportInsert)
          .returning(),
    });
    this.logger.log(
      `批量导入创建成功 id=${String(row.id)} no=${row.importNo}`,
    );
    return mapImport(row);
  }

  async findById(id: number): Promise<BatchImport> {
    const existing: ImportRow = await this.findImportOrThrow(id);
    return mapImport(existing);
  }

  async start(id: number, userId: string): Promise<BatchImport> {
    const existing: ImportRow = await this.findImportOrThrow(id);
    if (existing.status !== IMPORT_STATUS_PENDING) {
      throw new BadRequestException('仅待处理的导入任务可以开始');
    }
    const updated: ImportRow[] = await this.db
      .update(batchImports)
      .set({
        status: IMPORT_STATUS_RUNNING,
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(
        and(
          eq(batchImports.id, id),
          eq(batchImports.status, IMPORT_STATUS_PENDING),
          isNull(batchImports.deletedAt),
        ),
      )
      .returning();
    if (updated.length === 0) {
      throw new ConflictException('导入任务状态已变更，请刷新后重试');
    }
    return mapImport(updated[0]);
  }

  async finish(
    id: number,
    dto: BatchImportFinishDto,
    userId: string,
  ): Promise<BatchImport> {
    const existing: ImportRow = await this.findImportOrThrow(id);
    if (existing.status !== IMPORT_STATUS_RUNNING) {
      throw new BadRequestException('仅处理中的导入任务可以完成');
    }
    const totalCount: number = existing.totalCount;
    const successCount: number = assertTaskEnhanceNonNegativeInt(
      dto?.successCount ?? totalCount,
      '成功条数',
    );
    const failCount: number = assertTaskEnhanceNonNegativeInt(
      dto?.failCount ?? 0,
      '失败条数',
    );
    if (successCount + failCount > totalCount) {
      throw new BadRequestException('成功+失败条数不能超过总条数');
    }
    const finalStatus: string =
      failCount === 0
        ? IMPORT_STATUS_DONE
        : successCount === 0
          ? IMPORT_STATUS_FAILED
          : IMPORT_STATUS_PARTIAL;
    const updated: ImportRow[] = await this.db
      .update(batchImports)
      .set({
        status: finalStatus,
        successCount,
        failCount,
        completedAt: new Date(),
        errorLog: dto?.errorLog ?? existing.errorLog,
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(
        and(
          eq(batchImports.id, id),
          eq(batchImports.status, IMPORT_STATUS_RUNNING),
          isNull(batchImports.deletedAt),
        ),
      )
      .returning();
    if (updated.length === 0) {
      throw new ConflictException('导入任务状态已变更，请刷新后重试');
    }
    this.logger.log(
      `批量导入完成 id=${String(id)} status=${finalStatus} success=${String(successCount)} fail=${String(failCount)}`,
    );
    return mapImport(updated[0]);
  }

  async remove(id: number, userId: string): Promise<{ success: boolean }> {
    const existing: ImportRow = await this.findImportOrThrow(id);
    if (existing.status === IMPORT_STATUS_RUNNING) {
      throw new ConflictException('处理中的导入任务不能删除');
    }
    const updated: { id: number }[] = await this.db
      .update(batchImports)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(
        and(eq(batchImports.id, id), isNull(batchImports.deletedAt)),
      )
      .returning({ id: batchImports.id });
    if (updated.length === 0) throw new NotFoundException('导入记录不存在');
    return { success: true };
  }

  private async findImportOrThrow(id: number): Promise<ImportRow> {
    const rows: ImportRow[] = await this.db
      .select()
      .from(batchImports)
      .where(and(eq(batchImports.id, id), isNull(batchImports.deletedAt)));
    if (rows.length === 0) throw new NotFoundException('导入记录不存在');
    return rows[0];
  }
}
