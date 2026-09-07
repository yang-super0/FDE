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
  sql,
  type SQL,
} from 'drizzle-orm';
import { myTodos } from '@server/database/schema';
import type {
  MyTodo,
  MyTodoBatchActionDto,
  MyTodoCreateDto,
  MyTodoListParams,
  MyTodoSummary,
  TaskEnhanceListResponse,
} from '@shared/api.interface';
import { insertWithSeqNo } from '../finance-core/fin-seq.util';
import {
  assertTaskEnhanceDateString,
  assertTaskEnhanceEnum,
  assertTaskEnhanceRequired,
  resolveTaskEnhancePagination,
  resolveTaskEnhanceSortOrder,
  taskEnhanceToday,
  toIsoOrNull,
} from './task-enhance-shared.util';

type TodoRow = typeof myTodos.$inferSelect;
type TodoInsert = typeof myTodos.$inferInsert;

const TODO_NO_PREFIX: string = 'DB';
const TODO_TYPES: string[] = ['审批', '任务', '提醒', '其他'];
const TODO_SOURCE_MODULES: string[] = [
  '客户',
  '广告',
  '财务',
  '合同',
  '行政',
  '人资',
  '系统',
];
const TODO_PRIORITIES: string[] = ['高', '中', '低'];
const TODO_OPEN_STATUSES: string[] = ['待处理', '处理中'];
const TODO_STATUS_PENDING: string = '待处理';
const TODO_STATUS_DONE: string = '已完成';
const TODO_STATUS_IGNORED: string = '已忽略';

function mapTodo(row: TodoRow): MyTodo {
  return {
    id: row.id,
    todoNo: row.todoNo,
    title: row.title,
    todoType: row.todoType,
    sourceModule: row.sourceModule,
    sourceId: row.sourceId,
    sourceNo: row.sourceNo,
    priority: row.priority,
    status: row.status,
    assignee: row.assignee,
    dueDate: row.dueDate ?? null,
    remark: row.remark,
    createdBy: row.createdBy,
    createdAt: toIsoOrNull(row.createdAt) ?? '',
    completedAt: toIsoOrNull(row.completedAt),
  };
}

@Injectable()
export class MyTodosService {
  private readonly logger = new Logger(MyTodosService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
  ) {}

  async list(params: MyTodoListParams): Promise<TaskEnhanceListResponse<MyTodo>> {
    const { page, pageSize, offset } = resolveTaskEnhancePagination(
      params.page,
      params.pageSize,
    );
    const conditions: SQL[] = [isNull(myTodos.deletedAt)];
    if (params.todoType) conditions.push(eq(myTodos.todoType, params.todoType));
    if (params.sourceModule) {
      conditions.push(eq(myTodos.sourceModule, params.sourceModule));
    }
    if (params.priority) conditions.push(eq(myTodos.priority, params.priority));
    if (params.status) conditions.push(eq(myTodos.status, params.status));
    if (params.assignee) {
      conditions.push(sql`(${myTodos.assignee}).user_id = ${params.assignee}`);
    }
    const where = and(...conditions);
    const sortColumn =
      params.sortBy === 'dueDate' ? myTodos.dueDate : myTodos.createdAt;
    const orderBy =
      resolveTaskEnhanceSortOrder(params.sortOrder) === 'asc'
        ? asc(sortColumn)
        : desc(sortColumn);
    const totalRows: { count: number | string }[] = await this.db
      .select({ count: count() })
      .from(myTodos)
      .where(where);
    const rows: TodoRow[] = await this.db
      .select()
      .from(myTodos)
      .where(where)
      .orderBy(orderBy)
      .limit(pageSize)
      .offset(offset);
    return {
      items: rows.map((row: TodoRow) => mapTodo(row)),
      total: Number(totalRows[0]?.count ?? 0),
      page,
      pageSize,
    };
  }

  async summary(): Promise<MyTodoSummary> {
    const today: string = taskEnhanceToday();
    const rows: {
      pending: number | string;
      dueToday: number | string;
      overdue: number | string;
      high: number | string;
    }[] = await this.db
      .select({
        pending: sql<number>`count(*) filter (where ${myTodos.status} = '待处理')`,
        dueToday: sql<number>`count(*) filter (where ${myTodos.dueDate} = ${today} and ${myTodos.status} in ('待处理','处理中'))`,
        overdue: sql<number>`count(*) filter (where ${myTodos.dueDate} < ${today} and ${myTodos.status} in ('待处理','处理中'))`,
        high: sql<number>`count(*) filter (where ${myTodos.priority} = '高' and ${myTodos.status} in ('待处理','处理中'))`,
      })
      .from(myTodos)
      .where(isNull(myTodos.deletedAt));
    const first = rows[0];
    return {
      pendingCount: Number(first?.pending ?? 0),
      dueTodayCount: Number(first?.dueToday ?? 0),
      overdueCount: Number(first?.overdue ?? 0),
      highPriorityCount: Number(first?.high ?? 0),
    };
  }

  async create(dto: MyTodoCreateDto, userId: string): Promise<MyTodo> {
    const title: string = assertTaskEnhanceRequired(dto?.title, '待办标题');
    const todoType: string =
      dto?.todoType !== undefined
        ? assertTaskEnhanceEnum(dto.todoType, TODO_TYPES, '待办类型')
        : '其他';
    const sourceModule: string =
      dto?.sourceModule !== undefined
        ? assertTaskEnhanceEnum(dto.sourceModule, TODO_SOURCE_MODULES, '来源模块')
        : '系统';
    const priority: string =
      dto?.priority !== undefined
        ? assertTaskEnhanceEnum(dto.priority, TODO_PRIORITIES, '优先级')
        : '中';
    const dueDate: string | null = dto?.dueDate
      ? assertTaskEnhanceDateString(dto.dueDate, '截止日期')
      : null;
    const assignee: string | null =
      dto?.assignee && dto.assignee.trim() !== ''
        ? dto.assignee.trim()
        : null;
    const values: TodoInsert = {
      todoNo: '',
      title,
      todoType,
      sourceModule,
      sourceId: dto?.sourceId ?? null,
      sourceNo: dto?.sourceNo ?? null,
      priority,
      status: TODO_STATUS_PENDING,
      assignee,
      dueDate,
      remark: dto?.remark ?? null,
      createdBy: userId,
      updatedBy: userId,
    };
    const { row } = await insertWithSeqNo<TodoRow>({
      db: this.db,
      table: myTodos,
      noColumn: myTodos.todoNo,
      prefix: TODO_NO_PREFIX,
      insert: (no: string) =>
        this.db
          .insert(myTodos)
          .values({ ...values, todoNo: no })
          .returning(),
    });
    this.logger.log(`待办创建成功 id=${String(row.id)} no=${row.todoNo}`);
    return mapTodo(row);
  }

  async complete(id: number, userId: string): Promise<MyTodo> {
    const existing: TodoRow = await this.findTodoOrThrow(id);
    if (!TODO_OPEN_STATUSES.includes(existing.status)) {
      throw new BadRequestException('仅待处理/处理中的待办可以完成');
    }
    const updated: TodoRow[] = await this.db
      .update(myTodos)
      .set({
        status: TODO_STATUS_DONE,
        completedAt: new Date(),
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(
        and(
          eq(myTodos.id, id),
          inArray(myTodos.status, TODO_OPEN_STATUSES),
          isNull(myTodos.deletedAt),
        ),
      )
      .returning();
    if (updated.length === 0) {
      throw new ConflictException('待办状态已变更，请刷新后重试');
    }
    return mapTodo(updated[0]);
  }

  async ignore(id: number, userId: string): Promise<MyTodo> {
    const existing: TodoRow = await this.findTodoOrThrow(id);
    if (existing.status === TODO_STATUS_DONE || existing.status === TODO_STATUS_IGNORED) {
      throw new BadRequestException('已完成/已忽略的待办不能忽略');
    }
    const updated: TodoRow[] = await this.db
      .update(myTodos)
      .set({
        status: TODO_STATUS_IGNORED,
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(
        and(
          eq(myTodos.id, id),
          sql`${myTodos.status} not in ('已完成','已忽略')`,
          isNull(myTodos.deletedAt),
        ),
      )
      .returning();
    if (updated.length === 0) {
      throw new ConflictException('待办状态已变更，请刷新后重试');
    }
    return mapTodo(updated[0]);
  }

  async reopen(id: number, userId: string): Promise<MyTodo> {
    const existing: TodoRow = await this.findTodoOrThrow(id);
    if (
      existing.status !== TODO_STATUS_DONE &&
      existing.status !== TODO_STATUS_IGNORED
    ) {
      throw new BadRequestException('仅已完成/已忽略的待办可以重开');
    }
    const updated: TodoRow[] = await this.db
      .update(myTodos)
      .set({
        status: TODO_STATUS_PENDING,
        completedAt: null,
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(
        and(
          eq(myTodos.id, id),
          inArray(myTodos.status, [TODO_STATUS_DONE, TODO_STATUS_IGNORED]),
          isNull(myTodos.deletedAt),
        ),
      )
      .returning();
    if (updated.length === 0) {
      throw new ConflictException('待办状态已变更，请刷新后重试');
    }
    return mapTodo(updated[0]);
  }

  async batchAction(
    dto: MyTodoBatchActionDto,
    userId: string,
  ): Promise<number> {
    if (!Array.isArray(dto?.ids) || dto.ids.length === 0) {
      throw new BadRequestException('请提供要处理的待办');
    }
    const ids: number[] = dto.ids.map((item: number): number => {
      const parsed: number = Number(item);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new BadRequestException('待办 ID 无效');
      }
      return parsed;
    });
    let patch: Partial<TodoInsert>;
    let gate: SQL;
    if (dto.action === '完成') {
      patch = {
        status: TODO_STATUS_DONE,
        completedAt: new Date(),
        updatedAt: new Date(),
        updatedBy: userId,
      };
      gate = inArray(myTodos.status, TODO_OPEN_STATUSES);
    } else if (dto.action === '忽略') {
      patch = {
        status: TODO_STATUS_IGNORED,
        updatedAt: new Date(),
        updatedBy: userId,
      };
      gate = sql`${myTodos.status} not in ('已完成','已忽略')`;
    } else {
      throw new BadRequestException('action 必须为 完成 或 忽略');
    }
    const updated: { id: number }[] = await this.db
      .update(myTodos)
      .set(patch)
      .where(and(inArray(myTodos.id, ids), gate, isNull(myTodos.deletedAt)))
      .returning({ id: myTodos.id });
    return updated.length;
  }

  async remove(id: number, userId: string): Promise<{ success: boolean }> {
    await this.findTodoOrThrow(id);
    const updated: { id: number }[] = await this.db
      .update(myTodos)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(and(eq(myTodos.id, id), isNull(myTodos.deletedAt)))
      .returning({ id: myTodos.id });
    if (updated.length === 0) throw new NotFoundException('待办不存在');
    return { success: true };
  }

  private async findTodoOrThrow(id: number): Promise<TodoRow> {
    const rows: TodoRow[] = await this.db
      .select()
      .from(myTodos)
      .where(and(eq(myTodos.id, id), isNull(myTodos.deletedAt)));
    if (rows.length === 0) throw new NotFoundException('待办不存在');
    return rows[0];
  }
}
