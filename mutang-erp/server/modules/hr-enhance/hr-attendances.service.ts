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
  isNull,
  lt,
  sql,
  type SQL,
} from 'drizzle-orm';
import { hrAttendances } from '@server/database/schema';
import type {
  CreateHrAttendanceBody,
  HrAttendance,
  HrAttendanceLeaveApplyBody,
  HrAttendanceOvertimeBody,
  HrAttendancePage,
  HrAttendanceStats,
  HrAttendanceListParams,
  UpdateHrAttendanceBody,
} from '@shared/api.interface';
import { insertWithSeqNo } from '../finance-core/fin-seq.util';
import {
  assertHrPositiveNumber,
  assertHrRequired,
  resolveHrPagination,
} from './hr-enhance-shared.util';

type AttRow = typeof hrAttendances.$inferSelect;
type AttInsert = typeof hrAttendances.$inferInsert;

const ATTENDANCE_NO_PREFIX: string = 'KQ';

const STATUS_NORMAL: string = '正常';
const STATUS_LATE: string = '迟到';
const STATUS_EARLY_LEAVE: string = '早退';
const STATUS_ABSENT: string = '缺勤';
const STATUS_LEAVE: string = '请假';
const STATUS_OVERTIME: string = '加班';

const LEAVE_TYPES: string[] = ['事假', '病假', '年假', '婚假', '产假', '其他'];

const WORK_START_TIME: string = '09:00:00';
const WORK_END_TIME: string = '18:00:00';

const DATE_PATTERN: RegExp = /^\d{4}-\d{2}-\d{2}$/u;
const MONTH_PATTERN: RegExp = /^\d{4}-\d{2}$/u;
const TIME_PATTERN: RegExp = /^\d{2}:\d{2}:\d{2}$/u;

const LEAVE_APPROVED_MARK: string = '[请假已审批]';
const REMARK_MAX_LENGTH: number = 500;

const toIsoString = (value: Date | null): string | null =>
  value === null ? null : value.toISOString();

const mapHrAttendance = (row: AttRow): HrAttendance => ({
  id: row.id,
  attendanceNo: row.attendanceNo,
  employeeId: row.employeeId,
  employeeName: row.employeeName,
  department: row.department,
  attendanceDate: row.attendanceDate,
  checkInTime: row.checkInTime,
  checkOutTime: row.checkOutTime,
  status: row.status,
  leaveType: row.leaveType,
  leaveHours: row.leaveHours,
  overtimeHours: row.overtimeHours,
  remark: row.remark,
  createdAt: row.createdAt.toISOString(),
  createdBy: row.createdBy ?? '',
  updatedAt: row.updatedAt.toISOString(),
  updatedBy: row.updatedBy ?? '',
  deletedAt: toIsoString(row.deletedAt),
});

/** 业务时区 Asia/Shanghai 的当前时刻 'HH:mm:ss' */
const shanghaiNowTime = (): string => {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Shanghai',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  return formatter.format(new Date());
};

/** 校验 'YYYY-MM-DD' 考勤日期格式 */
const assertAttendanceDate = (value: string): string => {
  if (!DATE_PATTERN.test(value)) {
    throw new BadRequestException(`考勤日期格式应为 YYYY-MM-DD: ${value}`);
  }
  return value;
};

/** 校验 'HH:mm:ss' 时间格式 */
const assertTimeFormat = (value: string): string => {
  if (!TIME_PATTERN.test(value)) {
    throw new BadRequestException(`时间格式应为 HH:mm:ss: ${value}`);
  }
  return value;
};

/** 校验 'YYYY-MM' 月份格式 */
const parseMonthParam = (month: string): string => {
  if (!MONTH_PATTERN.test(month)) {
    throw new BadRequestException(`月份格式应为 YYYY-MM: ${month}`);
  }
  const monthNum: number = Number(month.slice(5));
  if (monthNum < 1 || monthNum > 12) {
    throw new BadRequestException(`无效月份: ${month}`);
  }
  return month;
};

/** 下月一号字符串 'YYYY-MM-01'（半开区间上界） */
const nextMonthFirstDay = (month: string): string => {
  const parts: string[] = month.split('-');
  const year: number = Number(parts[0]);
  const monthNum: number = Number(parts[1]);
  const nextYear: number = monthNum === 12 ? year + 1 : year;
  const nextMonth: number = monthNum === 12 ? 1 : monthNum + 1;
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
};

/** 员工 ID 校验：正整数 → 400 */
const assertPositiveEmployeeId = (value: unknown): number => {
  const parsed: number = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new BadRequestException('请提供有效的员工ID');
  }
  return parsed;
};

interface StatsAggregateRow {
  totalRecords: number | string;
  normalCount: number | string;
  lateCount: number | string;
  earlyLeaveCount: number | string;
  absentCount: number | string;
  leaveCount: number | string;
  overtimeCount: number | string;
  leaveHours: string;
  overtimeHours: string;
}

@Injectable()
export class HrAttendancesService {
  private readonly logger = new Logger(HrAttendancesService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
  ) {}

  async list(params: HrAttendanceListParams): Promise<HrAttendancePage> {
    const { page, pageSize, offset } = resolveHrPagination(
      params.page,
      params.pageSize,
    );
    const conditions: SQL[] = [isNull(hrAttendances.deletedAt)];
    if (params.month) {
      const month: string = parseMonthParam(params.month);
      conditions.push(gte(hrAttendances.attendanceDate, `${month}-01`));
      conditions.push(
        lt(hrAttendances.attendanceDate, nextMonthFirstDay(month)),
      );
    }
    if (params.department) {
      conditions.push(eq(hrAttendances.department, params.department));
    }
    if (params.employeeName) {
      conditions.push(
        ilike(hrAttendances.employeeName, `%${params.employeeName}%`),
      );
    }
    if (params.status) {
      conditions.push(eq(hrAttendances.status, params.status));
    }
    const where = and(...conditions);
    const totalRows: { count: number | string }[] = await this.db
      .select({ count: count() })
      .from(hrAttendances)
      .where(where);
    const rows: AttRow[] = await this.db
      .select()
      .from(hrAttendances)
      .where(where)
      .orderBy(desc(hrAttendances.id))
      .limit(pageSize)
      .offset(offset);
    return {
      items: rows.map((row: AttRow) => mapHrAttendance(row)),
      total: Number(totalRows[0]?.count ?? 0),
      page,
      pageSize,
    };
  }

  async create(
    dto: CreateHrAttendanceBody,
    userId: string,
  ): Promise<HrAttendance> {
    assertHrRequired(dto.employeeId, '员工ID');
    assertHrRequired(dto.employeeName, '员工姓名');
    assertHrRequired(dto.department, '部门');
    assertHrRequired(dto.attendanceDate, '考勤日期');
    const employeeId: number = assertPositiveEmployeeId(dto.employeeId);
    const attendanceDate: string = assertAttendanceDate(
      String(dto.attendanceDate).trim(),
    );

    const duplicated: { id: number }[] = await this.db
      .select({ id: hrAttendances.id })
      .from(hrAttendances)
      .where(
        and(
          eq(hrAttendances.employeeId, employeeId),
          eq(hrAttendances.attendanceDate, attendanceDate),
          isNull(hrAttendances.deletedAt),
        ),
      );
    if (duplicated.length > 0) {
      throw new ConflictException('该员工当天考勤记录已存在');
    }

    const values: Omit<AttInsert, 'attendanceNo'> = {
      employeeId,
      employeeName: String(dto.employeeName).trim(),
      department: String(dto.department).trim(),
      attendanceDate,
      checkInTime:
        dto.checkInTime && dto.checkInTime.trim() !== ''
          ? assertTimeFormat(dto.checkInTime.trim())
          : '',
      checkOutTime:
        dto.checkOutTime && dto.checkOutTime.trim() !== ''
          ? assertTimeFormat(dto.checkOutTime.trim())
          : '',
      status: dto.status ?? STATUS_NORMAL,
      leaveType: dto.leaveType ?? '',
      leaveHours: dto.leaveHours ?? '0',
      overtimeHours: dto.overtimeHours ?? '0',
      remark: dto.remark ?? '',
      createdBy: userId,
    };
    const { row } = await insertWithSeqNo<AttRow>({
      db: this.db,
      table: hrAttendances,
      noColumn: hrAttendances.attendanceNo,
      prefix: ATTENDANCE_NO_PREFIX,
      insert: (no: string): Promise<AttRow[]> =>
        this.db
          .insert(hrAttendances)
          .values({ ...values, attendanceNo: no })
          .returning(),
    });
    this.logger.log(`考勤记录创建成功: ${row.attendanceNo}`);
    return mapHrAttendance(row);
  }

  async update(
    id: number,
    dto: UpdateHrAttendanceBody,
    userId: string,
  ): Promise<HrAttendance> {
    await this.findExisting(id);
    const patch: Partial<AttInsert> = {};
    if (dto.employeeId !== undefined) {
      patch.employeeId = assertPositiveEmployeeId(dto.employeeId);
    }
    if (dto.employeeName !== undefined) {
      patch.employeeName = dto.employeeName;
    }
    if (dto.department !== undefined) {
      patch.department = dto.department;
    }
    if (dto.attendanceDate !== undefined) {
      patch.attendanceDate = assertAttendanceDate(
        String(dto.attendanceDate).trim(),
      );
    }
    if (dto.checkInTime !== undefined) {
      patch.checkInTime =
        dto.checkInTime.trim() === ''
          ? ''
          : assertTimeFormat(dto.checkInTime.trim());
    }
    if (dto.checkOutTime !== undefined) {
      patch.checkOutTime =
        dto.checkOutTime.trim() === ''
          ? ''
          : assertTimeFormat(dto.checkOutTime.trim());
    }
    if (dto.status !== undefined) {
      patch.status = dto.status;
    }
    if (dto.leaveType !== undefined) {
      patch.leaveType = dto.leaveType;
    }
    if (dto.leaveHours !== undefined) {
      patch.leaveHours = String(dto.leaveHours);
    }
    if (dto.overtimeHours !== undefined) {
      patch.overtimeHours = String(dto.overtimeHours);
    }
    if (dto.remark !== undefined) {
      patch.remark = dto.remark;
    }
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }
    patch.updatedAt = new Date();
    patch.updatedBy = userId;
    const updated: AttRow[] = await this.db
      .update(hrAttendances)
      .set(patch)
      .where(
        and(eq(hrAttendances.id, id), isNull(hrAttendances.deletedAt)),
      )
      .returning();
    if (updated.length === 0) {
      throw new NotFoundException('考勤记录不存在');
    }
    return mapHrAttendance(updated[0]);
  }

  async remove(id: number, userId: string): Promise<{ success: boolean }> {
    const updated: { id: number }[] = await this.db
      .update(hrAttendances)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(and(eq(hrAttendances.id, id), isNull(hrAttendances.deletedAt)))
      .returning({ id: hrAttendances.id });
    if (updated.length === 0) {
      throw new NotFoundException('考勤记录不存在');
    }
    return { success: true };
  }

  async checkIn(
    id: number,
    dto: { checkInTime?: string; checkOutTime?: string },
    userId: string,
  ): Promise<HrAttendance> {
    const row: AttRow = await this.findExisting(id);
    if (row.checkInTime !== '') {
      throw new ConflictException('该记录已有签到时间，不能重复签到');
    }
    const checkInTime: string =
      dto.checkInTime && dto.checkInTime.trim() !== ''
        ? assertTimeFormat(dto.checkInTime.trim())
        : shanghaiNowTime();
    let newStatus: string = row.status;
    if (row.status === STATUS_NORMAL || row.status === STATUS_EARLY_LEAVE) {
      newStatus =
        checkInTime > WORK_START_TIME ? STATUS_LATE : STATUS_NORMAL;
    }
    const updated: AttRow[] = await this.db
      .update(hrAttendances)
      .set({
        checkInTime,
        status: newStatus,
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(
        and(
          eq(hrAttendances.id, id),
          isNull(hrAttendances.deletedAt),
          eq(hrAttendances.checkInTime, ''),
        ),
      )
      .returning();
    if (updated.length === 0) {
      throw new ConflictException('该记录已有签到时间，不能重复签到');
    }
    return mapHrAttendance(updated[0]);
  }

  async checkOut(
    id: number,
    dto: { checkInTime?: string; checkOutTime?: string },
    userId: string,
  ): Promise<HrAttendance> {
    const row: AttRow = await this.findExisting(id);
    if (row.checkOutTime !== '') {
      throw new ConflictException('该记录已有签退时间，不能重复签退');
    }
    const checkOutTime: string =
      dto.checkOutTime && dto.checkOutTime.trim() !== ''
        ? assertTimeFormat(dto.checkOutTime.trim())
        : shanghaiNowTime();
    let newStatus: string = row.status;
    if (row.status === STATUS_NORMAL && checkOutTime < WORK_END_TIME) {
      newStatus = STATUS_EARLY_LEAVE;
    }
    const updated: AttRow[] = await this.db
      .update(hrAttendances)
      .set({
        checkOutTime,
        status: newStatus,
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(
        and(
          eq(hrAttendances.id, id),
          isNull(hrAttendances.deletedAt),
          eq(hrAttendances.checkOutTime, ''),
        ),
      )
      .returning();
    if (updated.length === 0) {
      throw new ConflictException('该记录已有签退时间，不能重复签退');
    }
    return mapHrAttendance(updated[0]);
  }

  async leaveApply(
    id: number,
    dto: HrAttendanceLeaveApplyBody,
    userId: string,
  ): Promise<HrAttendance> {
    assertHrRequired(dto.leaveType, '请假类型');
    const leaveType: string = String(dto.leaveType).trim();
    if (!LEAVE_TYPES.includes(leaveType)) {
      throw new BadRequestException(
        `请假类型必须为: ${LEAVE_TYPES.join('、')}`,
      );
    }
    assertHrRequired(dto.leaveHours, '请假时长');
    const leaveHours: number = assertHrPositiveNumber(
      dto.leaveHours,
      '请假时长',
    );
    const row: AttRow = await this.findExisting(id);
    const updated: AttRow[] = await this.db
      .update(hrAttendances)
      .set({
        status: STATUS_LEAVE,
        leaveType,
        leaveHours: String(leaveHours),
        remark: dto.remark !== undefined ? dto.remark : row.remark,
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(and(eq(hrAttendances.id, id), isNull(hrAttendances.deletedAt)))
      .returning();
    if (updated.length === 0) {
      throw new NotFoundException('考勤记录不存在');
    }
    return mapHrAttendance(updated[0]);
  }

  async leaveApprove(id: number, userId: string): Promise<HrAttendance> {
    const updatedRow: AttRow = await this.db.transaction(async (tx) => {
      const rows: AttRow[] = await tx
        .select()
        .from(hrAttendances)
        .where(
          and(eq(hrAttendances.id, id), isNull(hrAttendances.deletedAt)),
        );
      if (rows.length === 0) {
        throw new NotFoundException('考勤记录不存在');
      }
      const row: AttRow = rows[0];
      if (row.status !== STATUS_LEAVE) {
        throw new ConflictException('仅请假状态的记录可审批');
      }
      if (row.remark.includes(LEAVE_APPROVED_MARK)) {
        throw new ConflictException('该请假已审批，请勿重复操作');
      }
      const newRemark: string = `${row.remark}${LEAVE_APPROVED_MARK}`.slice(
        0,
        REMARK_MAX_LENGTH,
      );
      const updated: AttRow[] = await tx
        .update(hrAttendances)
        .set({
          remark: newRemark,
          updatedAt: new Date(),
          updatedBy: userId,
        })
        .where(
          and(eq(hrAttendances.id, id), isNull(hrAttendances.deletedAt)),
        )
        .returning();
      if (updated.length === 0) {
        throw new NotFoundException('考勤记录不存在');
      }
      return updated[0];
    });
    this.logger.log(`请假审批完成: ${updatedRow.attendanceNo}`);
    return mapHrAttendance(updatedRow);
  }

  async leaveReject(
    id: number,
    reason: string,
    userId: string,
  ): Promise<HrAttendance> {
    assertHrRequired(reason, '驳回原因');
    const rejectMark: string = `[请假驳回: ${String(reason).trim()}]`;
    const updatedRow: AttRow = await this.db.transaction(async (tx) => {
      const rows: AttRow[] = await tx
        .select()
        .from(hrAttendances)
        .where(
          and(eq(hrAttendances.id, id), isNull(hrAttendances.deletedAt)),
        );
      if (rows.length === 0) {
        throw new NotFoundException('考勤记录不存在');
      }
      const row: AttRow = rows[0];
      if (row.status !== STATUS_LEAVE) {
        throw new ConflictException('仅请假状态的记录可驳回');
      }
      const newRemark: string = `${row.remark}${rejectMark}`.slice(
        0,
        REMARK_MAX_LENGTH,
      );
      const updated: AttRow[] = await tx
        .update(hrAttendances)
        .set({
          status: STATUS_NORMAL,
          leaveType: '',
          leaveHours: '0',
          remark: newRemark,
          updatedAt: new Date(),
          updatedBy: userId,
        })
        .where(
          and(eq(hrAttendances.id, id), isNull(hrAttendances.deletedAt)),
        )
        .returning();
      if (updated.length === 0) {
        throw new NotFoundException('考勤记录不存在');
      }
      return updated[0];
    });
    this.logger.log(`请假驳回完成: ${updatedRow.attendanceNo}`);
    return mapHrAttendance(updatedRow);
  }

  async overtime(
    id: number,
    dto: HrAttendanceOvertimeBody,
    userId: string,
  ): Promise<HrAttendance> {
    assertHrRequired(dto.overtimeHours, '加班时长');
    const hours: number = assertHrPositiveNumber(
      dto.overtimeHours,
      '加班时长',
    );
    const row: AttRow = await this.findExisting(id);
    const newStatus: string =
      row.status === STATUS_NORMAL ? STATUS_OVERTIME : row.status;
    const updated: AttRow[] = await this.db
      .update(hrAttendances)
      .set({
        overtimeHours: sql`${hrAttendances.overtimeHours} + ${hours}`,
        status: newStatus,
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(and(eq(hrAttendances.id, id), isNull(hrAttendances.deletedAt)))
      .returning();
    if (updated.length === 0) {
      throw new NotFoundException('考勤记录不存在');
    }
    return mapHrAttendance(updated[0]);
  }

  async stats(params: {
    month?: string;
    department?: string;
    employeeId?: string;
  }): Promise<HrAttendanceStats> {
    const conditions: SQL[] = [isNull(hrAttendances.deletedAt)];
    if (params.month) {
      const month: string = parseMonthParam(params.month);
      conditions.push(gte(hrAttendances.attendanceDate, `${month}-01`));
      conditions.push(
        lt(hrAttendances.attendanceDate, nextMonthFirstDay(month)),
      );
    }
    if (params.department) {
      conditions.push(eq(hrAttendances.department, params.department));
    }
    if (params.employeeId) {
      conditions.push(
        eq(hrAttendances.employeeId, assertPositiveEmployeeId(params.employeeId)),
      );
    }
    const rows: StatsAggregateRow[] = await this.db
      .select({
        totalRecords: count(),
        normalCount: sql<number>`count(*) filter (where ${hrAttendances.status} = ${STATUS_NORMAL})`,
        lateCount: sql<number>`count(*) filter (where ${hrAttendances.status} = ${STATUS_LATE})`,
        earlyLeaveCount: sql<number>`count(*) filter (where ${hrAttendances.status} = ${STATUS_EARLY_LEAVE})`,
        absentCount: sql<number>`count(*) filter (where ${hrAttendances.status} = ${STATUS_ABSENT})`,
        leaveCount: sql<number>`count(*) filter (where ${hrAttendances.status} = ${STATUS_LEAVE})`,
        overtimeCount: sql<number>`count(*) filter (where ${hrAttendances.status} = ${STATUS_OVERTIME})`,
        leaveHours: sql<string>`coalesce(sum(${hrAttendances.leaveHours}), 0)::text`,
        overtimeHours: sql<string>`coalesce(sum(${hrAttendances.overtimeHours}), 0)::text`,
      })
      .from(hrAttendances)
      .where(and(...conditions));
    const agg: StatsAggregateRow | undefined = rows[0];
    return {
      totalRecords: Number(agg?.totalRecords ?? 0),
      normalCount: Number(agg?.normalCount ?? 0),
      lateCount: Number(agg?.lateCount ?? 0),
      earlyLeaveCount: Number(agg?.earlyLeaveCount ?? 0),
      absentCount: Number(agg?.absentCount ?? 0),
      leaveCount: Number(agg?.leaveCount ?? 0),
      overtimeCount: Number(agg?.overtimeCount ?? 0),
      leaveHours: agg?.leaveHours ?? '0',
      overtimeHours: agg?.overtimeHours ?? '0',
    };
  }

  private async findExisting(id: number): Promise<AttRow> {
    const rows: AttRow[] = await this.db
      .select()
      .from(hrAttendances)
      .where(and(eq(hrAttendances.id, id), isNull(hrAttendances.deletedAt)));
    if (rows.length === 0) {
      throw new NotFoundException('考勤记录不存在');
    }
    return rows[0];
  }
}
