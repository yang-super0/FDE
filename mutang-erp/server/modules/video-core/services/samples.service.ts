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
import { and, count, desc, eq, gte, ilike, inArray, isNull, lt } from 'drizzle-orm';
import {
  samples,
  videoOrders,
  videoProjects,
} from '@server/database/schema';
import type {
  BatchMailSamplesRequest,
  CreateSampleRequest,
  MailSampleRequest,
  ReturnSampleRequest,
  Sample,
  SampleListParams,
  SampleListResult,
  SampleMarkRequest,
  UpdateSampleRequest,
} from '@shared/api.interface';
import { insertWithSeqNo } from '@server/modules/finance-core/fin-seq.util';
import { addDays, parseDateParam } from '@server/modules/finance-core/query.util';

type SampleRow = typeof samples.$inferSelect;

type DbExecutor = Pick<PostgresJsDatabase, 'select'>;

const SAMPLE_NO_PREFIX: string = 'YP';

const PENDING_MAIL_STATUS: string = '待邮寄';
const MAILED_STATUS: string = '已邮寄';
const RECEIVED_STATUS: string = '已接收';
const SHOOTING_STATUS: string = '拍摄中';
const RETURNED_STATUS: string = '已归还';
const LOST_STATUS: string = '已丢失';
const CONSUMED_STATUS: string = '已消耗';

/** 可归还 / 可标记丢失消耗的来源状态 */
const RETURNABLE_STATUSES: string[] = [RECEIVED_STATUS, SHOOTING_STATUS];
const MARKABLE_STATUSES: string[] = [RECEIVED_STATUS, SHOOTING_STATUS];

interface SampleJoinRow {
  row: SampleRow;
  projectNo: string | null;
  orderNo: string | null;
}

@Injectable()
export class VideoSamplesService {
  private readonly logger: Logger = new Logger(VideoSamplesService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
  ) {}

  private mapSample(item: SampleJoinRow): Sample {
    const row: SampleRow = item.row;
    return {
      id: row.id,
      sampleNo: row.sampleNo,
      projectId: row.projectId,
      projectNo: item.projectNo ?? '',
      orderId: row.orderId,
      orderNo: item.orderNo ?? '',
      customerName: row.customerName ?? '',
      productName: row.productName,
      productModel: row.productModel ?? '',
      quantity: row.quantity ?? 0,
      unit: row.unit ?? '',
      status: row.status,
      sender: row.sender ?? '',
      senderPhone: row.senderPhone ?? '',
      senderAddress: row.senderAddress ?? '',
      receiver: row.receiver ?? '',
      receiverPhone: row.receiverPhone ?? '',
      receiverAddress: row.receiverAddress ?? '',
      expressCompany: row.expressCompany ?? '',
      expressNo: row.expressNo ?? '',
      mailedAt: row.mailedAt ? row.mailedAt.toISOString() : '',
      receivedAt: row.receivedAt ? row.receivedAt.toISOString() : '',
      returnedAt: row.returnedAt ? row.returnedAt.toISOString() : '',
      returnExpressNo: row.returnExpressNo ?? '',
      remark: row.remark ?? '',
      createdAt: row.createdAt.toISOString(),
    };
  }

  private async loadJoinRow(id: number): Promise<SampleJoinRow> {
    const rows: SampleJoinRow[] = await this.db
      .select({
        row: samples,
        projectNo: videoProjects.projectNo,
        orderNo: videoOrders.orderNo,
      })
      .from(samples)
      .leftJoin(
        videoProjects,
        and(eq(samples.projectId, videoProjects.id), isNull(videoProjects.deletedAt)),
      )
      .leftJoin(
        videoOrders,
        and(eq(samples.orderId, videoOrders.id), isNull(videoOrders.deletedAt)),
      )
      .where(and(eq(samples.id, id), isNull(samples.deletedAt)));
    if (rows.length === 0) {
      throw new NotFoundException('样品不存在');
    }
    return rows[0];
  }

  async findAll(params: SampleListParams): Promise<SampleListResult> {
    const page: number = Math.max(params.page ?? 1, 1);
    const pageSize: number = Math.min(Math.max(params.pageSize ?? 20, 1), 50);

    const conditions = [isNull(samples.deletedAt)];
    if (params.sampleNo) {
      conditions.push(ilike(samples.sampleNo, `%${params.sampleNo}%`));
    }
    if (params.productName) {
      conditions.push(ilike(samples.productName, `%${params.productName}%`));
    }
    if (params.customerName) {
      conditions.push(ilike(samples.customerName, `%${params.customerName}%`));
    }
    if (params.status) {
      conditions.push(eq(samples.status, params.status));
    }
    if (params.startDate) {
      conditions.push(gte(samples.mailedAt, parseDateParam(params.startDate)));
    }
    if (params.endDate) {
      conditions.push(
        lt(samples.mailedAt, addDays(parseDateParam(params.endDate), 1)),
      );
    }
    const where = and(...conditions);

    const rows: SampleJoinRow[] = await this.db
      .select({
        row: samples,
        projectNo: videoProjects.projectNo,
        orderNo: videoOrders.orderNo,
      })
      .from(samples)
      .leftJoin(
        videoProjects,
        and(eq(samples.projectId, videoProjects.id), isNull(videoProjects.deletedAt)),
      )
      .leftJoin(
        videoOrders,
        and(eq(samples.orderId, videoOrders.id), isNull(videoOrders.deletedAt)),
      )
      .where(where)
      .orderBy(desc(samples.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const totalResult: { count: number | string }[] = await this.db
      .select({ count: count() })
      .from(samples)
      .where(where);
    const total: number = Number(totalResult[0]?.count ?? 0);

    return { items: rows.map((item: SampleJoinRow): Sample => this.mapSample(item)), total };
  }

  async detail(id: number): Promise<Sample> {
    return this.mapSample(await this.loadJoinRow(id));
  }

  async create(dto: CreateSampleRequest): Promise<Sample> {
    if (!dto.productName || dto.productName.trim().length === 0) {
      throw new BadRequestException('请填写产品名称');
    }

    const result = await insertWithSeqNo<SampleRow>({
      db: this.db,
      table: samples,
      noColumn: samples.sampleNo,
      prefix: SAMPLE_NO_PREFIX,
      insert: (sampleNo: string): Promise<SampleRow[]> =>
        this.db
          .insert(samples)
          .values({
            sampleNo,
            projectId: dto.projectId ?? null,
            orderId: dto.orderId ?? null,
            customerName: dto.customerName ?? '',
            productName: dto.productName.trim(),
            productModel: dto.productModel ?? '',
            quantity: dto.quantity ?? 1,
            unit: dto.unit ?? '件',
            status: PENDING_MAIL_STATUS,
            sender: dto.sender ?? '',
            senderPhone: dto.senderPhone ?? '',
            senderAddress: dto.senderAddress ?? '',
            receiver: dto.receiver ?? '',
            receiverPhone: dto.receiverPhone ?? '',
            receiverAddress: dto.receiverAddress ?? '',
            remark: dto.remark ?? '',
          })
          .returning(),
    });
    this.logger.log(`样品创建成功: ${result.no}`);
    return this.mapSample(await this.loadJoinRow(result.row.id));
  }

  async update(
    id: number,
    dto: UpdateSampleRequest,
  ): Promise<{ success: boolean }> {
    const patch: Partial<typeof samples.$inferInsert> = {};
    if (dto.productName !== undefined) {
      if (!dto.productName || dto.productName.trim().length === 0) {
        throw new BadRequestException('请填写产品名称');
      }
      patch.productName = dto.productName.trim();
    }
    if (dto.productModel !== undefined) patch.productModel = dto.productModel;
    if (dto.quantity !== undefined) patch.quantity = dto.quantity;
    if (dto.unit !== undefined) patch.unit = dto.unit;
    if (dto.customerName !== undefined) patch.customerName = dto.customerName;
    if (dto.sender !== undefined) patch.sender = dto.sender;
    if (dto.senderPhone !== undefined) patch.senderPhone = dto.senderPhone;
    if (dto.senderAddress !== undefined) patch.senderAddress = dto.senderAddress;
    if (dto.receiver !== undefined) patch.receiver = dto.receiver;
    if (dto.receiverPhone !== undefined) patch.receiverPhone = dto.receiverPhone;
    if (dto.receiverAddress !== undefined) {
      patch.receiverAddress = dto.receiverAddress;
    }
    if (dto.remark !== undefined) patch.remark = dto.remark;
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }
    patch.updatedAt = new Date();

    return this.db.transaction(async (tx) => {
      const rows: SampleRow[] = await tx
        .select()
        .from(samples)
        .where(and(eq(samples.id, id), isNull(samples.deletedAt)));
      if (rows.length === 0) {
        throw new NotFoundException('样品不存在');
      }
      if (rows[0].status !== PENDING_MAIL_STATUS) {
        throw new ConflictException('仅待邮寄状态的样品可编辑');
      }
      const updated: SampleRow[] = await tx
        .update(samples)
        .set(patch)
        .where(and(eq(samples.id, id), isNull(samples.deletedAt)))
        .returning();
      if (updated.length === 0) {
        throw new NotFoundException('样品不存在');
      }
      return { success: true };
    });
  }

  async batchMail(
    dto: BatchMailSamplesRequest,
  ): Promise<{ updated: number; skipped: number }> {
    const expressCompany: string = (dto.expressCompany ?? '').trim();
    const expressNo: string = (dto.expressNo ?? '').trim();
    if (expressCompany.length === 0) {
      throw new BadRequestException('请填写快递公司');
    }
    if (expressNo.length === 0) {
      throw new BadRequestException('请填写快递单号');
    }

    return this.db.transaction(async (tx) => {
      const rows: SampleRow[] = await tx
        .select()
        .from(samples)
        .where(and(inArray(samples.id, dto.ids), isNull(samples.deletedAt)));
      const eligibleIds: number[] = rows
        .filter((row: SampleRow): boolean => row.status === PENDING_MAIL_STATUS)
        .map((row: SampleRow): number => row.id);
      if (eligibleIds.length === 0) {
        throw new ConflictException('没有待邮寄状态的样品可批量邮寄');
      }
      await tx
        .update(samples)
        .set({
          status: MAILED_STATUS,
          expressCompany,
          expressNo,
          mailedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(inArray(samples.id, eligibleIds));
      return {
        updated: eligibleIds.length,
        skipped: rows.length - eligibleIds.length,
      };
    });
  }

  /** 读取并校验样品存在 + 状态流转合法性 */
  private async requireStatus(
    id: number,
    allowedStatuses: string[],
    executor: DbExecutor = this.db,
  ): Promise<SampleRow> {
    const rows: SampleRow[] = await executor
      .select()
      .from(samples)
      .where(and(eq(samples.id, id), isNull(samples.deletedAt)));
    if (rows.length === 0) {
      throw new NotFoundException('样品不存在');
    }
    if (!allowedStatuses.includes(rows[0].status)) {
      throw new ConflictException(
        `当前状态「${rows[0].status}」不允许该操作`,
      );
    }
    return rows[0];
  }

  async mail(id: number, dto: MailSampleRequest): Promise<Sample> {
    const expressCompany: string = (dto.expressCompany ?? '').trim();
    const expressNo: string = (dto.expressNo ?? '').trim();
    if (expressCompany.length === 0) {
      throw new BadRequestException('请填写快递公司');
    }
    if (expressNo.length === 0) {
      throw new BadRequestException('请填写快递单号');
    }

    await this.db.transaction(async (tx) => {
      await this.requireStatus(id, [PENDING_MAIL_STATUS], tx);
      const updated: SampleRow[] = await tx
        .update(samples)
        .set({
          status: MAILED_STATUS,
          expressCompany,
          expressNo,
          mailedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(eq(samples.id, id), isNull(samples.deletedAt)))
        .returning();
      if (updated.length === 0) {
        throw new NotFoundException('样品不存在');
      }
      return updated[0];
    });
    return this.detail(id);
  }

  async receive(id: number): Promise<Sample> {
    await this.db.transaction(async (tx) => {
      await this.requireStatus(id, [MAILED_STATUS], tx);
      const updated: SampleRow[] = await tx
        .update(samples)
        .set({
          status: RECEIVED_STATUS,
          receivedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(eq(samples.id, id), isNull(samples.deletedAt)))
        .returning();
      if (updated.length === 0) {
        throw new NotFoundException('样品不存在');
      }
      return updated[0];
    });
    return this.detail(id);
  }

  async shooting(id: number): Promise<Sample> {
    await this.db.transaction(async (tx) => {
      await this.requireStatus(id, [RECEIVED_STATUS], tx);
      const updated: SampleRow[] = await tx
        .update(samples)
        .set({ status: SHOOTING_STATUS, updatedAt: new Date() })
        .where(and(eq(samples.id, id), isNull(samples.deletedAt)))
        .returning();
      if (updated.length === 0) {
        throw new NotFoundException('样品不存在');
      }
      return updated[0];
    });
    return this.detail(id);
  }

  async returnSample(id: number, dto: ReturnSampleRequest): Promise<Sample> {
    const returnExpressNo: string = (dto.returnExpressNo ?? '').trim();
    if (returnExpressNo.length === 0) {
      throw new BadRequestException('请填写归还快递单号');
    }

    await this.db.transaction(async (tx) => {
      await this.requireStatus(id, RETURNABLE_STATUSES, tx);
      const updated: SampleRow[] = await tx
        .update(samples)
        .set({
          status: RETURNED_STATUS,
          returnedAt: new Date(),
          returnExpressNo,
          updatedAt: new Date(),
        })
        .where(and(eq(samples.id, id), isNull(samples.deletedAt)))
        .returning();
      if (updated.length === 0) {
        throw new NotFoundException('样品不存在');
      }
      return updated[0];
    });
    return this.detail(id);
  }

  async mark(id: number, dto: SampleMarkRequest): Promise<Sample> {
    await this.db.transaction(async (tx) => {
      await this.requireStatus(id, MARKABLE_STATUSES, tx);
      const updated: SampleRow[] = await tx
        .update(samples)
        .set({
          status: dto.status === LOST_STATUS ? LOST_STATUS : CONSUMED_STATUS,
          updatedAt: new Date(),
        })
        .where(and(eq(samples.id, id), isNull(samples.deletedAt)))
        .returning();
      if (updated.length === 0) {
        throw new NotFoundException('样品不存在');
      }
      return updated[0];
    });
    return this.detail(id);
  }

  async remove(id: number): Promise<{ success: boolean }> {
    const updated: { id: number }[] = await this.db
      .update(samples)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(samples.id, id), isNull(samples.deletedAt)))
      .returning({ id: samples.id });
    if (updated.length === 0) {
      throw new NotFoundException('样品不存在');
    }
    return { success: true };
  }
}
