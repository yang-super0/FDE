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
import { and, count, desc, eq, gte, ilike, isNull, lt } from 'drizzle-orm';
import { venueExpenses, videoProjects } from '@server/database/schema';
import type {
  CreateVenueExpenseRequest,
  UpdateVenueExpenseRequest,
  VenueExpense,
  VenueExpenseListParams,
  VenueExpenseListResult,
  VenueExpenseStatusRequest,
  VideoApproveRequest,
} from '@shared/api.interface';
import { insertWithSeqNo } from '@server/modules/finance-core/fin-seq.util';
import {
  addDays,
  parseDateParam,
} from '@server/modules/finance-core/query.util';

type VenueRow = typeof venueExpenses.$inferSelect;

type DbExecutor = Pick<PostgresJsDatabase, 'select'>;

const VENUE_NO_PREFIX: string = 'CD';

const PENDING_APPROVAL_STATUS: string = '待审批';
const APPROVED_STATUS: string = '已审批';
const REJECTED_STATUS: string = '已驳回';
const USED_STATUS: string = '已使用';
const SETTLED_STATUS: string = '已结算';
const CANCELLED_STATUS: string = '已取消';

const DEPOSIT_PENDING_STATUS: string = '未退还';
const DEPOSIT_RETURNED_STATUS: string = '已退还';
const DEPOSIT_DEDUCTED_STATUS: string = '已扣除';

/** 状态流转表：当前状态 → 允许流转的目标状态集合 */
const STATUS_TRANSITIONS: Map<string, string[]> = new Map([
  [APPROVED_STATUS, [USED_STATUS, CANCELLED_STATUS]],
  [USED_STATUS, [SETTLED_STATUS, CANCELLED_STATUS]],
]);

@Injectable()
export class VideoVenueExpensesService {
  private readonly logger: Logger = new Logger(
    VideoVenueExpensesService.name,
  );

  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
  ) {}

  private mapVenue(row: VenueRow, projectNo: string): VenueExpense {
    return {
      id: row.id,
      venueNo: row.venueNo,
      projectId: row.projectId,
      projectNo,
      venueName: row.venueName,
      venueType: row.venueType ?? '',
      address: row.address ?? '',
      contactPerson: row.contactPerson ?? '',
      phone: row.phone ?? '',
      rentalDate: row.rentalDate ? row.rentalDate.toISOString() : '',
      rentalDuration: row.rentalDuration ?? '',
      rentalFee: Number(row.rentalFee ?? 0),
      deposit: Number(row.deposit ?? 0),
      depositStatus: row.depositStatus,
      status: row.status,
      applicant: row.applicant ?? '',
      approver: row.approver ?? '',
      approvedAt: row.approvedAt ? row.approvedAt.toISOString() : '',
      depositReturnedAt: row.depositReturnedAt
        ? row.depositReturnedAt.toISOString()
        : '',
      remark: row.remark ?? '',
      createdAt: row.createdAt.toISOString(),
    };
  }

  private async loadProjectNo(
    projectId: number | null,
    executor: DbExecutor = this.db,
  ): Promise<string> {
    if (projectId === null) {
      return '';
    }
    const rows: { projectNo: string }[] = await executor
      .select({ projectNo: videoProjects.projectNo })
      .from(videoProjects)
      .where(eq(videoProjects.id, projectId));
    return rows.length > 0 ? rows[0].projectNo : '';
  }

  async findAll(
    params: VenueExpenseListParams,
  ): Promise<VenueExpenseListResult> {
    const page: number = Math.max(params.page ?? 1, 1);
    const pageSize: number = Math.min(Math.max(params.pageSize ?? 20, 1), 50);

    const conditions = [isNull(venueExpenses.deletedAt)];
    if (params.venueNo) {
      conditions.push(ilike(venueExpenses.venueNo, `%${params.venueNo}%`));
    }
    if (params.venueName) {
      conditions.push(ilike(venueExpenses.venueName, `%${params.venueName}%`));
    }
    if (params.venueType) {
      conditions.push(eq(venueExpenses.venueType, params.venueType));
    }
    if (params.status) {
      conditions.push(eq(venueExpenses.status, params.status));
    }
    if (params.startDate) {
      conditions.push(
        gte(venueExpenses.rentalDate, parseDateParam(params.startDate)),
      );
    }
    if (params.endDate) {
      conditions.push(
        lt(
          venueExpenses.rentalDate,
          addDays(parseDateParam(params.endDate), 1),
        ),
      );
    }
    const where = and(...conditions);

    const rows: { row: VenueRow; projectNo: string | null }[] = await this.db
      .select({ row: venueExpenses, projectNo: videoProjects.projectNo })
      .from(venueExpenses)
      .leftJoin(
        videoProjects,
        and(
          eq(venueExpenses.projectId, videoProjects.id),
          isNull(videoProjects.deletedAt),
        ),
      )
      .where(where)
      .orderBy(desc(venueExpenses.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const totalResult: { count: number | string }[] = await this.db
      .select({ count: count() })
      .from(venueExpenses)
      .where(where);
    const total: number = Number(totalResult[0]?.count ?? 0);

    return {
      items: rows.map(
        (item: { row: VenueRow; projectNo: string | null }): VenueExpense =>
          this.mapVenue(item.row, item.projectNo ?? ''),
      ),
      total,
    };
  }

  async detail(id: number): Promise<VenueExpense> {
    const rows: { row: VenueRow; projectNo: string | null }[] = await this.db
      .select({ row: venueExpenses, projectNo: videoProjects.projectNo })
      .from(venueExpenses)
      .leftJoin(
        videoProjects,
        and(
          eq(venueExpenses.projectId, videoProjects.id),
          isNull(videoProjects.deletedAt),
        ),
      )
      .where(and(eq(venueExpenses.id, id), isNull(venueExpenses.deletedAt)));
    if (rows.length === 0) {
      throw new NotFoundException('场地费用不存在');
    }
    return this.mapVenue(rows[0].row, rows[0].projectNo ?? '');
  }

  private parseAmount(value: unknown, fieldName: string): number {
    const parsed: number = Number(value);
    if (Number.isNaN(parsed) || parsed < 0) {
      throw new BadRequestException(`${fieldName}无效`);
    }
    return parsed;
  }

  async create(
    dto: CreateVenueExpenseRequest,
    applicant: string,
  ): Promise<VenueExpense> {
    if (!dto.venueName || dto.venueName.trim().length === 0) {
      throw new BadRequestException('请填写场地名称');
    }
    const rentalFee: number =
      dto.rentalFee !== undefined && dto.rentalFee !== null
        ? this.parseAmount(dto.rentalFee, '租赁费用')
        : 0;
    const deposit: number =
      dto.deposit !== undefined && dto.deposit !== null
        ? this.parseAmount(dto.deposit, '押金')
        : 0;

    const result = await insertWithSeqNo<VenueRow>({
      db: this.db,
      table: venueExpenses,
      noColumn: venueExpenses.venueNo,
      prefix: VENUE_NO_PREFIX,
      insert: (venueNo: string): Promise<VenueRow[]> =>
        this.db
          .insert(venueExpenses)
          .values({
            venueNo,
            projectId: dto.projectId ?? null,
            venueName: dto.venueName.trim(),
            venueType: dto.venueType ?? '影棚',
            address: dto.address ?? '',
            contactPerson: dto.contactPerson ?? '',
            phone: dto.phone ?? '',
            rentalDate: dto.rentalDate
              ? parseDateParam(dto.rentalDate)
              : null,
            rentalDuration: dto.rentalDuration ?? '',
            rentalFee: String(rentalFee),
            deposit: String(deposit),
            status: PENDING_APPROVAL_STATUS,
            applicant,
            remark: dto.remark ?? '',
          })
          .returning(),
    });
    this.logger.log(`场地费用创建成功: ${result.no}`);
    const projectNo: string = await this.loadProjectNo(result.row.projectId);
    return this.mapVenue(result.row, projectNo);
  }

  async update(
    id: number,
    dto: UpdateVenueExpenseRequest,
  ): Promise<{ success: boolean }> {
    const patch: Partial<typeof venueExpenses.$inferInsert> = {};
    if (dto.venueName !== undefined) {
      if (!dto.venueName || dto.venueName.trim().length === 0) {
        throw new BadRequestException('请填写场地名称');
      }
      patch.venueName = dto.venueName.trim();
    }
    if (dto.venueType !== undefined) patch.venueType = dto.venueType;
    if (dto.address !== undefined) patch.address = dto.address;
    if (dto.contactPerson !== undefined) patch.contactPerson = dto.contactPerson;
    if (dto.phone !== undefined) patch.phone = dto.phone;
    if (dto.projectId !== undefined) patch.projectId = dto.projectId;
    if (dto.rentalDate !== undefined) {
      patch.rentalDate = dto.rentalDate
        ? parseDateParam(dto.rentalDate)
        : null;
    }
    if (dto.rentalDuration !== undefined) patch.rentalDuration = dto.rentalDuration;
    if (dto.rentalFee !== undefined) {
      patch.rentalFee = String(this.parseAmount(dto.rentalFee, '租赁费用'));
    }
    if (dto.deposit !== undefined) {
      patch.deposit = String(this.parseAmount(dto.deposit, '押金'));
    }
    if (dto.remark !== undefined) patch.remark = dto.remark;
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }
    patch.updatedAt = new Date();

    return this.db.transaction(async (tx) => {
      const rows: VenueRow[] = await tx
        .select()
        .from(venueExpenses)
        .where(and(eq(venueExpenses.id, id), isNull(venueExpenses.deletedAt)));
      if (rows.length === 0) {
        throw new NotFoundException('场地费用不存在');
      }
      if (rows[0].status !== PENDING_APPROVAL_STATUS) {
        throw new ConflictException('仅待审批状态的场地费用可编辑');
      }
      const updated: VenueRow[] = await tx
        .update(venueExpenses)
        .set(patch)
        .where(and(eq(venueExpenses.id, id), isNull(venueExpenses.deletedAt)))
        .returning();
      if (updated.length === 0) {
        throw new NotFoundException('场地费用不存在');
      }
      return { success: true };
    });
  }

  async approve(
    id: number,
    dto: VideoApproveRequest,
    approver: string,
  ): Promise<VenueExpense> {
    if (typeof dto.approved !== 'boolean') {
      throw new BadRequestException('请提供有效的审批结果');
    }
    const rejectReason: string = (dto.rejectReason ?? '').trim();
    if (!dto.approved && rejectReason.length === 0) {
      throw new BadRequestException('驳回时必须填写驳回原因');
    }

    return this.db.transaction(async (tx) => {
      const rows: VenueRow[] = await tx
        .select()
        .from(venueExpenses)
        .where(and(eq(venueExpenses.id, id), isNull(venueExpenses.deletedAt)));
      if (rows.length === 0) {
        throw new NotFoundException('场地费用不存在');
      }
      const current: VenueRow = rows[0];
      if (current.status !== PENDING_APPROVAL_STATUS) {
        throw new ConflictException('仅待审批状态的场地费用可审批');
      }

      const patch: Partial<typeof venueExpenses.$inferInsert> = {
        updatedAt: new Date(),
      };
      if (dto.approved) {
        patch.status = APPROVED_STATUS;
        patch.approver = approver;
        patch.approvedAt = new Date();
      } else {
        patch.status = REJECTED_STATUS;
        // 表结构无独立驳回原因列，驳回原因并入备注保存
        patch.remark = `驳回原因：${rejectReason}`;
      }

      const updated: VenueRow[] = await tx
        .update(venueExpenses)
        .set(patch)
        .where(and(eq(venueExpenses.id, id), isNull(venueExpenses.deletedAt)))
        .returning();
      const projectNo: string = await this.loadProjectNo(
        updated[0].projectId,
        tx,
      );
      return this.mapVenue(updated[0], projectNo);
    });
  }

  async changeStatus(
    id: number,
    dto: VenueExpenseStatusRequest,
  ): Promise<VenueExpense> {
    return this.db.transaction(async (tx) => {
      const rows: VenueRow[] = await tx
        .select()
        .from(venueExpenses)
        .where(and(eq(venueExpenses.id, id), isNull(venueExpenses.deletedAt)));
      if (rows.length === 0) {
        throw new NotFoundException('场地费用不存在');
      }
      const current: VenueRow = rows[0];
      const allowed: string[] = STATUS_TRANSITIONS.get(current.status) ?? [];
      if (!allowed.includes(dto.status)) {
        throw new ConflictException(
          `当前状态「${current.status}」不允许流转为「${dto.status}」`,
        );
      }

      const updated: VenueRow[] = await tx
        .update(venueExpenses)
        .set({ status: dto.status, updatedAt: new Date() })
        .where(and(eq(venueExpenses.id, id), isNull(venueExpenses.deletedAt)))
        .returning();
      const projectNo: string = await this.loadProjectNo(
        updated[0].projectId,
        tx,
      );
      return this.mapVenue(updated[0], projectNo);
    });
  }

  /** 押金处理：退还 / 扣除共用，仅 未退还 可操作 */
  private async settleDeposit(
    id: number,
    targetStatus: string,
  ): Promise<VenueExpense> {
    return this.db.transaction(async (tx) => {
      const rows: VenueRow[] = await tx
        .select()
        .from(venueExpenses)
        .where(and(eq(venueExpenses.id, id), isNull(venueExpenses.deletedAt)));
      if (rows.length === 0) {
        throw new NotFoundException('场地费用不存在');
      }
      const current: VenueRow = rows[0];
      if (current.status === CANCELLED_STATUS) {
        throw new ConflictException('已取消的场地费用不能处理押金');
      }
      if (current.depositStatus !== DEPOSIT_PENDING_STATUS) {
        throw new ConflictException('押金已处理，不能重复操作');
      }

      const updated: VenueRow[] = await tx
        .update(venueExpenses)
        .set({
          depositStatus: targetStatus,
          depositReturnedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(eq(venueExpenses.id, id), isNull(venueExpenses.deletedAt)))
        .returning();
      const projectNo: string = await this.loadProjectNo(
        updated[0].projectId,
        tx,
      );
      return this.mapVenue(updated[0], projectNo);
    });
  }

  async returnDeposit(id: number): Promise<VenueExpense> {
    return this.settleDeposit(id, DEPOSIT_RETURNED_STATUS);
  }

  async deductDeposit(id: number): Promise<VenueExpense> {
    return this.settleDeposit(id, DEPOSIT_DEDUCTED_STATUS);
  }

  async remove(id: number): Promise<{ success: boolean }> {
    const updated: { id: number }[] = await this.db
      .update(venueExpenses)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(venueExpenses.id, id), isNull(venueExpenses.deletedAt)))
      .returning({ id: venueExpenses.id });
    if (updated.length === 0) {
      throw new NotFoundException('场地费用不存在');
    }
    return { success: true };
  }
}
