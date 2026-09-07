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
} from 'drizzle-orm';
import { videoOrders, videoProjects } from '@server/database/schema';
import type {
  CreateVideoCoreProjectRequest,
  UpdateVideoCoreProjectRequest,
  VideoCoreDeliverable,
  VideoCoreProject,
  VideoCoreProjectListParams,
  VideoCoreProjectListResult,
  VideoCoreProjectNode,
  VideoCoreProjectStatus,
} from '@shared/api.interface';
import { insertWithSeqNo } from '@server/modules/finance-core/fin-seq.util';
import {
  addDays,
  parseDateParam,
} from '@server/modules/finance-core/query.util';
import { publishSyncEvent } from '@server/modules/feishu-sync/sync-event.publisher';

type ProjectRow = typeof videoProjects.$inferSelect;
type ProjectInsert = typeof videoProjects.$inferInsert;
type OrderRow = typeof videoOrders.$inferSelect;

const PROJECT_NO_PREFIX: string = 'XM';
/** 允许关联项目创建的订单状态 */
const ORDER_STATUSES_FOR_PROJECT: string[] = [
  '已通过',
  '制作中',
  '已交付',
  '已完成',
];
/** 单向推进：筹备中 → 拍摄中 → 后期中 → 待审核 → 已交付 → 已完成 */
const PROJECT_STATUS_FLOW: Record<string, string> = {
  筹备中: '拍摄中',
  拍摄中: '后期中',
  后期中: '待审核',
  待审核: '已交付',
  已交付: '已完成',
};

@Injectable()
export class VideoProjectsService {
  private readonly logger: Logger = new Logger(VideoProjectsService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
  ) {}

  private parseJsonArray<T>(value: string | null): T[] {
    if (!value) {
      return [];
    }
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }

  private mapProject(row: ProjectRow, orderNo: string): VideoCoreProject {
    return {
      id: row.id,
      projectNo: row.projectNo,
      projectName: row.projectName,
      orderId: row.orderId,
      orderNo,
      customerName: row.customerName ?? '',
      projectType: row.projectType ?? '',
      status: row.status,
      projectManager: row.projectManager ?? '',
      teamMembers: this.parseJsonArray<string>(row.teamMembers ?? null),
      nodes: this.parseJsonArray<VideoCoreProjectNode>(row.nodes ?? null),
      deliverables: this.parseJsonArray<VideoCoreDeliverable>(
        row.deliverables ?? null,
      ),
      progress: row.progress,
      startDate: row.startDate ? row.startDate.toISOString() : '',
      endDate: row.endDate ? row.endDate.toISOString() : '',
      remark: row.remark ?? '',
      createdAt: row.createdAt.toISOString(),
    };
  }

  private async loadOrderNo(orderId: number | null): Promise<string> {
    if (orderId === null) {
      return '';
    }
    const rows: { orderNo: string }[] = await this.db
      .select({ orderNo: videoOrders.orderNo })
      .from(videoOrders)
      .where(
        and(eq(videoOrders.id, orderId), isNull(videoOrders.deletedAt)),
      );
    return rows.length > 0 ? rows[0].orderNo : '';
  }

  async findAll(
    params: VideoCoreProjectListParams,
  ): Promise<VideoCoreProjectListResult> {
    const page: number = Math.max(params.page ?? 1, 1);
    const pageSize: number = Math.min(Math.max(params.pageSize ?? 10, 1), 100);

    const conditions = [isNull(videoProjects.deletedAt)];
    if (params.projectNo) {
      conditions.push(
        ilike(videoProjects.projectNo, `%${params.projectNo}%`),
      );
    }
    if (params.projectName) {
      conditions.push(
        ilike(videoProjects.projectName, `%${params.projectName}%`),
      );
    }
    if (params.customerName) {
      conditions.push(
        ilike(videoProjects.customerName, `%${params.customerName}%`),
      );
    }
    if (params.status) {
      conditions.push(eq(videoProjects.status, params.status));
    }
    if (params.projectManager) {
      conditions.push(
        eq(videoProjects.projectManager, params.projectManager),
      );
    }
    if (params.startDate) {
      conditions.push(
        gte(videoProjects.startDate, parseDateParam(params.startDate)),
      );
    }
    if (params.endDate) {
      conditions.push(
        lt(
          videoProjects.startDate,
          addDays(parseDateParam(params.endDate), 1),
        ),
      );
    }
    const where = and(...conditions);

    const rows: { project: ProjectRow; orderNo: string | null }[] = await this.db
      .select({ project: videoProjects, orderNo: videoOrders.orderNo })
      .from(videoProjects)
      .leftJoin(
        videoOrders,
        and(
          eq(videoProjects.orderId, videoOrders.id),
          isNull(videoOrders.deletedAt),
        ),
      )
      .where(where)
      .orderBy(desc(videoProjects.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const totalResult: { count: number | string }[] = await this.db
      .select({ count: count() })
      .from(videoProjects)
      .where(where);
    const total: number = Number(totalResult[0]?.count ?? 0);

    const items: VideoCoreProject[] = rows.map(
      (row: { project: ProjectRow; orderNo: string | null }): VideoCoreProject =>
        this.mapProject(row.project, row.orderNo ?? ''),
    );
    return { items, total };
  }

  async detail(id: number): Promise<VideoCoreProject> {
    const rows: { project: ProjectRow; orderNo: string | null }[] = await this.db
      .select({ project: videoProjects, orderNo: videoOrders.orderNo })
      .from(videoProjects)
      .leftJoin(
        videoOrders,
        and(
          eq(videoProjects.orderId, videoOrders.id),
          isNull(videoOrders.deletedAt),
        ),
      )
      .where(and(eq(videoProjects.id, id), isNull(videoProjects.deletedAt)));
    if (rows.length === 0) {
      throw new NotFoundException('视频项目不存在');
    }
    return this.mapProject(rows[0].project, rows[0].orderNo ?? '');
  }

  async create(
    dto: CreateVideoCoreProjectRequest,
    userId: string,
  ): Promise<VideoCoreProject> {
    if (!dto.projectName || dto.projectName.trim().length === 0) {
      throw new BadRequestException('请填写项目名称');
    }
    let orderId: number | null = null;
    if (dto.orderId !== undefined && dto.orderId !== null) {
      const orderRows: OrderRow[] = await this.db
        .select()
        .from(videoOrders)
        .where(
          and(eq(videoOrders.id, dto.orderId), isNull(videoOrders.deletedAt)),
        );
      if (orderRows.length === 0) {
        throw new BadRequestException('关联的视频订单不存在');
      }
      if (!ORDER_STATUSES_FOR_PROJECT.includes(orderRows[0].status)) {
        throw new BadRequestException(
          `订单状态「${orderRows[0].status}」不允许创建项目`,
        );
      }
      orderId = dto.orderId;
    }

    const result = await insertWithSeqNo<ProjectRow>({
      db: this.db,
      table: videoProjects,
      noColumn: videoProjects.projectNo,
      prefix: PROJECT_NO_PREFIX,
      insert: (projectNo: string): Promise<ProjectRow[]> =>
        this.db
          .insert(videoProjects)
          .values({
            projectNo,
            projectName: dto.projectName.trim(),
            orderId,
            customerName: dto.customerName ?? '',
            projectType: dto.projectType ?? '',
            status: '筹备中',
            projectManager: dto.projectManager ?? '',
            teamMembers: JSON.stringify(dto.teamMembers ?? []),
            nodes: '[]',
            deliverables: '[]',
            progress: 0,
            startDate: dto.startDate ? parseDateParam(dto.startDate) : null,
            endDate: dto.endDate ? parseDateParam(dto.endDate) : null,
            remark: dto.remark ?? '',
          })
          .returning(),
    });
    this.logger.log(
      `视频项目创建成功: ${result.no}, 操作人: ${userId}`,
    );
    publishSyncEvent('video_projects', result.row.id, 'create');
    const orderNo: string = await this.loadOrderNo(orderId);
    return this.mapProject(result.row, orderNo);
  }

  /** 编辑基础字段（含 teamMembers） */
  async update(
    id: number,
    dto: UpdateVideoCoreProjectRequest,
    userId: string,
  ): Promise<{ success: boolean }> {
    const patch: Partial<ProjectInsert> = {};
    if (dto.projectName !== undefined) patch.projectName = dto.projectName;
    if (dto.customerName !== undefined) patch.customerName = dto.customerName;
    if (dto.projectType !== undefined) patch.projectType = dto.projectType;
    if (dto.projectManager !== undefined) {
      patch.projectManager = dto.projectManager;
    }
    if (dto.teamMembers !== undefined) {
      patch.teamMembers = JSON.stringify(dto.teamMembers);
    }
    if (dto.startDate !== undefined) {
      patch.startDate = parseDateParam(dto.startDate);
    }
    if (dto.endDate !== undefined) {
      patch.endDate = parseDateParam(dto.endDate);
    }
    if (dto.remark !== undefined) patch.remark = dto.remark;
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }
    patch.updatedAt = new Date();

    const updated: { id: number }[] = await this.db
      .update(videoProjects)
      .set(patch)
      .where(and(eq(videoProjects.id, id), isNull(videoProjects.deletedAt)))
      .returning({ id: videoProjects.id });
    if (updated.length === 0) {
      throw new NotFoundException('视频项目不存在');
    }
    this.logger.log(`视频项目更新: ${String(id)}, 操作人: ${userId}`);
    publishSyncEvent('video_projects', id, 'update');
    return { success: true };
  }

  /** 整体替换节点，并按已完成节点占比重算 progress */
  async updateNodes(
    id: number,
    nodes: VideoCoreProjectNode[],
    userId: string,
  ): Promise<VideoCoreProject> {
    const total: number = nodes.length;
    const done: number = nodes.filter(
      (node: VideoCoreProjectNode): boolean => node.status === '已完成',
    ).length;
    const progress: number =
      total === 0 ? 0 : Math.round((done / total) * 100);

    const updated: ProjectRow[] = await this.db
      .update(videoProjects)
      .set({
        nodes: JSON.stringify(nodes),
        progress,
        updatedAt: new Date(),
      })
      .where(and(eq(videoProjects.id, id), isNull(videoProjects.deletedAt)))
      .returning();
    if (updated.length === 0) {
      throw new NotFoundException('视频项目不存在');
    }
    this.logger.log(
      `视频项目节点更新: ${String(id)}, progress=${String(progress)}, 操作人: ${userId}`,
    );
    publishSyncEvent('video_projects', id, 'update');
    const orderNo: string = await this.loadOrderNo(updated[0].orderId);
    return this.mapProject(updated[0], orderNo);
  }

  /** 整体替换交付物 */
  async updateDeliverables(
    id: number,
    deliverables: VideoCoreDeliverable[],
    userId: string,
  ): Promise<VideoCoreProject> {
    const updated: ProjectRow[] = await this.db
      .update(videoProjects)
      .set({
        deliverables: JSON.stringify(deliverables),
        updatedAt: new Date(),
      })
      .where(and(eq(videoProjects.id, id), isNull(videoProjects.deletedAt)))
      .returning();
    if (updated.length === 0) {
      throw new NotFoundException('视频项目不存在');
    }
    this.logger.log(
      `视频项目交付物更新: ${String(id)}, 操作人: ${userId}`,
    );
    publishSyncEvent('video_projects', id, 'update');
    const orderNo: string = await this.loadOrderNo(updated[0].orderId);
    return this.mapProject(updated[0], orderNo);
  }

  /** 单向推进：筹备中 → 拍摄中 → 后期中 → 待审核 → 已交付 → 已完成 */
  async updateStatus(
    id: number,
    status: VideoCoreProjectStatus,
    userId: string,
  ): Promise<{ success: boolean }> {
    const rows: ProjectRow[] = await this.db
      .select()
      .from(videoProjects)
      .where(
        and(eq(videoProjects.id, id), isNull(videoProjects.deletedAt)),
      );
    if (rows.length === 0) {
      throw new NotFoundException('视频项目不存在');
    }
    const current: string = rows[0].status;
    if (PROJECT_STATUS_FLOW[current] !== status) {
      throw new ConflictException(
        `状态不允许从「${current}」变更为「${status}」`,
      );
    }
    const updated: { id: number }[] = await this.db
      .update(videoProjects)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(videoProjects.id, id), isNull(videoProjects.deletedAt)))
      .returning({ id: videoProjects.id });
    if (updated.length === 0) {
      throw new NotFoundException('视频项目不存在');
    }
    this.logger.log(
      `视频项目状态推进: ${String(id)} → ${status}, 操作人: ${userId}`,
    );
    publishSyncEvent('video_projects', id, 'update');
    return { success: true };
  }

  async remove(id: number, userId: string): Promise<{ success: boolean }> {
    const updated: { id: number }[] = await this.db
      .update(videoProjects)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(videoProjects.id, id), isNull(videoProjects.deletedAt)))
      .returning({ id: videoProjects.id });
    if (updated.length === 0) {
      throw new NotFoundException('视频项目不存在');
    }
    this.logger.log(`视频项目删除: ${String(id)}, 操作人: ${userId}`);
    publishSyncEvent('video_projects', id, 'delete');
    return { success: true };
  }
}
