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
  ilike,
  inArray,
  isNull,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import { collaborationTasks } from '@server/database/schema';
import type {
  CollaborationTask,
  CollaborationTaskBatchUpdateDto,
  CollaborationTaskCreateDto,
  CollaborationTaskListParams,
  CollaborationTaskStats,
  CollaborationTaskUpdateDto,
  TaskEnhanceListResponse,
  TaskStatItem,
} from '@shared/api.interface';
import { insertWithSeqNo } from '../finance-core/fin-seq.util';
import {
  assertTaskEnhanceDateString,
  assertTaskEnhanceEnum,
  assertTaskEnhanceRequired,
  castTaskEnhanceStringArray,
  resolveTaskEnhancePagination,
  resolveTaskEnhanceSortOrder,
  toIsoOrNull,
} from './task-enhance-shared.util';

type TaskRow = typeof collaborationTasks.$inferSelect;
type TaskInsert = typeof collaborationTasks.$inferInsert;

const TASK_NO_PREFIX: string = 'XZ';
const TASK_TYPES: string[] = ['日常工作', '项目任务', '临时任务', '其他'];
const TASK_PRIORITIES: string[] = ['高', '中', '低'];
const TASK_STATUSES: string[] = [
  '待开始',
  '进行中',
  '已完成',
  '已暂停',
  '已取消',
];
const TASK_STATUS_NOT_STARTED: string = '待开始';
const TASK_STATUS_RUNNING: string = '进行中';
const TASK_STATUS_DONE: string = '已完成';
const TASK_STATUS_PAUSED: string = '已暂停';
const TASK_STATUS_CANCELLED: string = '已取消';
const UNASSIGNED_NAME: string = '未分配';

function mapTask(row: TaskRow): CollaborationTask {
  return {
    id: row.id,
    taskNo: row.taskNo,
    title: row.title,
    description: row.description,
    taskType: row.taskType,
    priority: row.priority,
    status: row.status,
    creator: row.creator,
    assignee: row.assignee,
    participants: castTaskEnhanceStringArray(row.participants),
    department: row.department,
    sourceModule: row.sourceModule,
    sourceId: row.sourceId,
    sourceNo: row.sourceNo,
    progress: row.progress,
    startDate: row.startDate ?? null,
    dueDate: row.dueDate ?? null,
    completedAt: toIsoOrNull(row.completedAt),
    remark: row.remark,
    createdAt: toIsoOrNull(row.createdAt) ?? '',
    updatedAt: toIsoOrNull(row.updatedAt) ?? '',
  };
}

function toStatItems(
  rows: { name: string | null; count: number | string }[],
): TaskStatItem[] {
  return rows
    .map(
      (row: { name: string | null; count: number | string }): TaskStatItem => ({
        name: row.name ?? UNASSIGNED_NAME,
        count: Number(row.count),
      }),
    )
    .sort((a: TaskStatItem, b: TaskStatItem): number => b.count - a.count);
}

@Injectable()
export class CollaborationTasksService {
  private readonly logger = new Logger(CollaborationTasksService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
  ) {}

  async list(
    params: CollaborationTaskListParams,
  ): Promise<TaskEnhanceListResponse<CollaborationTask>> {
    const { page, pageSize, offset } = resolveTaskEnhancePagination(
      params.page,
      params.pageSize,
    );
    const conditions: SQL[] = [isNull(collaborationTasks.deletedAt)];
    if (params.taskType) {
      conditions.push(eq(collaborationTasks.taskType, params.taskType));
    }
    if (params.status) {
      conditions.push(eq(collaborationTasks.status, params.status));
    }
    if (params.priority) {
      conditions.push(eq(collaborationTasks.priority, params.priority));
    }
    if (params.assignee) {
      conditions.push(
        sql`(${collaborationTasks.assignee}).user_id = ${params.assignee}`,
      );
    }
    if (params.department) {
      conditions.push(eq(collaborationTasks.department, params.department));
    }
    if (params.keyword) {
      const kw: string = `%${params.keyword}%`;
      const keywordCond = or(
        ilike(collaborationTasks.title, kw),
        ilike(collaborationTasks.taskNo, kw),
      );
      if (keywordCond) conditions.push(keywordCond);
    }
    const where = and(...conditions);
    const sortColumn =
      params.sortBy === 'dueDate'
        ? collaborationTasks.dueDate
        : params.sortBy === 'progress'
          ? collaborationTasks.progress
          : collaborationTasks.createdAt;
    const orderBy =
      resolveTaskEnhanceSortOrder(params.sortOrder) === 'asc'
        ? asc(sortColumn)
        : desc(sortColumn);
    const totalRows: { count: number | string }[] = await this.db
      .select({ count: count() })
      .from(collaborationTasks)
      .where(where);
    const rows: TaskRow[] = await this.db
      .select()
      .from(collaborationTasks)
      .where(where)
      .orderBy(orderBy)
      .limit(pageSize)
      .offset(offset);
    return {
      items: rows.map((row: TaskRow) => mapTask(row)),
      total: Number(totalRows[0]?.count ?? 0),
      page,
      pageSize,
    };
  }

  async summary(): Promise<CollaborationTaskStats> {
    const notDeleted: SQL = isNull(collaborationTasks.deletedAt);
    const totalRows: { count: number | string }[] = await this.db
      .select({ count: count() })
      .from(collaborationTasks)
      .where(notDeleted);
    const statusRows: { name: string; count: number | string }[] = await this.db
      .select({ name: collaborationTasks.status, count: count() })
      .from(collaborationTasks)
      .where(notDeleted)
      .groupBy(collaborationTasks.status);
    const priorityRows: { name: string; count: number | string }[] =
      await this.db
        .select({ name: collaborationTasks.priority, count: count() })
        .from(collaborationTasks)
        .where(notDeleted)
        .groupBy(collaborationTasks.priority);
    const assigneeRows: { name: string | null; count: number | string }[] =
      await this.db
        .select({
          name: sql<string | null>`(${collaborationTasks.assignee}).user_id`,
          count: count(),
        })
        .from(collaborationTasks)
        .where(notDeleted)
        .groupBy(sql`(${collaborationTasks.assignee}).user_id`);
    return {
      total: Number(totalRows[0]?.count ?? 0),
      byStatus: toStatItems(statusRows),
      byPriority: toStatItems(priorityRows),
      byAssignee: toStatItems(assigneeRows),
    };
  }

  async create(
    dto: CollaborationTaskCreateDto,
    userId: string,
  ): Promise<CollaborationTask> {
    const title: string = assertTaskEnhanceRequired(dto?.title, '任务标题');
    const taskType: string =
      dto?.taskType !== undefined
        ? assertTaskEnhanceEnum(dto.taskType, TASK_TYPES, '任务类型')
        : '日常工作';
    const priority: string =
      dto?.priority !== undefined
        ? assertTaskEnhanceEnum(dto.priority, TASK_PRIORITIES, '优先级')
        : '中';
    const startDate: string | null = dto?.startDate
      ? assertTaskEnhanceDateString(dto.startDate, '开始日期')
      : null;
    const dueDate: string | null = dto?.dueDate
      ? assertTaskEnhanceDateString(dto.dueDate, '截止日期')
      : null;
    if (startDate && dueDate && dueDate < startDate) {
      throw new BadRequestException('截止日期不能早于开始日期');
    }
    const assignee: string =
      dto?.assignee && dto.assignee.trim() !== ''
        ? dto.assignee.trim()
        : userId;
    const values: TaskInsert = {
      taskNo: '',
      title,
      description: dto?.description ?? null,
      taskType,
      priority,
      status: TASK_STATUS_NOT_STARTED,
      creator: userId,
      assignee,
      participants: dto?.participants ? JSON.stringify(dto.participants) : null,
      department: dto?.department ?? null,
      sourceModule: dto?.sourceModule ?? null,
      sourceId: dto?.sourceId ?? null,
      sourceNo: dto?.sourceNo ?? null,
      progress: 0,
      startDate,
      dueDate,
      remark: dto?.remark ?? null,
      createdBy: userId,
      updatedBy: userId,
    };
    const { row } = await insertWithSeqNo<TaskRow>({
      db: this.db,
      table: collaborationTasks,
      noColumn: collaborationTasks.taskNo,
      prefix: TASK_NO_PREFIX,
      insert: (no: string) =>
        this.db
          .insert(collaborationTasks)
          .values({ ...values, taskNo: no })
          .returning(),
    });
    this.logger.log(
      `协作任务创建成功 id=${String(row.id)} no=${row.taskNo}`,
    );
    return mapTask(row);
  }

  async findById(id: number): Promise<CollaborationTask> {
    const existing: TaskRow = await this.findTaskOrThrow(id);
    return mapTask(existing);
  }

  async update(
    id: number,
    dto: CollaborationTaskUpdateDto,
    userId: string,
  ): Promise<CollaborationTask> {
    const existing: TaskRow = await this.findTaskOrThrow(id);
    const patch: Partial<TaskInsert> = {};
    if (dto?.title !== undefined) {
      patch.title = assertTaskEnhanceRequired(dto.title, '任务标题');
    }
    if (dto?.description !== undefined) patch.description = dto.description;
    if (dto?.taskType !== undefined) {
      patch.taskType = assertTaskEnhanceEnum(dto.taskType, TASK_TYPES, '任务类型');
    }
    if (dto?.priority !== undefined) {
      patch.priority = assertTaskEnhanceEnum(dto.priority, TASK_PRIORITIES, '优先级');
    }
    if (dto?.assignee !== undefined) patch.assignee = dto.assignee;
    if (dto?.participants !== undefined) {
      patch.participants = dto.participants
        ? JSON.stringify(dto.participants)
        : null;
    }
    if (dto?.department !== undefined) patch.department = dto.department;
    if (dto?.startDate !== undefined) {
      patch.startDate = dto.startDate
        ? assertTaskEnhanceDateString(dto.startDate, '开始日期')
        : null;
    }
    if (dto?.dueDate !== undefined) {
      patch.dueDate = dto.dueDate
        ? assertTaskEnhanceDateString(dto.dueDate, '截止日期')
        : null;
    }
    if (dto?.remark !== undefined) patch.remark = dto.remark;
    if (dto?.progress !== undefined) {
      const progress: number = Number(dto.progress);
      if (!Number.isInteger(progress) || progress < 0 || progress > 100) {
        throw new BadRequestException('进度必须在0-100之间');
      }
      patch.progress = progress;
    }
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }

    const hasManualStatus: boolean = dto?.status !== undefined;
    if (hasManualStatus) {
      patch.status = assertTaskEnhanceEnum(dto.status, TASK_STATUSES, '任务状态');
    }
    const hasProgress: boolean = dto?.progress !== undefined;

    // 状态推导：progress 自动推导（已暂停/已取消不推导）；手动 status 优先
    let nextStatus: string | null = null;
    if (
      hasProgress &&
      existing.status !== TASK_STATUS_PAUSED &&
      existing.status !== TASK_STATUS_CANCELLED
    ) {
      const progress: number = patch.progress ?? existing.progress;
      nextStatus =
        progress === 0
          ? TASK_STATUS_NOT_STARTED
          : progress === 100
            ? TASK_STATUS_DONE
            : TASK_STATUS_RUNNING;
    }
    if (hasManualStatus) nextStatus = patch.status ?? null;
    if (nextStatus !== null) {
      patch.status = nextStatus;
      if (nextStatus === TASK_STATUS_DONE) {
        patch.progress = 100;
        patch.completedAt = new Date();
      } else if (existing.status === TASK_STATUS_DONE) {
        patch.completedAt = null;
      }
    }

    const finalStart: string | null =
      patch.startDate !== undefined ? patch.startDate : existing.startDate;
    const finalDue: string | null =
      patch.dueDate !== undefined ? patch.dueDate : existing.dueDate;
    if (finalStart && finalDue && finalDue < finalStart) {
      throw new BadRequestException('截止日期不能早于开始日期');
    }

    patch.updatedAt = new Date();
    patch.updatedBy = userId;
    const updated: TaskRow[] = await this.db
      .update(collaborationTasks)
      .set(patch)
      .where(
        and(
          eq(collaborationTasks.id, id),
          isNull(collaborationTasks.deletedAt),
        ),
      )
      .returning();
    if (updated.length === 0) throw new NotFoundException('任务不存在');
    return mapTask(updated[0]);
  }

  async batchUpdate(
    dto: CollaborationTaskBatchUpdateDto,
    userId: string,
  ): Promise<number> {
    if (!Array.isArray(dto?.ids) || dto.ids.length === 0) {
      throw new BadRequestException('请提供要处理的任务');
    }
    const ids: number[] = dto.ids.map((item: number): number => {
      const parsed: number = Number(item);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new BadRequestException('任务 ID 无效');
      }
      return parsed;
    });
    const hasStatus: boolean = dto?.status !== undefined;
    const hasPriority: boolean = dto?.priority !== undefined;
    const hasAssignee: boolean = dto?.assignee !== undefined;
    if (!hasStatus && !hasPriority && !hasAssignee) {
      throw new BadRequestException('请至少提供状态/优先级/负责人之一');
    }
    const patch: Partial<TaskInsert> = {
      updatedAt: new Date(),
      updatedBy: userId,
    };
    if (hasStatus) {
      patch.status = assertTaskEnhanceEnum(
        dto.status,
        TASK_STATUSES,
        '任务状态',
      );
    }
    if (hasPriority) {
      patch.priority = assertTaskEnhanceEnum(
        dto.priority,
        TASK_PRIORITIES,
        '优先级',
      );
    }
    if (hasAssignee) patch.assignee = dto.assignee;
    const updated: { id: number }[] = await this.db
      .update(collaborationTasks)
      .set(patch)
      .where(
        and(
          inArray(collaborationTasks.id, ids),
          isNull(collaborationTasks.deletedAt),
        ),
      )
      .returning({ id: collaborationTasks.id });
    return updated.length;
  }

  async remove(id: number, userId: string): Promise<{ success: boolean }> {
    const existing: TaskRow = await this.findTaskOrThrow(id);
    if (existing.status === TASK_STATUS_RUNNING) {
      throw new ConflictException('进行中的任务不能删除');
    }
    const updated: { id: number }[] = await this.db
      .update(collaborationTasks)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(
        and(
          eq(collaborationTasks.id, id),
          isNull(collaborationTasks.deletedAt),
        ),
      )
      .returning({ id: collaborationTasks.id });
    if (updated.length === 0) throw new NotFoundException('任务不存在');
    return { success: true };
  }

  private async findTaskOrThrow(id: number): Promise<TaskRow> {
    const rows: TaskRow[] = await this.db
      .select()
      .from(collaborationTasks)
      .where(
        and(
          eq(collaborationTasks.id, id),
          isNull(collaborationTasks.deletedAt),
        ),
      );
    if (rows.length === 0) throw new NotFoundException('任务不存在');
    return rows[0];
  }
}
