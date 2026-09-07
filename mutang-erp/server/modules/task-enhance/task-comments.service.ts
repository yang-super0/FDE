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
import { and, asc, eq, isNull } from 'drizzle-orm';
import { collaborationTasks, taskComments } from '@server/database/schema';
import type {
  TaskComment,
  TaskCommentCreateDto,
} from '@shared/api.interface';
import { insertWithSeqNo } from '../finance-core/fin-seq.util';
import {
  castTaskEnhanceStringArray,
  toIsoOrNull,
} from './task-enhance-shared.util';

type CommentRow = typeof taskComments.$inferSelect;
type CommentInsert = typeof taskComments.$inferInsert;

const COMMENT_NO_PREFIX: string = 'PL';

function mapComment(row: CommentRow): TaskComment {
  return {
    id: row.id,
    commentNo: row.commentNo,
    taskId: row.taskId,
    commenter: row.commenter,
    content: row.content,
    attachments: castTaskEnhanceStringArray(row.attachments),
    createdAt: toIsoOrNull(row.createdAt) ?? '',
  };
}

@Injectable()
export class TaskCommentsService {
  private readonly logger = new Logger(TaskCommentsService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
  ) {}

  async list(taskId: number): Promise<TaskComment[]> {
    await this.assertTaskExists(taskId);
    const rows: CommentRow[] = await this.db
      .select()
      .from(taskComments)
      .where(
        and(eq(taskComments.taskId, taskId), isNull(taskComments.deletedAt)),
      )
      .orderBy(asc(taskComments.createdAt));
    return rows.map((row: CommentRow) => mapComment(row));
  }

  async create(
    taskId: number,
    dto: TaskCommentCreateDto,
    userId: string,
  ): Promise<TaskComment> {
    await this.assertTaskExists(taskId);
    const content: string =
      typeof dto?.content === 'string' ? dto.content.trim() : '';
    if (content === '') {
      throw new BadRequestException('评论内容不能为空');
    }
    const { row } = await insertWithSeqNo<CommentRow>({
      db: this.db,
      table: taskComments,
      noColumn: taskComments.commentNo,
      prefix: COMMENT_NO_PREFIX,
      insert: (no: string) =>
        this.db
          .insert(taskComments)
          .values({
            commentNo: no,
            taskId,
            commenter: userId,
            content,
            attachments: dto?.attachments
              ? JSON.stringify(dto.attachments)
              : null,
            createdBy: userId,
            updatedBy: userId,
          } satisfies CommentInsert)
          .returning(),
    });
    this.logger.log(
      `评论创建成功 id=${String(row.id)} no=${row.commentNo} task=${String(taskId)}`,
    );
    return mapComment(row);
  }

  private async assertTaskExists(taskId: number): Promise<void> {
    const rows: { id: number }[] = await this.db
      .select({ id: collaborationTasks.id })
      .from(collaborationTasks)
      .where(
        and(
          eq(collaborationTasks.id, taskId),
          isNull(collaborationTasks.deletedAt),
        ),
      );
    if (rows.length === 0) throw new NotFoundException('任务不存在');
  }
}
