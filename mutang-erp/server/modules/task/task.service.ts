import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  AuthNPaasService,
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { and, count, desc, eq, lt, ne } from 'drizzle-orm';
import { task } from '@server/database/schema';
import { MessageNotificationService } from '../message-notification/message-notification.service';
import type {
  PageResult,
  Task,
  TaskDisplayStatus,
  TaskPriority,
  TaskStatus,
  TaskSummary,
} from '@shared/api.interface';

export interface TaskListParams {
  assigneeId?: string;
  status?: TaskDisplayStatus;
  page: number;
  pageSize: number;
}

export interface CreateTaskInput {
  title: string;
  description: string;
  assigneeId: string;
  priority: TaskPriority;
  deadline?: string;
}

type TaskRow = typeof task.$inferSelect;

@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
    private readonly authn: AuthNPaasService,
    private readonly messageNotificationService: MessageNotificationService,
  ) {}

  async summary(): Promise<TaskSummary> {
    const result = await this.db
      .select({ count: count() })
      .from(task)
      .where(and(ne(task.status, 'done'), lt(task.deadline, new Date())));
    return { overdueCount: Number(result[0]?.count ?? 0) };
  }

  async findAll(params: TaskListParams): Promise<PageResult<Task>> {
    const page: number = Math.max(params.page, 1);
    const pageSize: number = Math.min(Math.max(params.pageSize, 1), 100);
    const now: Date = new Date();

    const conditions = [];
    if (params.assigneeId) {
      conditions.push(eq(task.assignee, params.assigneeId));
    }
    if (params.status === 'overdue') {
      conditions.push(ne(task.status, 'done'));
      conditions.push(lt(task.deadline, now));
    } else if (params.status) {
      conditions.push(eq(task.status, params.status));
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const rows: TaskRow[] = where
      ? await this.db
          .select()
          .from(task)
          .where(where)
          .orderBy(desc(task.createdAt))
          .limit(pageSize)
          .offset((page - 1) * pageSize)
      : await this.db
          .select()
          .from(task)
          .orderBy(desc(task.createdAt))
          .limit(pageSize)
          .offset((page - 1) * pageSize);

    const totalResult = where
      ? await this.db.select({ count: count() }).from(task).where(where)
      : await this.db.select({ count: count() }).from(task);
    const total: number = Number(totalResult[0]?.count ?? 0);

    const assigneeIds: string[] = Array.from(
      new Set(
        rows
          .map((row: TaskRow) => row.assignee)
          .filter((id): id is string => Boolean(id)),
      ),
    );
    const nameMap = new Map<string, string>();
    if (assigneeIds.length > 0) {
      const users = await this.authn.listUsersByIds(assigneeIds.slice(0, 100));
      users.forEach((user, index: number) => {
        if (user) {
          nameMap.set(
            assigneeIds[index],
            user.name?.zh_cn ?? user.name?.en_us ?? '',
          );
        }
      });
    }

    const items: Task[] = rows.map((row: TaskRow): Task => {
      const baseStatus: TaskStatus =
        row.status === 'doing'
          ? 'doing'
          : row.status === 'done'
            ? 'done'
            : 'todo';
      const overdue: boolean =
        baseStatus !== 'done' &&
        row.deadline !== null &&
        row.deadline.getTime() < now.getTime();
      const priority: TaskPriority =
        row.priority === 'high' || row.priority === 'low'
          ? row.priority
          : 'medium';
      return {
        id: row.id,
        title: row.title,
        description: row.description,
        assigneeId: row.assignee ?? '',
        assigneeName: row.assignee ? (nameMap.get(row.assignee) ?? '') : '',
        priority,
        status:
          baseStatus === 'done' ? 'done' : overdue ? 'overdue' : baseStatus,
        deadline: row.deadline ? row.deadline.toISOString() : '',
      };
    });

    return { items, total };
  }

  async create(input: CreateTaskInput): Promise<{ id: string }> {
    const inserted = await this.db
      .insert(task)
      .values({
        title: input.title,
        description: input.description,
        assignee: input.assigneeId,
        priority: input.priority,
        status: 'todo',
        deadline: input.deadline ? new Date(input.deadline) : null,
      })
      .returning({ id: task.id });
    if (inserted.length === 0) {
      throw new NotFoundException('任务创建失败');
    }
    const assigneeId: string = (input.assigneeId ?? '').trim();
    if (assigneeId.length > 0) {
      try {
        await this.messageNotificationService.pushTaskReminder({
          title: '新任务提醒',
          content: `您有一个新任务「${input.title}」，请及时处理。`,
          toUserId: assigneeId,
          relatedModule: '任务中心',
          relatedBusinessId: inserted[0].id,
        });
      } catch (error: unknown) {
        this.logger.warn(
          `任务提醒推送失败: ${JSON.stringify({ title: input.title, error: String(error) })}`,
        );
      }
    }
    return { id: inserted[0].id };
  }

  async updateStatus(
    id: string,
    status: TaskStatus,
  ): Promise<{ id: string; title: string }> {
    const updated = await this.db
      .update(task)
      .set({ status })
      .where(eq(task.id, id))
      .returning({ id: task.id, title: task.title });
    if (updated.length === 0) {
      throw new NotFoundException('任务不存在');
    }
    return updated[0];
  }
}
