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
} from 'drizzle-orm';
import { videoOrders, videoProjects } from '@server/database/schema';
import type {
  CreateVideoOrderRequest,
  UpdateVideoOrderRequest,
  VideoApproveRequest,
  VideoOrder,
  VideoOrderListParams,
  VideoOrderListResult,
  VideoOrderStatusRequest,
} from '@shared/api.interface';
import { insertWithSeqNo } from '@server/modules/finance-core/fin-seq.util';
import {
  addDays,
  parseDateParam,
  round2,
} from '@server/modules/finance-core/query.util';
import { publishSyncEvent } from '@server/modules/feishu-sync/sync-event.publisher';

type OrderRow = typeof videoOrders.$inferSelect;
type OrderInsert = typeof videoOrders.$inferInsert;

const ORDER_NO_PREFIX: string = 'SP';
const PENDING_STATUS: string = '待审核';
const APPROVED_STATUS: string = '已通过';
const REJECTED_STATUS: string = '已驳回';
/** 仅 待审核/已驳回 状态可编辑 */
const EDITABLE_STATUSES: string[] = [PENDING_STATUS, REJECTED_STATUS];
/** 单向推进：已通过 → 制作中 → 已交付 → 已完成 */
const STATUS_FLOW: Record<string, string> = {
  [APPROVED_STATUS]: '制作中',
  制作中: '已交付',
  已交付: '已完成',
};

@Injectable()
export class VideoOrdersService {
  private readonly logger: Logger = new Logger(VideoOrdersService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
  ) {}

  private mapOrder(row: OrderRow): VideoOrder {
    return {
      id: row.id,
      orderNo: row.orderNo,
      groupName: row.groupName,
      subjectName: row.subjectName ?? '',
      videoType: row.videoType ?? '',
      quantity: row.quantity ?? 0,
      unitPrice: Number(row.unitPrice ?? 0),
      totalAmount: Number(row.totalAmount ?? 0),
      status: row.status,
      salesperson: row.salesperson ?? '',
      projectManager: row.projectManager ?? '',
      orderDate: row.orderDate ? row.orderDate.toISOString() : '',
      deliveryDate: row.deliveryDate ? row.deliveryDate.toISOString() : '',
      rejectReason: row.rejectReason ?? '',
      remark: row.remark ?? '',
      createdAt: row.createdAt.toISOString(),
    };
  }

  async findAll(
    params: VideoOrderListParams,
  ): Promise<VideoOrderListResult> {
    const page: number = Math.max(params.page ?? 1, 1);
    const pageSize: number = Math.min(Math.max(params.pageSize ?? 10, 1), 100);

    const conditions = [isNull(videoOrders.deletedAt)];
    if (params.orderNo) {
      conditions.push(ilike(videoOrders.orderNo, `%${params.orderNo}%`));
    }
    if (params.groupName) {
      conditions.push(ilike(videoOrders.groupName, `%${params.groupName}%`));
    }
    if (params.subjectName) {
      conditions.push(ilike(videoOrders.subjectName, `%${params.subjectName}%`));
    }
    if (params.videoType) {
      conditions.push(eq(videoOrders.videoType, params.videoType));
    }
    if (params.status) {
      conditions.push(eq(videoOrders.status, params.status));
    }
    if (params.startDate) {
      conditions.push(
        gte(videoOrders.orderDate, parseDateParam(params.startDate)),
      );
    }
    if (params.endDate) {
      conditions.push(
        lt(
          videoOrders.orderDate,
          addDays(parseDateParam(params.endDate), 1),
        ),
      );
    }
    const where = and(...conditions);

    const rows: OrderRow[] = await this.db
      .select()
      .from(videoOrders)
      .where(where)
      .orderBy(desc(videoOrders.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const totalResult: { count: number | string }[] = await this.db
      .select({ count: count() })
      .from(videoOrders)
      .where(where);
    const total: number = Number(totalResult[0]?.count ?? 0);

    return { items: rows.map((row: OrderRow): VideoOrder => this.mapOrder(row)), total };
  }

  async detail(id: number): Promise<VideoOrder> {
    const rows: OrderRow[] = await this.db
      .select()
      .from(videoOrders)
      .where(and(eq(videoOrders.id, id), isNull(videoOrders.deletedAt)));
    if (rows.length === 0) {
      throw new NotFoundException('视频订单不存在');
    }
    return this.mapOrder(rows[0]);
  }

  async create(
    dto: CreateVideoOrderRequest,
    userId: string,
  ): Promise<VideoOrder> {
    if (!dto.groupName || dto.groupName.trim().length === 0) {
      throw new BadRequestException('请填写集团名称');
    }
    const quantity: number = dto.quantity ?? 1;
    const unitPrice: number = dto.unitPrice ?? 0;
    const totalAmount: number =
      dto.totalAmount !== undefined && dto.totalAmount !== null
        ? dto.totalAmount
        : round2(quantity * unitPrice);

    const result = await insertWithSeqNo<OrderRow>({
      db: this.db,
      table: videoOrders,
      noColumn: videoOrders.orderNo,
      prefix: ORDER_NO_PREFIX,
      insert: (orderNo: string): Promise<OrderRow[]> =>
        this.db
          .insert(videoOrders)
          .values({
            orderNo,
            groupName: dto.groupName.trim(),
            subjectName: dto.subjectName ?? '',
            videoType: dto.videoType ?? '产品展示',
            quantity,
            unitPrice: String(unitPrice),
            totalAmount: String(totalAmount),
            status: PENDING_STATUS,
            salesperson: dto.salesperson ?? '',
            projectManager: dto.projectManager ?? '',
            orderDate: dto.orderDate
              ? parseDateParam(dto.orderDate)
              : new Date(),
            deliveryDate: dto.deliveryDate
              ? parseDateParam(dto.deliveryDate)
              : null,
            remark: dto.remark ?? '',
          })
          .returning(),
    });
    this.logger.log(
      `视频订单创建成功: ${result.no}, 操作人: ${userId}`,
    );
    publishSyncEvent('video_orders', result.row.id, 'create');
    return this.mapOrder(result.row);
  }

  /** 仅 待审核/已驳回 状态可编辑 */
  async update(
    id: number,
    dto: UpdateVideoOrderRequest,
    userId: string,
  ): Promise<{ success: boolean }> {
    const rows: OrderRow[] = await this.db
      .select()
      .from(videoOrders)
      .where(and(eq(videoOrders.id, id), isNull(videoOrders.deletedAt)));
    if (rows.length === 0) {
      throw new NotFoundException('视频订单不存在');
    }
    if (!EDITABLE_STATUSES.includes(rows[0].status)) {
      throw new ConflictException('当前状态不允许编辑视频订单');
    }

    const patch: Partial<OrderInsert> = {};
    if (dto.groupName !== undefined) patch.groupName = dto.groupName;
    if (dto.subjectName !== undefined) patch.subjectName = dto.subjectName;
    if (dto.videoType !== undefined) patch.videoType = dto.videoType;
    if (dto.quantity !== undefined) patch.quantity = dto.quantity;
    if (dto.unitPrice !== undefined) patch.unitPrice = String(dto.unitPrice);
    if (dto.totalAmount !== undefined) {
      patch.totalAmount = String(dto.totalAmount);
    }
    if (dto.salesperson !== undefined) patch.salesperson = dto.salesperson;
    if (dto.projectManager !== undefined) {
      patch.projectManager = dto.projectManager;
    }
    if (dto.orderDate !== undefined) {
      patch.orderDate = parseDateParam(dto.orderDate);
    }
    if (dto.deliveryDate !== undefined) {
      patch.deliveryDate = parseDateParam(dto.deliveryDate);
    }
    if (dto.remark !== undefined) patch.remark = dto.remark;
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }
    patch.updatedAt = new Date();

    const updated: { id: number }[] = await this.db
      .update(videoOrders)
      .set(patch)
      .where(and(eq(videoOrders.id, id), isNull(videoOrders.deletedAt)))
      .returning({ id: videoOrders.id });
    if (updated.length === 0) {
      throw new NotFoundException('视频订单不存在');
    }
    this.logger.log(`视频订单更新: ${String(id)}, 操作人: ${userId}`);
    publishSyncEvent('video_orders', id, 'update');
    return { success: true };
  }

  /** 批量审核：eligible = 状态为待审核且未删除的记录 */
  async batchApprove(
    ids: number[],
    dto: VideoApproveRequest,
    userId: string,
  ): Promise<{ updated: number; skipped: number }> {
    if (!dto.approved && (!dto.rejectReason || dto.rejectReason.trim().length === 0)) {
      throw new BadRequestException('驳回时必须填写驳回原因');
    }
    const eligibleRows: { id: number }[] = await this.db
      .select({ id: videoOrders.id })
      .from(videoOrders)
      .where(
        and(
          inArray(videoOrders.id, ids),
          eq(videoOrders.status, PENDING_STATUS),
          isNull(videoOrders.deletedAt),
        ),
      );
    if (eligibleRows.length === 0) {
      throw new ConflictException('所选订单中没有待审核状态的记录');
    }
    const eligibleIds: number[] = eligibleRows.map(
      (row: { id: number }): number => row.id,
    );

    const updatedIds: number[] = [];
    const updated: number = await this.db.transaction(
      async (tx): Promise<number> => {
        const rows: { id: number }[] = await tx
          .update(videoOrders)
          .set({
            status: dto.approved ? APPROVED_STATUS : REJECTED_STATUS,
            rejectReason: dto.approved ? null : dto.rejectReason ?? '',
            updatedAt: new Date(),
          })
          .where(inArray(videoOrders.id, eligibleIds))
          .returning({ id: videoOrders.id });
        updatedIds.push(
          ...rows.map((row: { id: number }): number => row.id),
        );
        return rows.length;
      },
    );
    for (const updatedId of updatedIds) {
      publishSyncEvent('video_orders', updatedId, 'update');
    }
    this.logger.log(
      `视频订单批量审核: 更新 ${String(updated)} 条, 操作人: ${userId}`,
    );
    return { updated, skipped: ids.length - updated };
  }

  /** 单向推进：已通过 → 制作中 → 已交付 → 已完成 */
  async updateStatus(
    id: number,
    dto: VideoOrderStatusRequest,
    userId: string,
  ): Promise<{ success: boolean }> {
    const rows: OrderRow[] = await this.db
      .select()
      .from(videoOrders)
      .where(and(eq(videoOrders.id, id), isNull(videoOrders.deletedAt)));
    if (rows.length === 0) {
      throw new NotFoundException('视频订单不存在');
    }
    const current: string = rows[0].status;
    if (STATUS_FLOW[current] !== dto.status) {
      throw new ConflictException(
        `状态不允许从「${current}」变更为「${dto.status}」`,
      );
    }
    const updated: { id: number }[] = await this.db
      .update(videoOrders)
      .set({ status: dto.status, updatedAt: new Date() })
      .where(and(eq(videoOrders.id, id), isNull(videoOrders.deletedAt)))
      .returning({ id: videoOrders.id });
    if (updated.length === 0) {
      throw new NotFoundException('视频订单不存在');
    }
    this.logger.log(
      `视频订单状态推进: ${String(id)} → ${dto.status}, 操作人: ${userId}`,
    );
    publishSyncEvent('video_orders', id, 'update');
    return { success: true };
  }

  async remove(id: number, userId: string): Promise<{ success: boolean }> {
    const projectRows: { id: number }[] = await this.db
      .select({ id: videoProjects.id })
      .from(videoProjects)
      .where(
        and(
          eq(videoProjects.orderId, id),
          isNull(videoProjects.deletedAt),
        ),
      );
    if (projectRows.length > 0) {
      throw new ConflictException('该订单有关联项目，无法删除');
    }
    const updated: { id: number }[] = await this.db
      .update(videoOrders)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(videoOrders.id, id), isNull(videoOrders.deletedAt)))
      .returning({ id: videoOrders.id });
    if (updated.length === 0) {
      throw new NotFoundException('视频订单不存在');
    }
    this.logger.log(`视频订单删除: ${String(id)}, 操作人: ${userId}`);
    publishSyncEvent('video_orders', id, 'delete');
    return { success: true };
  }
}
