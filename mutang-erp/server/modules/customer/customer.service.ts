import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  AuthNPaasService,
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { and, count, desc, eq, ilike } from 'drizzle-orm';
import { customer, followRecord } from '@server/database/schema';
import type {
  Customer,
  CustomerStatus,
  FollowRecord,
  PageResult,
} from '@shared/api.interface';
import { OperationLogService } from '../operation-log/operation-log.service';
import type {
  CustomerPatch,
  CustomerPayload,
  FollowRecordPayload,
} from './customer.dto';
import { publishSyncEvent } from '@server/modules/feishu-sync/sync-event.publisher';

export interface CustomerListQuery {
  keyword?: string;
  industry?: string;
  status?: string;
  page: number;
  pageSize: number;
}

type CustomerRow = typeof customer.$inferSelect;
type FollowRecordRow = typeof followRecord.$inferSelect;

@Injectable()
export class CustomerService {
  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
    private readonly authn: AuthNPaasService,
    private readonly operationLogService: OperationLogService,
  ) {}

  private toCustomer(row: CustomerRow): Customer {
    return {
      id: row.id,
      name: row.name,
      industry: row.industry,
      contactName: row.contactName,
      contactPhone: row.contactPhone,
      source: row.source,
      status: row.status as CustomerStatus,
      createdAt: row.createdAt.toISOString(),
    };
  }

  async list(query: CustomerListQuery): Promise<PageResult<Customer>> {
    const page: number = Math.max(query.page || 1, 1);
    const pageSize: number = Math.min(Math.max(query.pageSize || 20, 1), 100);

    const conditions = [];
    if (query.keyword) {
      conditions.push(ilike(customer.name, `%${query.keyword}%`));
    }
    if (query.industry) {
      conditions.push(eq(customer.industry, query.industry));
    }
    if (query.status) {
      conditions.push(eq(customer.status, query.status));
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const rows: CustomerRow[] = where
      ? await this.db
          .select()
          .from(customer)
          .where(where)
          .orderBy(desc(customer.createdAt))
          .limit(pageSize)
          .offset((page - 1) * pageSize)
      : await this.db
          .select()
          .from(customer)
          .orderBy(desc(customer.createdAt))
          .limit(pageSize)
          .offset((page - 1) * pageSize);

    const totalResult = where
      ? await this.db.select({ count: count() }).from(customer).where(where)
      : await this.db.select({ count: count() }).from(customer);
    const total: number = Number(totalResult[0]?.count ?? 0);

    return {
      items: rows.map((row: CustomerRow) => this.toCustomer(row)),
      total,
    };
  }

  async create(
    input: CustomerPayload,
    userId: string,
  ): Promise<{ id: string }> {
    const rows = await this.db
      .insert(customer)
      .values({
        name: input.name,
        industry: input.industry,
        contactName: input.contactName,
        contactPhone: input.contactPhone,
        source: input.source,
        status: input.status,
        createdBy: userId,
      })
      .returning({ id: customer.id });
    await this.operationLogService.record({
      module: '客户管理',
      actionType: 'create',
      target: `创建客户：${input.name}`,
      operatorId: userId,
    });
    publishSyncEvent('customer', rows[0].id, 'create');
    return { id: rows[0].id };
  }

  async update(
    id: string,
    patch: CustomerPatch,
    userId: string,
  ): Promise<{ success: true }> {
    const setValues: Partial<typeof customer.$inferInsert> = {
      updatedAt: new Date(),
      updatedBy: userId,
    };
    if (patch.name !== undefined) setValues.name = patch.name;
    if (patch.industry !== undefined) setValues.industry = patch.industry;
    if (patch.contactName !== undefined) {
      setValues.contactName = patch.contactName;
    }
    if (patch.contactPhone !== undefined) {
      setValues.contactPhone = patch.contactPhone;
    }
    if (patch.source !== undefined) setValues.source = patch.source;
    if (patch.status !== undefined) setValues.status = patch.status;

    const rows = await this.db
      .update(customer)
      .set(setValues)
      .where(eq(customer.id, id))
      .returning({ id: customer.id, name: customer.name });
    if (rows.length === 0) {
      throw new NotFoundException('客户不存在');
    }
    await this.operationLogService.record({
      module: '客户管理',
      actionType: 'update',
      target: `更新客户：${rows[0].name}`,
      operatorId: userId,
    });
    publishSyncEvent('customer', id, 'update');
    return { success: true };
  }

  async findOne(id: string): Promise<Customer> {
    const rows: CustomerRow[] = await this.db
      .select()
      .from(customer)
      .where(eq(customer.id, id));
    if (rows.length === 0) {
      throw new NotFoundException('客户不存在');
    }
    return this.toCustomer(rows[0]);
  }

  async listFollowRecords(
    customerId: string,
  ): Promise<{ items: FollowRecord[] }> {
    await this.findOne(customerId);
    const rows: FollowRecordRow[] = await this.db
      .select()
      .from(followRecord)
      .where(eq(followRecord.customerId, customerId))
      .orderBy(desc(followRecord.createdAt));

    const creatorIds: string[] = Array.from(
      new Set(
        rows
          .map((row: FollowRecordRow) => row.createdBy)
          .filter((creatorId: string | null): creatorId is string =>
            Boolean(creatorId),
          ),
      ),
    );
    const nameMap: Map<string, string> = new Map();
    if (creatorIds.length > 0) {
      const users = await this.authn.listUsersByIds(creatorIds.slice(0, 100));
      users.forEach((user, index: number) => {
        if (user) {
          nameMap.set(
            creatorIds[index],
            user.name?.zh_cn ?? user.name?.en_us ?? '',
          );
        }
      });
    }

    const items: FollowRecord[] = rows.map((row: FollowRecordRow) => ({
      id: row.id,
      customerId: row.customerId,
      method: row.method,
      content: row.content,
      nextFollowAt: row.nextFollowAt ? row.nextFollowAt.toISOString() : '',
      creatorName: row.createdBy ? nameMap.get(row.createdBy) ?? '' : '',
      createdAt: row.createdAt.toISOString(),
    }));
    return { items };
  }

  async addFollowRecord(
    customerId: string,
    input: FollowRecordPayload,
    userId: string,
  ): Promise<{ id: string }> {
    const target: Customer = await this.findOne(customerId);
    const nextFollowAt: Date | null = input.nextFollowAt
      ? new Date(input.nextFollowAt)
      : null;
    const rows = await this.db
      .insert(followRecord)
      .values({
        customerId,
        method: input.method,
        content: input.content,
        nextFollowAt,
        createdBy: userId,
      })
      .returning({ id: followRecord.id });
    await this.operationLogService.record({
      module: '客户管理',
      actionType: 'create',
      target: `添加跟进记录：${target.name}`,
      operatorId: userId,
    });
    return { id: rows[0].id };
  }
}
