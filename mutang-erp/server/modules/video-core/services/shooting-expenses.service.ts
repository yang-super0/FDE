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
  inArray,
  isNull,
  lt,
  sql,
} from 'drizzle-orm';
import { shootingExpenses, videoProjects } from '@server/database/schema';
import type {
  CreateShootingExpenseRequest,
  FinanceNamedAmountItem,
  ShootingExpense,
  ShootingExpenseListParams,
  ShootingExpenseListResult,
  ShootingExpenseStats,
  UpdateShootingExpenseRequest,
} from '@shared/api.interface';
import {
  insertWithSeqNo,
} from '@server/modules/finance-core/fin-seq.util';
import {
  addDays,
  parseAmountParam,
  parseDateParam,
  parseIdList,
} from '@server/modules/finance-core/query.util';

type ExpenseRow = typeof shootingExpenses.$inferSelect;
type ExpenseInsert = typeof shootingExpenses.$inferInsert;
type ProjectRow = typeof videoProjects.$inferSelect;

const EXPENSE_NO_PREFIX: string = 'PS';
const PENDING_STATUS: string = '待审批';
const APPROVED_STATUS: string = '已审批';
const REJECTED_STATUS: string = '已驳回';
const REIMBURSED_STATUS: string = '已报销';

@Injectable()
export class VideoShootingExpensesService {
  private readonly logger: Logger = new Logger(
    VideoShootingExpensesService.name,
  );

  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
  ) {}

  private mapExpense(row: ExpenseRow, projectNo: string): ShootingExpense {
    return {
      id: row.id,
      expenseNo: row.expenseNo,
      projectId: row.projectId,
      projectNo,
      expenseType: row.expenseType ?? '',
      expenseCategory: row.expenseCategory ?? '',
      amount: Number(row.amount),
      expenseDate: row.expenseDate ? row.expenseDate.toISOString() : '',
      applicant: row.applicant ?? '',
      status: row.status,
      approver: row.approver ?? '',
      approvedAt: row.approvedAt ? row.approvedAt.toISOString() : '',
      rejectReason: row.rejectReason ?? '',
      invoiceStatus: row.invoiceStatus ?? '',
      remark: row.remark ?? '',
      createdAt: row.createdAt.toISOString(),
    };
  }

  async findAll(
    params: ShootingExpenseListParams,
  ): Promise<ShootingExpenseListResult> {
    const page: number = Math.max(params.page ?? 1, 1);
    const pageSize: number = Math.min(Math.max(params.pageSize ?? 20, 1), 50);

    const conditions = [isNull(shootingExpenses.deletedAt)];
    if (params.expenseNo) {
      conditions.push(
        ilike(shootingExpenses.expenseNo, `%${params.expenseNo}%`),
      );
    }
    if (params.projectId !== undefined && params.projectId !== null) {
      conditions.push(eq(shootingExpenses.projectId, params.projectId));
    }
    if (params.expenseType) {
      conditions.push(eq(shootingExpenses.expenseType, params.expenseType));
    }
    if (params.status) {
      conditions.push(eq(shootingExpenses.status, params.status));
    }
    if (params.startDate) {
      conditions.push(
        gte(
          shootingExpenses.expenseDate,
          parseDateParam(params.startDate),
        ),
      );
    }
    if (params.endDate) {
      conditions.push(
        lt(
          shootingExpenses.expenseDate,
          addDays(parseDateParam(params.endDate), 1),
        ),
      );
    }
    const where = and(...conditions);

    const rows: {
      expense: ExpenseRow;
      projectNo: string | null;
    }[] = await this.db
      .select({
        expense: shootingExpenses,
        projectNo: videoProjects.projectNo,
      })
      .from(shootingExpenses)
      .leftJoin(
        videoProjects,
        eq(shootingExpenses.projectId, videoProjects.id),
      )
      .where(where)
      .orderBy(desc(shootingExpenses.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const totalResult: { count: number | string }[] = await this.db
      .select({ count: count() })
      .from(shootingExpenses)
      .where(where);
    const total: number = Number(totalResult[0]?.count ?? 0);

    return {
      items: rows.map(
        (row: { expense: ExpenseRow; projectNo: string | null }): ShootingExpense =>
          this.mapExpense(row.expense, row.projectNo ?? ''),
      ),
      total,
    };
  }

  async stats(): Promise<ShootingExpenseStats> {
    const now: Date = new Date();
    const monthStart: Date = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd: Date = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      1,
    );

    const monthRows: { total: string }[] = await this.db
      .select({
        total: sql<string>`coalesce(sum(${shootingExpenses.amount}), 0)`,
      })
      .from(shootingExpenses)
      .where(
        and(
          isNull(shootingExpenses.deletedAt),
          gte(shootingExpenses.expenseDate, monthStart),
          lt(shootingExpenses.expenseDate, monthEnd),
        ),
      );

    const byTypeRows: { expenseType: string | null; total: string }[] =
      await this.db
        .select({
          expenseType: shootingExpenses.expenseType,
          total: sql<string>`coalesce(sum(${shootingExpenses.amount}), 0)`,
        })
        .from(shootingExpenses)
        .where(isNull(shootingExpenses.deletedAt))
        .groupBy(shootingExpenses.expenseType);

    const byType: FinanceNamedAmountItem[] = byTypeRows.map(
      (row: { expenseType: string | null; total: string }): FinanceNamedAmountItem => ({
        name: row.expenseType ?? '其他',
        amount: Number(row.total),
      }),
    );

    return {
      monthTotal: Number(monthRows[0]?.total ?? 0),
      byType,
    };
  }

  async create(
    dto: CreateShootingExpenseRequest,
    userId: string,
  ): Promise<ShootingExpense> {
    if (
      dto?.projectId === undefined ||
      dto?.projectId === null ||
      !Number.isInteger(dto.projectId) ||
      dto.projectId <= 0
    ) {
      throw new BadRequestException('请提供有效的项目 ID');
    }
    const projects: ProjectRow[] = await this.db
      .select()
      .from(videoProjects)
      .where(
        and(eq(videoProjects.id, dto.projectId), isNull(videoProjects.deletedAt)),
      );
    if (projects.length === 0) {
      throw new NotFoundException('项目不存在');
    }
    if (!dto?.expenseType || dto.expenseType.trim().length === 0) {
      throw new BadRequestException('请填写费用类型');
    }
    const amount: number = parseAmountParam(dto?.amount);
    const expenseDate: Date = dto?.expenseDate
      ? parseDateParam(dto.expenseDate)
      : new Date();

    const result = await insertWithSeqNo<ExpenseRow>({
      db: this.db,
      table: shootingExpenses,
      noColumn: shootingExpenses.expenseNo,
      prefix: EXPENSE_NO_PREFIX,
      insert: (expenseNo: string): Promise<ExpenseRow[]> =>
        this.db
          .insert(shootingExpenses)
          .values({
            expenseNo,
            projectId: dto.projectId,
            expenseType: dto.expenseType.trim(),
            expenseCategory: dto?.expenseCategory ?? '',
            amount: String(amount),
            expenseDate,
            applicant: userId,
            status: PENDING_STATUS,
            invoiceStatus: dto?.invoiceStatus ?? '无发票',
            remark: dto?.remark ?? '',
          })
          .returning(),
    });
    this.logger.log(`拍摄费用创建成功: ${result.no}`);
    return this.mapExpense(result.row, projects[0].projectNo);
  }

  async detail(id: number): Promise<ShootingExpense> {
    const rows: { expense: ExpenseRow; projectNo: string | null }[] = await this.db
      .select({
        expense: shootingExpenses,
        projectNo: videoProjects.projectNo,
      })
      .from(shootingExpenses)
      .leftJoin(
        videoProjects,
        eq(shootingExpenses.projectId, videoProjects.id),
      )
      .where(
        and(eq(shootingExpenses.id, id), isNull(shootingExpenses.deletedAt)),
      );
    if (rows.length === 0) {
      throw new NotFoundException('拍摄费用不存在');
    }
    return this.mapExpense(rows[0].expense, rows[0].projectNo ?? '');
  }

  /** 仅 待审批 状态可编辑，否则 409 */
  async update(
    id: number,
    dto: UpdateShootingExpenseRequest,
  ): Promise<{ success: boolean }> {
    const rows: ExpenseRow[] = await this.db
      .select()
      .from(shootingExpenses)
      .where(
        and(eq(shootingExpenses.id, id), isNull(shootingExpenses.deletedAt)),
      );
    if (rows.length === 0) {
      throw new NotFoundException('拍摄费用不存在');
    }
    if (rows[0].status !== PENDING_STATUS) {
      throw new ConflictException('仅待审批的拍摄费用可以编辑');
    }

    const patch: Partial<ExpenseInsert> = {};
    if (dto?.expenseType !== undefined) {
      if (!dto.expenseType || dto.expenseType.trim().length === 0) {
        throw new BadRequestException('费用类型不能为空');
      }
      patch.expenseType = dto.expenseType.trim();
    }
    if (dto?.expenseCategory !== undefined) {
      patch.expenseCategory = dto.expenseCategory;
    }
    if (dto?.amount !== undefined) {
      patch.amount = String(parseAmountParam(dto.amount));
    }
    if (dto?.expenseDate !== undefined) {
      patch.expenseDate = parseDateParam(dto.expenseDate);
    }
    if (dto?.invoiceStatus !== undefined) {
      patch.invoiceStatus = dto.invoiceStatus;
    }
    if (dto?.remark !== undefined) {
      patch.remark = dto.remark;
    }
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }
    patch.updatedAt = new Date();

    const updated: { id: number }[] = await this.db
      .update(shootingExpenses)
      .set(patch)
      .where(
        and(
          eq(shootingExpenses.id, id),
          eq(shootingExpenses.status, PENDING_STATUS),
        ),
      )
      .returning({ id: shootingExpenses.id });
    if (updated.length === 0) {
      throw new ConflictException('拍摄费用状态已变更，请刷新后重试');
    }
    return { success: true };
  }

  /** 批量审批：仅 待审批 可处理；驳回必填原因；一条都不是 → 409 */
  async batchApprove(
    dto: { ids: number[]; approved: boolean; rejectReason?: string },
    userId: string,
  ): Promise<{ updated: number; skipped: number }> {
    const ids: number[] = parseIdList(dto?.ids);
    const approved: boolean = dto?.approved === true;
    const rejectReason: string = (dto?.rejectReason ?? '').trim();
    if (!approved && rejectReason.length === 0) {
      throw new BadRequestException('驳回时必须填写驳回原因');
    }
    const targetStatus: string = approved
      ? APPROVED_STATUS
      : REJECTED_STATUS;

    let updated: number = 0;
    let skipped: number = 0;

    await this.db.transaction(async (tx) => {
      const rows: ExpenseRow[] = await tx
        .select()
        .from(shootingExpenses)
        .where(
          and(
            inArray(shootingExpenses.id, ids),
            isNull(shootingExpenses.deletedAt),
          ),
        );
      const eligible: ExpenseRow[] = rows.filter(
        (row: ExpenseRow): boolean => row.status === PENDING_STATUS,
      );
      if (eligible.length === 0) {
        throw new ConflictException('没有待审批的拍摄费用');
      }
      skipped = rows.length - eligible.length;

      const now: Date = new Date();
      for (const row of eligible) {
        const updatedRows: { id: number }[] = await tx
          .update(shootingExpenses)
          .set({
            status: targetStatus,
            approver: userId,
            approvedAt: now,
            rejectReason: approved ? null : rejectReason,
            updatedAt: now,
          })
          .where(
            and(
              eq(shootingExpenses.id, row.id),
              eq(shootingExpenses.status, PENDING_STATUS),
            ),
          )
          .returning({ id: shootingExpenses.id });
        if (updatedRows.length > 0) {
          updated += 1;
        } else {
          skipped += 1;
        }
      }
    });

    this.logger.log(
      `拍摄费用批量审批完成: 更新 ${String(updated)} 条，跳过 ${String(skipped)} 条`,
    );
    return { updated, skipped };
  }

  /** 报销：仅 已审批 → 已报销，否则 409 */
  async reimburse(id: number): Promise<{ success: boolean }> {
    const rows: ExpenseRow[] = await this.db
      .select()
      .from(shootingExpenses)
      .where(
        and(eq(shootingExpenses.id, id), isNull(shootingExpenses.deletedAt)),
      );
    if (rows.length === 0) {
      throw new NotFoundException('拍摄费用不存在');
    }
    if (rows[0].status !== APPROVED_STATUS) {
      throw new ConflictException('仅已审批的拍摄费用可以报销');
    }

    const updated: { id: number }[] = await this.db
      .update(shootingExpenses)
      .set({ status: REIMBURSED_STATUS, updatedAt: new Date() })
      .where(
        and(
          eq(shootingExpenses.id, id),
          eq(shootingExpenses.status, APPROVED_STATUS),
        ),
      )
      .returning({ id: shootingExpenses.id });
    if (updated.length === 0) {
      throw new ConflictException('拍摄费用状态已变更，请刷新后重试');
    }
    this.logger.log(`拍摄费用报销成功: ${String(id)}`);
    return { success: true };
  }

  /** 软删除 */
  async remove(id: number): Promise<{ success: boolean }> {
    const now: Date = new Date();
    const updated: { id: number }[] = await this.db
      .update(shootingExpenses)
      .set({ deletedAt: now, updatedAt: now })
      .where(
        and(eq(shootingExpenses.id, id), isNull(shootingExpenses.deletedAt)),
      )
      .returning({ id: shootingExpenses.id });
    if (updated.length === 0) {
      throw new NotFoundException('拍摄费用不存在');
    }
    return { success: true };
  }
}
