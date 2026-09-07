import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
  AuthNPaasService,
} from '@lark-apaas/fullstack-nestjs-core';
import { and, count, desc, eq, gte, ilike, or } from 'drizzle-orm';
import { ticket, knowledgeDoc } from '@server/database/schema';
import type {
  KnowledgeDoc,
  KnowledgeDocDetail,
  PageResult,
  Ticket,
  TicketStatus,
  TicketSummary,
} from '@shared/api.interface';
import { OperationLogService } from '../operation-log/operation-log.service';

export interface CreateTicketInput {
  category: string;
  title: string;
  description: string;
  operatorId: string;
}

export interface UpdateTicketStatusInput {
  id: string;
  status: 'processing' | 'resolved';
  resolution?: string;
  operatorId: string;
}

export interface TicketListParams {
  status?: string;
  page: number;
  pageSize: number;
}

const toTicketStatus = (value: string): TicketStatus => {
  if (value === 'processing' || value === 'resolved') {
    return value;
  }
  return 'pending';
};

@Injectable()
export class SupportService {
  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
    private readonly authn: AuthNPaasService,
    private readonly operationLog: OperationLogService,
  ) {}

  private getWeekStart(): Date {
    const now: Date = new Date();
    const dayOfWeek: number = now.getDay();
    const daysSinceMonday: number = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday: Date = new Date(now);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(monday.getDate() - daysSinceMonday);
    return monday;
  }

  async getTicketSummary(): Promise<TicketSummary> {
    const pendingResult: Array<{ count: number }> = await this.db
      .select({ count: count() })
      .from(ticket)
      .where(eq(ticket.status, 'pending'));
    const pendingCount: number = Number(pendingResult[0]?.count ?? 0);

    const weekStart: Date = this.getWeekStart();
    const resolvedWeekResult: Array<{ count: number }> = await this.db
      .select({ count: count() })
      .from(ticket)
      .where(
        and(eq(ticket.status, 'resolved'), gte(ticket.updatedAt, weekStart)),
      );
    const resolvedThisWeek: number = Number(
      resolvedWeekResult[0]?.count ?? 0,
    );

    const resolvedRows: Array<{ createdAt: Date; updatedAt: Date }> =
      await this.db
        .select({ createdAt: ticket.createdAt, updatedAt: ticket.updatedAt })
        .from(ticket)
        .where(eq(ticket.status, 'resolved'));

    let avgResponseHours = 0;
    if (resolvedRows.length > 0) {
      const totalHours: number = resolvedRows.reduce(
        (sum: number, row: { createdAt: Date; updatedAt: Date }) =>
          sum + (row.updatedAt.getTime() - row.createdAt.getTime()) / 3600000,
        0,
      );
      avgResponseHours =
        Math.round((totalHours / resolvedRows.length) * 10) / 10;
    }

    return { pendingCount, resolvedThisWeek, avgResponseHours };
  }

  async findTickets(params: TicketListParams): Promise<PageResult<Ticket>> {
    const page: number = Math.max(params.page, 1);
    const pageSize: number = Math.min(Math.max(params.pageSize, 1), 100);

    const conditions = [];
    if (params.status) {
      conditions.push(eq(ticket.status, params.status));
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const totalResult: Array<{ count: number }> = await this.db
      .select({ count: count() })
      .from(ticket)
      .where(where);
    const total: number = Number(totalResult[0]?.count ?? 0);

    const rows = await this.db
      .select()
      .from(ticket)
      .where(where)
      .orderBy(desc(ticket.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const submitterIds: string[] = [
      ...new Set(
        rows
          .map((row) => row.createdBy)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const nameMap = new Map<string, string>();
    if (submitterIds.length > 0) {
      const users = await this.authn.listUsersByIds(
        submitterIds.slice(0, 100),
      );
      users.forEach((user, index: number) => {
        if (user) {
          nameMap.set(
            submitterIds[index],
            user.name?.zh_cn ?? user.name?.en_us ?? '',
          );
        }
      });
    }

    const items: Ticket[] = rows.map((row) => ({
      id: row.id,
      category: row.category,
      title: row.title,
      description: row.description,
      status: toTicketStatus(row.status),
      resolution: row.resolution,
      submitterName: row.createdBy ? nameMap.get(row.createdBy) ?? '' : '',
      createdAt: row.createdAt.toISOString(),
    }));

    return { items, total };
  }

  async createTicket(input: CreateTicketInput): Promise<{ id: string }> {
    if (!input.category || !input.title || !input.description) {
      throw new BadRequestException('问题分类、标题和描述均为必填');
    }
    const inserted = await this.db
      .insert(ticket)
      .values({
        category: input.category,
        title: input.title,
        description: input.description,
        status: 'pending',
        resolution: '',
        createdBy: input.operatorId,
      })
      .returning({ id: ticket.id });
    const id: string = inserted[0].id;

    await this.operationLog.record({
      module: '业务支持',
      actionType: 'create',
      target: `工单:${input.title}`,
      operatorId: input.operatorId,
    });

    return { id };
  }

  async updateTicketStatus(
    input: UpdateTicketStatusInput,
  ): Promise<{ success: boolean }> {
    if (input.status === 'resolved' && !(input.resolution ?? '').trim()) {
      throw new BadRequestException('解决工单时必须填写处理结果');
    }

    const patch: Partial<typeof ticket.$inferInsert> = {
      status: input.status,
    };
    if (input.resolution !== undefined) {
      patch.resolution = input.resolution;
    }

    const updated = await this.db
      .update(ticket)
      .set(patch)
      .where(eq(ticket.id, input.id))
      .returning({ id: ticket.id });
    if (updated.length === 0) {
      throw new NotFoundException('工单不存在');
    }

    await this.operationLog.record({
      module: '业务支持',
      actionType: 'status_change',
      target: `工单:${input.id}`,
      operatorId: input.operatorId,
    });

    return { success: true };
  }

  async findKnowledgeDocs(params: {
    category?: string;
    keyword?: string;
  }): Promise<{ items: KnowledgeDoc[] }> {
    const conditions = [];
    if (params.category) {
      conditions.push(eq(knowledgeDoc.category, params.category));
    }
    if (params.keyword) {
      const pattern: string = `%${params.keyword}%`;
      const keywordCondition = or(
        ilike(knowledgeDoc.title, pattern),
        ilike(knowledgeDoc.summary, pattern),
      );
      if (keywordCondition) {
        conditions.push(keywordCondition);
      }
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await this.db
      .select()
      .from(knowledgeDoc)
      .where(where)
      .orderBy(desc(knowledgeDoc.createdAt));

    const items: KnowledgeDoc[] = rows.map((row) => ({
      id: row.id,
      category: row.category,
      title: row.title,
      summary: row.summary,
    }));

    return { items };
  }

  async getKnowledgeDoc(id: string): Promise<KnowledgeDocDetail> {
    const rows = await this.db
      .select()
      .from(knowledgeDoc)
      .where(eq(knowledgeDoc.id, id));
    const row = rows[0];
    if (!row) {
      throw new NotFoundException('知识文档不存在');
    }
    return {
      id: row.id,
      category: row.category,
      title: row.title,
      summary: row.summary,
      content: row.content,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
