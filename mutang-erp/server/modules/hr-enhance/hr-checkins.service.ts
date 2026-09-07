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
  isNull,
  lt,
  type SQL,
} from 'drizzle-orm';
import { hrCheckins } from '@server/database/schema';
import type {
  CreateHrCheckinBody,
  HrCheckin,
  HrCheckinListParams,
  HrCheckinPage,
  HrCheckinStats,
  UpdateHrCheckinBody,
} from '@shared/api.interface';
import { insertWithSeqNo } from '../finance-core/fin-seq.util';
import { addDays, parseDateParam } from '../finance-core/query.util';
import {
  assertHrRequired,
  resolveHrPagination,
} from './hr-enhance-shared.util';

type CheckinRow = typeof hrCheckins.$inferSelect;
type CheckinInsert = typeof hrCheckins.$inferInsert;

const CHECKIN_NO_PREFIX: string = 'QD';
const STATUS_CHECKED_IN: string = '已签到';
const STATUS_NOT_CHECKED_IN: string = '未签到';
const STATUS_LATE: string = '迟到';
const CHECKABLE_STATUSES: string[] = [STATUS_NOT_CHECKED_IN, STATUS_LATE];
const DEFAULT_TYPE: string = '面试签到';

export interface HrCheckinCheckinBody {
  location?: string;
}

export function mapHrCheckin(row: CheckinRow): HrCheckin {
  return {
    id: row.id,
    checkinNo: row.checkinNo,
    candidateName: row.candidateName,
    type: row.type,
    relatedId: row.relatedId,
    checkinTime: row.checkinTime ? row.checkinTime.toISOString() : null,
    location: row.location,
    status: row.status,
    remark: row.remark,
    createdAt: row.createdAt.toISOString(),
    createdBy: row.createdBy ?? '',
    updatedAt: row.updatedAt.toISOString(),
    updatedBy: row.updatedBy ?? '',
    deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
  };
}

@Injectable()
export class HrCheckinsService {
  private readonly logger = new Logger(HrCheckinsService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
  ) {}

  async listCheckins(params: HrCheckinListParams): Promise<HrCheckinPage> {
    const pagination = resolveHrPagination(params.page, params.pageSize);
    const conditions: (SQL | undefined)[] = [isNull(hrCheckins.deletedAt)];
    if (params.type) {
      conditions.push(eq(hrCheckins.type, params.type));
    }
    if (params.status) {
      conditions.push(eq(hrCheckins.status, params.status));
    }
    if (params.dateStart) {
      conditions.push(
        gte(hrCheckins.checkinTime, parseDateParam(params.dateStart)),
      );
    }
    if (params.dateEnd) {
      conditions.push(
        lt(
          hrCheckins.checkinTime,
          addDays(parseDateParam(params.dateEnd), 1),
        ),
      );
    }
    const where = and(...conditions);
    const totalRows: { count: number | string }[] = await this.db
      .select({ count: count() })
      .from(hrCheckins)
      .where(where);
    const rows: CheckinRow[] = await this.db
      .select()
      .from(hrCheckins)
      .where(where)
      .orderBy(desc(hrCheckins.id))
      .limit(pagination.pageSize)
      .offset(pagination.offset);
    return {
      items: rows.map((row: CheckinRow) => mapHrCheckin(row)),
      total: Number(totalRows[0]?.count ?? 0),
      page: pagination.page,
      pageSize: pagination.pageSize,
    };
  }

  async createCheckin(
    dto: CreateHrCheckinBody,
    userId: string,
  ): Promise<HrCheckin> {
    assertHrRequired(dto?.candidateName, '候选人姓名');
    assertHrRequired(dto?.type, '签到类型');
    const checkinTime: Date | null | undefined = parseOptionalTime(
      dto?.checkinTime,
    );
    const values: Omit<CheckinInsert, 'checkinNo'> = {
      candidateName: dto.candidateName,
      type: dto.type,
      relatedId: dto?.relatedId ?? null,
      checkinTime: checkinTime ?? null,
      location: typeof dto?.location === 'string' ? dto.location : '',
      status: dto?.status ?? STATUS_NOT_CHECKED_IN,
      remark: dto?.remark ?? '',
      createdBy: userId,
      updatedBy: userId,
    };
    const inserted = await insertWithSeqNo<CheckinRow>({
      db: this.db,
      table: hrCheckins,
      noColumn: hrCheckins.checkinNo,
      prefix: CHECKIN_NO_PREFIX,
      insert: (no: string) =>
        this.db
          .insert(hrCheckins)
          .values({ ...values, checkinNo: no })
          .returning(),
    });
    this.logger.log(`创建签到记录 ${inserted.no}`);
    return mapHrCheckin(inserted.row);
  }

  async updateCheckin(
    id: number,
    dto: UpdateHrCheckinBody,
    userId: string,
  ): Promise<HrCheckin> {
    const row = await this.getCheckinOrThrow(id);
    if (row.status === STATUS_CHECKED_IN) {
      throw new ConflictException('已签到的记录不允许修改');
    }
    const patch: Partial<CheckinInsert> = {};
    if (dto?.candidateName !== undefined) {
      patch.candidateName = dto.candidateName;
    }
    if (dto?.type !== undefined) {
      patch.type = dto.type;
    }
    if (dto?.relatedId !== undefined) {
      patch.relatedId = dto.relatedId;
    }
    if (dto?.checkinTime !== undefined) {
      patch.checkinTime = parseOptionalTime(dto.checkinTime) ?? null;
    }
    if (dto?.location !== undefined) {
      patch.location = dto.location;
    }
    if (dto?.status !== undefined) {
      patch.status = dto.status;
    }
    if (dto?.remark !== undefined) {
      patch.remark = dto.remark;
    }
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }
    patch.updatedAt = new Date();
    patch.updatedBy = userId;
    const updated: CheckinRow[] = await this.db
      .update(hrCheckins)
      .set(patch)
      .where(and(eq(hrCheckins.id, id), isNull(hrCheckins.deletedAt)))
      .returning();
    if (updated.length === 0) {
      throw new NotFoundException('签到记录不存在');
    }
    return mapHrCheckin(updated[0]);
  }

  async deleteCheckin(id: number): Promise<{ success: boolean }> {
    const row = await this.getCheckinOrThrow(id);
    if (row.status === STATUS_CHECKED_IN) {
      throw new ConflictException('已签到的记录不允许删除');
    }
    const updated: CheckinRow[] = await this.db
      .update(hrCheckins)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(hrCheckins.id, id), isNull(hrCheckins.deletedAt)))
      .returning();
    if (updated.length === 0) {
      throw new NotFoundException('签到记录不存在');
    }
    this.logger.log(`删除签到记录 ${row.checkinNo}`);
    return { success: true };
  }

  async checkin(
    id: number,
    body: HrCheckinCheckinBody,
    userId: string,
  ): Promise<HrCheckin> {
    const row = await this.getCheckinOrThrow(id);
    if (!CHECKABLE_STATUSES.includes(row.status)) {
      throw new ConflictException(
        `当前状态为${row.status}的记录不允许签到`,
      );
    }
    const patch: Partial<CheckinInsert> = {
      checkinTime: new Date(),
      status: STATUS_CHECKED_IN,
      updatedAt: new Date(),
      updatedBy: userId,
    };
    if (typeof body?.location === 'string' && body.location !== '') {
      patch.location = body.location;
    }
    const updated: CheckinRow[] = await this.db
      .update(hrCheckins)
      .set(patch)
      .where(and(eq(hrCheckins.id, id), isNull(hrCheckins.deletedAt)))
      .returning();
    if (updated.length === 0) {
      throw new NotFoundException('签到记录不存在');
    }
    return mapHrCheckin(updated[0]);
  }

  async getStats(): Promise<HrCheckinStats> {
    const scope = isNull(hrCheckins.deletedAt);
    const totalRows: { count: number | string }[] = await this.db
      .select({ count: count() })
      .from(hrCheckins)
      .where(scope);
    const statusRows: { status: string; count: number | string }[] =
      await this.db
        .select({ status: hrCheckins.status, count: count() })
        .from(hrCheckins)
        .where(scope)
        .groupBy(hrCheckins.status);
    const typeRows: { type: string; count: number | string }[] =
      await this.db
        .select({ type: hrCheckins.type, count: count() })
        .from(hrCheckins)
        .where(scope)
        .groupBy(hrCheckins.type);
    const statusCount = new Map<string, number>();
    for (const row of statusRows) {
      statusCount.set(row.status, Number(row.count));
    }
    const byType: { type: string; count: number }[] = typeRows
      .map((row: { type: string; count: number | string }) => ({
        type: row.type,
        count: Number(row.count),
      }))
      .sort(
        (a: { count: number }, b: { count: number }) => b.count - a.count,
      );
    return {
      total: Number(totalRows[0]?.count ?? 0),
      checkedIn: statusCount.get(STATUS_CHECKED_IN) ?? 0,
      notCheckedIn: statusCount.get(STATUS_NOT_CHECKED_IN) ?? 0,
      late: statusCount.get(STATUS_LATE) ?? 0,
      byType,
    };
  }

  private async getCheckinOrThrow(id: number): Promise<CheckinRow> {
    const rows: CheckinRow[] = await this.db
      .select()
      .from(hrCheckins)
      .where(and(eq(hrCheckins.id, id), isNull(hrCheckins.deletedAt)));
    if (rows.length === 0) {
      throw new NotFoundException('签到记录不存在');
    }
    return rows[0];
  }
}

const parseOptionalTime = (
  value: string | null | undefined,
): Date | null | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (value === null || value === '') {
    return null;
  }
  const parsed: Date = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException('签到时间格式无效');
  }
  return parsed;
};
