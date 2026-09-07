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
  ilike,
  isNull,
  lt,
  sql,
  type SQL,
} from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { operationLogs, systemSettings } from '@server/database/schema';
import type {
  OperationLogEnhance,
  OperationLogCreateDto,
  OperationLogEnhanceListParams,
  OperationLogStatItem,
  OperationLogStats,
  TaskEnhanceListResponse,
} from '@shared/api.interface';
import { insertWithSeqNo } from '../finance-core/fin-seq.util';
import {
  assertSystemEnhanceDate,
  assertSystemEnhanceEnum,
  assertSystemEnhanceRequired,
  parseSystemEnhanceJson,
  resolveSystemEnhancePagination,
  resolveSystemEnhanceSortColumn,
  resolveSystemEnhanceSortOrder,
  toSystemEnhanceIsoOrNull,
} from './system-enhance-shared.util';

/** 操作日志：编号 CZ、风险等级推导、定期归档 */
type OperationLogRow = typeof operationLogs.$inferSelect;
type OperationLogInsert = typeof operationLogs.$inferInsert;

const OPERATION_LOG_NO_PREFIX: string = 'CZ';
const OPERATION_LOG_STATUSES: string[] = [
  '新增',
  '编辑',
  '删除',
  '审批',
  '导出',
  '登录',
  '其他',
];
const HIGH_RISK_OPERATIONS: string[] = ['删除', '审批', '其他'];
const RISK_LEVELS: string[] = ['普通', '高风险'];
const STATS_TOP_LIMIT: number = 10;
const ONE_DAY_MS: number = 86400000;
const DEFAULT_RETENTION_DAYS: number = 90;
const SETTING_KEY_RETENTION: string = 'oplog.retention_days';

function mapOperationLog(row: OperationLogRow): OperationLogEnhance {
  return {
    id: row.id,
    logNo: row.logNo,
    userId: row.userId,
    username: row.username,
    module: row.module,
    operation: row.operation,
    targetType: row.targetType,
    targetId: row.targetId,
    targetName: row.targetName,
    beforeData: parseSystemEnhanceJson(row.beforeData),
    afterData: parseSystemEnhanceJson(row.afterData),
    riskLevel: row.riskLevel,
    ipAddress: row.ipAddress,
    userAgent: row.userAgent,
    archived: row.archived,
    remark: row.remark,
    createdAt: toSystemEnhanceIsoOrNull(row.createdAt) ?? '',
  };
}

/** 风险等级自动推导：删除/审批/其他 或 目标类型含 权限/密码 → 高风险 */
function deriveRiskLevel(operation: string, targetType: string): string {
  if (HIGH_RISK_OPERATIONS.includes(operation)) return '高风险';
  if (targetType.includes('权限') || targetType.includes('密码')) {
    return '高风险';
  }
  return '普通';
}

const OPERATION_LOG_SORT_COLUMN_MAP: Record<string, AnyPgColumn> = {
  createdAt: operationLogs.createdAt,
  module: operationLogs.module,
  operation: operationLogs.operation,
};

@Injectable()
export class OperationLogsEnhanceService {
  private readonly logger = new Logger(OperationLogsEnhanceService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
  ) {}

  async list(
    params: OperationLogEnhanceListParams,
  ): Promise<TaskEnhanceListResponse<OperationLogEnhance>> {
    const { page, pageSize, offset } = resolveSystemEnhancePagination(
      params.page,
      params.pageSize,
    );
    const conditions: SQL[] = [isNull(operationLogs.deletedAt)];
    if (params.module) {
      conditions.push(eq(operationLogs.module, params.module));
    }
    if (params.operation) {
      conditions.push(eq(operationLogs.operation, params.operation));
    }
    if (params.username) {
      conditions.push(ilike(operationLogs.username, `%${params.username}%`));
    }
    if (params.riskLevel) {
      conditions.push(
        eq(operationLogs.riskLevel, assertSystemEnhanceEnum(
          params.riskLevel,
          RISK_LEVELS,
          '风险等级',
        )),
      );
    }
    if (params.dateFrom) {
      const from: string = assertSystemEnhanceDate(
        params.dateFrom,
        '开始日期',
      );
      conditions.push(gte(operationLogs.createdAt, new Date(from)));
    }
    if (params.dateTo) {
      const to: string = assertSystemEnhanceDate(params.dateTo, '结束日期');
      conditions.push(
        lt(operationLogs.createdAt, new Date(new Date(to).getTime() + ONE_DAY_MS)),
      );
    }
    if (params.includeArchived !== 'true') {
      conditions.push(eq(operationLogs.archived, false));
    }
    const where = and(...conditions);
    const sortColumn =
      resolveSystemEnhanceSortColumn(
        params.sortBy,
        OPERATION_LOG_SORT_COLUMN_MAP,
      ) ?? operationLogs.createdAt;
    const orderBy =
      resolveSystemEnhanceSortOrder(params.sortOrder) === 'asc'
        ? asc(sortColumn)
        : desc(sortColumn);
    const totalRows: { count: number | string }[] = await this.db
      .select({ count: count() })
      .from(operationLogs)
      .where(where);
    const rows: OperationLogRow[] = await this.db
      .select()
      .from(operationLogs)
      .where(where)
      .orderBy(orderBy)
      .limit(pageSize)
      .offset(offset);
    return {
      items: rows.map((row: OperationLogRow): OperationLogEnhance =>
        mapOperationLog(row),
      ),
      total: Number(totalRows[0]?.count ?? 0),
      page,
      pageSize,
    };
  }

  async stats(): Promise<OperationLogStats> {
    const scope = and(
      isNull(operationLogs.deletedAt),
      eq(operationLogs.archived, false),
    );
    const totalRows: { count: number | string }[] = await this.db
      .select({ count: count() })
      .from(operationLogs)
      .where(scope);
    const byModuleRows: { name: string; count: number | string }[] =
      await this.db
        .select({ name: operationLogs.module, count: count() })
        .from(operationLogs)
        .where(scope)
        .groupBy(operationLogs.module)
        .orderBy(sql`count(*) desc`)
        .limit(STATS_TOP_LIMIT);
    const byOperationRows: { name: string; count: number | string }[] =
      await this.db
        .select({ name: operationLogs.operation, count: count() })
        .from(operationLogs)
        .where(scope)
        .groupBy(operationLogs.operation)
        .orderBy(sql`count(*) desc`)
        .limit(STATS_TOP_LIMIT);
    const byUserRows: { name: string; count: number | string }[] =
      await this.db
        .select({ name: operationLogs.username, count: count() })
        .from(operationLogs)
        .where(scope)
        .groupBy(operationLogs.username)
        .orderBy(sql`count(*) desc`)
        .limit(STATS_TOP_LIMIT);
    const toStatItems = (
      rows: { name: string; count: number | string }[],
    ): OperationLogStatItem[] =>
      rows.map(
        (row: { name: string; count: number | string }): OperationLogStatItem => ({
          name: row.name,
          count: Number(row.count),
        }),
      );
    return {
      totalCount: Number(totalRows[0]?.count ?? 0),
      byModule: toStatItems(byModuleRows),
      byOperation: toStatItems(byOperationRows),
      byUser: toStatItems(byUserRows),
    };
  }

  async detail(id: number): Promise<OperationLogEnhance> {
    const rows: OperationLogRow[] = await this.db
      .select()
      .from(operationLogs)
      .where(and(eq(operationLogs.id, id), isNull(operationLogs.deletedAt)))
      .limit(1);
    if (rows.length === 0) {
      throw new NotFoundException('操作日志不存在');
    }
    return mapOperationLog(rows[0]);
  }

  async create(
    dto: OperationLogCreateDto,
    userId: string,
    username: string,
  ): Promise<OperationLogEnhance> {
    const module: string = assertSystemEnhanceRequired(dto?.module, '模块');
    const operation: string = assertSystemEnhanceEnum(
      dto?.operation,
      OPERATION_LOG_STATUSES,
      '操作类型',
    );
    const targetType: string = assertSystemEnhanceRequired(
      dto?.targetType,
      '目标类型',
    );
    const riskLevel: string = deriveRiskLevel(operation, targetType);
    const values: OperationLogInsert = {
      logNo: '',
      userId,
      username,
      module,
      operation,
      targetType,
      targetId: dto?.targetId ?? null,
      targetName: dto?.targetName ?? null,
      beforeData: dto?.beforeData ?? null,
      afterData: dto?.afterData ?? null,
      riskLevel,
      ipAddress: dto?.ipAddress ?? null,
      userAgent: dto?.userAgent ?? null,
      archived: false,
      remark: dto?.remark ?? null,
      createdBy: userId,
      updatedBy: userId,
    };
    const { row } = await insertWithSeqNo<OperationLogRow>({
      db: this.db,
      table: operationLogs,
      noColumn: operationLogs.logNo,
      prefix: OPERATION_LOG_NO_PREFIX,
      insert: (no: string) =>
        this.db
          .insert(operationLogs)
          .values({ ...values, logNo: no })
          .returning(),
    });
    this.logger.log(`操作日志记录成功 id=${String(row.id)} no=${row.logNo}`);
    return mapOperationLog(row);
  }

  /** 归档：早于保留天数的未归档日志置 archived=true，返回生效行数 */
  async archive(userId: string): Promise<{ archived: number }> {
    const retentionDays: number = await this.readRetentionDays();
    const cutoff: Date = new Date(Date.now() - retentionDays * ONE_DAY_MS);
    const updated: { id: number }[] = await this.db
      .update(operationLogs)
      .set({
        archived: true,
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(
        and(
          lt(operationLogs.createdAt, cutoff),
          eq(operationLogs.archived, false),
          isNull(operationLogs.deletedAt),
        ),
      )
      .returning({ id: operationLogs.id });
    this.logger.log(
      `操作日志归档完成 days=${String(retentionDays)} count=${String(updated.length)}`,
    );
    return { archived: updated.length };
  }

  /** 读取归档保留天数：system_settings key='oplog.retention_days'，缺省 90 */
  private async readRetentionDays(): Promise<number> {
    const rows: { value: unknown }[] = await this.db
      .select({ value: systemSettings.settingValue })
      .from(systemSettings)
      .where(
        and(
          eq(systemSettings.settingKey, SETTING_KEY_RETENTION),
          isNull(systemSettings.deletedAt),
        ),
      )
      .limit(1);
    const raw: unknown = rows[0]?.value;
    if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) {
      return Math.floor(raw);
    }
    if (typeof raw === 'string') {
      const parsed: number = Number(raw);
      if (Number.isFinite(parsed) && parsed > 0) {
        return Math.floor(parsed);
      }
    }
    return DEFAULT_RETENTION_DAYS;
  }
}
