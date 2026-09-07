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
  and, count, desc, eq, gte, ilike, inArray, isNull, lt, or, type SQL,
} from 'drizzle-orm';
import { adminRequisitions } from '@server/database/schema';
import type {
  AdminEnhanceApproveDto,
  AdminEnhanceListResponse,
  AdminRequisition,
  CreateAdminRequisitionDto,
  UpdateAdminRequisitionDto,
} from '@shared/api.interface';
import { insertWithSeqNo } from '../finance-core/fin-seq.util';
import { parseIdList } from '../finance-core/query.util';
import {
  adminToday, assertAdminPositiveInt, assertAdminRequired,
  decreaseInventoryStock, formatAdminDateTime, resolveAdminPagination,
} from './admin-enhance-shared.util';

type RequisitionRow = typeof adminRequisitions.$inferSelect;
type RequisitionInsert = typeof adminRequisitions.$inferInsert;

const REQUISITION_NO_PREFIX: string = 'LY';
const STATUS_PENDING: string = '待审批';
const STATUS_APPROVED: string = '已通过';
const STATUS_REJECTED: string = '已驳回';
const STATUS_ISSUED: string = '已领用';
const STATUS_CANCELLED: string = '已取消';
const CANCELABLE_STATUSES: string[] = [STATUS_PENDING, STATUS_APPROVED];
const DELETABLE_STATUSES: string[] = [
  STATUS_PENDING, STATUS_REJECTED, STATUS_CANCELLED,
];

/** 业务时区当日零点（东八区） */
const dayStart = (day: string): Date => new Date(`${day}T00:00:00+08:00`);

function mapRequisition(row: RequisitionRow): AdminRequisition {
  return {
    id: row.id, requisitionNo: row.requisitionNo, applicant: row.applicant,
    department: row.department, itemName: row.itemName, itemType: row.itemType,
    specification: row.specification, quantity: row.quantity, unit: row.unit,
    purpose: row.purpose, status: row.status, approver: row.approver,
    approveTime: formatAdminDateTime(row.approveTime),
    approveRemark: row.approveRemark,
    outboundDate: row.outboundDate ?? null, operator: row.operator,
    expectedReturnDate: row.expectedReturnDate ?? null, remark: row.remark,
    createdAt: formatAdminDateTime(row.createdAt) ?? '',
    updatedAt: formatAdminDateTime(row.updatedAt) ?? '',
  };
}

@Injectable()
export class AdminRequisitionsService {
  private readonly logger = new Logger(AdminRequisitionsService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
  ) {}

  async list(params: {
    department?: string; status?: string; dateFrom?: string;
    dateTo?: string; keyword?: string; page?: string; pageSize?: string;
  }): Promise<AdminEnhanceListResponse<AdminRequisition>> {
    const { page, pageSize, offset } = resolveAdminPagination(params.page, params.pageSize);
    const conditions: SQL[] = [isNull(adminRequisitions.deletedAt)];
    if (params.department) {
      conditions.push(eq(adminRequisitions.department, params.department));
    }
    if (params.status) {
      conditions.push(eq(adminRequisitions.status, params.status));
    }
    if (params.dateFrom) {
      conditions.push(gte(adminRequisitions.createdAt, dayStart(params.dateFrom)));
    }
    if (params.dateTo) {
      conditions.push(lt(
        adminRequisitions.createdAt,
        new Date(dayStart(params.dateTo).getTime() + 86400000),
      ));
    }
    if (params.keyword) {
      const kw: string = `%${params.keyword}%`;
      const keywordCond = or(
        ilike(adminRequisitions.requisitionNo, kw),
        ilike(adminRequisitions.itemName, kw),
        ilike(adminRequisitions.applicant, kw),
      );
      if (keywordCond) conditions.push(keywordCond);
    }
    const where = and(...conditions);
    const totalRows: { count: number | string }[] = await this.db
      .select({ count: count() }).from(adminRequisitions).where(where);
    const rows: RequisitionRow[] = await this.db.select().from(adminRequisitions)
      .where(where).orderBy(desc(adminRequisitions.id))
      .limit(pageSize).offset(offset);
    return {
      items: rows.map((row: RequisitionRow) => mapRequisition(row)),
      total: Number(totalRows[0]?.count ?? 0), page, pageSize,
    };
  }

  async create(dto: CreateAdminRequisitionDto): Promise<AdminRequisition> {
    assertAdminRequired(dto?.applicant, '申请人');
    assertAdminRequired(dto?.department, '部门');
    assertAdminRequired(dto?.itemName, '物品名称');
    const quantity: number = assertAdminPositiveInt(dto?.quantity, '数量');
    const { row } = await insertWithSeqNo<RequisitionRow>({
      db: this.db,
      table: adminRequisitions,
      noColumn: adminRequisitions.requisitionNo,
      prefix: REQUISITION_NO_PREFIX,
      insert: (no: string) =>
        this.db.insert(adminRequisitions).values({
          requisitionNo: no, applicant: String(dto.applicant).trim(),
          department: String(dto.department).trim(),
          itemName: String(dto.itemName).trim(),
          itemType: dto?.itemType ?? '办公用品',
          specification: dto?.specification ?? '', quantity,
          unit: dto?.unit ?? '件', purpose: dto?.purpose ?? '',
          status: STATUS_PENDING, approver: '', approveTime: null,
          approveRemark: '', outboundDate: null, operator: '',
          expectedReturnDate: dto?.expectedReturnDate ?? null,
          remark: dto?.remark ?? '',
        } satisfies RequisitionInsert).returning(),
    });
    this.logger.log(
      `领用单创建成功 id=${String(row.id)} no=${row.requisitionNo}`,
    );
    return mapRequisition(row);
  }

  async update(
    id: number,
    dto: UpdateAdminRequisitionDto,
  ): Promise<AdminRequisition> {
    const existing: RequisitionRow = await this.findRequisitionOrThrow(id);
    if (existing.status !== STATUS_PENDING) {
      throw new ConflictException('只有待审批的领用单可以修改');
    }
    const patch: Partial<RequisitionInsert> = {};
    if (dto?.applicant !== undefined) {
      assertAdminRequired(dto.applicant, '申请人');
      patch.applicant = String(dto.applicant).trim();
    }
    if (dto?.department !== undefined) {
      assertAdminRequired(dto.department, '部门');
      patch.department = String(dto.department).trim();
    }
    if (dto?.itemName !== undefined) {
      assertAdminRequired(dto.itemName, '物品名称');
      patch.itemName = String(dto.itemName).trim();
    }
    if (dto?.itemType !== undefined) patch.itemType = dto.itemType;
    if (dto?.specification !== undefined) patch.specification = dto.specification;
    if (dto?.quantity !== undefined)
      patch.quantity = assertAdminPositiveInt(dto.quantity, '数量');
    if (dto?.unit !== undefined) patch.unit = dto.unit;
    if (dto?.purpose !== undefined) patch.purpose = dto.purpose;
    if (dto?.expectedReturnDate !== undefined)
      patch.expectedReturnDate = dto.expectedReturnDate;
    if (dto?.remark !== undefined) patch.remark = dto.remark;
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }
    patch.updatedAt = new Date();
    const updated: RequisitionRow[] = await this.db.update(adminRequisitions)
      .set(patch)
      .where(and(eq(adminRequisitions.id, id), isNull(adminRequisitions.deletedAt)))
      .returning();
    if (updated.length === 0) throw new NotFoundException('领用单不存在');
    return mapRequisition(updated[0]);
  }

  /** 审批：待审批 → 已通过/已驳回；驳回必须填写意见 */
  async approve(
    id: number,
    dto: AdminEnhanceApproveDto,
    approver: string,
  ): Promise<AdminRequisition> {
    const existing: RequisitionRow = await this.findRequisitionOrThrow(id);
    if (existing.status !== STATUS_PENDING) {
      throw new ConflictException('只有待审批的领用单可以审批');
    }
    const approve: boolean = dto?.approve === true;
    const remark: string = String(dto?.remark ?? '').trim();
    if (!approve && remark === '') {
      throw new BadRequestException('驳回时必须填写审批意见');
    }
    const updated: RequisitionRow[] = await this.db
      .update(adminRequisitions)
      .set({
        status: approve ? STATUS_APPROVED : STATUS_REJECTED, approver,
        approveTime: new Date(), approveRemark: remark, updatedAt: new Date(),
      })
      .where(and(
        eq(adminRequisitions.id, id),
        eq(adminRequisitions.status, STATUS_PENDING),
        isNull(adminRequisitions.deletedAt),
      ))
      .returning();
    if (updated.length === 0) {
      throw new ConflictException('领用单状态已变更，请刷新后重试');
    }
    return mapRequisition(updated[0]);
  }

  /** 领用确认：事务内原子扣减库存（不足回滚 409） */
  async issue(id: number, operator: string): Promise<AdminRequisition> {
    const existing: RequisitionRow = await this.findRequisitionOrThrow(id);
    if (existing.status !== STATUS_APPROVED) {
      throw new ConflictException('只有已通过的领用单可以领用');
    }
    return this.db.transaction(async (tx) => {
      await decreaseInventoryStock(tx, {
        itemName: existing.itemName,
        specification: existing.specification || '',
        quantity: existing.quantity,
      });
      const updated: RequisitionRow[] = await tx.update(adminRequisitions)
        .set({ status: STATUS_ISSUED, outboundDate: adminToday(), operator, updatedAt: new Date() })
        .where(and(
          eq(adminRequisitions.id, id),
          eq(adminRequisitions.status, STATUS_APPROVED),
          isNull(adminRequisitions.deletedAt),
        ))
        .returning();
      if (updated.length === 0) {
        throw new ConflictException('领用单状态已变更，请刷新后重试');
      }
      this.logger.log(
        `领用单出库成功 id=${String(id)} no=${existing.requisitionNo}`,
      );
      return mapRequisition(updated[0]);
    });
  }

  async cancel(id: number): Promise<AdminRequisition> {
    const existing: RequisitionRow = await this.findRequisitionOrThrow(id);
    if (!CANCELABLE_STATUSES.includes(existing.status)) {
      throw new ConflictException('只有待审批或已通过的领用单可以取消');
    }
    const updated: RequisitionRow[] = await this.db.update(adminRequisitions)
      .set({ status: STATUS_CANCELLED, updatedAt: new Date() })
      .where(and(
        eq(adminRequisitions.id, id),
        inArray(adminRequisitions.status, CANCELABLE_STATUSES),
        isNull(adminRequisitions.deletedAt),
      ))
      .returning();
    if (updated.length === 0) {
      throw new ConflictException('领用单状态已变更，请刷新后重试');
    }
    return mapRequisition(updated[0]);
  }

  async remove(id: number): Promise<{ success: boolean }> {
    const existing: RequisitionRow = await this.findRequisitionOrThrow(id);
    if (!DELETABLE_STATUSES.includes(existing.status)) {
      throw new ConflictException('只有待审批、已驳回或已取消的领用单可以删除');
    }
    const updated: { id: number }[] = await this.db.update(adminRequisitions)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(adminRequisitions.id, id), isNull(adminRequisitions.deletedAt)))
      .returning({ id: adminRequisitions.id });
    if (updated.length === 0) throw new NotFoundException('领用单不存在');
    return { success: true };
  }

  async batchDelete(ids: unknown): Promise<number> {
    const idList: number[] = parseIdList(ids);
    const updated: { id: number }[] = await this.db.update(adminRequisitions)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(
        inArray(adminRequisitions.id, idList),
        inArray(adminRequisitions.status, DELETABLE_STATUSES),
        isNull(adminRequisitions.deletedAt),
      ))
      .returning({ id: adminRequisitions.id });
    return updated.length;
  }

  private async findRequisitionOrThrow(id: number): Promise<RequisitionRow> {
    const rows: RequisitionRow[] = await this.db.select().from(adminRequisitions)
      .where(and(eq(adminRequisitions.id, id), isNull(adminRequisitions.deletedAt)));
    if (rows.length === 0) throw new NotFoundException('领用单不存在');
    return rows[0];
  }
}
