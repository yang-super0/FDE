import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { desc, eq, inArray } from 'drizzle-orm';
import { customer, opportunity } from '@server/database/schema';
import type { Opportunity, OpportunityStage } from '@shared/api.interface';
import { OperationLogService } from '../operation-log/operation-log.service';
import type { OpportunityPayload } from './customer.dto';

type OpportunityRow = typeof opportunity.$inferSelect;

@Injectable()
export class OpportunityService {
  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
    private readonly operationLogService: OperationLogService,
  ) {}

  async list(stage?: OpportunityStage): Promise<{ items: Opportunity[] }> {
    const rows: OpportunityRow[] = stage
      ? await this.db
          .select()
          .from(opportunity)
          .where(eq(opportunity.stage, stage))
          .orderBy(desc(opportunity.createdAt))
      : await this.db
          .select()
          .from(opportunity)
          .orderBy(desc(opportunity.createdAt));

    const customerIds: string[] = Array.from(
      new Set(rows.map((row: OpportunityRow) => row.customerId)),
    );
    const nameMap: Map<string, string> = new Map();
    if (customerIds.length > 0) {
      const customers = await this.db
        .select({ id: customer.id, name: customer.name })
        .from(customer)
        .where(inArray(customer.id, customerIds));
      customers.forEach((item: { id: string; name: string }) => {
        nameMap.set(item.id, item.name);
      });
    }

    const items: Opportunity[] = rows.map((row: OpportunityRow) => ({
      id: row.id,
      name: row.name,
      customerId: row.customerId,
      customerName: nameMap.get(row.customerId) ?? '',
      stage: row.stage as OpportunityStage,
      amount: Number(row.amount),
      expectedCloseAt: row.expectedCloseAt
        ? row.expectedCloseAt.toISOString()
        : '',
    }));
    return { items };
  }

  async create(
    input: OpportunityPayload,
    userId: string,
  ): Promise<{ id: string }> {
    const customerRows = await this.db
      .select({ name: customer.name })
      .from(customer)
      .where(eq(customer.id, input.customerId));
    if (customerRows.length === 0) {
      throw new NotFoundException('客户不存在');
    }
    const expectedCloseAt: Date | null = input.expectedCloseAt
      ? new Date(input.expectedCloseAt)
      : null;
    const rows = await this.db
      .insert(opportunity)
      .values({
        name: input.name,
        customerId: input.customerId,
        stage: input.stage,
        amount: String(input.amount),
        expectedCloseAt,
        createdBy: userId,
      })
      .returning({ id: opportunity.id });
    await this.operationLogService.record({
      module: '客户管理',
      actionType: 'create',
      target: `创建商机：${input.name}`,
      operatorId: userId,
    });
    return { id: rows[0].id };
  }

  async updateStage(
    id: string,
    stage: OpportunityStage,
    userId: string,
  ): Promise<{ success: boolean }> {
    const rows = await this.db
      .update(opportunity)
      .set({ stage, updatedAt: new Date(), updatedBy: userId })
      .where(eq(opportunity.id, id))
      .returning({ id: opportunity.id, name: opportunity.name });
    if (rows.length === 0) {
      throw new NotFoundException('商机不存在');
    }
    await this.operationLogService.record({
      module: '客户管理',
      actionType: 'status_change',
      target: `更新商机阶段：${rows[0].name}`,
      operatorId: userId,
    });
    return { success: true };
  }
}
