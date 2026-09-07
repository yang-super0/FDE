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
  ilike,
  inArray,
  isNull,
  type SQL,
} from 'drizzle-orm';
import { hrInvitations, hrResumes } from '@server/database/schema';
import type {
  CreateHrInvitationBody,
  HrBatchStatusBody,
  HrInvitation,
  HrInvitationListParams,
  HrInvitationPage,
  UpdateHrInvitationBody,
} from '@shared/api.interface';
import { insertWithSeqNo } from '../finance-core/fin-seq.util';
import {
  assertHrNumberInRange,
  assertHrRequired,
  resolveHrPagination,
  type HrPagination,
} from './hr-enhance-shared.util';

type InvitationRow = typeof hrInvitations.$inferSelect;

const INVITATION_NO_PREFIX: string = 'YY';
const INVITATION_STATUS_PENDING: string = '待确认';
const INVITATION_STATUS_CONFIRMED: string = '已确认';
const INVITATION_STATUS_DONE: string = '已完成';
const INVITATION_STATUS_CANCELLED: string = '已取消';
const INVITATION_STATUS_ABSENT: string = '未到场';

export interface HrInvitationStatusBody {
  status: string;
}

/** HR 邀约状态集合 */
export const HR_INVITATION_STATUSES: string[] = [
  INVITATION_STATUS_PENDING,
  INVITATION_STATUS_CONFIRMED,
  INVITATION_STATUS_DONE,
  INVITATION_STATUS_CANCELLED,
  INVITATION_STATUS_ABSENT,
];

/** 邀约状态机：待确认→已确认|已取消；已确认→已完成|未到场|已取消 */
const INVITATION_STATUS_FLOW: Record<string, string[]> = {
  [INVITATION_STATUS_PENDING]: [
    INVITATION_STATUS_CONFIRMED,
    INVITATION_STATUS_CANCELLED,
  ],
  [INVITATION_STATUS_CONFIRMED]: [
    INVITATION_STATUS_DONE,
    INVITATION_STATUS_ABSENT,
    INVITATION_STATUS_CANCELLED,
  ],
};

const assertInvitationStatus = (status: unknown): string => {
  assertHrRequired(status, '邀约状态');
  if (
    typeof status !== 'string' ||
    !HR_INVITATION_STATUSES.includes(status)
  ) {
    throw new BadRequestException(
      `邀约状态必须为：${HR_INVITATION_STATUSES.join('、')}`,
    );
  }
  return status;
};

const parseScheduledTime = (value: unknown): Date => {
  assertHrRequired(value, '面试时间');
  if (typeof value !== 'string') {
    throw new BadRequestException('面试时间格式非法');
  }
  const parsed: Date = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException('面试时间格式非法');
  }
  return parsed;
};

const mapHrInvitation = (row: InvitationRow): HrInvitation => ({
  id: row.id,
  invitationNo: row.invitationNo,
  resumeId: row.resumeId,
  candidateName: row.candidateName,
  position: row.position,
  department: row.department,
  interviewer: row.interviewer,
  interviewType: row.interviewType,
  interviewRound: row.interviewRound,
  scheduledTime: row.scheduledTime.toISOString(),
  location: row.location,
  status: row.status,
  remark: row.remark,
  createdAt: row.createdAt.toISOString(),
  createdBy: row.createdBy ?? '',
  updatedAt: row.updatedAt.toISOString(),
  updatedBy: row.updatedBy ?? '',
  deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
});

@Injectable()
export class HrInvitationsService {
  private readonly logger = new Logger(HrInvitationsService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
  ) {}

  async list(params: HrInvitationListParams): Promise<HrInvitationPage> {
    const pagination: HrPagination = resolveHrPagination(
      params.page,
      params.pageSize,
    );
    const conditions: SQL[] = [isNull(hrInvitations.deletedAt)];
    if (params.status) {
      conditions.push(eq(hrInvitations.status, params.status));
    }
    if (params.department) {
      conditions.push(eq(hrInvitations.department, params.department));
    }
    if (params.candidateName) {
      conditions.push(
        ilike(hrInvitations.candidateName, `%${params.candidateName}%`),
      );
    }
    if (params.interviewRound) {
      conditions.push(eq(hrInvitations.interviewRound, params.interviewRound));
    }
    const where = and(...conditions);
    const totalRows: { count: number | string }[] = await this.db
      .select({ count: count() })
      .from(hrInvitations)
      .where(where);
    const rows: InvitationRow[] = await this.db
      .select()
      .from(hrInvitations)
      .where(where)
      .orderBy(desc(hrInvitations.id))
      .limit(pagination.pageSize)
      .offset(pagination.offset);
    return {
      items: rows.map((row: InvitationRow) => mapHrInvitation(row)),
      total: Number(totalRows[0]?.count ?? 0),
      page: pagination.page,
      pageSize: pagination.pageSize,
    };
  }

  async create(dto: CreateHrInvitationBody): Promise<HrInvitation> {
    assertHrRequired(dto?.resumeId, '简历 ID');
    const resumeId: number = assertHrNumberInRange(
      dto.resumeId,
      '简历 ID',
      1,
      Number.MAX_SAFE_INTEGER,
    );
    assertHrRequired(dto?.candidateName, '候选人姓名');
    assertHrRequired(dto?.position, '面试职位');
    assertHrRequired(dto?.department, '部门');
    assertHrRequired(dto?.interviewer, '面试官');
    assertHrRequired(dto?.location, '面试地点');

    const resumeRows: { id: number }[] = await this.db
      .select({ id: hrResumes.id })
      .from(hrResumes)
      .where(and(eq(hrResumes.id, resumeId), isNull(hrResumes.deletedAt)))
      .limit(1);
    if (resumeRows.length === 0) {
      throw new BadRequestException('关联简历不存在');
    }

    const scheduledTime: Date = dto?.scheduledTime
      ? parseScheduledTime(dto.scheduledTime)
      : new Date();
    const status: string = dto?.status
      ? assertInvitationStatus(dto.status)
      : INVITATION_STATUS_PENDING;

    const result = await insertWithSeqNo<InvitationRow>({
      db: this.db,
      table: hrInvitations,
      noColumn: hrInvitations.invitationNo,
      prefix: INVITATION_NO_PREFIX,
      insert: (invitationNo: string) =>
        this.db
          .insert(hrInvitations)
          .values({
            invitationNo,
            resumeId,
            candidateName: String(dto.candidateName).trim(),
            position: String(dto.position).trim(),
            department: String(dto.department).trim(),
            interviewer: String(dto.interviewer).trim(),
            interviewType: dto.interviewType ?? '现场',
            interviewRound: dto.interviewRound ?? '一面',
            scheduledTime,
            location: String(dto.location).trim(),
            status,
            remark: dto.remark ?? '',
          })
          .returning(),
    });
    this.logger.log(
      `创建邀约成功 id=${result.id} invitationNo=${result.no}`,
    );
    return mapHrInvitation(result.row);
  }

  async update(
    id: number,
    dto: UpdateHrInvitationBody,
  ): Promise<HrInvitation> {
    const row: InvitationRow | undefined = await this.findInvitation(id);
    if (!row) {
      throw new NotFoundException('邀约不存在');
    }
    if (row.status === INVITATION_STATUS_DONE) {
      throw new ConflictException(
        `邀约已完成（状态「${INVITATION_STATUS_DONE}」），不允许修改`,
      );
    }

    const patch: Partial<typeof hrInvitations.$inferInsert> = {};
    if (dto?.resumeId !== undefined) {
      patch.resumeId = assertHrNumberInRange(
        dto.resumeId,
        '简历 ID',
        1,
        Number.MAX_SAFE_INTEGER,
      );
    }
    if (dto?.candidateName !== undefined) {
      assertHrRequired(dto.candidateName, '候选人姓名');
      patch.candidateName = String(dto.candidateName).trim();
    }
    if (dto?.position !== undefined) {
      assertHrRequired(dto.position, '面试职位');
      patch.position = String(dto.position).trim();
    }
    if (dto?.department !== undefined) {
      assertHrRequired(dto.department, '部门');
      patch.department = String(dto.department).trim();
    }
    if (dto?.interviewer !== undefined) {
      assertHrRequired(dto.interviewer, '面试官');
      patch.interviewer = String(dto.interviewer).trim();
    }
    if (dto?.location !== undefined) {
      assertHrRequired(dto.location, '面试地点');
      patch.location = String(dto.location).trim();
    }
    if (dto?.interviewType !== undefined) {
      patch.interviewType = dto.interviewType;
    }
    if (dto?.interviewRound !== undefined) {
      patch.interviewRound = dto.interviewRound;
    }
    if (dto?.scheduledTime !== undefined) {
      patch.scheduledTime = parseScheduledTime(dto.scheduledTime);
    }
    if (dto?.status !== undefined) {
      patch.status = assertInvitationStatus(dto.status);
    }
    if (dto?.remark !== undefined) {
      patch.remark = dto.remark;
    }
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }
    patch.updatedAt = new Date();

    const updated: InvitationRow[] = await this.db
      .update(hrInvitations)
      .set(patch)
      .where(and(eq(hrInvitations.id, id), isNull(hrInvitations.deletedAt)))
      .returning();
    if (updated.length === 0) {
      throw new NotFoundException('邀约不存在');
    }
    this.logger.log(
      `更新邀约成功 id=${id} fields=${JSON.stringify(Object.keys(patch))}`,
    );
    return mapHrInvitation(updated[0]);
  }

  async remove(id: number): Promise<{ success: boolean }> {
    const row: InvitationRow | undefined = await this.findInvitation(id);
    if (!row) {
      throw new NotFoundException('邀约不存在');
    }
    if (row.status === INVITATION_STATUS_DONE) {
      throw new ConflictException(
        `邀约已完成（状态「${INVITATION_STATUS_DONE}」），不允许删除`,
      );
    }
    const updated: { id: number }[] = await this.db
      .update(hrInvitations)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(hrInvitations.id, id), isNull(hrInvitations.deletedAt)))
      .returning({ id: hrInvitations.id });
    if (updated.length === 0) {
      throw new NotFoundException('邀约不存在');
    }
    this.logger.log(`删除邀约成功 id=${id}`);
    return { success: true };
  }

  async updateStatus(
    id: number,
    body: HrInvitationStatusBody,
  ): Promise<HrInvitation> {
    const status: string = assertInvitationStatus(body?.status);
    const row: InvitationRow | undefined = await this.findInvitation(id);
    if (!row) {
      throw new NotFoundException('邀约不存在');
    }
    const allowed: string[] = INVITATION_STATUS_FLOW[row.status] ?? [];
    if (!allowed.includes(status)) {
      throw new ConflictException(
        `邀约状态「${row.status}」不允许流转为「${status}」`,
      );
    }
    const updated: InvitationRow[] = await this.db
      .update(hrInvitations)
      .set({ status, updatedAt: new Date() })
      .where(
        and(
          eq(hrInvitations.id, id),
          eq(hrInvitations.status, row.status),
          isNull(hrInvitations.deletedAt),
        ),
      )
      .returning();
    if (updated.length === 0) {
      throw new ConflictException('邀约状态已变更，请刷新后重试');
    }
    this.logger.log(`邀约状态流转成功 id=${id} status=${status}`);
    return mapHrInvitation(updated[0]);
  }

  async batchStatus(body: HrBatchStatusBody): Promise<{ updated: number }> {
    if (!body || !Array.isArray(body.ids) || body.ids.length === 0) {
      throw new BadRequestException('ids 不能为空');
    }
    const ids: number[] = body.ids.map((id: number) => Number(id));
    for (const id of ids) {
      if (!Number.isInteger(id) || id <= 0) {
        throw new BadRequestException('ids 含非法记录 ID');
      }
    }
    const status: string = assertInvitationStatus(body.status);
    if (
      status !== INVITATION_STATUS_CONFIRMED &&
      status !== INVITATION_STATUS_CANCELLED
    ) {
      throw new BadRequestException(
        `批量流转仅允许「${INVITATION_STATUS_PENDING}」转为「${INVITATION_STATUS_CONFIRMED}」或「${INVITATION_STATUS_CANCELLED}」`,
      );
    }
    // 仅流转待确认记录：非待确认（含非法状态）记录跳过，返回实际更新数
    const updated: { id: number }[] = await this.db
      .update(hrInvitations)
      .set({ status, updatedAt: new Date() })
      .where(
        and(
          inArray(hrInvitations.id, ids),
          eq(hrInvitations.status, INVITATION_STATUS_PENDING),
          isNull(hrInvitations.deletedAt),
        ),
      )
      .returning({ id: hrInvitations.id });
    this.logger.log(
      `批量更新邀约状态成功 status=${status} updated=${updated.length} total=${ids.length}`,
    );
    return { updated: updated.length };
  }

  private async findInvitation(
    id: number,
  ): Promise<InvitationRow | undefined> {
    const rows: InvitationRow[] = await this.db
      .select()
      .from(hrInvitations)
      .where(and(eq(hrInvitations.id, id), isNull(hrInvitations.deletedAt)))
      .limit(1);
    return rows[0];
  }
}
