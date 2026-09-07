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
import { and, count, desc, eq, ilike, isNull, or } from 'drizzle-orm';
import { actors } from '@server/database/schema';
import type {
  Actor,
  ActorListParams,
  ActorListResult,
  CreateActorRequest,
  UpdateActorRequest,
} from '@shared/api.interface';
import { publishSyncEvent } from '@server/modules/feishu-sync/sync-event.publisher';

type ActorRow = typeof actors.$inferSelect;
type ActorInsert = typeof actors.$inferInsert;

const ACTOR_STATUSES: string[] = ['可用', '忙碌', '停用'];

const parseStringArray = (value: string | null): string[] => {
  if (!value) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(
      (item: unknown): item is string => typeof item === 'string',
    );
  } catch {
    return [];
  }
};

const validateStatus = (status: string): void => {
  if (!ACTOR_STATUSES.includes(status)) {
    throw new BadRequestException(
      `演员状态无效，允许值：${ACTOR_STATUSES.join('/')}`,
    );
  }
};

@Injectable()
export class VideoActorsService {
  private readonly logger: Logger = new Logger(VideoActorsService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
  ) {}

  private mapActor(row: ActorRow): Actor {
    return {
      id: row.id,
      actorName: row.actorName,
      actorType: row.actorType ?? '',
      gender: row.gender ?? '',
      age: row.age,
      phone: row.phone ?? '',
      wechat: row.wechat ?? '',
      email: row.email ?? '',
      dailyRate: Number(row.dailyRate ?? 0),
      halfDayRate: Number(row.halfDayRate ?? 0),
      skills: parseStringArray(row.skills),
      styleTags: parseStringArray(row.styleTags),
      schedule: parseStringArray(row.schedule),
      portfolio: row.portfolio ?? '',
      status: row.status,
      remark: row.remark ?? '',
      createdAt: row.createdAt.toISOString(),
    };
  }

  async findAll(params: ActorListParams): Promise<ActorListResult> {
    const page: number = Math.max(params.page ?? 1, 1);
    const pageSize: number = Math.min(Math.max(params.pageSize ?? 20, 1), 50);

    const conditions = [isNull(actors.deletedAt)];
    if (params.actorName) {
      conditions.push(ilike(actors.actorName, `%${params.actorName}%`));
    }
    if (params.actorType) {
      conditions.push(eq(actors.actorType, params.actorType));
    }
    if (params.gender) {
      conditions.push(eq(actors.gender, params.gender));
    }
    if (params.status) {
      conditions.push(eq(actors.status, params.status));
    }
    if (params.tag) {
      conditions.push(
        or(
          ilike(actors.skills, `%${params.tag}%`),
          ilike(actors.styleTags, `%${params.tag}%`),
        ),
      );
    }
    const where = and(...conditions);

    const rows: ActorRow[] = await this.db
      .select()
      .from(actors)
      .where(where)
      .orderBy(desc(actors.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const totalResult: { count: number | string }[] = await this.db
      .select({ count: count() })
      .from(actors)
      .where(where);
    const total: number = Number(totalResult[0]?.count ?? 0);

    return { items: rows.map((row: ActorRow): Actor => this.mapActor(row)), total };
  }

  async detail(id: number): Promise<Actor> {
    const rows: ActorRow[] = await this.db
      .select()
      .from(actors)
      .where(and(eq(actors.id, id), isNull(actors.deletedAt)));
    if (rows.length === 0) {
      throw new NotFoundException('演员不存在');
    }
    return this.mapActor(rows[0]);
  }

  async create(dto: CreateActorRequest): Promise<Actor> {
    if (!dto.actorName || dto.actorName.trim().length === 0) {
      throw new BadRequestException('请填写演员姓名');
    }
    if (dto.status !== undefined) {
      validateStatus(dto.status);
    }

    const values: ActorInsert = {
      actorName: dto.actorName.trim(),
      actorType: dto.actorType ?? '素人',
      gender: dto.gender ?? '',
      age: dto.age ?? null,
      phone: dto.phone ?? '',
      wechat: dto.wechat ?? '',
      email: dto.email ?? '',
      dailyRate: String(dto.dailyRate ?? 0),
      halfDayRate: String(dto.halfDayRate ?? 0),
      skills: JSON.stringify(dto.skills ?? []),
      styleTags: JSON.stringify(dto.styleTags ?? []),
      schedule: JSON.stringify(dto.schedule ?? []),
      portfolio: dto.portfolio ?? '',
      status: dto.status ?? '可用',
      remark: dto.remark ?? '',
    };

    const inserted: ActorRow = await this.db.transaction(
      async (tx): Promise<ActorRow> => {
        const rows: ActorRow[] = await tx
          .insert(actors)
          .values(values)
          .returning();
        if (rows.length === 0) {
          throw new BadRequestException('创建失败');
        }
        return rows[0];
      },
    );
    this.logger.log(`演员创建成功: ${inserted.actorName}`);
    publishSyncEvent('actors', inserted.id, 'create');
    return this.mapActor(inserted);
  }

  async update(id: number, dto: UpdateActorRequest): Promise<Actor> {
    const rows: ActorRow[] = await this.db
      .select()
      .from(actors)
      .where(and(eq(actors.id, id), isNull(actors.deletedAt)));
    if (rows.length === 0) {
      throw new NotFoundException('演员不存在');
    }

    const patch: Partial<ActorInsert> = {};
    if (dto.actorName !== undefined) {
      if (dto.actorName.trim().length === 0) {
        throw new BadRequestException('演员姓名不能为空');
      }
      patch.actorName = dto.actorName.trim();
    }
    if (dto.actorType !== undefined) {
      patch.actorType = dto.actorType;
    }
    if (dto.gender !== undefined) {
      patch.gender = dto.gender;
    }
    if (dto.age !== undefined) {
      patch.age = dto.age;
    }
    if (dto.phone !== undefined) {
      patch.phone = dto.phone;
    }
    if (dto.wechat !== undefined) {
      patch.wechat = dto.wechat;
    }
    if (dto.email !== undefined) {
      patch.email = dto.email;
    }
    if (dto.dailyRate !== undefined) {
      patch.dailyRate = String(dto.dailyRate);
    }
    if (dto.halfDayRate !== undefined) {
      patch.halfDayRate = String(dto.halfDayRate);
    }
    if (dto.skills !== undefined) {
      patch.skills = JSON.stringify(dto.skills);
    }
    if (dto.styleTags !== undefined) {
      patch.styleTags = JSON.stringify(dto.styleTags);
    }
    if (dto.schedule !== undefined) {
      patch.schedule = JSON.stringify(dto.schedule);
    }
    if (dto.portfolio !== undefined) {
      patch.portfolio = dto.portfolio;
    }
    if (dto.status !== undefined) {
      validateStatus(dto.status);
      patch.status = dto.status;
    }
    if (dto.remark !== undefined) {
      patch.remark = dto.remark;
    }
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }
    patch.updatedAt = new Date();

    const updated: ActorRow = await this.db.transaction(
      async (tx): Promise<ActorRow> => {
        const result: ActorRow[] = await tx
          .update(actors)
          .set(patch)
          .where(and(eq(actors.id, id), isNull(actors.deletedAt)))
          .returning();
        if (result.length === 0) {
          throw new NotFoundException('演员不存在');
        }
        return result[0];
      },
    );
    this.logger.log(`演员更新成功: ${String(id)}`);
    publishSyncEvent('actors', id, 'update');
    return this.mapActor(updated);
  }

  async remove(id: number): Promise<{ success: boolean }> {
    const rows: ActorRow[] = await this.db
      .select()
      .from(actors)
      .where(and(eq(actors.id, id), isNull(actors.deletedAt)));
    if (rows.length === 0) {
      throw new NotFoundException('演员不存在');
    }

    const now: Date = new Date();
    const updated: { id: number }[] = await this.db
      .update(actors)
      .set({ deletedAt: now, updatedAt: now })
      .where(and(eq(actors.id, id), isNull(actors.deletedAt)))
      .returning({ id: actors.id });
    if (updated.length === 0) {
      throw new NotFoundException('演员不存在');
    }
    publishSyncEvent('actors', id, 'delete');
    return { success: true };
  }
}
