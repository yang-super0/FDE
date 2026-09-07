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
  or,
  sum,
  type SQL,
} from 'drizzle-orm';
import { hrRecruitmentPlans } from '@server/database/schema';
import type {
  CreateHrRecruitmentPlanBody,
  HrPlanDepartmentStat,
  HrPlanStatusBody,
  HrRecruitmentPlan,
  HrRecruitmentPlanListParams,
  HrRecruitmentPlanPage,
  UpdateHrRecruitmentPlanBody,
} from '@shared/api.interface';
import { insertWithSeqNo } from '../finance-core/fin-seq.util';
import {
  assertHrNonNegativeNumber,
  assertHrRequired,
  resolveHrPagination,
} from './hr-enhance-shared.util';

type PlanRow = typeof hrRecruitmentPlans.$inferSelect;
type PlanInsert = typeof hrRecruitmentPlans.$inferInsert;

const PLAN_NO_PREFIX: string = 'ZP';
const STATUS_PLANNING: string = '规划中';
const STATUS_RECRUITING: string = '招聘中';
const STATUS_DONE: string = '已完成';
const STATUS_CANCELLED: string = '已取消';
const DEFAULT_PRIORITY: string = '中';

const PLAN_TRANSITIONS: Record<string, string[]> = {
  [STATUS_PLANNING]: [STATUS_RECRUITING, STATUS_CANCELLED],
  [STATUS_RECRUITING]: [STATUS_DONE, STATUS_CANCELLED],
};

const assertPositiveInt = (value: unknown, label: string): number => {
  const parsed: number = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new BadRequestException(`${label}必须为正整数`);
  }
  return parsed;
};

export function mapHrPlan(row: PlanRow): HrRecruitmentPlan {
  return {
    id: row.id,
    planNo: row.planNo,
    planName: row.planName,
    department: row.department,
    position: row.position,
    headcount: row.headcount,
    hiredCount: row.hiredCount,
    priority: row.priority,
    status: row.status,
    startDate: row.startDate,
    endDate: row.endDate,
    requirementDescription: row.requirementDescription,
    createdAt: row.createdAt.toISOString(),
    createdBy: row.createdBy ?? '',
    updatedAt: row.updatedAt.toISOString(),
    updatedBy: row.updatedBy ?? '',
    deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
  };
}

@Injectable()
export class HrPlansService {
  private readonly logger = new Logger(HrPlansService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
  ) {}

  async listPlans(
    params: HrRecruitmentPlanListParams,
  ): Promise<HrRecruitmentPlanPage> {
    const pagination = resolveHrPagination(params.page, params.pageSize);
    const conditions: (SQL | undefined)[] = [
      isNull(hrRecruitmentPlans.deletedAt),
    ];
    if (params.department) {
      conditions.push(eq(hrRecruitmentPlans.department, params.department));
    }
    if (params.status) {
      conditions.push(eq(hrRecruitmentPlans.status, params.status));
    }
    if (params.keyword) {
      conditions.push(
        or(
          ilike(hrRecruitmentPlans.planName, `%${params.keyword}%`),
          ilike(hrRecruitmentPlans.position, `%${params.keyword}%`),
        ),
      );
    }
    const where = and(...conditions);
    const totalRows: { count: number | string }[] = await this.db
      .select({ count: count() })
      .from(hrRecruitmentPlans)
      .where(where);
    const rows: PlanRow[] = await this.db
      .select()
      .from(hrRecruitmentPlans)
      .where(where)
      .orderBy(desc(hrRecruitmentPlans.id))
      .limit(pagination.pageSize)
      .offset(pagination.offset);
    return {
      items: rows.map((row: PlanRow) => mapHrPlan(row)),
      total: Number(totalRows[0]?.count ?? 0),
      page: pagination.page,
      pageSize: pagination.pageSize,
    };
  }

  async createPlan(
    dto: CreateHrRecruitmentPlanBody,
    userId: string,
  ): Promise<HrRecruitmentPlan> {
    assertHrRequired(dto?.planName, '计划名称');
    assertHrRequired(dto?.department, '部门');
    assertHrRequired(dto?.position, '岗位');
    const headcount: number =
      dto?.headcount !== undefined && dto.headcount !== null
        ? assertPositiveInt(dto.headcount, '招聘人数')
        : 1;
    const hiredCount: number =
      dto?.hiredCount !== undefined && dto.hiredCount !== null
        ? assertHrNonNegativeNumber(dto.hiredCount, '已入职人数')
        : 0;
    const values: Omit<PlanInsert, 'planNo'> = {
      planName: dto.planName,
      department: dto.department,
      position: dto.position,
      headcount,
      hiredCount,
      priority: dto?.priority ?? DEFAULT_PRIORITY,
      status: dto?.status ?? STATUS_PLANNING,
      startDate: dto?.startDate ?? null,
      endDate: dto?.endDate ?? null,
      requirementDescription: dto?.requirementDescription ?? '',
      createdBy: userId,
      updatedBy: userId,
    };
    const inserted = await insertWithSeqNo<PlanRow>({
      db: this.db,
      table: hrRecruitmentPlans,
      noColumn: hrRecruitmentPlans.planNo,
      prefix: PLAN_NO_PREFIX,
      insert: (no: string) =>
        this.db
          .insert(hrRecruitmentPlans)
          .values({ ...values, planNo: no })
          .returning(),
    });
    this.logger.log(`创建招聘计划 ${inserted.no}`);
    return mapHrPlan(inserted.row);
  }

  async updatePlan(
    id: number,
    dto: UpdateHrRecruitmentPlanBody,
    userId: string,
  ): Promise<HrRecruitmentPlan> {
    const row = await this.getPlanOrThrow(id);
    if (row.status === STATUS_DONE) {
      throw new ConflictException('已完成的招聘计划不允许修改');
    }
    const patch: Partial<PlanInsert> = {};
    if (dto?.planName !== undefined) {
      patch.planName = dto.planName;
    }
    if (dto?.department !== undefined) {
      patch.department = dto.department;
    }
    if (dto?.position !== undefined) {
      patch.position = dto.position;
    }
    if (dto?.headcount !== undefined) {
      patch.headcount = assertPositiveInt(dto.headcount, '招聘人数');
    }
    if (dto?.hiredCount !== undefined) {
      patch.hiredCount = assertHrNonNegativeNumber(
        dto.hiredCount,
        '已入职人数',
      );
    }
    if (dto?.priority !== undefined) {
      patch.priority = dto.priority;
    }
    if (dto?.status !== undefined) {
      patch.status = dto.status;
    }
    if (dto?.startDate !== undefined) {
      patch.startDate = dto.startDate;
    }
    if (dto?.endDate !== undefined) {
      patch.endDate = dto.endDate;
    }
    if (dto?.requirementDescription !== undefined) {
      patch.requirementDescription = dto.requirementDescription;
    }
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }
    patch.updatedAt = new Date();
    patch.updatedBy = userId;
    const updated: PlanRow[] = await this.db
      .update(hrRecruitmentPlans)
      .set(patch)
      .where(
        and(
          eq(hrRecruitmentPlans.id, id),
          isNull(hrRecruitmentPlans.deletedAt),
        ),
      )
      .returning();
    if (updated.length === 0) {
      throw new NotFoundException('招聘计划不存在');
    }
    return mapHrPlan(updated[0]);
  }

  async deletePlan(id: number): Promise<{ success: boolean }> {
    const row = await this.getPlanOrThrow(id);
    if (row.status === STATUS_DONE) {
      throw new ConflictException('已完成的招聘计划不允许删除');
    }
    const updated: PlanRow[] = await this.db
      .update(hrRecruitmentPlans)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(hrRecruitmentPlans.id, id),
          isNull(hrRecruitmentPlans.deletedAt),
        ),
      )
      .returning();
    if (updated.length === 0) {
      throw new NotFoundException('招聘计划不存在');
    }
    this.logger.log(`删除招聘计划 ${row.planNo}`);
    return { success: true };
  }

  async updatePlanStatus(
    id: number,
    body: HrPlanStatusBody,
    userId: string,
  ): Promise<HrRecruitmentPlan> {
    assertHrRequired(body?.status, '状态');
    const row = await this.getPlanOrThrow(id);
    const allowed: string[] | undefined = PLAN_TRANSITIONS[row.status];
    if (!allowed || !allowed.includes(body.status)) {
      throw new ConflictException(
        `当前状态为${row.status}，不允许变更为${body.status}`,
      );
    }
    const updated: PlanRow[] = await this.db
      .update(hrRecruitmentPlans)
      .set({
        status: body.status,
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(
        and(
          eq(hrRecruitmentPlans.id, id),
          isNull(hrRecruitmentPlans.deletedAt),
        ),
      )
      .returning();
    if (updated.length === 0) {
      throw new NotFoundException('招聘计划不存在');
    }
    return mapHrPlan(updated[0]);
  }

  async getDepartmentStats(): Promise<HrPlanDepartmentStat[]> {
    const rows: {
      department: string;
      planCount: number | string;
      totalHeadcount: string | null;
      totalHired: string | null;
    }[] = await this.db
      .select({
        department: hrRecruitmentPlans.department,
        planCount: count(),
        totalHeadcount: sum(hrRecruitmentPlans.headcount),
        totalHired: sum(hrRecruitmentPlans.hiredCount),
      })
      .from(hrRecruitmentPlans)
      .where(isNull(hrRecruitmentPlans.deletedAt))
      .groupBy(hrRecruitmentPlans.department);
    return rows.map(
      (row: {
        department: string;
        planCount: number | string;
        totalHeadcount: string | null;
        totalHired: string | null;
      }): HrPlanDepartmentStat => ({
        department: row.department,
        planCount: Number(row.planCount),
        totalHeadcount: Number(row.totalHeadcount ?? 0),
        totalHired: Number(row.totalHired ?? 0),
      }),
    );
  }

  private async getPlanOrThrow(id: number): Promise<PlanRow> {
    const rows: PlanRow[] = await this.db
      .select()
      .from(hrRecruitmentPlans)
      .where(
        and(
          eq(hrRecruitmentPlans.id, id),
          isNull(hrRecruitmentPlans.deletedAt),
        ),
      );
    if (rows.length === 0) {
      throw new NotFoundException('招聘计划不存在');
    }
    return rows[0];
  }
}
