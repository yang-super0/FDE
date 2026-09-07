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
  sql,
  type SQL,
} from 'drizzle-orm';
import { hrSalaries } from '@server/database/schema';
import type {
  CreateHrSalaryBody,
  HrSalary,
  HrSalaryPage,
  HrSalaryPayslip,
  UpdateHrSalaryBody,
} from '@shared/api.interface';
import { insertWithSeqNo } from '../finance-core/fin-seq.util';
import {
  assertHrNonNegativeNumber,
  assertHrRequired,
  resolveHrPagination,
} from './hr-enhance-shared.util';

type SalaryRow = typeof hrSalaries.$inferSelect;
type SalaryInsert = typeof hrSalaries.$inferInsert;

export const SALARY_NO_PREFIX: string = 'GZ';

const STATUS_PENDING: string = '待核算';
const STATUS_CALCULATED: string = '已核算';
const STATUS_PAID: string = '已发放';
const STATUS_CONFIRMED: string = '已确认';
const LOCKED_STATUSES: string[] = [STATUS_PAID, STATUS_CONFIRMED];

const SALARY_MONTH_PATTERN: RegExp = /^\d{4}-(0[1-9]|1[0-2])$/u;

/** 当前业务日期（Asia/Shanghai），'YYYY-MM-DD' */
const todayDate = (): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

/** 必填薪资月份，'YYYY-MM' 格式非法 → 400 */
const assertSalaryMonth = (value: unknown): string => {
  const month: string = String(value ?? '').trim();
  if (!SALARY_MONTH_PATTERN.test(month)) {
    throw new BadRequestException('薪资月份格式必须为 YYYY-MM');
  }
  return month;
};

/** 正整数 ID 校验（员工 ID 等） */
const parsePositiveId = (value: unknown, label: string): number => {
  const parsed: number = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new BadRequestException(`请提供有效的${label}`);
  }
  return parsed;
};

/** 可选金额：未提供 → 0；提供则非负校验 */
const parseAmount = (value: unknown, label: string): number => {
  if (value === undefined || value === null || String(value).trim() === '') {
    return 0;
  }
  return assertHrNonNegativeNumber(value, label);
};

const fmtMoney = (value: string | null): string =>
  Number(value ?? 0).toFixed(2);

/** 实发工资 = 基本 + 绩效 + 补贴 - 扣款 - 个税 - 社保，两位小数 */
const computeActualSalary = (
  base: number,
  performance: number,
  allowance: number,
  deduction: number,
  tax: number,
  socialInsurance: number,
): string =>
  (base + performance + allowance - deduction - tax - socialInsurance).toFixed(
    2,
  );

function mapSalary(row: SalaryRow): HrSalary {
  return {
    id: row.id,
    salaryNo: row.salaryNo,
    employeeId: row.employeeId,
    employeeName: row.employeeName,
    department: row.department,
    position: row.position,
    salaryMonth: row.salaryMonth,
    baseSalary: row.baseSalary,
    performanceSalary: row.performanceSalary,
    allowance: row.allowance,
    deduction: row.deduction,
    tax: row.tax,
    socialInsurance: row.socialInsurance,
    actualSalary: row.actualSalary,
    status: row.status,
    payDate: row.payDate ?? null,
    remark: row.remark,
    createdAt: row.createdAt.toISOString(),
    createdBy: row.createdBy ?? '',
    updatedAt: row.updatedAt.toISOString(),
    updatedBy: row.updatedBy ?? '',
    deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
  };
}

@Injectable()
export class HrSalariesService {
  private readonly logger = new Logger(HrSalariesService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
  ) {}

  async list(params: {
    salaryMonth?: string;
    department?: string;
    employeeName?: string;
    status?: string;
    page?: string;
    pageSize?: string;
  }): Promise<HrSalaryPage> {
    const { page, pageSize, offset } = resolveHrPagination(
      params.page,
      params.pageSize,
    );
    const conditions: SQL[] = [isNull(hrSalaries.deletedAt)];
    if (params.salaryMonth) {
      conditions.push(eq(hrSalaries.salaryMonth, params.salaryMonth));
    }
    if (params.department) {
      conditions.push(eq(hrSalaries.department, params.department));
    }
    if (params.employeeName) {
      conditions.push(ilike(hrSalaries.employeeName, `%${params.employeeName}%`));
    }
    if (params.status) {
      conditions.push(eq(hrSalaries.status, params.status));
    }
    const where = and(...conditions);
    const totalRows: { count: number | string }[] = await this.db
      .select({ count: count() })
      .from(hrSalaries)
      .where(where);
    const rows: SalaryRow[] = await this.db
      .select()
      .from(hrSalaries)
      .where(where)
      .orderBy(desc(hrSalaries.id))
      .limit(pageSize)
      .offset(offset);
    return {
      items: rows.map((row: SalaryRow) => mapSalary(row)),
      total: Number(totalRows[0]?.count ?? 0),
      page,
      pageSize,
    };
  }

  async create(dto: CreateHrSalaryBody): Promise<HrSalary> {
    const employeeId: number = parsePositiveId(dto?.employeeId, '员工 ID');
    assertHrRequired(dto?.employeeName, '员工姓名');
    assertHrRequired(dto?.department, '部门');
    assertHrRequired(dto?.position, '职位');
    const salaryMonth: string = assertSalaryMonth(dto?.salaryMonth);
    const base: number = parseAmount(dto?.baseSalary, '基本工资');
    const performance: number = parseAmount(dto?.performanceSalary, '绩效工资');
    const allowance: number = parseAmount(dto?.allowance, '补贴');
    const deduction: number = parseAmount(dto?.deduction, '扣款');
    const tax: number = parseAmount(dto?.tax, '个税');
    const socialInsurance: number = parseAmount(dto?.socialInsurance, '社保');
    const actualSalary: string = computeActualSalary(
      base,
      performance,
      allowance,
      deduction,
      tax,
      socialInsurance,
    );
    const { row } = await insertWithSeqNo<SalaryRow>({
      db: this.db,
      table: hrSalaries,
      noColumn: hrSalaries.salaryNo,
      prefix: SALARY_NO_PREFIX,
      insert: (no: string) =>
        this.db
          .insert(hrSalaries)
          .values({
            salaryNo: no,
            employeeId,
            employeeName: String(dto.employeeName).trim(),
            department: String(dto.department).trim(),
            position: String(dto.position).trim(),
            salaryMonth,
            baseSalary: base.toFixed(2),
            performanceSalary: performance.toFixed(2),
            allowance: allowance.toFixed(2),
            deduction: deduction.toFixed(2),
            tax: tax.toFixed(2),
            socialInsurance: socialInsurance.toFixed(2),
            actualSalary,
            status:
              typeof dto?.status === 'string' && dto.status.trim() !== ''
                ? dto.status.trim()
                : STATUS_PENDING,
            payDate: dto?.payDate ?? null,
            remark: dto?.remark ?? '',
          } satisfies SalaryInsert)
          .returning(),
    });
    this.logger.log(
      `工资单创建成功 id=${String(row.id)} no=${row.salaryNo} month=${salaryMonth}`,
    );
    return mapSalary(row);
  }

  async update(id: number, dto: UpdateHrSalaryBody): Promise<HrSalary> {
    const existing: SalaryRow = await this.findSalaryOrThrow(id);
    if (LOCKED_STATUSES.includes(existing.status)) {
      throw new ConflictException('已发放或已确认的工资单不允许修改');
    }
    const patch: Partial<SalaryInsert> = {};
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
    if (dto?.position !== undefined) {
      assertHrRequired(dto.position, '职位');
      patch.position = String(dto.position).trim();
    }
    if (dto?.salaryMonth !== undefined) {
      patch.salaryMonth = assertSalaryMonth(dto.salaryMonth);
    }
    let amountChanged: boolean = false;
    if (dto?.baseSalary !== undefined) {
      amountChanged = true;
      patch.baseSalary = assertHrNonNegativeNumber(
        dto.baseSalary,
        '基本工资',
      ).toFixed(2);
    }
    if (dto?.performanceSalary !== undefined) {
      amountChanged = true;
      patch.performanceSalary = assertHrNonNegativeNumber(
        dto.performanceSalary,
        '绩效工资',
      ).toFixed(2);
    }
    if (dto?.allowance !== undefined) {
      amountChanged = true;
      patch.allowance = assertHrNonNegativeNumber(
        dto.allowance,
        '补贴',
      ).toFixed(2);
    }
    if (dto?.deduction !== undefined) {
      amountChanged = true;
      patch.deduction = assertHrNonNegativeNumber(
        dto.deduction,
        '扣款',
      ).toFixed(2);
    }
    if (dto?.tax !== undefined) {
      amountChanged = true;
      patch.tax = assertHrNonNegativeNumber(dto.tax, '个税').toFixed(2);
    }
    if (dto?.socialInsurance !== undefined) {
      amountChanged = true;
      patch.socialInsurance = assertHrNonNegativeNumber(
        dto.socialInsurance,
        '社保',
      ).toFixed(2);
    }
    if (amountChanged) {
      patch.actualSalary = computeActualSalary(
        patch.baseSalary !== undefined
          ? Number(patch.baseSalary)
          : Number(existing.baseSalary),
        patch.performanceSalary !== undefined
          ? Number(patch.performanceSalary)
          : Number(existing.performanceSalary),
        patch.allowance !== undefined
          ? Number(patch.allowance)
          : Number(existing.allowance),
        patch.deduction !== undefined
          ? Number(patch.deduction)
          : Number(existing.deduction),
        patch.tax !== undefined ? Number(patch.tax) : Number(existing.tax),
        patch.socialInsurance !== undefined
          ? Number(patch.socialInsurance)
          : Number(existing.socialInsurance),
      );
    } else if (dto?.actualSalary !== undefined) {
      patch.actualSalary = dto.actualSalary;
    }
    if (dto?.status !== undefined) {
      patch.status = dto.status;
    }
    if (dto?.payDate !== undefined) {
      patch.payDate = dto.payDate;
    }
    if (dto?.remark !== undefined) {
      patch.remark = dto.remark;
    }
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }
    patch.updatedAt = new Date();
    const updated: SalaryRow[] = await this.db
      .update(hrSalaries)
      .set(patch)
      .where(and(eq(hrSalaries.id, id), isNull(hrSalaries.deletedAt)))
      .returning();
    if (updated.length === 0) {
      throw new NotFoundException('工资单不存在');
    }
    return mapSalary(updated[0]);
  }

  async remove(id: number): Promise<{ success: boolean }> {
    const existing: SalaryRow = await this.findSalaryOrThrow(id);
    if (LOCKED_STATUSES.includes(existing.status)) {
      throw new ConflictException('已发放或已确认的工资单不允许删除');
    }
    const updated: { id: number }[] = await this.db
      .update(hrSalaries)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(hrSalaries.id, id), isNull(hrSalaries.deletedAt)))
      .returning({ id: hrSalaries.id });
    if (updated.length === 0) {
      throw new NotFoundException('工资单不存在');
    }
    return { success: true };
  }

  /** 单条核算：待核算 → 已核算，并重算实发工资 */
  async calculate(id: number): Promise<HrSalary> {
    const existing: SalaryRow = await this.findSalaryOrThrow(id);
    if (existing.status !== STATUS_PENDING) {
      throw new ConflictException('只有待核算的工资单可以核算');
    }
    const actualSalary: string = computeActualSalary(
      Number(existing.baseSalary),
      Number(existing.performanceSalary),
      Number(existing.allowance),
      Number(existing.deduction),
      Number(existing.tax),
      Number(existing.socialInsurance),
    );
    const updated: SalaryRow[] = await this.db
      .update(hrSalaries)
      .set({ status: STATUS_CALCULATED, actualSalary, updatedAt: new Date() })
      .where(
        and(
          eq(hrSalaries.id, id),
          eq(hrSalaries.status, STATUS_PENDING),
          isNull(hrSalaries.deletedAt),
        ),
      )
      .returning();
    if (updated.length === 0) {
      throw new ConflictException('工资单状态已变更，请刷新后重试');
    }
    return mapSalary(updated[0]);
  }

  /** 批量核算：事务内单条 UPDATE，指定月份全部 待核算 → 已核算 并重算实发工资 */
  async batchCalculate(salaryMonth: string): Promise<number> {
    const month: string = assertSalaryMonth(salaryMonth);
    const updated: number = await this.db.transaction(async (tx) => {
      const rows: { id: number }[] = await tx
        .update(hrSalaries)
        .set({
          status: STATUS_CALCULATED,
          actualSalary: sql`${hrSalaries.baseSalary} + ${hrSalaries.performanceSalary} + ${hrSalaries.allowance} - ${hrSalaries.deduction} - ${hrSalaries.tax} - ${hrSalaries.socialInsurance}`,
          updatedAt: new Date(),
        })
        .where(
          and(
            isNull(hrSalaries.deletedAt),
            eq(hrSalaries.salaryMonth, month),
            eq(hrSalaries.status, STATUS_PENDING),
          ),
        )
        .returning({ id: hrSalaries.id });
      return rows.length;
    });
    this.logger.log(
      `工资批量核算完成 month=${month} updated=${String(updated)}`,
    );
    return updated;
  }

  /** 单条发放：已核算 → 已发放，pay_date = 当天 */
  async pay(id: number): Promise<HrSalary> {
    const existing: SalaryRow = await this.findSalaryOrThrow(id);
    if (existing.status !== STATUS_CALCULATED) {
      throw new ConflictException('只有已核算的工资单可以发放');
    }
    const updated: SalaryRow[] = await this.db
      .update(hrSalaries)
      .set({
        status: STATUS_PAID,
        payDate: todayDate(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(hrSalaries.id, id),
          eq(hrSalaries.status, STATUS_CALCULATED),
          isNull(hrSalaries.deletedAt),
        ),
      )
      .returning();
    if (updated.length === 0) {
      throw new ConflictException('工资单状态已变更，请刷新后重试');
    }
    return mapSalary(updated[0]);
  }

  /** 批量发放：事务内单条 UPDATE，指定月份全部 已核算 → 已发放 */
  async batchPay(salaryMonth: string): Promise<number> {
    const month: string = assertSalaryMonth(salaryMonth);
    const payDate: string = todayDate();
    const updated: number = await this.db.transaction(async (tx) => {
      const rows: { id: number }[] = await tx
        .update(hrSalaries)
        .set({
          status: STATUS_PAID,
          payDate,
          updatedAt: new Date(),
        })
        .where(
          and(
            isNull(hrSalaries.deletedAt),
            eq(hrSalaries.salaryMonth, month),
            eq(hrSalaries.status, STATUS_CALCULATED),
          ),
        )
        .returning({ id: hrSalaries.id });
      return rows.length;
    });
    this.logger.log(
      `工资批量发放完成 month=${month} updated=${String(updated)}`,
    );
    return updated;
  }

  /** 确认：已发放 → 已确认 */
  async confirm(id: number): Promise<HrSalary> {
    const existing: SalaryRow = await this.findSalaryOrThrow(id);
    if (existing.status !== STATUS_PAID) {
      throw new ConflictException('只有已发放的工资单可以确认');
    }
    const updated: SalaryRow[] = await this.db
      .update(hrSalaries)
      .set({ status: STATUS_CONFIRMED, updatedAt: new Date() })
      .where(
        and(
          eq(hrSalaries.id, id),
          eq(hrSalaries.status, STATUS_PAID),
          isNull(hrSalaries.deletedAt),
        ),
      )
      .returning();
    if (updated.length === 0) {
      throw new ConflictException('工资单状态已变更，请刷新后重试');
    }
    return mapSalary(updated[0]);
  }

  /** 工资条：明细 + 组成 breakdown（金额两位小数字符串，负项带负号） */
  async payslip(id: number): Promise<HrSalaryPayslip> {
    const row: SalaryRow = await this.findSalaryOrThrow(id);
    const fmt = (value: string | null): string => fmtMoney(value);
    const neg = (value: string | null): string => `-${fmtMoney(value)}`;
    return {
      salary: mapSalary(row),
      breakdown: [
        { label: '基本工资', amount: fmt(row.baseSalary) },
        { label: '绩效工资', amount: fmt(row.performanceSalary) },
        { label: '补贴', amount: fmt(row.allowance) },
        { label: '扣款', amount: neg(row.deduction) },
        { label: '个税', amount: neg(row.tax) },
        { label: '社保', amount: neg(row.socialInsurance) },
        { label: '实发工资', amount: fmt(row.actualSalary) },
      ],
    };
  }

  private async findSalaryOrThrow(id: number): Promise<SalaryRow> {
    const rows: SalaryRow[] = await this.db
      .select()
      .from(hrSalaries)
      .where(and(eq(hrSalaries.id, id), isNull(hrSalaries.deletedAt)));
    if (rows.length === 0) {
      throw new NotFoundException('工资单不存在');
    }
    return rows[0];
  }
}
