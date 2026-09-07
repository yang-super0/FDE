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
  gte,
  ilike,
  inArray,
  isNull,
  lt,
  ne,
} from 'drizzle-orm';
import { publicPoolLeads, sysUser } from '@server/database/schema';
import type {
  CreatePoolLeadRequest,
  PoolAnalytics,
  PoolAssignRequest,
  PoolLead,
  PoolLeadListParams,
  PoolLeadListResult,
  PoolLeadStatus,
  UpdatePoolLeadRequest,
} from '@shared/api.interface';
import { buildPoolAnalytics } from './pool-analytics';
import type { PoolAnalyticsRow } from './pool-analytics';
import { publishSyncEvent } from '@server/modules/feishu-sync/sync-event.publisher';

type PoolLeadRow = typeof publicPoolLeads.$inferSelect;
type PoolLeadInsert = typeof publicPoolLeads.$inferInsert;

const INVALID_STATUS: string = '无效';
const UNASSIGNED_STATUS: string = '未分配';
const CLAIMED_STATUS: string = '已领取';
const ASSIGNED_STATUS: string = '已分配';
const CONVERTED_STATUS: string = '已转化';
const CLAIMABLE_STATUSES: string[] = [UNASSIGNED_STATUS, CLAIMED_STATUS];

const POOL_STATUSES: PoolLeadStatus[] = [
  '未分配',
  '已领取',
  '已分配',
  '已转化',
  '无效',
];

const toPoolStatus = (value: string): PoolLeadStatus =>
  POOL_STATUSES.includes(value as PoolLeadStatus)
    ? (value as PoolLeadStatus)
    : '未分配';

const buildInsertValues = (
  item: CreatePoolLeadRequest,
  operatorId: string,
): PoolLeadInsert => ({
  subjectName: item.subjectName.trim(),
  leadLevel: item.leadLevel ?? null,
  industry1: item.industry1 ?? null,
  industry2: item.industry2 ?? null,
  contactPerson: item.contactPerson ?? null,
  contactPhone: item.contactPhone ?? null,
  status: UNASSIGNED_STATUS,
  remark: item.remark ?? '',
  createdBy: operatorId,
});

@Injectable()
export class PoolService {
  private readonly logger: Logger = new Logger(PoolService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
  ) {}

  private mapLead(row: PoolLeadRow): PoolLead {
    return {
      id: row.id,
      subjectName: row.subjectName,
      leadLevel: row.leadLevel ?? '',
      industry1: row.industry1 ?? '',
      industry2: row.industry2 ?? '',
      contactPerson: row.contactPerson ?? '',
      contactPhone: row.contactPhone ?? '',
      status: toPoolStatus(row.status),
      assignedTo: row.assignedTo ?? '',
      assignedAt: row.assignedAt ? row.assignedAt.toISOString() : null,
      createdBy: row.createdBy ?? '',
      remark: row.remark,
      createdAt: row.createdAt.toISOString(),
    };
  }

  async findAll(params: PoolLeadListParams): Promise<PoolLeadListResult> {
    const page: number = Math.max(params.page ?? 1, 1);
    const pageSize: number = Math.min(Math.max(params.pageSize ?? 20, 1), 100);

    const conditions = [isNull(publicPoolLeads.deletedAt)];
    if (params.subjectName) {
      conditions.push(
        ilike(publicPoolLeads.subjectName, `%${params.subjectName}%`),
      );
    }
    if (params.leadLevel) {
      conditions.push(eq(publicPoolLeads.leadLevel, params.leadLevel));
    }
    if (params.industry1) {
      conditions.push(eq(publicPoolLeads.industry1, params.industry1));
    }
    if (params.industry2) {
      conditions.push(eq(publicPoolLeads.industry2, params.industry2));
    }
    if (params.createdBy) {
      conditions.push(eq(publicPoolLeads.createdBy, params.createdBy));
    }
    if (params.status) {
      conditions.push(eq(publicPoolLeads.status, params.status));
    } else {
      conditions.push(ne(publicPoolLeads.status, INVALID_STATUS));
    }
    if (params.startTime) {
      conditions.push(
        gte(publicPoolLeads.createdAt, new Date(params.startTime)),
      );
    }
    if (params.endTime) {
      conditions.push(lt(publicPoolLeads.createdAt, new Date(params.endTime)));
    }
    const where = and(...conditions);

    const rows: PoolLeadRow[] = await this.db
      .select()
      .from(publicPoolLeads)
      .where(where)
      .orderBy(desc(publicPoolLeads.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const totalResult = await this.db
      .select({ count: count() })
      .from(publicPoolLeads)
      .where(where);
    const total: number = Number(totalResult[0]?.count ?? 0);

    return {
      items: rows.map((row: PoolLeadRow): PoolLead => this.mapLead(row)),
      total,
    };
  }

  async create(
    dto: CreatePoolLeadRequest,
    operatorId: string,
  ): Promise<{ id: string }> {
    const inserted = await this.db
      .insert(publicPoolLeads)
      .values(buildInsertValues(dto, operatorId))
      .returning({ id: publicPoolLeads.id });
    if (inserted.length === 0) {
      throw new BadRequestException('公海客资创建失败');
    }
    this.logger.log(`公海客资创建成功: ${dto.subjectName}`);
    publishSyncEvent('public_pool_leads', inserted[0].id, 'create');
    return { id: inserted[0].id };
  }

  async batchCreate(
    items: CreatePoolLeadRequest[],
    operatorId: string,
  ): Promise<{ created: number }> {
    const values: PoolLeadInsert[] = items.map(
      (item: CreatePoolLeadRequest): PoolLeadInsert =>
        buildInsertValues(item, operatorId),
    );
    const inserted = await this.db
      .insert(publicPoolLeads)
      .values(values)
      .returning({ id: publicPoolLeads.id });
    this.logger.log(`公海客资批量导入成功: ${inserted.length} 条`);
    for (const row of inserted) {
      publishSyncEvent('public_pool_leads', row.id, 'create');
    }
    return { created: inserted.length };
  }

  async update(
    id: string,
    dto: UpdatePoolLeadRequest,
    operatorId: string,
  ): Promise<{ success: boolean }> {
    const patch: Partial<PoolLeadInsert> = {};
    if (dto.subjectName !== undefined) {
      patch.subjectName = dto.subjectName.trim();
    }
    if (dto.leadLevel !== undefined) {
      patch.leadLevel = dto.leadLevel;
    }
    if (dto.industry1 !== undefined) {
      patch.industry1 = dto.industry1;
    }
    if (dto.industry2 !== undefined) {
      patch.industry2 = dto.industry2;
    }
    if (dto.contactPerson !== undefined) {
      patch.contactPerson = dto.contactPerson;
    }
    if (dto.contactPhone !== undefined) {
      patch.contactPhone = dto.contactPhone;
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
      .update(publicPoolLeads)
      .set(patch)
      .where(and(eq(publicPoolLeads.id, id), isNull(publicPoolLeads.deletedAt)))
      .returning({ id: publicPoolLeads.id });
    if (updated.length === 0) {
      throw new NotFoundException('公海客资不存在');
    }
    publishSyncEvent('public_pool_leads', id, 'update');
    return { success: true };
  }

  async remove(id: string): Promise<{ success: boolean }> {
    const updated = await this.db
      .update(publicPoolLeads)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(publicPoolLeads.id, id), isNull(publicPoolLeads.deletedAt)))
      .returning({ id: publicPoolLeads.id });
    if (updated.length === 0) {
      throw new NotFoundException('公海客资不存在');
    }
    publishSyncEvent('public_pool_leads', id, 'delete');
    return { success: true };
  }

  async claim(id: string, operatorId: string): Promise<{ success: boolean }> {
    const now: Date = new Date();
    const updated = await this.db
      .update(publicPoolLeads)
      .set({
        status: CLAIMED_STATUS,
        assignedTo: operatorId,
        assignedAt: now,
        updatedAt: now,
        updatedBy: operatorId,
      })
      .where(
        and(
          eq(publicPoolLeads.id, id),
          isNull(publicPoolLeads.deletedAt),
          eq(publicPoolLeads.status, UNASSIGNED_STATUS),
        ),
      )
      .returning({ id: publicPoolLeads.id });
    if (updated.length === 0) {
      throw new ConflictException('该客资已被领取或分配');
    }
    publishSyncEvent('public_pool_leads', id, 'update');
    return { success: true };
  }

  async batchClaim(
    ids: string[],
    operatorId: string,
  ): Promise<{ claimed: number }> {
    let claimed: number = 0;
    for (const leadId of ids) {
      const now: Date = new Date();
      const updated = await this.db
        .update(publicPoolLeads)
        .set({
          status: CLAIMED_STATUS,
          assignedTo: operatorId,
          assignedAt: now,
          updatedAt: now,
          updatedBy: operatorId,
        })
        .where(
          and(
            eq(publicPoolLeads.id, leadId),
            isNull(publicPoolLeads.deletedAt),
            eq(publicPoolLeads.status, UNASSIGNED_STATUS),
          ),
        )
        .returning({ id: publicPoolLeads.id });
      claimed += updated.length;
      for (const row of updated) {
        publishSyncEvent('public_pool_leads', row.id, 'update');
      }
    }
    this.logger.log(`公海客资批量领取成功: ${claimed} 条`);
    return { claimed };
  }

  async assign(dto: PoolAssignRequest): Promise<{ assigned: number }> {
    const now: Date = new Date();
    const updated = await this.db
      .update(publicPoolLeads)
      .set({
        status: ASSIGNED_STATUS,
        assignedTo: dto.assignee,
        assignedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          inArray(publicPoolLeads.id, dto.ids),
          isNull(publicPoolLeads.deletedAt),
          inArray(publicPoolLeads.status, CLAIMABLE_STATUSES),
        ),
      )
      .returning({ id: publicPoolLeads.id });
    this.logger.log(`公海客资分配成功: ${updated.length} 条`);
    for (const row of updated) {
      publishSyncEvent('public_pool_leads', row.id, 'update');
    }
    return { assigned: updated.length };
  }

  async autoAssign(): Promise<{ assigned: number }> {
    const members: { member: string }[] = await this.db
      .select({ member: sysUser.member })
      .from(sysUser)
      .where(eq(sysUser.status, 'enabled'));
    if (members.length === 0) {
      throw new BadRequestException('暂无启用状态的成员，无法自动分配');
    }
    const memberIds: string[] = members.map(
      (row: { member: string }): string => row.member,
    );

    const poolRows: { id: string }[] = await this.db
      .select({ id: publicPoolLeads.id })
      .from(publicPoolLeads)
      .where(
        and(
          isNull(publicPoolLeads.deletedAt),
          eq(publicPoolLeads.status, UNASSIGNED_STATUS),
        ),
      )
      .orderBy(asc(publicPoolLeads.createdAt));
    if (poolRows.length === 0) {
      return { assigned: 0 };
    }

    const byMember: Map<string, string[]> = new Map();
    poolRows.forEach((row: { id: string }, index: number): void => {
      const memberId: string = memberIds[index % memberIds.length];
      byMember.set(memberId, [...(byMember.get(memberId) ?? []), row.id]);
    });

    let assigned: number = 0;
    await this.db.transaction(async (tx) => {
      for (const [memberId, ids] of byMember) {
        const now: Date = new Date();
        const updated = await tx
          .update(publicPoolLeads)
          .set({
            status: ASSIGNED_STATUS,
            assignedTo: memberId,
            assignedAt: now,
            updatedAt: now,
          })
          .where(
            and(
              inArray(publicPoolLeads.id, ids),
              isNull(publicPoolLeads.deletedAt),
              eq(publicPoolLeads.status, UNASSIGNED_STATUS),
            ),
          )
          .returning({ id: publicPoolLeads.id });
        assigned += updated.length;
        for (const row of updated) {
          publishSyncEvent('public_pool_leads', row.id, 'update');
        }
      }
    });
    this.logger.log(`公海客资自动分配成功: ${assigned} 条`);
    return { assigned };
  }

  async invalidate(id: string): Promise<{ success: boolean }> {
    const updated = await this.db
      .update(publicPoolLeads)
      .set({
        status: INVALID_STATUS,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(publicPoolLeads.id, id),
          isNull(publicPoolLeads.deletedAt),
          inArray(publicPoolLeads.status, [
            UNASSIGNED_STATUS,
            CLAIMED_STATUS,
            ASSIGNED_STATUS,
          ]),
        ),
      )
      .returning({ id: publicPoolLeads.id });
    if (updated.length === 0) {
      throw new ConflictException('客资不存在或当前状态不支持标记无效');
    }
    publishSyncEvent('public_pool_leads', id, 'update');
    return { success: true };
  }

  async restore(id: string): Promise<{ success: boolean }> {
    const updated = await this.db
      .update(publicPoolLeads)
      .set({
        status: UNASSIGNED_STATUS,
        assignedTo: null,
        assignedAt: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(publicPoolLeads.id, id),
          isNull(publicPoolLeads.deletedAt),
          eq(publicPoolLeads.status, INVALID_STATUS),
        ),
      )
      .returning({ id: publicPoolLeads.id });
    if (updated.length === 0) {
      throw new ConflictException('仅无效状态的客资可以恢复');
    }
    publishSyncEvent('public_pool_leads', id, 'update');
    return { success: true };
  }

  async analytics(): Promise<PoolAnalytics> {
    const rows: PoolAnalyticsRow[] = await this.db
      .select({
        status: publicPoolLeads.status,
        assignedTo: publicPoolLeads.assignedTo,
        assignedAt: publicPoolLeads.assignedAt,
        createdAt: publicPoolLeads.createdAt,
        updatedAt: publicPoolLeads.updatedAt,
      })
      .from(publicPoolLeads)
      .where(isNull(publicPoolLeads.deletedAt));
    return buildPoolAnalytics(rows);
  }
}
