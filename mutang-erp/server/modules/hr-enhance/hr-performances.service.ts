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
import { hrPerformances } from '@server/database/schema';
import type {
  CreateHrPerformanceBody,
  HrPerformance,
  HrPerformanceAppealBody,
  HrPerformanceLeaderScoreBody,
  HrPerformancePage,
  HrPerformanceSelfScoreBody,
  UpdateHrPerformanceBody,
} from '@shared/api.interface';
import { insertWithSeqNo } from '../finance-core/fin-seq.util';
import {
  assertHrNumberInRange,
  assertHrRequired,
  resolveHrPagination,
} from './hr-enhance-shared.util';

type PerformanceRow = typeof hrPerformances.$inferSelect;
type PerformanceInsert = typeof hrPerformances.$inferInsert;

export const PERFORMANCE_NO_PREFIX: string = 'JX';

const PERF_MODES: string[] = ['KPI', 'OKR'];
const PERF_PERIODS: string[] = ['月度', '季度', '年度'];

const STATUS_GOAL: string = '目标设定';
const STATUS_SELF: string = '自评中';
const STATUS_LEADER: string = '上级评中';
const STATUS_CONFIRMED: string = '已确认';
const STATUS_APPEALED: string = '已申诉';

const SELF_SCORE_STATUSES: string[] = [STATUS_GOAL, STATUS_SELF];
const LEADER_SCORE_STATUSES: string[] = [STATUS_LEADER, STATUS_APPEALED];

/** 当前业务日期（Asia/Shanghai），'YYYY-MM-DD' */
const todayDate = (): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

/** 正整数 ID 校验（员工 ID 等） */
const parsePositiveId = (value: unknown, label: string): number => {
  const parsed: number = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new BadRequestException(`请提供有效的${label}`);
  }
  return parsed;
};

/** 枚举校验：未提供取默认值；提供但非法 → 400 */
const parseEnumOrDefault = (
  value: unknown,
  allowed: string[],
  label: string,
  fallback: string,
): string => {
  if (value === undefined || value === null || String(value).trim() === '') {
    return fallback;
  }
  const trimmed: string = String(value).trim();
  if (!allowed.includes(trimmed)) {
    throw new BadRequestException(`${label}必须为 ${allowed.join(' / ')}`);
  }
  return trimmed;
};

/** 枚举校验（更新场景，提供即必须合法） */
const parseEnumStrict = (
  value: unknown,
  allowed: string[],
  label: string,
): string => {
  const trimmed: string = String(value ?? '').trim();
  if (!allowed.includes(trimmed)) {
    throw new BadRequestException(`${label}必须为 ${allowed.join(' / ')}`);
  }
  return trimmed;
};

/** 可选评分：1-100 */
const parseOptionalScore = (value: unknown, label: string): number | null => {
  if (value === undefined || value === null) {
    return null;
  }
  return assertHrNumberInRange(value, label, 1, 100);
};

/** 综合得分 = 自评 40% + 上评 60%，两位小数 */
const computeFinalScore = (
  selfScore: number,
  leaderScore: number,
): string => (selfScore * 0.4 + leaderScore * 0.6).toFixed(2);

const resolveGrade = (finalScore: string): string => {
  const score: number = Number(finalScore);
  if (score >= 90) return 'S';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  return 'D';
};

function mapPerformance(row: PerformanceRow): HrPerformance {
  return {
    id: row.id,
    performanceNo: row.performanceNo,
    employeeId: row.employeeId,
    employeeName: row.employeeName,
    department: row.department,
    period: row.period,
    mode: row.mode,
    goals: row.goals,
    selfScore: row.selfScore ?? null,
    leaderScore: row.leaderScore ?? null,
    finalScore: row.finalScore ?? null,
    grade: row.grade,
    status: row.status,
    confirmDate: row.confirmDate ?? null,
    appealReason: row.appealReason,
    remark: row.remark,
    createdAt: row.createdAt.toISOString(),
    createdBy: row.createdBy ?? '',
    updatedAt: row.updatedAt.toISOString(),
    updatedBy: row.updatedBy ?? '',
    deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
  };
}

@Injectable()
export class HrPerformancesService {
  private readonly logger = new Logger(HrPerformancesService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
  ) {}

  async list(params: {
    period?: string;
    mode?: string;
    grade?: string;
    status?: string;
    employeeName?: string;
    page?: string;
    pageSize?: string;
  }): Promise<HrPerformancePage> {
    const { page, pageSize, offset } = resolveHrPagination(
      params.page,
      params.pageSize,
    );
    const conditions: SQL[] = [isNull(hrPerformances.deletedAt)];
    if (params.period) {
      conditions.push(eq(hrPerformances.period, params.period));
    }
    if (params.mode) {
      conditions.push(eq(hrPerformances.mode, params.mode));
    }
    if (params.grade) {
      conditions.push(eq(hrPerformances.grade, params.grade));
    }
    if (params.status) {
      conditions.push(eq(hrPerformances.status, params.status));
    }
    if (params.employeeName) {
      conditions.push(
        ilike(hrPerformances.employeeName, `%${params.employeeName}%`),
      );
    }
    const where = and(...conditions);
    const totalRows: { count: number | string }[] = await this.db
      .select({ count: count() })
      .from(hrPerformances)
      .where(where);
    const rows: PerformanceRow[] = await this.db
      .select()
      .from(hrPerformances)
      .where(where)
      .orderBy(desc(hrPerformances.id))
      .limit(pageSize)
      .offset(offset);
    return {
      items: rows.map((row: PerformanceRow) => mapPerformance(row)),
      total: Number(totalRows[0]?.count ?? 0),
      page,
      pageSize,
    };
  }

  async create(dto: CreateHrPerformanceBody): Promise<HrPerformance> {
    const employeeId: number = parsePositiveId(dto?.employeeId, '员工 ID');
    assertHrRequired(dto?.employeeName, '员工姓名');
    assertHrRequired(dto?.department, '部门');
    assertHrRequired(dto?.goals, '绩效目标');
    const mode: string = parseEnumOrDefault(
      dto?.mode,
      PERF_MODES,
      '考核方式',
      'KPI',
    );
    const period: string = parseEnumOrDefault(
      dto?.period,
      PERF_PERIODS,
      '考核周期',
      '月度',
    );
    const selfScore: number | null = parseOptionalScore(
      dto?.selfScore,
      '自评分',
    );
    const leaderScore: number | null = parseOptionalScore(
      dto?.leaderScore,
      '上级评分',
    );
    const { row } = await insertWithSeqNo<PerformanceRow>({
      db: this.db,
      table: hrPerformances,
      noColumn: hrPerformances.performanceNo,
      prefix: PERFORMANCE_NO_PREFIX,
      insert: (no: string) =>
        this.db
          .insert(hrPerformances)
          .values({
            performanceNo: no,
            employeeId,
            employeeName: String(dto.employeeName).trim(),
            department: String(dto.department).trim(),
            period,
            mode,
            goals: String(dto.goals),
            selfScore,
            leaderScore,
            finalScore: dto?.finalScore ?? null,
            grade: dto?.grade ?? '',
            status:
              typeof dto?.status === 'string' && dto.status.trim() !== ''
                ? dto.status.trim()
                : STATUS_GOAL,
            confirmDate: dto?.confirmDate ?? null,
            appealReason: dto?.appealReason ?? '',
            remark: dto?.remark ?? '',
          } satisfies PerformanceInsert)
          .returning(),
    });
    this.logger.log(
      `绩效记录创建成功 id=${String(row.id)} no=${row.performanceNo}`,
    );
    return mapPerformance(row);
  }

  async update(
    id: number,
    dto: UpdateHrPerformanceBody,
  ): Promise<HrPerformance> {
    const existing: PerformanceRow = await this.findPerformanceOrThrow(id);
    if (existing.status === STATUS_CONFIRMED) {
      throw new ConflictException('已确认的绩效不允许修改');
    }
    const patch: Partial<PerformanceInsert> = {};
    if (dto?.employeeId !== undefined) {
      patch.employeeId = parsePositiveId(dto.employeeId, '员工 ID');
    }
    if (dto?.employeeName !== undefined) {
      assertHrRequired(dto.employeeName, '员工姓名');
      patch.employeeName = String(dto.employeeName).trim();
    }
    if (dto?.department !== undefined) {
      assertHrRequired(dto.department, '部门');
      patch.department = String(dto.department).trim();
    }
    if (dto?.goals !== undefined) {
      assertHrRequired(dto.goals, '绩效目标');
      patch.goals = String(dto.goals);
    }
    if (dto?.grade !== undefined) {
      assertHrRequired(dto.grade, '评级');
      patch.grade = String(dto.grade).trim();
    }
    if (dto?.period !== undefined) {
      patch.period = parseEnumStrict(dto.period, PERF_PERIODS, '考核周期');
    }
    if (dto?.mode !== undefined) {
      patch.mode = parseEnumStrict(dto.mode, PERF_MODES, '考核方式');
    }
    if (dto?.selfScore !== undefined) {
      patch.selfScore =
        dto.selfScore === null
          ? null
          : assertHrNumberInRange(dto.selfScore, '自评分', 1, 100);
    }
    if (dto?.leaderScore !== undefined) {
      patch.leaderScore =
        dto.leaderScore === null
          ? null
          : assertHrNumberInRange(dto.leaderScore, '上级评分', 1, 100);
    }
    if (dto?.finalScore !== undefined) {
      patch.finalScore = dto.finalScore;
    }
    if (dto?.status !== undefined) {
      patch.status = dto.status;
    }
    if (dto?.confirmDate !== undefined) {
      patch.confirmDate = dto.confirmDate;
    }
    if (dto?.appealReason !== undefined) {
      patch.appealReason = dto.appealReason;
    }
    if (dto?.remark !== undefined) {
      patch.remark = dto.remark;
    }
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }
    patch.updatedAt = new Date();
    const updated: PerformanceRow[] = await this.db
      .update(hrPerformances)
      .set(patch)
      .where(
        and(eq(hrPerformances.id, id), isNull(hrPerformances.deletedAt)),
      )
      .returning();
    if (updated.length === 0) {
      throw new NotFoundException('绩效记录不存在');
    }
    return mapPerformance(updated[0]);
  }

  async remove(id: number): Promise<{ success: boolean }> {
    const existing: PerformanceRow = await this.findPerformanceOrThrow(id);
    if (existing.status === STATUS_CONFIRMED) {
      throw new ConflictException('已确认的绩效不允许删除');
    }
    const updated: { id: number }[] = await this.db
      .update(hrPerformances)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(eq(hrPerformances.id, id), isNull(hrPerformances.deletedAt)),
      )
      .returning({ id: hrPerformances.id });
    if (updated.length === 0) {
      throw new NotFoundException('绩效记录不存在');
    }
    return { success: true };
  }

  /** 自评：目标设定/自评中 → 上级评中 */
  async selfScore(
    id: number,
    dto: HrPerformanceSelfScoreBody,
  ): Promise<HrPerformance> {
    const score: number = assertHrNumberInRange(
      dto?.selfScore,
      '自评分',
      1,
      100,
    );
    const existing: PerformanceRow = await this.findPerformanceOrThrow(id);
    if (!SELF_SCORE_STATUSES.includes(existing.status)) {
      throw new ConflictException(
        '只有目标设定或自评中状态的绩效可以提交自评',
      );
    }
    const updated: PerformanceRow[] = await this.db
      .update(hrPerformances)
      .set({ selfScore: score, status: STATUS_LEADER, updatedAt: new Date() })
      .where(
        and(
          eq(hrPerformances.id, id),
          inArray(hrPerformances.status, SELF_SCORE_STATUSES),
          isNull(hrPerformances.deletedAt),
        ),
      )
      .returning();
    if (updated.length === 0) {
      throw new ConflictException('绩效状态已变更，请刷新后重试');
    }
    return mapPerformance(updated[0]);
  }

  /** 上评：上级评中/已申诉 → 已确认（综合得分 + 评级 + 确认日期） */
  async leaderScore(
    id: number,
    dto: HrPerformanceLeaderScoreBody,
  ): Promise<HrPerformance> {
    const score: number = assertHrNumberInRange(
      dto?.leaderScore,
      '上级评分',
      1,
      100,
    );
    const existing: PerformanceRow = await this.findPerformanceOrThrow(id);
    if (!LEADER_SCORE_STATUSES.includes(existing.status)) {
      throw new ConflictException(
        '只有上级评中或已申诉状态的绩效可以评分',
      );
    }
    const finalScore: string = computeFinalScore(
      existing.selfScore ?? 0,
      score,
    );
    const updated: PerformanceRow[] = await this.db
      .update(hrPerformances)
      .set({
        leaderScore: score,
        finalScore,
        grade: resolveGrade(finalScore),
        confirmDate: todayDate(),
        status: STATUS_CONFIRMED,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(hrPerformances.id, id),
          inArray(hrPerformances.status, LEADER_SCORE_STATUSES),
          isNull(hrPerformances.deletedAt),
        ),
      )
      .returning();
    if (updated.length === 0) {
      throw new ConflictException('绩效状态已变更，请刷新后重试');
    }
    return mapPerformance(updated[0]);
  }

  /** 申诉：已确认 → 已申诉 */
  async appeal(
    id: number,
    dto: HrPerformanceAppealBody,
  ): Promise<HrPerformance> {
    const reason: string = String(dto?.reason ?? '').trim();
    assertHrRequired(reason, '申诉原因');
    const existing: PerformanceRow = await this.findPerformanceOrThrow(id);
    if (existing.status !== STATUS_CONFIRMED) {
      throw new ConflictException('只有已确认的绩效可以申诉');
    }
    const updated: PerformanceRow[] = await this.db
      .update(hrPerformances)
      .set({
        appealReason: reason,
        status: STATUS_APPEALED,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(hrPerformances.id, id),
          eq(hrPerformances.status, STATUS_CONFIRMED),
          isNull(hrPerformances.deletedAt),
        ),
      )
      .returning();
    if (updated.length === 0) {
      throw new ConflictException('绩效状态已变更，请刷新后重试');
    }
    return mapPerformance(updated[0]);
  }

  private async findPerformanceOrThrow(id: number): Promise<PerformanceRow> {
    const rows: PerformanceRow[] = await this.db
      .select()
      .from(hrPerformances)
      .where(
        and(eq(hrPerformances.id, id), isNull(hrPerformances.deletedAt)),
      );
    if (rows.length === 0) {
      throw new NotFoundException('绩效记录不存在');
    }
    return rows[0];
  }
}
