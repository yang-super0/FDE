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
  or,
  type SQL,
} from 'drizzle-orm';
import { hrResumes } from '@server/database/schema';
import type {
  CreateHrResumeBody,
  HrBatchStatusBody,
  HrResume,
  HrResumeListParams,
  HrResumePage,
  HrResumeRatingBody,
  UpdateHrResumeBody,
} from '@shared/api.interface';
import { insertWithSeqNo } from '../finance-core/fin-seq.util';
import {
  assertHrNonNegativeNumber,
  assertHrNumberInRange,
  assertHrRequired,
  resolveHrPagination,
  type HrPagination,
} from './hr-enhance-shared.util';

type ResumeRow = typeof hrResumes.$inferSelect;

const RESUME_NO_PREFIX: string = 'JL';
const RESUME_STATUS_HIRED: string = '已录用';

/** HR 简历状态集合 */
export const HR_RESUME_STATUSES: string[] = [
  '新简历',
  '已筛选',
  '已邀约',
  '已面试',
  '已录用',
  '已淘汰',
];

const assertResumeStatus = (status: unknown): string => {
  assertHrRequired(status, '简历状态');
  if (typeof status !== 'string' || !HR_RESUME_STATUSES.includes(status)) {
    throw new BadRequestException(
      `简历状态必须为：${HR_RESUME_STATUSES.join('、')}`,
    );
  }
  return status;
};

const mapHrResume = (row: ResumeRow): HrResume => ({
  id: row.id,
  resumeNo: row.resumeNo,
  candidateName: row.candidateName,
  gender: row.gender,
  phone: row.phone,
  email: row.email,
  positionApplied: row.positionApplied,
  department: row.department,
  source: row.source,
  workYears: row.workYears,
  education: row.education,
  tags: row.tags,
  status: row.status,
  rating: row.rating,
  resumeContent: row.resumeContent,
  createdAt: row.createdAt.toISOString(),
  createdBy: row.createdBy ?? '',
  updatedAt: row.updatedAt.toISOString(),
  updatedBy: row.updatedBy ?? '',
  deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
});

@Injectable()
export class HrResumesService {
  private readonly logger = new Logger(HrResumesService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
  ) {}

  async list(params: HrResumeListParams): Promise<HrResumePage> {
    const pagination: HrPagination = resolveHrPagination(
      params.page,
      params.pageSize,
    );
    const conditions: SQL[] = [isNull(hrResumes.deletedAt)];
    if (params.status) {
      conditions.push(eq(hrResumes.status, params.status));
    }
    if (params.department) {
      conditions.push(eq(hrResumes.department, params.department));
    }
    if (params.positionApplied) {
      conditions.push(eq(hrResumes.positionApplied, params.positionApplied));
    }
    if (params.source) {
      conditions.push(eq(hrResumes.source, params.source));
    }
    if (params.education) {
      conditions.push(eq(hrResumes.education, params.education));
    }
    if (params.keyword) {
      const keyword: string = `%${params.keyword}%`;
      const keywordCondition: SQL | undefined = or(
        ilike(hrResumes.candidateName, keyword),
        ilike(hrResumes.phone, keyword),
        ilike(hrResumes.positionApplied, keyword),
      );
      if (keywordCondition) {
        conditions.push(keywordCondition);
      }
    }
    const where = and(...conditions);
    const totalRows: { count: number | string }[] = await this.db
      .select({ count: count() })
      .from(hrResumes)
      .where(where);
    const rows: ResumeRow[] = await this.db
      .select()
      .from(hrResumes)
      .where(where)
      .orderBy(desc(hrResumes.id))
      .limit(pagination.pageSize)
      .offset(pagination.offset);
    return {
      items: rows.map((row: ResumeRow) => mapHrResume(row)),
      total: Number(totalRows[0]?.count ?? 0),
      page: pagination.page,
      pageSize: pagination.pageSize,
    };
  }

  async create(dto: CreateHrResumeBody): Promise<HrResume> {
    assertHrRequired(dto?.candidateName, '候选人姓名');
    assertHrRequired(dto?.phone, '手机号');
    assertHrRequired(dto?.email, '邮箱');
    assertHrRequired(dto?.positionApplied, '应聘职位');
    assertHrRequired(dto?.department, '应聘部门');
    assertHrRequired(dto?.resumeContent, '简历内容');

    let workYears: number = 0;
    if (dto?.workYears !== undefined && dto?.workYears !== null) {
      workYears = assertHrNonNegativeNumber(dto.workYears, '工作年限');
    }
    let rating: number = 0;
    if (dto?.rating !== undefined && dto?.rating !== null) {
      rating = assertHrNumberInRange(dto.rating, '评分', 1, 5);
    }
    const status: string = dto?.status
      ? assertResumeStatus(dto.status)
      : '新简历';

    const result = await insertWithSeqNo<ResumeRow>({
      db: this.db,
      table: hrResumes,
      noColumn: hrResumes.resumeNo,
      prefix: RESUME_NO_PREFIX,
      insert: (resumeNo: string) =>
        this.db
          .insert(hrResumes)
          .values({
            resumeNo,
            candidateName: String(dto.candidateName).trim(),
            gender: dto.gender ?? '男',
            phone: String(dto.phone).trim(),
            email: String(dto.email).trim(),
            positionApplied: String(dto.positionApplied).trim(),
            department: String(dto.department).trim(),
            source: dto.source ?? '招聘网站',
            workYears: Math.trunc(workYears),
            education: dto.education ?? '本科',
            tags: dto.tags ?? '',
            status,
            rating,
            resumeContent: String(dto.resumeContent),
          })
          .returning(),
    });
    this.logger.log(
      `创建简历成功 id=${result.id} resumeNo=${result.no}`,
    );
    return mapHrResume(result.row);
  }

  async getById(id: number): Promise<HrResume> {
    const row: ResumeRow | undefined = await this.findResume(id);
    if (!row) {
      throw new NotFoundException('简历不存在');
    }
    return mapHrResume(row);
  }

  async update(id: number, dto: UpdateHrResumeBody): Promise<HrResume> {
    const row: ResumeRow | undefined = await this.findResume(id);
    if (!row) {
      throw new NotFoundException('简历不存在');
    }
    if (row.status === RESUME_STATUS_HIRED) {
      throw new ConflictException(
        `简历已录用（状态「${RESUME_STATUS_HIRED}」），不允许修改`,
      );
    }

    const patch: Partial<typeof hrResumes.$inferInsert> = {};
    if (dto?.candidateName !== undefined) {
      assertHrRequired(dto.candidateName, '候选人姓名');
      patch.candidateName = String(dto.candidateName).trim();
    }
    if (dto?.phone !== undefined) {
      assertHrRequired(dto.phone, '手机号');
      patch.phone = String(dto.phone).trim();
    }
    if (dto?.email !== undefined) {
      assertHrRequired(dto.email, '邮箱');
      patch.email = String(dto.email).trim();
    }
    if (dto?.positionApplied !== undefined) {
      assertHrRequired(dto.positionApplied, '应聘职位');
      patch.positionApplied = String(dto.positionApplied).trim();
    }
    if (dto?.department !== undefined) {
      assertHrRequired(dto.department, '应聘部门');
      patch.department = String(dto.department).trim();
    }
    if (dto?.resumeContent !== undefined) {
      assertHrRequired(dto.resumeContent, '简历内容');
      patch.resumeContent = String(dto.resumeContent);
    }
    if (dto?.gender !== undefined) {
      patch.gender = dto.gender;
    }
    if (dto?.source !== undefined) {
      patch.source = dto.source;
    }
    if (dto?.workYears !== undefined) {
      patch.workYears = Math.trunc(
        assertHrNonNegativeNumber(dto.workYears, '工作年限'),
      );
    }
    if (dto?.education !== undefined) {
      patch.education = dto.education;
    }
    if (dto?.tags !== undefined) {
      patch.tags = dto.tags;
    }
    if (dto?.status !== undefined) {
      patch.status = assertResumeStatus(dto.status);
    }
    if (dto?.rating !== undefined) {
      patch.rating = assertHrNumberInRange(dto.rating, '评分', 1, 5);
    }
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }
    patch.updatedAt = new Date();

    const updated: ResumeRow[] = await this.db
      .update(hrResumes)
      .set(patch)
      .where(and(eq(hrResumes.id, id), isNull(hrResumes.deletedAt)))
      .returning();
    if (updated.length === 0) {
      throw new NotFoundException('简历不存在');
    }
    this.logger.log(`更新简历成功 id=${id} fields=${JSON.stringify(Object.keys(patch))}`);
    return mapHrResume(updated[0]);
  }

  async remove(id: number): Promise<{ success: boolean }> {
    const row: ResumeRow | undefined = await this.findResume(id);
    if (!row) {
      throw new NotFoundException('简历不存在');
    }
    if (row.status === RESUME_STATUS_HIRED) {
      throw new ConflictException(
        `简历已录用（状态「${RESUME_STATUS_HIRED}」），不允许删除`,
      );
    }
    const updated: { id: number }[] = await this.db
      .update(hrResumes)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(hrResumes.id, id), isNull(hrResumes.deletedAt)))
      .returning({ id: hrResumes.id });
    if (updated.length === 0) {
      throw new NotFoundException('简历不存在');
    }
    this.logger.log(`删除简历成功 id=${id}`);
    return { success: true };
  }

  async updateRating(
    id: number,
    body: HrResumeRatingBody,
  ): Promise<HrResume> {
    const rating: number = assertHrNumberInRange(
      body?.rating,
      '评分',
      1,
      5,
    );
    const row: ResumeRow | undefined = await this.findResume(id);
    if (!row) {
      throw new NotFoundException('简历不存在');
    }
    const updated: ResumeRow[] = await this.db
      .update(hrResumes)
      .set({ rating, updatedAt: new Date() })
      .where(and(eq(hrResumes.id, id), isNull(hrResumes.deletedAt)))
      .returning();
    if (updated.length === 0) {
      throw new NotFoundException('简历不存在');
    }
    this.logger.log(`简历评分成功 id=${id} rating=${rating}`);
    return mapHrResume(updated[0]);
  }

  async batchStatus(body: HrBatchStatusBody): Promise<{ updated: number }> {
    if (
      !body ||
      !Array.isArray(body.ids) ||
      body.ids.length === 0
    ) {
      throw new BadRequestException('ids 不能为空');
    }
    const ids: number[] = body.ids.map((id: number) => Number(id));
    for (const id of ids) {
      if (!Number.isInteger(id) || id <= 0) {
        throw new BadRequestException('ids 含非法记录 ID');
      }
    }
    const status: string = assertResumeStatus(body.status);
    const updated: { id: number }[] = await this.db
      .update(hrResumes)
      .set({ status, updatedAt: new Date() })
      .where(
        and(
          inArray(hrResumes.id, ids),
          isNull(hrResumes.deletedAt),
        ),
      )
      .returning({ id: hrResumes.id });
    this.logger.log(
      `批量更新简历状态成功 status=${status} updated=${updated.length}`,
    );
    return { updated: updated.length };
  }

  private async findResume(id: number): Promise<ResumeRow | undefined> {
    const rows: ResumeRow[] = await this.db
      .select()
      .from(hrResumes)
      .where(and(eq(hrResumes.id, id), isNull(hrResumes.deletedAt)))
      .limit(1);
    return rows[0];
  }
}
