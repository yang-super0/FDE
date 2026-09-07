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
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNull,
  lt,
} from 'drizzle-orm';
import { customer, leadFollowUps, leads } from '@server/database/schema';
import type {
  AbandonLeadRequest,
  AddFollowUpRequest,
  ConvertLeadRequest,
  CreateLeadRequest,
  Lead,
  LeadDetail,
  LeadFollowUp,
  LeadListParams,
  LeadListResult,
  LeadStatus,
  UpdateLeadRequest,
} from '@shared/api.interface';
import { publishSyncEvent } from '@server/modules/feishu-sync/sync-event.publisher';

type LeadRow = typeof leads.$inferSelect;
type LeadInsert = typeof leads.$inferInsert;
type FollowUpRow = typeof leadFollowUps.$inferSelect;

const PENDING_STATUS: string = '待跟进';
const FOLLOWING_STATUS: string = '跟进中';
const CONVERTED_STATUS: string = '已转化';
const ABANDONED_STATUS: string = '已放弃';
const MAX_BATCH_SIZE: number = 500;

const LEAD_STATUSES: LeadStatus[] = ['待跟进', '跟进中', '已转化', '已放弃'];

const toLeadStatus = (value: string): LeadStatus =>
  LEAD_STATUSES.includes(value as LeadStatus)
    ? (value as LeadStatus)
    : '待跟进';

const buildInsertValues = (
  item: CreateLeadRequest,
  operatorId: string,
): LeadInsert => ({
  leadName: item.leadName.trim(),
  contactPerson: item.contactPerson ?? null,
  contactPhone: item.contactPhone ?? null,
  industry: item.industry ?? null,
  source: item.source ?? null,
  owner: item.owner?.trim() || operatorId,
  nextFollowUpAt: item.nextFollowUpAt ? new Date(item.nextFollowUpAt) : null,
  remark: item.remark ?? '',
});

@Injectable()
export class LeadsService {
  private readonly logger: Logger = new Logger(LeadsService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
  ) {}

  private mapLead(row: LeadRow): Lead {
    return {
      id: row.id,
      leadName: row.leadName,
      contactPerson: row.contactPerson ?? '',
      contactPhone: row.contactPhone ?? '',
      industry: row.industry ?? '',
      source: row.source ?? '',
      status: toLeadStatus(row.status),
      owner: row.owner ?? '',
      nextFollowUpAt: row.nextFollowUpAt
        ? row.nextFollowUpAt.toISOString()
        : null,
      convertedCustomerId: row.convertedCustomerId ?? null,
      convertedAt: row.convertedAt ? row.convertedAt.toISOString() : null,
      remark: row.remark,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private mapFollowUp(row: FollowUpRow): LeadFollowUp {
    return {
      id: row.id,
      followUpType: row.followUpType ?? '',
      content: row.content,
      followUpAt: row.followUpAt.toISOString(),
      followUpBy: row.followUpBy ?? '',
      nextAction: row.nextAction ?? '',
    };
  }

  async findAll(params: LeadListParams): Promise<LeadListResult> {
    const page: number = Math.max(params.page ?? 1, 1);
    const pageSize: number = Math.min(Math.max(params.pageSize ?? 20, 1), 100);

    const conditions = [isNull(leads.deletedAt)];
    if (params.leadName) {
      conditions.push(ilike(leads.leadName, `%${params.leadName}%`));
    }
    if (params.contactPerson) {
      conditions.push(ilike(leads.contactPerson, `%${params.contactPerson}%`));
    }
    if (params.industry) {
      conditions.push(eq(leads.industry, params.industry));
    }
    if (params.source) {
      conditions.push(eq(leads.source, params.source));
    }
    if (params.status) {
      conditions.push(eq(leads.status, params.status));
    }
    if (params.owner) {
      conditions.push(eq(leads.owner, params.owner));
    }
    if (params.startTime) {
      conditions.push(gte(leads.createdAt, new Date(params.startTime)));
    }
    if (params.endTime) {
      conditions.push(lt(leads.createdAt, new Date(params.endTime)));
    }
    const where = and(...conditions);

    const rows: LeadRow[] = await this.db
      .select()
      .from(leads)
      .where(where)
      .orderBy(desc(leads.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const totalResult = await this.db
      .select({ count: count() })
      .from(leads)
      .where(where);
    const total: number = Number(totalResult[0]?.count ?? 0);

    return {
      items: rows.map((row: LeadRow): Lead => this.mapLead(row)),
      total,
    };
  }

  async create(
    dto: CreateLeadRequest,
    operatorId: string,
  ): Promise<{ id: string }> {
    const inserted = await this.db
      .insert(leads)
      .values(buildInsertValues(dto, operatorId))
      .returning({ id: leads.id });
    if (inserted.length === 0) {
      throw new BadRequestException('线索创建失败');
    }
    this.logger.log(`线索创建成功: ${dto.leadName}`);
    publishSyncEvent('leads', inserted[0].id, 'create');
    return { id: inserted[0].id };
  }

  async batchCreate(
    items: CreateLeadRequest[],
    operatorId: string,
  ): Promise<{ created: number }> {
    const values: LeadInsert[] = items.map(
      (item: CreateLeadRequest): LeadInsert => buildInsertValues(item, operatorId),
    );
    if (values.length > MAX_BATCH_SIZE) {
      throw new BadRequestException(`单次批量导入不能超过 ${MAX_BATCH_SIZE} 条`);
    }
    const inserted = await this.db
      .insert(leads)
      .values(values)
      .returning({ id: leads.id });
    this.logger.log(`线索批量导入成功: ${inserted.length} 条`);
    for (const row of inserted) {
      publishSyncEvent('leads', row.id, 'create');
    }
    return { created: inserted.length };
  }

  async update(
    id: string,
    dto: UpdateLeadRequest,
    operatorId: string,
  ): Promise<{ success: boolean }> {
    const patch: Partial<LeadInsert> = {};
    if (dto.leadName !== undefined) {
      patch.leadName = dto.leadName.trim();
    }
    if (dto.contactPerson !== undefined) {
      patch.contactPerson = dto.contactPerson;
    }
    if (dto.contactPhone !== undefined) {
      patch.contactPhone = dto.contactPhone;
    }
    if (dto.industry !== undefined) {
      patch.industry = dto.industry;
    }
    if (dto.source !== undefined) {
      patch.source = dto.source;
    }
    if (dto.owner !== undefined) {
      patch.owner = dto.owner;
    }
    if (dto.nextFollowUpAt !== undefined) {
      patch.nextFollowUpAt = new Date(dto.nextFollowUpAt);
    }
    if (dto.remark !== undefined) {
      patch.remark = dto.remark;
    }
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }
    patch.updatedAt = new Date();
    patch.updatedBy = operatorId;

    const updated = await this.db
      .update(leads)
      .set(patch)
      .where(and(eq(leads.id, id), isNull(leads.deletedAt)))
      .returning({ id: leads.id });
    if (updated.length === 0) {
      throw new NotFoundException('线索不存在');
    }
    publishSyncEvent('leads', id, 'update');
    return { success: true };
  }

  async remove(id: string): Promise<{ success: boolean }> {
    const updated = await this.db
      .update(leads)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(leads.id, id), isNull(leads.deletedAt)))
      .returning({ id: leads.id });
    if (updated.length === 0) {
      throw new NotFoundException('线索不存在');
    }
    publishSyncEvent('leads', id, 'delete');
    return { success: true };
  }

  async assign(
    ids: string[],
    owner: string,
    operatorId: string,
  ): Promise<{ assigned: number }> {
    const updated = await this.db
      .update(leads)
      .set({ owner, updatedAt: new Date(), updatedBy: operatorId })
      .where(and(inArray(leads.id, ids), isNull(leads.deletedAt)))
      .returning({ id: leads.id });
    this.logger.log(`线索分配成功: ${updated.length} 条`);
    for (const row of updated) {
      publishSyncEvent('leads', row.id, 'update');
    }
    return { assigned: updated.length };
  }

  async detail(id: string): Promise<LeadDetail> {
    const rows: LeadRow[] = await this.db
      .select()
      .from(leads)
      .where(and(eq(leads.id, id), isNull(leads.deletedAt)));
    if (rows.length === 0) {
      throw new NotFoundException('线索不存在');
    }
    const followUpRows: FollowUpRow[] = await this.db
      .select()
      .from(leadFollowUps)
      .where(
        and(
          eq(leadFollowUps.leadId, id),
          isNull(leadFollowUps.deletedAt),
        ),
      )
      .orderBy(desc(leadFollowUps.followUpAt));
    return {
      ...this.mapLead(rows[0]),
      followUps: followUpRows.map(
        (row: FollowUpRow): LeadFollowUp => this.mapFollowUp(row),
      ),
    };
  }

  async addFollowUp(
    id: string,
    dto: AddFollowUpRequest,
    operatorId: string,
  ): Promise<{ success: boolean }> {
    await this.db.transaction(async (tx) => {
      const rows: LeadRow[] = await tx
        .select()
        .from(leads)
        .where(and(eq(leads.id, id), isNull(leads.deletedAt)));
      if (rows.length === 0) {
        throw new NotFoundException('线索不存在');
      }
      const lead: LeadRow = rows[0];

      await tx.insert(leadFollowUps).values({
        leadId: id,
        followUpType: dto.followUpType,
        content: dto.content,
        followUpAt: dto.followUpAt ? new Date(dto.followUpAt) : new Date(),
        followUpBy: operatorId,
        nextAction: dto.nextAction ?? null,
      });

      const patch: Partial<LeadInsert> = {
        updatedAt: new Date(),
        updatedBy: operatorId,
      };
      if (lead.status === PENDING_STATUS) {
        patch.status = FOLLOWING_STATUS;
      }
      if (dto.nextFollowUpAt) {
        patch.nextFollowUpAt = new Date(dto.nextFollowUpAt);
      }
      await tx.update(leads).set(patch).where(eq(leads.id, id));
    });
    this.logger.log(`线索跟进记录添加成功: ${id}`);
    publishSyncEvent('leads', id, 'update');
    return { success: true };
  }

  async convert(
    id: string,
    dto: ConvertLeadRequest,
    operatorId: string,
  ): Promise<{ customerId: string }> {
    let customerId: string = '';
    await this.db.transaction(async (tx) => {
      const rows: LeadRow[] = await tx
        .select()
        .from(leads)
        .where(and(eq(leads.id, id), isNull(leads.deletedAt)));
      if (rows.length === 0) {
        throw new NotFoundException('线索不存在');
      }
      const lead: LeadRow = rows[0];
      if (
        lead.status === CONVERTED_STATUS ||
        lead.status === ABANDONED_STATUS
      ) {
        throw new ConflictException('该线索已转化或已放弃，不能重复转化');
      }

      const inserted = await tx
        .insert(customer)
        .values({
          name: dto.customerName.trim(),
          industry: dto.industry || lead.industry || '其他',
          contactName: dto.contactName || lead.contactPerson || '',
          contactPhone: dto.contactPhone || lead.contactPhone || '',
          source: '线索转化',
        })
        .returning({ id: customer.id });
      if (inserted.length === 0) {
        throw new BadRequestException('客户创建失败');
      }
      customerId = inserted[0].id;

      await tx
        .update(leads)
        .set({
          status: CONVERTED_STATUS,
          convertedCustomerId: customerId,
          convertedAt: new Date(),
          updatedAt: new Date(),
          updatedBy: operatorId,
        })
        .where(eq(leads.id, id));
    });
    this.logger.log(`线索转化成功: ${id} -> ${customerId}`);
    publishSyncEvent('leads', id, 'update');
    publishSyncEvent('customer', customerId, 'create');
    return { customerId };
  }

  async abandon(
    id: string,
    dto: AbandonLeadRequest,
    operatorId: string,
  ): Promise<{ success: boolean }> {
    const rows: LeadRow[] = await this.db
      .select()
      .from(leads)
      .where(and(eq(leads.id, id), isNull(leads.deletedAt)));
    if (rows.length === 0) {
      throw new NotFoundException('线索不存在');
    }
    const lead: LeadRow = rows[0];
    if (lead.status === CONVERTED_STATUS) {
      throw new ConflictException('已转化的线索不能放弃');
    }
    const reasonLine: string = `放弃原因：${dto.reason}`;
    const remark: string = lead.remark
      ? `${lead.remark}\n${reasonLine}`
      : reasonLine;

    const updated = await this.db
      .update(leads)
      .set({
        status: ABANDONED_STATUS,
        remark,
        updatedAt: new Date(),
        updatedBy: operatorId,
      })
      .where(and(eq(leads.id, id), isNull(leads.deletedAt)))
      .returning({ id: leads.id });
    if (updated.length === 0) {
      throw new NotFoundException('线索不存在');
    }
    this.logger.log(`线索放弃成功: ${id}`);
    publishSyncEvent('leads', id, 'update');
    return { success: true };
  }
}
