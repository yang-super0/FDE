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
  like,
  ne,
  sql,
} from 'drizzle-orm';
import {
  outsourcingProjects,
  shootingExpenses,
  venueExpenses,
  videoCommissions,
  videoOrders,
  videoProjects,
} from '@server/database/schema';
import type {
  CalculateCommissionsRequest,
  VideoCommission,
  VideoCommissionListParams,
  VideoCommissionListResult,
  VideoCommissionStats,
} from '@shared/api.interface';
import {
  buildSeqNo,
} from '@server/modules/finance-core/fin-seq.util';
import {
  parseIdList,
  round2,
} from '@server/modules/finance-core/query.util';

type CommissionRow = typeof videoCommissions.$inferSelect;
type CommissionInsert = typeof videoCommissions.$inferInsert;
type OrderRow = typeof videoOrders.$inferSelect;
type ProjectRow = typeof videoProjects.$inferSelect;

const COMMISSION_NO_PREFIX: string = 'TC';
const PENDING_STATUS: string = '待发放';
const PAID_STATUS: string = '已发放';
const CANCELLED_STATUS: string = '已取消';
const CANCELLABLE_STATUSES: string[] = [PENDING_STATUS, '已计算'];
const ORDER_DONE_STATUS: string = '已完成';
const DEFAULT_COMMISSION_RATE: number = 10;
/** 计入成本的拍摄费用状态 */
const SHOOTING_COST_STATUSES: string[] = ['已审批', '已报销'];
/** 计入成本的场地费用状态 */
const VENUE_COST_STATUSES: string[] = ['已审批', '已使用', '已结算'];

@Injectable()
export class VideoCommissionsService {
  private readonly logger: Logger = new Logger(VideoCommissionsService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
  ) {}

  private mapCommission(
    row: CommissionRow,
    orderNo: string,
    projectNo: string,
  ): VideoCommission {
    return {
      id: row.id,
      commissionNo: row.commissionNo,
      orderId: row.orderId,
      orderNo,
      projectId: row.projectId,
      projectNo,
      salesperson: row.salesperson ?? '',
      projectManager: row.projectManager ?? '',
      orderAmount: Number(row.orderAmount),
      costAmount: Number(row.costAmount),
      profitAmount: Number(row.profitAmount),
      commissionRate: Number(row.commissionRate),
      commissionAmount: Number(row.commissionAmount),
      status: row.status,
      period: row.period ?? '',
      calculatedBy: row.calculatedBy ?? '',
      calculatedAt: row.calculatedAt ? row.calculatedAt.toISOString() : '',
      paidAt: row.paidAt ? row.paidAt.toISOString() : '',
      remark: row.remark ?? '',
      createdAt: row.createdAt.toISOString(),
    };
  }

  async findAll(
    params: VideoCommissionListParams,
  ): Promise<VideoCommissionListResult> {
    const page: number = Math.max(params.page ?? 1, 1);
    const pageSize: number = Math.min(Math.max(params.pageSize ?? 20, 1), 50);

    const conditions = [isNull(videoCommissions.deletedAt)];
    if (params.commissionNo) {
      conditions.push(
        ilike(videoCommissions.commissionNo, `%${params.commissionNo}%`),
      );
    }
    if (params.salesperson) {
      conditions.push(
        ilike(videoCommissions.salesperson, `%${params.salesperson}%`),
      );
    }
    if (params.projectManager) {
      conditions.push(
        ilike(videoCommissions.projectManager, `%${params.projectManager}%`),
      );
    }
    if (params.status) {
      conditions.push(eq(videoCommissions.status, params.status));
    }
    if (params.period) {
      conditions.push(eq(videoCommissions.period, params.period));
    }
    const where = and(...conditions);

    const rows: {
      commission: CommissionRow;
      orderNo: string | null;
      projectNo: string | null;
    }[] = await this.db
      .select({
        commission: videoCommissions,
        orderNo: videoOrders.orderNo,
        projectNo: videoProjects.projectNo,
      })
      .from(videoCommissions)
      .leftJoin(videoOrders, eq(videoCommissions.orderId, videoOrders.id))
      .leftJoin(videoProjects, eq(videoCommissions.projectId, videoProjects.id))
      .where(where)
      .orderBy(desc(videoCommissions.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const totalResult: { count: number | string }[] = await this.db
      .select({ count: count() })
      .from(videoCommissions)
      .where(where);
    const total: number = Number(totalResult[0]?.count ?? 0);

    return {
      items: rows.map(
        (row: {
          commission: CommissionRow;
          orderNo: string | null;
          projectNo: string | null;
        }): VideoCommission =>
          this.mapCommission(
            row.commission,
            row.orderNo ?? '',
            row.projectNo ?? '',
          ),
      ),
      total,
    };
  }

  async stats(): Promise<VideoCommissionStats> {
    const now: Date = new Date();
    const period: string = `${now.getFullYear()}-${String(
      now.getMonth() + 1,
    ).padStart(2, '0')}`;

    const monthRows: { total: string }[] = await this.db
      .select({
        total: sql<string>`coalesce(sum(${videoCommissions.commissionAmount}), 0)`,
      })
      .from(videoCommissions)
      .where(
        and(
          isNull(videoCommissions.deletedAt),
          ne(videoCommissions.status, CANCELLED_STATUS),
          eq(videoCommissions.period, period),
        ),
      );

    const statusRows: { status: string; total: string }[] = await this.db
      .select({
        status: videoCommissions.status,
        total: sql<string>`coalesce(sum(${videoCommissions.commissionAmount}), 0)`,
      })
      .from(videoCommissions)
      .where(isNull(videoCommissions.deletedAt))
      .groupBy(videoCommissions.status);

    let paid: number = 0;
    let pending: number = 0;
    for (const row of statusRows) {
      if (row.status === PAID_STATUS) {
        paid = Number(row.total);
      } else if (row.status === PENDING_STATUS) {
        pending = Number(row.total);
      }
    }

    return {
      monthTotal: Number(monthRows[0]?.total ?? 0),
      paid,
      pending,
    };
  }

  /**
   * 提成计算：逐单校验订单存在且已完成，整事务内
   * 汇总关联项目成本（拍摄费用 + 场地费用 + 外包项目），
   * 利润 = 订单金额 - 成本，提成 = round2(利润 × 比例 / 100)
   */
  async calculate(
    dto: CalculateCommissionsRequest,
    userId: string,
  ): Promise<{ created: number; skipped: number }> {
    const orderIds: number[] = parseIdList(dto?.orderIds);
    const rate: number = dto?.commissionRate ?? DEFAULT_COMMISSION_RATE;
    if (!Number.isFinite(rate) || rate <= 0) {
      throw new BadRequestException('提成比例必须大于 0');
    }

    const foundOrders: OrderRow[] = await this.db
      .select()
      .from(videoOrders)
      .where(
        and(inArray(videoOrders.id, orderIds), isNull(videoOrders.deletedAt)),
      );
    const foundIds: Set<number> = new Set(
      foundOrders.map((order: OrderRow): number => order.id),
    );
    const missingIds: number[] = orderIds.filter(
      (id: number): boolean => !foundIds.has(id),
    );
    if (missingIds.length > 0) {
      throw new NotFoundException(`订单不存在: ${missingIds.join(', ')}`);
    }
    const notDoneOrders: OrderRow[] = foundOrders.filter(
      (order: OrderRow): boolean => order.status !== ORDER_DONE_STATUS,
    );
    if (notDoneOrders.length > 0) {
      const orderNos: string[] = notDoneOrders.map(
        (order: OrderRow): string => order.orderNo,
      );
      throw new BadRequestException(
        `订单未完成，不能计算提成: ${orderNos.join(', ')}`,
      );
    }

    let created: number = 0;
    let skipped: number = 0;

    await this.db.transaction(async (tx) => {
      // 已存在该订单的非已取消提成 → 跳过
      const existingRows: { orderId: number | null }[] = await tx
        .select({ orderId: videoCommissions.orderId })
        .from(videoCommissions)
        .where(
          and(
            inArray(videoCommissions.orderId, orderIds),
            ne(videoCommissions.status, CANCELLED_STATUS),
            isNull(videoCommissions.deletedAt),
          ),
        );
      const calculatedOrderIds: Set<number> = new Set(
        existingRows
          .map((row: { orderId: number | null }): number | null => row.orderId)
          .filter(
            (value: number | null): value is number => value !== null,
          ),
      );

      // 订单关联项目
      const projects: ProjectRow[] = await tx
        .select()
        .from(videoProjects)
        .where(
          and(
            inArray(videoProjects.orderId, orderIds),
            isNull(videoProjects.deletedAt),
          ),
        );
      const projectIds: number[] = projects.map(
        (project: ProjectRow): number => project.id,
      );

      // 三段成本 SQL sum：按项目聚合（COALESCE 0）
      const shootingCosts: Map<number, number> = new Map();
      const venueCosts: Map<number, number> = new Map();
      const outsourcingCosts: Map<number, number> = new Map();
      if (projectIds.length > 0) {
        const shootingRows: {
          projectId: number | null;
          total: string;
        }[] = await tx
          .select({
            projectId: shootingExpenses.projectId,
            total: sql<string>`coalesce(sum(${shootingExpenses.amount}), 0)`,
          })
          .from(shootingExpenses)
          .where(
            and(
              inArray(shootingExpenses.projectId, projectIds),
              inArray(shootingExpenses.status, SHOOTING_COST_STATUSES),
              isNull(shootingExpenses.deletedAt),
            ),
          )
          .groupBy(shootingExpenses.projectId);
        for (const row of shootingRows) {
          if (row.projectId !== null) {
            shootingCosts.set(row.projectId, Number(row.total));
          }
        }

        const venueRows: {
          projectId: number | null;
          total: string;
        }[] = await tx
          .select({
            projectId: venueExpenses.projectId,
            total: sql<string>`coalesce(sum(${venueExpenses.rentalFee}), 0)`,
          })
          .from(venueExpenses)
          .where(
            and(
              inArray(venueExpenses.projectId, projectIds),
              inArray(venueExpenses.status, VENUE_COST_STATUSES),
              isNull(venueExpenses.deletedAt),
            ),
          )
          .groupBy(venueExpenses.projectId);
        for (const row of venueRows) {
          if (row.projectId !== null) {
            venueCosts.set(row.projectId, Number(row.total));
          }
        }

        const outsourcingRows: {
          relatedProjectId: number | null;
          total: string;
        }[] = await tx
          .select({
            relatedProjectId: outsourcingProjects.relatedProjectId,
            total: sql<string>`coalesce(sum(${outsourcingProjects.amount}), 0)`,
          })
          .from(outsourcingProjects)
          .where(
            and(
              inArray(outsourcingProjects.relatedProjectId, projectIds),
              ne(outsourcingProjects.status, CANCELLED_STATUS),
              isNull(outsourcingProjects.deletedAt),
            ),
          )
          .groupBy(outsourcingProjects.relatedProjectId);
        for (const row of outsourcingRows) {
          if (row.relatedProjectId !== null) {
            outsourcingCosts.set(row.relatedProjectId, Number(row.total));
          }
        }
      }

      // 当月期号 + 编号序号
      const now: Date = new Date();
      const monthText: string = String(now.getMonth() + 1).padStart(2, '0');
      const period: string = `${now.getFullYear()}-${monthText}`;
      const yearMonth: string = `${now.getFullYear()}${monthText}`;
      const existingCountRows: { count: number | string }[] = await tx
        .select({ count: count() })
        .from(videoCommissions)
        .where(
          like(
            videoCommissions.commissionNo,
            `${COMMISSION_NO_PREFIX}${yearMonth}%`,
          ),
        );
      const baseSeq: number = Number(existingCountRows[0]?.count ?? 0) + 1;

      const values: CommissionInsert[] = [];
      for (const order of foundOrders) {
        if (calculatedOrderIds.has(order.id)) {
          skipped += 1;
          continue;
        }
        const orderProjects: ProjectRow[] = projects.filter(
          (project: ProjectRow): boolean => project.orderId === order.id,
        );
        let cost: number = 0;
        for (const project of orderProjects) {
          cost += shootingCosts.get(project.id) ?? 0;
          cost += venueCosts.get(project.id) ?? 0;
          cost += outsourcingCosts.get(project.id) ?? 0;
        }
        const orderAmount: number = Number(order.totalAmount ?? 0);
        const profit: number = orderAmount - cost;
        const commissionAmount: number = round2((profit * rate) / 100);
        values.push({
          commissionNo: buildSeqNo(
            COMMISSION_NO_PREFIX,
            yearMonth,
            baseSeq + values.length,
          ),
          orderId: order.id,
          projectId: orderProjects.length > 0 ? orderProjects[0].id : null,
          salesperson: order.salesperson,
          projectManager: order.projectManager,
          orderAmount: String(orderAmount),
          costAmount: String(round2(cost)),
          profitAmount: String(round2(profit)),
          commissionRate: String(rate),
          commissionAmount: String(commissionAmount),
          status: PENDING_STATUS,
          period,
          calculatedBy: userId,
          calculatedAt: now,
        });
        created += 1;
      }
      if (values.length > 0) {
        await tx.insert(videoCommissions).values(values);
      }
    });

    this.logger.log(
      `提成计算完成: 创建 ${String(created)} 条，跳过 ${String(skipped)} 条`,
    );
    return { created, skipped };
  }

  /** 批量发放：仅 待发放 → 已发放；一条都不是 → 409 */
  async batchPay(ids: number[]): Promise<{ updated: number; skipped: number }> {
    let updated: number = 0;
    let skipped: number = 0;

    await this.db.transaction(async (tx) => {
      const rows: CommissionRow[] = await tx
        .select()
        .from(videoCommissions)
        .where(
          and(inArray(videoCommissions.id, ids), isNull(videoCommissions.deletedAt)),
        );
      const eligible: CommissionRow[] = rows.filter(
        (row: CommissionRow): boolean => row.status === PENDING_STATUS,
      );
      if (eligible.length === 0) {
        throw new ConflictException('没有待发放的提成记录');
      }
      skipped = rows.length - eligible.length;

      const now: Date = new Date();
      for (const row of eligible) {
        const updatedRows: { id: number }[] = await tx
          .update(videoCommissions)
          .set({ status: PAID_STATUS, paidAt: now, updatedAt: now })
          .where(
            and(
              eq(videoCommissions.id, row.id),
              eq(videoCommissions.status, PENDING_STATUS),
            ),
          )
          .returning({ id: videoCommissions.id });
        if (updatedRows.length > 0) {
          updated += 1;
        } else {
          skipped += 1;
        }
      }
    });

    this.logger.log(`提成批量发放完成: ${String(updated)} 条`);
    return { updated, skipped };
  }

  /** 取消：仅 待发放/已计算 → 已取消，否则 409 */
  async cancel(id: number): Promise<{ success: boolean }> {
    const rows: CommissionRow[] = await this.db
      .select()
      .from(videoCommissions)
      .where(
        and(eq(videoCommissions.id, id), isNull(videoCommissions.deletedAt)),
      );
    if (rows.length === 0) {
      throw new NotFoundException('提成记录不存在');
    }
    if (!CANCELLABLE_STATUSES.includes(rows[0].status)) {
      throw new ConflictException(
        `当前状态「${rows[0].status}」不允许取消，仅待发放/已计算可取消`,
      );
    }

    const updated: { id: number }[] = await this.db
      .update(videoCommissions)
      .set({ status: CANCELLED_STATUS, updatedAt: new Date() })
      .where(
        and(
          eq(videoCommissions.id, id),
          inArray(videoCommissions.status, CANCELLABLE_STATUSES),
        ),
      )
      .returning({ id: videoCommissions.id });
    if (updated.length === 0) {
      throw new ConflictException('提成状态已变更，请刷新后重试');
    }
    this.logger.log(`提成取消成功: ${String(id)}`);
    return { success: true };
  }

  /** 软删除 */
  async remove(id: number): Promise<{ success: boolean }> {
    const now: Date = new Date();
    const updated: { id: number }[] = await this.db
      .update(videoCommissions)
      .set({ deletedAt: now, updatedAt: now })
      .where(
        and(eq(videoCommissions.id, id), isNull(videoCommissions.deletedAt)),
      )
      .returning({ id: videoCommissions.id });
    if (updated.length === 0) {
      throw new NotFoundException('提成记录不存在');
    }
    return { success: true };
  }
}
