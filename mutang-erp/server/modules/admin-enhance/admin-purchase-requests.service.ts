import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { and, count, desc, eq, ilike, inArray, isNull, or, type SQL } from 'drizzle-orm';
import { adminPurchaseRequests } from '@server/database/schema';
import type {
  AdminEnhanceApproveDto,
  AdminEnhanceListResponse,
  AdminPurchaseRequest,
  CreateAdminPurchaseRequestDto,
  UpdateAdminPurchaseRequestDto,
} from '@shared/api.interface';
import { insertWithSeqNo } from '../finance-core/fin-seq.util';
import { MessageNotificationService } from '../message-notification/message-notification.service';
import { parseIdList } from '../finance-core/query.util';
import {
  assertAdminPositiveInt,
  assertAdminPositiveNumber,
  assertAdminRequired,
  formatAdminDateTime,
  resolveAdminPagination,
} from './admin-enhance-shared.util';

type RequestRow = typeof adminPurchaseRequests.$inferSelect;
type RequestInsert = typeof adminPurchaseRequests.$inferInsert;
type RequestStrKey = 'applicant' | 'department' | 'itemName' | 'unit' | 'reason';

const REQUEST_NO_PREFIX: string = 'CGSQ';
const STATUS_PENDING: string = '待审批';
const STATUS_APPROVED: string = '已通过';
const STATUS_REJECTED: string = '已驳回';
const STATUS_CANCELLED: string = '已取消';
const ITEM_TYPES: string[] = ['办公用品', '电子设备', '耗材', '其他'];
const CANCELLABLE_STATUSES: string[] = [STATUS_PENDING, STATUS_APPROVED];
const DELETABLE_STATUSES: string[] = [STATUS_PENDING, STATUS_REJECTED, STATUS_CANCELLED];
const ITEM_TYPE_ERROR: string = '物品类型必须为 办公用品/电子设备/耗材/其他';

const aliveCond = (id: number): SQL | undefined =>
  and(eq(adminPurchaseRequests.id, id), isNull(adminPurchaseRequests.deletedAt));

function mapRequest(row: RequestRow): AdminPurchaseRequest {
  return {
    id: row.id,
    requestNo: row.requestNo,
    applicant: row.applicant,
    department: row.department,
    itemName: row.itemName,
    itemType: row.itemType,
    quantity: row.quantity,
    unit: row.unit,
    estimatedPrice: Number(row.estimatedPrice),
    totalPrice: Number(row.totalPrice),
    reason: row.reason,
    status: row.status,
    approver: row.approver,
    approveTime: formatAdminDateTime(row.approveTime),
    approveRemark: row.approveRemark,
    createdAt: formatAdminDateTime(row.createdAt) ?? '',
    updatedAt: formatAdminDateTime(row.updatedAt) ?? '',
  };
}

/** 仅当字段提供时写入必填字符串（undefined 跳过，空白 → 400） */
function setRequiredString(
  patch: Partial<RequestInsert>,
  key: RequestStrKey,
  value: unknown,
  label: string,
): void {
  if (value === undefined) return;
  assertAdminRequired(value, label);
  patch[key] = String(value).trim();
}

@Injectable()
export class AdminPurchaseRequestsService {
  private readonly logger = new Logger(AdminPurchaseRequestsService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
    private readonly messageNotificationService: MessageNotificationService,
  ) {}

  async list(params: {
    status?: string;
    department?: string;
    itemType?: string;
    keyword?: string;
    page?: string;
    pageSize?: string;
  }): Promise<AdminEnhanceListResponse<AdminPurchaseRequest>> {
    const { page, pageSize, offset } = resolveAdminPagination(params.page, params.pageSize);
    const conditions: SQL[] = [isNull(adminPurchaseRequests.deletedAt)];
    if (params.status) {
      conditions.push(eq(adminPurchaseRequests.status, params.status));
    }
    if (params.department) {
      conditions.push(eq(adminPurchaseRequests.department, params.department));
    }
    if (params.itemType) {
      conditions.push(eq(adminPurchaseRequests.itemType, params.itemType));
    }
    if (params.keyword) {
      const kw: string = `%${params.keyword}%`;
      const keywordFilter = or(
        ilike(adminPurchaseRequests.requestNo, kw),
        ilike(adminPurchaseRequests.itemName, kw),
        ilike(adminPurchaseRequests.applicant, kw),
      );
      if (keywordFilter) conditions.push(keywordFilter);
    }
    const where = and(...conditions);
    const totalRows: { count: number | string }[] = await this.db
      .select({ count: count() })
      .from(adminPurchaseRequests)
      .where(where);
    const rows: RequestRow[] = await this.db
      .select()
      .from(adminPurchaseRequests)
      .where(where)
      .orderBy(desc(adminPurchaseRequests.id))
      .limit(pageSize)
      .offset(offset);
    return {
      items: rows.map((row: RequestRow) => mapRequest(row)),
      total: Number(totalRows[0]?.count ?? 0),
      page,
      pageSize,
    };
  }

  async create(dto: CreateAdminPurchaseRequestDto): Promise<AdminPurchaseRequest> {
    assertAdminRequired(dto?.applicant, '申请人');
    assertAdminRequired(dto?.department, '部门');
    assertAdminRequired(dto?.itemName, '物品名称');
    assertAdminRequired(dto?.unit, '单位');
    assertAdminRequired(dto?.reason, '申请事由');
    const itemType: string = String(dto?.itemType ?? '').trim();
    if (!ITEM_TYPES.includes(itemType)) {
      throw new BadRequestException(ITEM_TYPE_ERROR);
    }
    const quantity: number = assertAdminPositiveInt(dto?.quantity, '数量');
    const estimatedPrice: number = assertAdminPositiveNumber(dto?.estimatedPrice, '预计单价');
    const { row } = await insertWithSeqNo<RequestRow>({
      db: this.db,
      table: adminPurchaseRequests,
      noColumn: adminPurchaseRequests.requestNo,
      prefix: REQUEST_NO_PREFIX,
      insert: (no: string) =>
        this.db
          .insert(adminPurchaseRequests)
          .values({
            requestNo: no,
            applicant: String(dto.applicant).trim(),
            department: String(dto.department).trim(),
            itemName: String(dto.itemName).trim(),
            itemType,
            quantity,
            unit: String(dto.unit).trim(),
            estimatedPrice: estimatedPrice.toFixed(2),
            totalPrice: (quantity * estimatedPrice).toFixed(2),
            reason: String(dto.reason).trim(),
            status: STATUS_PENDING,
            approver: '',
            approveRemark: '',
          } satisfies RequestInsert)
          .returning(),
    });
    this.logger.log(`采购申请创建成功 id=${String(row.id)} no=${row.requestNo}`);
    return mapRequest(row);
  }

  async update(id: number, dto: UpdateAdminPurchaseRequestDto): Promise<AdminPurchaseRequest> {
    const existing: RequestRow = await this.findRequestOrThrow(id);
    if (existing.status !== STATUS_PENDING) {
      throw new ConflictException('仅待审批状态的采购申请允许修改');
    }
    const patch: Partial<RequestInsert> = {};
    setRequiredString(patch, 'applicant', dto?.applicant, '申请人');
    setRequiredString(patch, 'department', dto?.department, '部门');
    setRequiredString(patch, 'itemName', dto?.itemName, '物品名称');
    setRequiredString(patch, 'unit', dto?.unit, '单位');
    setRequiredString(patch, 'reason', dto?.reason, '申请事由');
    if (dto?.itemType !== undefined) {
      const itemType: string = String(dto.itemType).trim();
      if (!ITEM_TYPES.includes(itemType)) {
        throw new BadRequestException(ITEM_TYPE_ERROR);
      }
      patch.itemType = itemType;
    }
    if (dto?.quantity !== undefined) {
      patch.quantity = assertAdminPositiveInt(dto.quantity, '数量');
    }
    if (dto?.estimatedPrice !== undefined) {
      patch.estimatedPrice = assertAdminPositiveNumber(dto.estimatedPrice, '预计单价').toFixed(2);
    }
    if (patch.quantity !== undefined || patch.estimatedPrice !== undefined) {
      const quantity: number = patch.quantity ?? existing.quantity;
      const price: number = patch.estimatedPrice !== undefined
        ? Number(patch.estimatedPrice)
        : Number(existing.estimatedPrice);
      patch.totalPrice = (quantity * price).toFixed(2);
    }
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }
    patch.updatedAt = new Date();
    return mapRequest(await this.applyPatch(id, patch));
  }

  async approve(
    id: number,
    dto: AdminEnhanceApproveDto,
    approver: string,
  ): Promise<AdminPurchaseRequest> {
    if (typeof dto?.approve !== 'boolean') {
      throw new BadRequestException('请提供有效的审批意见');
    }
    const remark: string = String(dto?.remark ?? '').trim();
    if (!dto.approve && remark === '') {
      throw new BadRequestException('驳回时必须填写原因');
    }
    const existing: RequestRow = await this.findRequestOrThrow(id);
    if (existing.status !== STATUS_PENDING) {
      throw new ConflictException('仅待审批状态的采购申请允许审批');
    }
    const result: AdminPurchaseRequest = mapRequest(
      await this.applyPatch(id, {
        status: dto.approve ? STATUS_APPROVED : STATUS_REJECTED,
        approver,
        approveTime: new Date(),
        approveRemark: remark,
        updatedAt: new Date(),
      }),
    );
    if (existing.createdBy) {
      try {
        await this.messageNotificationService.pushApprovalResult({
          title: dto.approve ? '采购申请审批通过' : '采购申请被驳回',
          content: dto.approve
            ? `您的采购申请「${existing.requestNo}」（${existing.itemName}）已审批通过。`
            : `您的采购申请「${existing.requestNo}」（${existing.itemName}）被驳回：${remark}`,
          toUserId: existing.createdBy,
          relatedModule: '行政',
          relatedBusinessId: String(id),
          relatedBusinessNo: existing.requestNo,
        });
      } catch (error: unknown) {
        this.logger.warn(
          `采购申请审批结果推送失败: ${JSON.stringify({ id, error: String(error) })}`,
        );
      }
    }
    return result;
  }

  async cancel(id: number): Promise<AdminPurchaseRequest> {
    const existing: RequestRow = await this.findRequestOrThrow(id);
    if (!CANCELLABLE_STATUSES.includes(existing.status)) {
      throw new ConflictException('仅待审批或已通过的采购申请允许取消');
    }
    return mapRequest(await this.applyPatch(id, {
      status: STATUS_CANCELLED,
      updatedAt: new Date(),
    }));
  }

  async remove(id: number): Promise<{ success: boolean }> {
    const existing: RequestRow = await this.findRequestOrThrow(id);
    if (!DELETABLE_STATUSES.includes(existing.status)) {
      throw new ConflictException('仅待审批、已驳回或已取消的采购申请允许删除');
    }
    await this.applyPatch(id, { deletedAt: new Date(), updatedAt: new Date() });
    return { success: true };
  }

  async batchRemove(ids: unknown): Promise<{ deleted: number }> {
    const idList: number[] = parseIdList(ids);
    const rows: { id: number; status: string }[] = await this.db
      .select({ id: adminPurchaseRequests.id, status: adminPurchaseRequests.status })
      .from(adminPurchaseRequests)
      .where(and(inArray(adminPurchaseRequests.id, idList), isNull(adminPurchaseRequests.deletedAt)));
    const deletableIds: number[] = rows
      .filter((row: { id: number; status: string }) => DELETABLE_STATUSES.includes(row.status))
      .map((row: { id: number; status: string }) => row.id);
    if (deletableIds.length === 0) return { deleted: 0 };
    const updated: { id: number }[] = await this.db
      .update(adminPurchaseRequests)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(inArray(adminPurchaseRequests.id, deletableIds), isNull(adminPurchaseRequests.deletedAt)))
      .returning({ id: adminPurchaseRequests.id });
    return { deleted: updated.length };
  }

  private async applyPatch(id: number, patch: Partial<RequestInsert>): Promise<RequestRow> {
    const updated: RequestRow[] = await this.db
      .update(adminPurchaseRequests)
      .set(patch)
      .where(aliveCond(id))
      .returning();
    if (updated.length === 0) throw new NotFoundException('记录不存在');
    return updated[0];
  }

  private async findRequestOrThrow(id: number): Promise<RequestRow> {
    const rows: RequestRow[] = await this.db
      .select()
      .from(adminPurchaseRequests)
      .where(aliveCond(id))
      .limit(1);
    if (rows.length === 0) throw new NotFoundException('记录不存在');
    return rows[0];
  }
}
