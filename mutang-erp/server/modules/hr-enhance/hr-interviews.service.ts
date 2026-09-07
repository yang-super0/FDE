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
  isNull,
  type SQL,
} from 'drizzle-orm';
import { hrInterviews } from '@server/database/schema';
import type {
  CreateHrInterviewBody,
  HrInterview,
  HrInterviewEvaluateBody,
  HrInterviewListParams,
  HrInterviewOfferBody,
  HrInterviewPage,
  UpdateHrInterviewBody,
} from '@shared/api.interface';
import { insertWithSeqNo } from '../finance-core/fin-seq.util';
import {
  assertHrNumberInRange,
  assertHrRequired,
  resolveHrPagination,
} from './hr-enhance-shared.util';

type InterviewRow = typeof hrInterviews.$inferSelect;
type InterviewInsert = typeof hrInterviews.$inferInsert;

const INTERVIEW_NO_PREFIX: string = 'MS';
const OFFER_ACCEPTED: string = '已接受';
const OFFER_STATUSES: string[] = [
  '未发offer',
  '已发offer',
  '已接受',
  '已拒绝',
];
const DEFAULT_INTERVIEW_ROUND: string = '一面';
const DEFAULT_RESULT: string = '待定';
const DEFAULT_OFFER_STATUS: string = '未发offer';

const assertPositiveId = (value: unknown, label: string): number => {
  const parsed: number = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new BadRequestException(`请提供有效的${label}`);
  }
  return parsed;
};

const parseOptionalDate = (
  value: string | undefined,
  label: string,
): Date | undefined => {
  if (value === undefined || value === '') {
    return undefined;
  }
  const parsed: Date = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException(`${label}格式无效`);
  }
  return parsed;
};

const validateOptionalScore = (
  value: number | undefined,
  label: string,
): number | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }
  return assertHrNumberInRange(value, label, 1, 10);
};

export function mapHrInterview(row: InterviewRow): HrInterview {
  return {
    id: row.id,
    interviewNo: row.interviewNo,
    invitationId: row.invitationId,
    resumeId: row.resumeId,
    candidateName: row.candidateName,
    position: row.position,
    interviewer: row.interviewer,
    interviewRound: row.interviewRound,
    interviewTime: row.interviewTime.toISOString(),
    result: row.result,
    scoreProfessional: row.scoreProfessional,
    scoreCommunication: row.scoreCommunication,
    scoreGeneral: row.scoreGeneral,
    evaluation: row.evaluation,
    offerStatus: row.offerStatus,
    remark: row.remark,
    createdAt: row.createdAt.toISOString(),
    createdBy: row.createdBy ?? '',
    updatedAt: row.updatedAt.toISOString(),
    updatedBy: row.updatedBy ?? '',
    deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
  };
}

@Injectable()
export class HrInterviewsService {
  private readonly logger = new Logger(HrInterviewsService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
  ) {}

  async listInterviews(
    params: HrInterviewListParams,
  ): Promise<HrInterviewPage> {
    const pagination = resolveHrPagination(params.page, params.pageSize);
    const conditions: (SQL | undefined)[] = [isNull(hrInterviews.deletedAt)];
    if (params.result) {
      conditions.push(eq(hrInterviews.result, params.result));
    }
    if (params.offerStatus) {
      conditions.push(eq(hrInterviews.offerStatus, params.offerStatus));
    }
    if (params.candidateName) {
      conditions.push(
        ilike(hrInterviews.candidateName, `%${params.candidateName}%`),
      );
    }
    if (params.position) {
      conditions.push(ilike(hrInterviews.position, `%${params.position}%`));
    }
    const where = and(...conditions);
    const totalRows: { count: number | string }[] = await this.db
      .select({ count: count() })
      .from(hrInterviews)
      .where(where);
    const rows: InterviewRow[] = await this.db
      .select()
      .from(hrInterviews)
      .where(where)
      .orderBy(desc(hrInterviews.id))
      .limit(pagination.pageSize)
      .offset(pagination.offset);
    return {
      items: rows.map((row: InterviewRow) => mapHrInterview(row)),
      total: Number(totalRows[0]?.count ?? 0),
      page: pagination.page,
      pageSize: pagination.pageSize,
    };
  }

  async createInterview(
    dto: CreateHrInterviewBody,
    userId: string,
  ): Promise<HrInterview> {
    const resumeId: number = assertPositiveId(dto?.resumeId, '简历 ID');
    const scoreProfessional: number | undefined = validateOptionalScore(
      dto?.scoreProfessional,
      '专业能力评分',
    );
    const scoreCommunication: number | undefined = validateOptionalScore(
      dto?.scoreCommunication,
      '沟通能力评分',
    );
    const scoreGeneral: number | undefined = validateOptionalScore(
      dto?.scoreGeneral,
      '综合评分',
    );
    const interviewTime: Date | undefined = parseOptionalDate(
      dto?.interviewTime,
      '面试时间',
    );
    const values: Omit<InterviewInsert, 'interviewNo'> = {
      invitationId: dto?.invitationId ?? null,
      resumeId,
      candidateName:
        typeof dto?.candidateName === 'string' ? dto.candidateName : '',
      position: typeof dto?.position === 'string' ? dto.position : '',
      interviewer: typeof dto?.interviewer === 'string' ? dto.interviewer : '',
      interviewRound: dto?.interviewRound ?? DEFAULT_INTERVIEW_ROUND,
      interviewTime: interviewTime ?? new Date(),
      result: dto?.result ?? DEFAULT_RESULT,
      scoreProfessional: scoreProfessional ?? 0,
      scoreCommunication: scoreCommunication ?? 0,
      scoreGeneral: scoreGeneral ?? 0,
      evaluation: dto?.evaluation ?? '',
      offerStatus: dto?.offerStatus ?? DEFAULT_OFFER_STATUS,
      remark: dto?.remark ?? '',
      createdBy: userId,
      updatedBy: userId,
    };
    const inserted = await insertWithSeqNo<InterviewRow>({
      db: this.db,
      table: hrInterviews,
      noColumn: hrInterviews.interviewNo,
      prefix: INTERVIEW_NO_PREFIX,
      insert: (no: string) =>
        this.db
          .insert(hrInterviews)
          .values({ ...values, interviewNo: no })
          .returning(),
    });
    this.logger.log(`创建面试记录 ${inserted.no}`);
    return mapHrInterview(inserted.row);
  }

  async updateInterview(
    id: number,
    dto: UpdateHrInterviewBody,
    userId: string,
  ): Promise<HrInterview> {
    const row = await this.getInterviewOrThrow(id);
    if (row.offerStatus === OFFER_ACCEPTED) {
      throw new ConflictException('已接受offer的面试记录不允许修改');
    }
    const patch: Partial<InterviewInsert> = {};
    if (dto?.resumeId !== undefined) {
      patch.resumeId = assertPositiveId(dto.resumeId, '简历 ID');
    }
    if (dto?.invitationId !== undefined) {
      patch.invitationId = dto.invitationId;
    }
    if (dto?.candidateName !== undefined) {
      patch.candidateName = dto.candidateName;
    }
    if (dto?.position !== undefined) {
      patch.position = dto.position;
    }
    if (dto?.interviewer !== undefined) {
      patch.interviewer = dto.interviewer;
    }
    if (dto?.interviewRound !== undefined) {
      patch.interviewRound = dto.interviewRound;
    }
    if (dto?.interviewTime !== undefined) {
      patch.interviewTime = parseOptionalDate(dto.interviewTime, '面试时间');
    }
    if (dto?.result !== undefined) {
      patch.result = dto.result;
    }
    if (dto?.scoreProfessional !== undefined) {
      patch.scoreProfessional = assertHrNumberInRange(
        dto.scoreProfessional,
        '专业能力评分',
        1,
        10,
      );
    }
    if (dto?.scoreCommunication !== undefined) {
      patch.scoreCommunication = assertHrNumberInRange(
        dto.scoreCommunication,
        '沟通能力评分',
        1,
        10,
      );
    }
    if (dto?.scoreGeneral !== undefined) {
      patch.scoreGeneral = assertHrNumberInRange(
        dto.scoreGeneral,
        '综合评分',
        1,
        10,
      );
    }
    if (dto?.evaluation !== undefined) {
      patch.evaluation = dto.evaluation;
    }
    if (dto?.offerStatus !== undefined) {
      patch.offerStatus = dto.offerStatus;
    }
    if (dto?.remark !== undefined) {
      patch.remark = dto.remark;
    }
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }
    patch.updatedAt = new Date();
    patch.updatedBy = userId;
    const updated: InterviewRow[] = await this.db
      .update(hrInterviews)
      .set(patch)
      .where(
        and(
          eq(hrInterviews.id, id),
          isNull(hrInterviews.deletedAt),
        ),
      )
      .returning();
    if (updated.length === 0) {
      throw new NotFoundException('面试记录不存在');
    }
    return mapHrInterview(updated[0]);
  }

  async deleteInterview(id: number): Promise<{ success: boolean }> {
    const row = await this.getInterviewOrThrow(id);
    if (row.offerStatus === OFFER_ACCEPTED) {
      throw new ConflictException('已接受offer的面试记录不允许删除');
    }
    const updated: InterviewRow[] = await this.db
      .update(hrInterviews)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(hrInterviews.id, id),
          isNull(hrInterviews.deletedAt),
        ),
      )
      .returning();
    if (updated.length === 0) {
      throw new NotFoundException('面试记录不存在');
    }
    this.logger.log(`删除面试记录 ${row.interviewNo}`);
    return { success: true };
  }

  async evaluateInterview(
    id: number,
    body: HrInterviewEvaluateBody,
    userId: string,
  ): Promise<HrInterview> {
    await this.getInterviewOrThrow(id);
    assertHrRequired(body?.result, '面试结果');
    const scoreProfessional: number = assertHrNumberInRange(
      body?.scoreProfessional,
      '专业能力评分',
      1,
      10,
    );
    const scoreCommunication: number = assertHrNumberInRange(
      body?.scoreCommunication,
      '沟通能力评分',
      1,
      10,
    );
    const scoreGeneral: number = assertHrNumberInRange(
      body?.scoreGeneral,
      '综合评分',
      1,
      10,
    );
    assertHrRequired(body?.evaluation, '面试评价');
    const updated: InterviewRow[] = await this.db
      .update(hrInterviews)
      .set({
        result: body.result,
        scoreProfessional,
        scoreCommunication,
        scoreGeneral,
        evaluation: body.evaluation,
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(
        and(
          eq(hrInterviews.id, id),
          isNull(hrInterviews.deletedAt),
        ),
      )
      .returning();
    if (updated.length === 0) {
      throw new NotFoundException('面试记录不存在');
    }
    return mapHrInterview(updated[0]);
  }

  async updateOfferStatus(
    id: number,
    body: HrInterviewOfferBody,
    userId: string,
  ): Promise<HrInterview> {
    await this.getInterviewOrThrow(id);
    assertHrRequired(body?.offerStatus, 'offer状态');
    if (!OFFER_STATUSES.includes(body.offerStatus)) {
      throw new BadRequestException(
        `offer状态必须为${OFFER_STATUSES.join('/')}`,
      );
    }
    const updated: InterviewRow[] = await this.db
      .update(hrInterviews)
      .set({
        offerStatus: body.offerStatus,
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(
        and(
          eq(hrInterviews.id, id),
          isNull(hrInterviews.deletedAt),
        ),
      )
      .returning();
    if (updated.length === 0) {
      throw new NotFoundException('面试记录不存在');
    }
    return mapHrInterview(updated[0]);
  }

  private async getInterviewOrThrow(id: number): Promise<InterviewRow> {
    const rows: InterviewRow[] = await this.db
      .select()
      .from(hrInterviews)
      .where(and(eq(hrInterviews.id, id), isNull(hrInterviews.deletedAt)));
    if (rows.length === 0) {
      throw new NotFoundException('面试记录不存在');
    }
    return rows[0];
  }
}
