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
import { and, count, desc, eq, ilike, inArray, isNull, sql } from 'drizzle-orm';
import {
  outsourcingProjects,
  outsourcingVendors,
  videoProjects,
} from '@server/database/schema';
import type {
  CreateOutsourcingProjectRequest,
  OutsourcingProject,
  OutsourcingProjectListParams,
  OutsourcingProjectListResult,
  OutsourcingProjectStatusRequest,
  SettleOutsourcingRequest,
  VideoApproveRequest,
} from '@shared/api.interface';
import {
  insertWithSeqNo,
} from '@server/modules/finance-core/fin-seq.util';

type ProjectRow = typeof outsourcingProjects.$inferSelect;
type ProjectInsert = typeof outsourcingProjects.$inferInsert;
type VendorRow = typeof outsourcingVendors.$inferSelect;
type VideoProjectRow = typeof videoProjects.$inferSelect;

const PROJECT_NO_PREFIX: string = 'WB';
const PENDING_STATUS: string = '待审批';
const APPROVED_STATUS: string = '已审批';
const REJECTED_STATUS: string = '已驳回';
const IN_PROGRESS_STATUS: string = '进行中';
const COMPLETED_STATUS: string = '已完成';
const CANCELLED_STATUS: string = '已取消';
const SETTLED_STATUS: string = '已结算';
const UNSETTLED_STATUS: string = '未结算';
const PARTIALLY_SETTLED_STATUS: string = '部分结算';
const FULLY_SETTLED_STATUS: string = '已结算';

/** 状态流转：已审批→进行中→已完成；已审批/进行中 可取消 */
const STATUS_TRANSITIONS: Record<string, string[]> = {
  [APPROVED_STATUS]: [IN_PROGRESS_STATUS, CANCELLED_STATUS],
  [IN_PROGRESS_STATUS]: [COMPLETED_STATUS, CANCELLED_STATUS],
};

const TARGET_STATUSES: string[] = [
  IN_PROGRESS_STATUS,
  COMPLETED_STATUS,
  CANCELLED_STATUS,
];

/** 允许结算的项目状态 */
const SETTLE_ALLOWED_STATUSES: string[] = [
  APPROVED_STATUS,
  IN_PROGRESS_STATUS,
  COMPLETED_STATUS,
  SETTLED_STATUS,
];

interface ProjectJoinRow {
  project: ProjectRow;
  vendorName: string | null;
  relatedProjectNo: string | null;
}

const parseTimestampParam = (value: string, fieldName: string): Date => {
  const parsed: Date = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException(`${fieldName}格式无效: ${value}`);
  }
  return parsed;
};

@Injectable()
export class VideoOutsourcingProjectsService {
  private readonly logger: Logger = new Logger(
    VideoOutsourcingProjectsService.name,
  );

  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
  ) {}

  private mapProject(row: ProjectJoinRow): OutsourcingProject {
    const project: ProjectRow = row.project;
    return {
      id: project.id,
      projectNo: project.projectNo,
      projectName: project.projectName,
      vendorId: project.vendorId,
      vendorName: row.vendorName ?? '',
      relatedProjectId: project.relatedProjectId,
      relatedProjectNo: row.relatedProjectNo ?? '',
      serviceContent: project.serviceContent ?? '',
      amount: Number(project.amount ?? 0),
      status: project.status,
      applicant: project.applicant ?? '',
      approver: project.approver ?? '',
      approvedAt: project.approvedAt
        ? project.approvedAt.toISOString()
        : '',
      rejectReason: project.rejectReason ?? '',
      startDate: project.startDate ? project.startDate.toISOString() : '',
      endDate: project.endDate ? project.endDate.toISOString() : '',
      settlementStatus: project.settlementStatus,
      settledAmount: Number(project.settledAmount ?? 0),
      remark: project.remark ?? '',
      createdAt: project.createdAt.toISOString(),
    };
  }

  private selectJoin() {
    return this.db
      .select({
        project: outsourcingProjects,
        vendorName: outsourcingVendors.vendorName,
        relatedProjectNo: videoProjects.projectNo,
      })
      .from(outsourcingProjects)
      .leftJoin(
        outsourcingVendors,
        eq(outsourcingProjects.vendorId, outsourcingVendors.id),
      )
      .leftJoin(
        videoProjects,
        eq(outsourcingProjects.relatedProjectId, videoProjects.id),
      );
  }

  async findAll(
    params: OutsourcingProjectListParams,
  ): Promise<OutsourcingProjectListResult> {
    const page: number = Math.max(params.page ?? 1, 1);
    const pageSize: number = Math.min(Math.max(params.pageSize ?? 20, 1), 50);

    const conditions = [isNull(outsourcingProjects.deletedAt)];
    if (params.projectNo) {
      conditions.push(
        ilike(outsourcingProjects.projectNo, `%${params.projectNo}%`),
      );
    }
    if (params.projectName) {
      conditions.push(
        ilike(outsourcingProjects.projectName, `%${params.projectName}%`),
      );
    }
    if (params.vendorId !== undefined && params.vendorId !== null) {
      conditions.push(eq(outsourcingProjects.vendorId, params.vendorId));
    }
    if (params.status) {
      conditions.push(eq(outsourcingProjects.status, params.status));
    }
    if (params.settlementStatus) {
      conditions.push(
        eq(outsourcingProjects.settlementStatus, params.settlementStatus),
      );
    }
    const where = and(...conditions);

    const rows: ProjectJoinRow[] = await this.selectJoin()
      .where(where)
      .orderBy(desc(outsourcingProjects.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const totalResult: { count: number | string }[] = await this.db
      .select({ count: count() })
      .from(outsourcingProjects)
      .where(where);
    const total: number = Number(totalResult[0]?.count ?? 0);

    return {
      items: rows.map((row: ProjectJoinRow): OutsourcingProject =>
        this.mapProject(row),
      ),
      total,
    };
  }

  async detail(id: number): Promise<OutsourcingProject> {
    const rows: ProjectJoinRow[] = await this.selectJoin().where(
      and(
        eq(outsourcingProjects.id, id),
        isNull(outsourcingProjects.deletedAt),
      ),
    );
    if (rows.length === 0) {
      throw new NotFoundException('外包项目不存在');
    }
    return this.mapProject(rows[0]);
  }

  private async verifyVendor(vendorId: number): Promise<void> {
    const rows: VendorRow[] = await this.db
      .select()
      .from(outsourcingVendors)
      .where(
        and(
          eq(outsourcingVendors.id, vendorId),
          isNull(outsourcingVendors.deletedAt),
        ),
      );
    if (rows.length === 0) {
      throw new BadRequestException('供应商不存在');
    }
  }

  private async verifyVideoProject(
    relatedProjectId: number,
  ): Promise<void> {
    const rows: VideoProjectRow[] = await this.db
      .select()
      .from(videoProjects)
      .where(
        and(
          eq(videoProjects.id, relatedProjectId),
          isNull(videoProjects.deletedAt),
        ),
      );
    if (rows.length === 0) {
      throw new BadRequestException('关联项目不存在');
    }
  }

  async create(
    dto: CreateOutsourcingProjectRequest,
    applicantId: string,
  ): Promise<OutsourcingProject> {
    if (!dto.projectName || dto.projectName.trim().length === 0) {
      throw new BadRequestException('请填写项目名称');
    }
    if (dto.vendorId !== undefined && dto.vendorId !== null) {
      await this.verifyVendor(dto.vendorId);
    }
    if (dto.relatedProjectId !== undefined && dto.relatedProjectId !== null) {
      await this.verifyVideoProject(dto.relatedProjectId);
    }
    let amountValue: string = '0';
    if (dto.amount !== undefined && dto.amount !== null) {
      const amount: number = Number(dto.amount);
      if (Number.isNaN(amount) || amount < 0) {
        throw new BadRequestException('外包金额必须为不小于 0 的数字');
      }
      amountValue = String(amount);
    }
    const startDate: Date | null = dto.startDate
      ? parseTimestampParam(dto.startDate, '开始日期')
      : null;
    const endDate: Date | null = dto.endDate
      ? parseTimestampParam(dto.endDate, '结束日期')
      : null;

    const result = await this.db.transaction(async (tx) => {
      const inserted = await insertWithSeqNo<ProjectRow>({
        db: tx,
        table: outsourcingProjects,
        noColumn: outsourcingProjects.projectNo,
        prefix: PROJECT_NO_PREFIX,
        insert: (projectNo: string): Promise<ProjectRow[]> =>
          tx
            .insert(outsourcingProjects)
            .values({
              projectNo,
              projectName: dto.projectName.trim(),
              vendorId: dto.vendorId ?? null,
              relatedProjectId: dto.relatedProjectId ?? null,
              serviceContent: dto.serviceContent ?? '',
              amount: amountValue,
              status: PENDING_STATUS,
              applicant: applicantId,
              startDate,
              endDate,
              settlementStatus: UNSETTLED_STATUS,
              settledAmount: '0',
              remark: dto.remark ?? '',
            } satisfies ProjectInsert)
            .returning(),
      });
      return inserted;
    });
    this.logger.log(`外包项目创建成功: ${result.no}`);
    return this.detail(result.row.id);
  }

  async approve(
    id: number,
    dto: VideoApproveRequest,
    approverId: string,
  ): Promise<OutsourcingProject> {
    if (typeof dto.approved !== 'boolean') {
      throw new BadRequestException('请提供有效的审批结果');
    }
    if (!dto.approved) {
      const reason: string = (dto.rejectReason ?? '').trim();
      if (reason.length === 0) {
        throw new BadRequestException('驳回时必须填写驳回原因');
      }
    }

    await this.db.transaction(async (tx) => {
      const rows: ProjectRow[] = await tx
        .select()
        .from(outsourcingProjects)
        .where(
          and(
            eq(outsourcingProjects.id, id),
            isNull(outsourcingProjects.deletedAt),
          ),
        );
      if (rows.length === 0) {
        throw new NotFoundException('外包项目不存在');
      }
      if (rows[0].status !== PENDING_STATUS) {
        throw new ConflictException(
          `当前状态「${rows[0].status}」不允许审批，仅待审批可审批`,
        );
      }

      const now: Date = new Date();
      const patch: Partial<ProjectInsert> = { updatedAt: now };
      if (dto.approved) {
        patch.status = APPROVED_STATUS;
        patch.approver = approverId;
        patch.approvedAt = now;
      } else {
        patch.status = REJECTED_STATUS;
        patch.rejectReason = (dto.rejectReason ?? '').trim();
      }

      const updated: ProjectRow[] = await tx
        .update(outsourcingProjects)
        .set(patch)
        .where(
          and(
            eq(outsourcingProjects.id, id),
            isNull(outsourcingProjects.deletedAt),
            eq(outsourcingProjects.status, PENDING_STATUS),
          ),
        )
        .returning();
      if (updated.length === 0) {
        throw new ConflictException('外包项目状态已变更，请刷新后重试');
      }
    });
    this.logger.log(
      `外包项目 ${String(id)} 审批完成: ${dto.approved ? '通过' : '驳回'}`,
    );
    return this.detail(id);
  }

  async updateStatus(
    id: number,
    dto: OutsourcingProjectStatusRequest,
  ): Promise<OutsourcingProject> {
    if (!dto.status || !TARGET_STATUSES.includes(dto.status)) {
      throw new BadRequestException(
        `状态无效，允许值：${TARGET_STATUSES.join('/')}`,
      );
    }

    await this.db.transaction(async (tx) => {
      const rows: ProjectRow[] = await tx
        .select()
        .from(outsourcingProjects)
        .where(
          and(
            eq(outsourcingProjects.id, id),
            isNull(outsourcingProjects.deletedAt),
          ),
        );
      if (rows.length === 0) {
        throw new NotFoundException('外包项目不存在');
      }
      const current: string = rows[0].status;
      const allowed: string[] = STATUS_TRANSITIONS[current] ?? [];
      if (!allowed.includes(dto.status)) {
        throw new ConflictException(
          `状态「${current}」不允许变更为「${dto.status}」`,
        );
      }

      const updated: ProjectRow[] = await tx
        .update(outsourcingProjects)
        .set({ status: dto.status, updatedAt: new Date() })
        .where(
          and(
            eq(outsourcingProjects.id, id),
            isNull(outsourcingProjects.deletedAt),
            eq(outsourcingProjects.status, current),
          ),
        )
        .returning();
      if (updated.length === 0) {
        throw new ConflictException('外包项目状态已变更，请刷新后重试');
      }
    });
    this.logger.log(`外包项目 ${String(id)} 状态变更为: ${dto.status}`);
    return this.detail(id);
  }

  async settle(
    id: number,
    dto: SettleOutsourcingRequest,
  ): Promise<OutsourcingProject> {
    const amount: number = Number(dto?.amount);
    if (Number.isNaN(amount) || amount <= 0) {
      throw new BadRequestException('结算金额必须大于 0');
    }

    await this.db.transaction(async (tx) => {
      const rows: ProjectRow[] = await tx
        .select()
        .from(outsourcingProjects)
        .where(
          and(
            eq(outsourcingProjects.id, id),
            isNull(outsourcingProjects.deletedAt),
          ),
        );
      if (rows.length === 0) {
        throw new NotFoundException('外包项目不存在');
      }
      const row: ProjectRow = rows[0];
      if (!SETTLE_ALLOWED_STATUSES.includes(row.status)) {
        throw new ConflictException(
          `当前状态「${row.status}」不允许结算`,
        );
      }

      const totalAmount: number = Number(row.amount ?? 0);
      const currentSettled: number = Number(row.settledAmount ?? 0);
      const newSettled: number = currentSettled + amount;
      const fullySettled: boolean = newSettled >= totalAmount;

      const updated: ProjectRow[] = await tx
        .update(outsourcingProjects)
        .set({
          settledAmount: sql`${outsourcingProjects.settledAmount} + ${amount}`,
          settlementStatus: fullySettled
            ? FULLY_SETTLED_STATUS
            : PARTIALLY_SETTLED_STATUS,
          ...(fullySettled ? { status: SETTLED_STATUS } : {}),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(outsourcingProjects.id, id),
            isNull(outsourcingProjects.deletedAt),
            inArray(outsourcingProjects.status, SETTLE_ALLOWED_STATUSES),
            sql`${outsourcingProjects.settledAmount} + ${amount} <= ${outsourcingProjects.amount}`,
          ),
        )
        .returning();
      if (updated.length === 0) {
        throw new ConflictException('结算金额超出外包金额');
      }
    });
    this.logger.log(`外包项目 ${String(id)} 结算成功: ${String(amount)}`);
    return this.detail(id);
  }

  async remove(id: number): Promise<{ success: boolean }> {
    const rows: ProjectRow[] = await this.db
      .select()
      .from(outsourcingProjects)
      .where(
        and(
          eq(outsourcingProjects.id, id),
          isNull(outsourcingProjects.deletedAt),
        ),
      );
    if (rows.length === 0) {
      throw new NotFoundException('外包项目不存在');
    }

    const now: Date = new Date();
    const updated: { id: number }[] = await this.db
      .update(outsourcingProjects)
      .set({ deletedAt: now, updatedAt: now })
      .where(
        and(
          eq(outsourcingProjects.id, id),
          isNull(outsourcingProjects.deletedAt),
        ),
      )
      .returning({ id: outsourcingProjects.id });
    if (updated.length === 0) {
      throw new NotFoundException('外包项目不存在');
    }
    return { success: true };
  }
}
