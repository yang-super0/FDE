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
import { and, count, desc, eq, gte, isNull, lt, like, sql } from 'drizzle-orm';
import {
  dailyConsumptionSummary,
  departmentTargets,
} from '@server/database/schema';
import type {
  CreateDepartmentTargetRequest,
  DashboardTargetSummary,
  DashboardTargetSummaryItem,
  DepartmentTarget,
  DepartmentTargetListParams,
  DepartmentTargetListResult,
  TargetStatus,
  UpdateDepartmentTargetRequest,
} from '@shared/api.interface';
import { insertWithSeqNo } from '@server/modules/finance-core/fin-seq.util';
import { targetRange, todayString } from './wb-date.util';
import { OperationLogService } from '@server/modules/operation-log/operation-log.service';
import { publishSyncEvent } from '@server/modules/feishu-sync/sync-event.publisher';

type TargetRow = typeof departmentTargets.$inferSelect;

const TARGET_NO_PREFIX: string = 'MB';
const TARGET_TYPES: string[] = ['年度', '月度'];
const MAX_AMOUNT: number = 9999999999.99;

const mapTarget = (row: TargetRow): DepartmentTarget => ({
  id: row.id,
  targetNo: row.targetNo,
  year: row.year,
  month: row.month,
  targetType: row.targetType as DepartmentTarget['targetType'],
  department: row.department,
  targetConsumption: Number(row.targetConsumption),
  actualConsumption: Number(row.actualConsumption),
  completionRate: Number(row.completionRate),
  status: row.status as DepartmentTarget['status'],
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

@Injectable()
export class DepartmentTargetsService {
  private readonly logger: Logger = new Logger(DepartmentTargetsService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
    private readonly operationLogService: OperationLogService,
  ) {}

  private validateBase(
    year: number,
    month: number | undefined,
    targetType: string,
    targetConsumption: number,
  ): void {
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      throw new BadRequestException('年份非法');
    }
    if (targetType === '月度') {
      if (!Number.isInteger(month) || (month as number) < 1 || (month as number) > 12) {
        throw new BadRequestException('月份非法');
      }
    }
    if (targetConsumption <= 0 || targetConsumption > MAX_AMOUNT) {
      throw new BadRequestException('目标消耗金额非法');
    }
  }

  /** 单条目标的实际消耗（从日消耗汇总按部门聚合） */
  private async computeActual(
    department: string,
    targetType: string,
    year: number,
    month: number,
  ): Promise<number> {
    const range = targetRange(targetType, year, month);
    const rows: { total: string | null }[] = await this.db
      .select({ total: sql<string>`sum(${dailyConsumptionSummary.consumption})` })
      .from(dailyConsumptionSummary)
      .where(
        and(
          eq(dailyConsumptionSummary.department, department),
          gte(dailyConsumptionSummary.summaryDate, range.start),
          lt(dailyConsumptionSummary.summaryDate, range.end),
        ),
      );
    return Number(rows[0]?.total ?? 0);
  }

  private buildStatus(
    actual: number,
    rate: number,
    targetType: string,
    year: number,
    month: number,
  ): TargetStatus {
    if (rate >= 100) {
      return '已完成';
    }
    const range = targetRange(targetType, year, month);
    if (range.end <= todayString()) {
      return '未达标';
    }
    return actual > 0 ? '进行中' : '未开始';
  }

  /** 重算并持久化给定目标行的进度，返回最新行 */
  private async syncProgress(rows: TargetRow[]): Promise<Map<number, TargetRow>> {
    const result: Map<number, TargetRow> = new Map();
    const cache: Map<string, number> = new Map();
    for (const row of rows) {
      const cacheKey: string = `${row.department}|${row.targetType}|${row.year}|${row.month}`;
      let actual: number;
      if (cache.has(cacheKey)) {
        actual = cache.get(cacheKey) as number;
      } else {
        actual = await this.computeActual(row.department, row.targetType, row.year, row.month);
        cache.set(cacheKey, actual);
      }
      const target: number = Number(row.targetConsumption);
      const rate: number =
        target > 0 ? Math.round((actual / target) * 10000) / 100 : 0;
      const status: TargetStatus = this.buildStatus(
        actual,
        rate,
        row.targetType,
        row.year,
        row.month,
      );
      if (
        actual !== Number(row.actualConsumption) ||
        rate !== Number(row.completionRate) ||
        status !== row.status
      ) {
        const updated: TargetRow[] = await this.db
          .update(departmentTargets)
          .set({
            actualConsumption: actual.toFixed(2),
            completionRate: rate.toFixed(2),
            status,
            updatedAt: new Date(),
          })
          .where(eq(departmentTargets.id, row.id))
          .returning();
        if (updated.length > 0) {
          result.set(row.id, updated[0]);
        }
      } else {
        result.set(row.id, row);
      }
    }
    return result;
  }

  async findAll(params: DepartmentTargetListParams): Promise<DepartmentTargetListResult> {
    const conditions = [];
    if (params.year) {
      conditions.push(eq(departmentTargets.year, Number(params.year)));
    }
    if (params.targetType) {
      conditions.push(eq(departmentTargets.targetType, params.targetType));
    }
    if (params.department) {
      conditions.push(like(departmentTargets.department, `%${params.department}%`));
    }
    if (params.status) {
      conditions.push(eq(departmentTargets.status, params.status));
    }
    const page: number = Math.max(Number(params.page) || 1, 1);
    const pageSize: number = Math.min(Math.max(Number(params.pageSize) || 10, 1), 100);
    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const totalRows: { count: number | string }[] = await this.db
      .select({ count: count() })
      .from(departmentTargets)
      .where(where);
    const rows: TargetRow[] = await this.db
      .select()
      .from(departmentTargets)
      .where(where)
      .orderBy(desc(departmentTargets.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    const synced: Map<number, TargetRow> = await this.syncProgress(rows);
    const items: DepartmentTarget[] = rows.map((row: TargetRow): DepartmentTarget =>
      mapTarget(synced.get(row.id) ?? row),
    );
    return { items, total: Number(totalRows[0]?.count ?? 0) };
  }

  async create(
    dto: CreateDepartmentTargetRequest,
    operatorId: string,
  ): Promise<DepartmentTarget> {
    if (!TARGET_TYPES.includes(dto.targetType)) {
      throw new BadRequestException('目标类型非法');
    }
    this.validateBase(
      Number(dto.year),
      dto.month === undefined ? undefined : Number(dto.month),
      dto.targetType,
      Number(dto.targetConsumption),
    );
    if (!dto.department?.trim()) {
      throw new BadRequestException('部门不能为空');
    }
    const monthValue: number = dto.targetType === '月度' ? Number(dto.month) : 1;
    const inserted = await insertWithSeqNo<TargetRow>({
      db: this.db,
      table: departmentTargets,
      noColumn: departmentTargets.targetNo,
      prefix: TARGET_NO_PREFIX,
      insert: (no: string): Promise<TargetRow[]> =>
        this.db
          .insert(departmentTargets)
          .values({
            targetNo: no,
            year: Number(dto.year),
            month: monthValue,
            targetType: dto.targetType,
            department: dto.department.trim(),
            targetConsumption: Number(dto.targetConsumption).toFixed(2),
            createdBy: operatorId,
          })
          .returning(),
    });
    const synced: Map<number, TargetRow> = await this.syncProgress([inserted.row]);
    const target: DepartmentTarget = mapTarget(synced.get(inserted.row.id) ?? inserted.row);
    await this.operationLogService.record({
      module: '目标管理',
      actionType: '新建',
      target: target.targetNo,
      operatorId,
    });
    publishSyncEvent('department_targets', inserted.row.id, 'create');
    return target;
  }

  async findOne(id: number): Promise<DepartmentTarget> {
    const rows: TargetRow[] = await this.db
      .select()
      .from(departmentTargets)
      .where(and(eq(departmentTargets.id, id), isNull(departmentTargets.deletedAt)));
    if (rows.length === 0) {
      throw new NotFoundException('目标不存在');
    }
    const synced: Map<number, TargetRow> = await this.syncProgress(rows);
    return mapTarget(synced.get(id) ?? rows[0]);
  }

  async update(
    id: number,
    dto: UpdateDepartmentTargetRequest,
    operatorId: string,
  ): Promise<DepartmentTarget> {
    const rows: TargetRow[] = await this.db
      .select()
      .from(departmentTargets)
      .where(and(eq(departmentTargets.id, id), isNull(departmentTargets.deletedAt)));
    if (rows.length === 0) {
      throw new NotFoundException('目标不存在');
    }
    const current: TargetRow = rows[0];
    const patch: Partial<TargetRow> = {};
    if (dto.targetType !== undefined) {
      if (!TARGET_TYPES.includes(dto.targetType)) {
        throw new BadRequestException('目标类型非法');
      }
      patch.targetType = dto.targetType;
    }
    const nextType: string = patch.targetType ?? current.targetType;
    const nextYear: number = dto.year !== undefined ? Number(dto.year) : current.year;
    const nextMonth: number | undefined =
      dto.month !== undefined ? Number(dto.month) : current.month;
    const nextTarget: number =
      dto.targetConsumption !== undefined
        ? Number(dto.targetConsumption)
        : Number(current.targetConsumption);
    this.validateBase(nextYear, nextMonth, nextType, nextTarget);
    patch.year = nextYear;
    patch.month = nextType === '月度' ? (nextMonth as number) : 1;
    patch.targetConsumption = nextTarget.toFixed(2);
    if (dto.department !== undefined) {
      if (!dto.department.trim()) {
        throw new BadRequestException('部门不能为空');
      }
      patch.department = dto.department.trim();
    }
    patch.updatedAt = new Date();
    const updated: TargetRow[] = await this.db
      .update(departmentTargets)
      .set(patch)
      .where(eq(departmentTargets.id, id))
      .returning();
    const synced: Map<number, TargetRow> = await this.syncProgress(updated);
    const target: DepartmentTarget = mapTarget(synced.get(id) ?? updated[0]);
    await this.operationLogService.record({
      module: '目标管理',
      actionType: '编辑',
      target: target.targetNo,
      operatorId,
    });
    publishSyncEvent('department_targets', id, 'update');
    return target;
  }

  async remove(id: number, operatorId: string): Promise<{ id: number }> {
    const rows: TargetRow[] = await this.db
      .select()
      .from(departmentTargets)
      .where(and(eq(departmentTargets.id, id), isNull(departmentTargets.deletedAt)));
    if (rows.length === 0) {
      throw new NotFoundException('目标不存在');
    }
    if (rows[0].status === '已完成') {
      throw new ConflictException('已完成目标禁止删除');
    }
    await this.db
      .delete(departmentTargets)
      .where(eq(departmentTargets.id, id));
    publishSyncEvent('department_targets', id, 'delete');
    await this.operationLogService.record({
      module: '目标管理',
      actionType: '删除',
      target: rows[0].targetNo,
      operatorId,
    });
    return { id };
  }

  async recalculate(id: number, operatorId: string): Promise<DepartmentTarget> {
    const rows: TargetRow[] = await this.db
      .select()
      .from(departmentTargets)
      .where(and(eq(departmentTargets.id, id), isNull(departmentTargets.deletedAt)));
    if (rows.length === 0) {
      throw new NotFoundException('目标不存在');
    }
    const synced: Map<number, TargetRow> = await this.syncProgress(rows);
    const target: DepartmentTarget = mapTarget(synced.get(id) ?? rows[0]);
    await this.operationLogService.record({
      module: '目标管理',
      actionType: '重算',
      target: target.targetNo,
      operatorId,
    });
    return target;
  }

  /** 工作台目标汇总：月度取当月，年度取当年 */
  async summary(targetType: string): Promise<DashboardTargetSummary> {
    if (!TARGET_TYPES.includes(targetType)) {
      throw new BadRequestException('目标类型非法');
    }
    const today: string = todayString();
    const [year, month] = today.split('-').map((part: string): number => Number(part));
    const conditions = [
      eq(departmentTargets.targetType, targetType),
      eq(departmentTargets.year, year),
      isNull(departmentTargets.deletedAt),
    ];
    if (targetType === '月度') {
      conditions.push(eq(departmentTargets.month, month));
    }
    const rows: TargetRow[] = await this.db
      .select()
      .from(departmentTargets)
      .where(and(...conditions))
      .orderBy(desc(departmentTargets.completionRate));
    const synced: Map<number, TargetRow> = await this.syncProgress(rows);
    const items: DashboardTargetSummaryItem[] = rows.map(
      (row: TargetRow): DashboardTargetSummaryItem => {
        const latest: TargetRow = synced.get(row.id) ?? row;
        return {
          department: latest.department,
          targetConsumption: Number(latest.targetConsumption),
          actualConsumption: Number(latest.actualConsumption),
          completionRate: Number(latest.completionRate),
          status: latest.status as TargetStatus,
        };
      },
    );
    return { targetType: targetType as DashboardTargetSummary['targetType'], items };
  }
}
