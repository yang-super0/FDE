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
import { and, count, desc, eq, ilike, isNull, or, SQL } from 'drizzle-orm';
import {
  department as departmentTable,
  employee,
  performanceTasks,
} from '@server/database/schema';
import type {
  ConfirmPerformanceTaskRequest,
  CreatePerformanceTaskRequest,
  PerformanceTask,
  PerformanceTaskListParams,
  PerformanceTaskListResult,
  PerformanceTaskSummary,
  RejectPerformanceTaskRequest,
  UpdatePerformanceTaskRequest,
} from '@shared/api.interface';
import { insertWithSeqNo } from '@server/modules/finance-core/fin-seq.util';
import { todayString } from './wb-date.util';
import { OperationLogService } from '@server/modules/operation-log/operation-log.service';

type TaskRow = typeof performanceTasks.$inferSelect;

const TASK_NO_PREFIX: string = 'JX';
const PENDING_STATUS: string = '待确认';
const CONFIRMED_STATUS: string = '已确认';
const REJECTED_STATUS: string = '已驳回';
const TASK_STATUSES: string[] = [PENDING_STATUS, CONFIRMED_STATUS, REJECTED_STATUS];
const MAX_SCORE_LIMIT: number = 10000;
const DATE_PATTERN: RegExp = /^\d{4}-\d{2}-\d{2}$/;

export interface UserContextLike {
  userId: string;
  userName: string;
}

export interface PerformanceScope {
  level: 'employee' | 'manager' | 'exec';
  department: string;
}

const mapTask = (row: TaskRow): PerformanceTask => ({
  id: row.id,
  taskNo: row.taskNo,
  taskName: row.taskName,
  taskType: row.taskType,
  department: row.department,
  personInCharge: row.personInCharge,
  assignee: row.assignee,
  score: row.score === null ? null : Number(row.score),
  maxScore: Number(row.maxScore),
  status: row.status as PerformanceTask['status'],
  confirmDate: row.confirmDate,
  confirmRemark: row.confirmRemark,
  dueDate: row.dueDate,
  description: row.description,
  createdAt: row.createdAt.toISOString(),
});

@Injectable()
export class PerformanceTasksService {
  private readonly logger: Logger = new Logger(PerformanceTasksService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
    private readonly operationLogService: OperationLogService,
  ) {}

  /** 权限：员工只看自己，部门经理看本部门，管理层看全部；无员工档案的账号视为管理层 */
  private async resolveScope(userName: string): Promise<PerformanceScope> {
    const rows: { position: string; departmentId: string | null }[] = await this.db
      .select({ position: employee.position, departmentId: employee.departmentId })
      .from(employee)
      .where(eq(employee.name, userName));
    if (rows.length === 0) {
      return { level: 'exec', department: '' };
    }
    const position: string = rows[0].position;
    if (/总经理|总监|CEO|管理层/.test(position)) {
      return { level: 'exec', department: '' };
    }
    if (/经理|主管/.test(position)) {
      const departmentId: string | null = rows[0].departmentId;
      if (departmentId) {
        const deptRows: { name: string }[] = await this.db
          .select({ name: departmentTable.name })
          .from(departmentTable)
          .where(eq(departmentTable.id, departmentId));
        if (deptRows.length > 0) {
          return { level: 'manager', department: deptRows[0].name };
        }
      }
      return { level: 'exec', department: '' };
    }
    return { level: 'employee', department: '' };
  }

  private scopeConditions(
    scope: PerformanceScope,
    userName: string,
  ): SQL[] {
    if (scope.level === 'employee') {
      return [eq(performanceTasks.assignee, userName)];
    }
    if (scope.level === 'manager') {
      return [eq(performanceTasks.department, scope.department)];
    }
    return [];
  }

  private async requireVisibleTask(
    id: number,
    scope: PerformanceScope,
    userName: string,
  ): Promise<TaskRow> {
    const conditions: SQL[] = [
      eq(performanceTasks.id, id),
      isNull(performanceTasks.deletedAt),
      ...this.scopeConditions(scope, userName),
    ];
    const rows: TaskRow[] = await this.db
      .select()
      .from(performanceTasks)
      .where(and(...conditions));
    if (rows.length === 0) {
      const existing: TaskRow[] = await this.db
        .select()
        .from(performanceTasks)
        .where(and(eq(performanceTasks.id, id), isNull(performanceTasks.deletedAt)));
      if (existing.length === 0) {
        throw new NotFoundException('任务不存在');
      }
      throw new NotFoundException('任务不存在或无权访问');
    }
    return rows[0];
  }

  private validateDate(value: string, label: string): void {
    if (!DATE_PATTERN.test(value)) {
      throw new BadRequestException(`${label}格式应为 YYYY-MM-DD`);
    }
  }

  async findAll(
    params: PerformanceTaskListParams,
    userContext: UserContextLike,
  ): Promise<PerformanceTaskListResult> {
    const scope: PerformanceScope = await this.resolveScope(userContext.userName);
    const conditions: SQL[] = [
      isNull(performanceTasks.deletedAt),
      ...this.scopeConditions(scope, userContext.userName),
    ];
    if (params.status) {
      if (!TASK_STATUSES.includes(params.status)) {
        throw new BadRequestException('状态筛选非法');
      }
      conditions.push(eq(performanceTasks.status, params.status));
    }
    if (params.department) {
      conditions.push(eq(performanceTasks.department, params.department));
    }
    if (params.keyword) {
      const keyword: string = `%${params.keyword}%`;
      const keywordCondition = or(
        ilike(performanceTasks.taskName, keyword),
        ilike(performanceTasks.taskNo, keyword),
      );
      if (keywordCondition) {
        conditions.push(keywordCondition);
      }
    }
    const page: number = Math.max(Number(params.page) || 1, 1);
    const pageSize: number = Math.min(Math.max(Number(params.pageSize) || 10, 1), 100);
    const where = and(...conditions);
    const totalRows: { count: number | string }[] = await this.db
      .select({ count: count() })
      .from(performanceTasks)
      .where(where);
    const rows: TaskRow[] = await this.db
      .select()
      .from(performanceTasks)
      .where(where)
      .orderBy(desc(performanceTasks.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    return {
      items: rows.map((row: TaskRow): PerformanceTask => mapTask(row)),
      total: Number(totalRows[0]?.count ?? 0),
    };
  }

  async summary(userContext: UserContextLike): Promise<PerformanceTaskSummary> {
    const scope: PerformanceScope = await this.resolveScope(userContext.userName);
    const rows: TaskRow[] = await this.db
      .select()
      .from(performanceTasks)
      .where(
        and(
          isNull(performanceTasks.deletedAt),
          ...this.scopeConditions(scope, userContext.userName),
        ),
      );
    const confirmedRows: TaskRow[] = rows.filter(
      (row: TaskRow): boolean => row.status === CONFIRMED_STATUS,
    );
    const avgScore: number =
      confirmedRows.length > 0
        ? Math.round(
            (confirmedRows.reduce(
              (sum: number, row: TaskRow): number => sum + Number(row.score ?? 0),
              0,
            ) /
              confirmedRows.length) *
              100,
          ) / 100
        : 0;
    const employeeScore: number = confirmedRows
      .filter((row: TaskRow): boolean => row.assignee === userContext.userName)
      .reduce((sum: number, row: TaskRow): number => sum + Number(row.score ?? 0), 0);
    return {
      departmentAvgScore: avgScore,
      personInCharge: userContext.userName,
      employeeScore: Math.round(employeeScore * 100) / 100,
      totalTasks: rows.length,
      confirmedCount: confirmedRows.length,
      pendingCount: rows.filter((row: TaskRow): boolean => row.status === PENDING_STATUS)
        .length,
    };
  }

  async create(
    dto: CreatePerformanceTaskRequest,
    operatorId: string,
  ): Promise<PerformanceTask> {
    if (!dto.taskName?.trim()) {
      throw new BadRequestException('任务名称不能为空');
    }
    if (!dto.taskType?.trim()) {
      throw new BadRequestException('任务类型不能为空');
    }
    if (!dto.department?.trim()) {
      throw new BadRequestException('部门不能为空');
    }
    if (!dto.personInCharge?.trim()) {
      throw new BadRequestException('绩效负责人不能为空');
    }
    if (!dto.assignee?.trim()) {
      throw new BadRequestException('员工不能为空');
    }
    const maxScore: number = dto.maxScore === undefined ? 100 : Number(dto.maxScore);
    if (maxScore <= 0 || maxScore > MAX_SCORE_LIMIT) {
      throw new BadRequestException('满分非法');
    }
    if (dto.dueDate) {
      this.validateDate(dto.dueDate, '截止日期');
    }
    const inserted = await insertWithSeqNo<TaskRow>({
      db: this.db,
      table: performanceTasks,
      noColumn: performanceTasks.taskNo,
      prefix: TASK_NO_PREFIX,
      insert: (no: string): Promise<TaskRow[]> =>
        this.db
          .insert(performanceTasks)
          .values({
            taskNo: no,
            taskName: dto.taskName.trim(),
            taskType: dto.taskType.trim(),
            department: dto.department.trim(),
            personInCharge: dto.personInCharge.trim(),
            assignee: dto.assignee.trim(),
            maxScore: maxScore.toFixed(2),
            confirmRemark: '',
            dueDate: dto.dueDate || null,
            description: dto.description ?? '',
            createdBy: operatorId,
          })
          .returning(),
    });
    await this.operationLogService.record({
      module: '绩效任务',
      actionType: '新建',
      target: inserted.row.taskNo,
      operatorId,
    });
    return mapTask(inserted.row);
  }

  async findOne(
    id: number,
    userContext: UserContextLike,
  ): Promise<PerformanceTask> {
    const scope: PerformanceScope = await this.resolveScope(userContext.userName);
    const row: TaskRow = await this.requireVisibleTask(id, scope, userContext.userName);
    return mapTask(row);
  }

  async update(
    id: number,
    dto: UpdatePerformanceTaskRequest,
    operatorId: string,
    userContext: UserContextLike,
  ): Promise<PerformanceTask> {
    const scope: PerformanceScope = await this.resolveScope(userContext.userName);
    const current: TaskRow = await this.requireVisibleTask(id, scope, userContext.userName);
    const patch: Partial<TaskRow> = {};
    if (dto.taskName !== undefined) {
      if (!dto.taskName.trim()) {
        throw new BadRequestException('任务名称不能为空');
      }
      patch.taskName = dto.taskName.trim();
    }
    if (dto.taskType !== undefined) {
      if (!dto.taskType.trim()) {
        throw new BadRequestException('任务类型不能为空');
      }
      patch.taskType = dto.taskType.trim();
    }
    if (dto.department !== undefined) {
      if (!dto.department.trim()) {
        throw new BadRequestException('部门不能为空');
      }
      patch.department = dto.department.trim();
    }
    if (dto.personInCharge !== undefined) {
      if (!dto.personInCharge.trim()) {
        throw new BadRequestException('绩效负责人不能为空');
      }
      patch.personInCharge = dto.personInCharge.trim();
    }
    if (dto.assignee !== undefined) {
      if (!dto.assignee.trim()) {
        throw new BadRequestException('员工不能为空');
      }
      patch.assignee = dto.assignee.trim();
    }
    if (dto.maxScore !== undefined) {
      const maxScore: number = Number(dto.maxScore);
      if (maxScore <= 0 || maxScore > MAX_SCORE_LIMIT) {
        throw new BadRequestException('满分非法');
      }
      patch.maxScore = maxScore.toFixed(2);
    }
    if (dto.dueDate !== undefined) {
      if (dto.dueDate) {
        this.validateDate(dto.dueDate, '截止日期');
      }
      patch.dueDate = dto.dueDate || null;
    }
    if (dto.description !== undefined) {
      patch.description = dto.description;
    }
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }
    patch.updatedAt = new Date();
    const updated: TaskRow[] = await this.db
      .update(performanceTasks)
      .set(patch)
      .where(eq(performanceTasks.id, current.id))
      .returning();
    if (updated.length === 0) {
      throw new NotFoundException('任务不存在');
    }
    await this.operationLogService.record({
      module: '绩效任务',
      actionType: '编辑',
      target: updated[0].taskNo,
      operatorId,
    });
    return mapTask(updated[0]);
  }

  async remove(
    id: number,
    operatorId: string,
    userContext: UserContextLike,
  ): Promise<{ id: number }> {
    const scope: PerformanceScope = await this.resolveScope(userContext.userName);
    const current: TaskRow = await this.requireVisibleTask(id, scope, userContext.userName);
    await this.db
      .update(performanceTasks)
      .set({ deletedAt: new Date() })
      .where(eq(performanceTasks.id, current.id));
    await this.operationLogService.record({
      module: '绩效任务',
      actionType: '删除',
      target: current.taskNo,
      operatorId,
    });
    return { id };
  }

  async confirm(
    id: number,
    dto: ConfirmPerformanceTaskRequest,
    operatorId: string,
    userContext: UserContextLike,
  ): Promise<PerformanceTask> {
    const scope: PerformanceScope = await this.resolveScope(userContext.userName);
    const current: TaskRow = await this.requireVisibleTask(id, scope, userContext.userName);
    if (current.status !== PENDING_STATUS) {
      throw new ConflictException('任务已确认或已驳回，不能重复操作');
    }
    const score: number = Number(dto?.score);
    if (!Number.isFinite(score) || score < 0 || score > Number(current.maxScore)) {
      throw new BadRequestException(
        `分值必须在 0 到 ${Number(current.maxScore)} 之间`,
      );
    }
    const updated: TaskRow[] = await this.db
      .update(performanceTasks)
      .set({
        status: CONFIRMED_STATUS,
        score: score.toFixed(2),
        confirmDate: todayString(),
        updatedAt: new Date(),
      })
      .where(
        and(eq(performanceTasks.id, current.id), eq(performanceTasks.status, PENDING_STATUS)),
      )
      .returning();
    if (updated.length === 0) {
      throw new ConflictException('任务已被处理，不能重复确认');
    }
    await this.operationLogService.record({
      module: '绩效任务',
      actionType: '确认',
      target: updated[0].taskNo,
      operatorId,
    });
    return mapTask(updated[0]);
  }

  async reject(
    id: number,
    dto: RejectPerformanceTaskRequest,
    operatorId: string,
    userContext: UserContextLike,
  ): Promise<PerformanceTask> {
    const scope: PerformanceScope = await this.resolveScope(userContext.userName);
    const current: TaskRow = await this.requireVisibleTask(id, scope, userContext.userName);
    if (current.status !== PENDING_STATUS) {
      throw new ConflictException('任务已确认或已驳回，不能重复操作');
    }
    if (!dto?.confirmRemark?.trim()) {
      throw new BadRequestException('驳回原因不能为空');
    }
    const updated: TaskRow[] = await this.db
      .update(performanceTasks)
      .set({
        status: REJECTED_STATUS,
        confirmRemark: dto.confirmRemark.trim(),
        confirmDate: todayString(),
        updatedAt: new Date(),
      })
      .where(
        and(eq(performanceTasks.id, current.id), eq(performanceTasks.status, PENDING_STATUS)),
      )
      .returning();
    if (updated.length === 0) {
      throw new ConflictException('任务已被处理，不能重复驳回');
    }
    await this.operationLogService.record({
      module: '绩效任务',
      actionType: '驳回',
      target: updated[0].taskNo,
      operatorId,
    });
    return mapTask(updated[0]);
  }
}
