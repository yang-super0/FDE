import {
  BadRequestException,
  ConflictException,
  Injectable,
  Inject,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
  AuthNPaasService,
} from '@lark-apaas/fullstack-nestjs-core';
import { and, asc, count, desc, eq, gte, inArray, isNull, lte } from 'drizzle-orm';
import {
  contract,
  contractApproval,
  contractCommissionApplications,
  contractExpenses,
  contractPaymentRecords,
  contractReminders,
  customer,
} from '@server/database/schema';
import type {
  Contract,
  ContractApprovalAction,
  ContractApprovalRecord,
  ContractDetail,
  ContractStatus,
  ContractSummary,
  PageResult,
} from '@shared/api.interface';
import { MessageNotificationService } from '../message-notification/message-notification.service';
import type {
  ApproveContractDto,
  CreateContractDto,
  ListContractsQueryDto,
} from './contract.dto';
import { publishSyncEvent } from '@server/modules/feishu-sync/sync-event.publisher';

type ContractRow = typeof contract.$inferSelect;
type ContractApprovalRow = typeof contractApproval.$inferSelect;

const EXPIRING_WINDOW_MS: number = 30 * 24 * 60 * 60 * 1000;
const ACTIVE_STATUS: string = 'active';
const PENDING_STATUS: string = 'pending';
const TERMINATED_STATUS: string = 'terminated';
/** 已到期/已终止（对应已归档/已完成语义）的合同不可删除 */
const NON_DELETABLE_STATUSES: string[] = ['expired', TERMINATED_STATUS];

@Injectable()
export class ContractService {
  private readonly logger = new Logger(ContractService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
    private readonly authn: AuthNPaasService,
    private readonly messageNotificationService: MessageNotificationService,
  ) {}

  private isExpiringSoon(status: string, expireDate: Date | null): boolean {
    if (status !== ACTIVE_STATUS || !expireDate) return false;
    const nowMs: number = Date.now();
    const expireMs: number = expireDate.getTime();
    return expireMs >= nowMs && expireMs <= nowMs + EXPIRING_WINDOW_MS;
  }

  private toContract(row: ContractRow, customerName: string): Contract {
    return {
      id: row.id,
      code: row.code,
      customerId: row.customerId,
      customerName,
      contractType: row.contractType,
      amount: Number(row.amount),
      signDate: row.signDate ? row.signDate.toISOString() : '',
      expireDate: row.expireDate ? row.expireDate.toISOString() : '',
      status: row.status as ContractStatus,
      rejectReason: row.rejectReason,
      expiringSoon: this.isExpiringSoon(row.status, row.expireDate),
      content: row.content ?? '',
    };
  }

  async getSummary(): Promise<ContractSummary> {
    const now: Date = new Date();
    const windowEnd: Date = new Date(now.getTime() + EXPIRING_WINDOW_MS);
    const [totalRows, activeRows, expiringRows] = await Promise.all([
      this.db.select({ count: count() }).from(contract),
      this.db
        .select({ count: count() })
        .from(contract)
        .where(eq(contract.status, ACTIVE_STATUS)),
      this.db
        .select({ count: count() })
        .from(contract)
        .where(
          and(
            eq(contract.status, ACTIVE_STATUS),
            gte(contract.expireDate, now),
            lte(contract.expireDate, windowEnd),
          ),
        ),
    ]);
    return {
      total: Number(totalRows[0]?.count ?? 0),
      active: Number(activeRows[0]?.count ?? 0),
      expiring: Number(expiringRows[0]?.count ?? 0),
    };
  }

  async findAll(query: ListContractsQueryDto): Promise<PageResult<Contract>> {
    const conditions = [];
    if (query.status) {
      conditions.push(eq(contract.status, query.status));
    }
    if (query.expireFrom) {
      conditions.push(gte(contract.expireDate, new Date(query.expireFrom)));
    }
    if (query.expireTo) {
      conditions.push(lte(contract.expireDate, new Date(query.expireTo)));
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const offset: number = (query.page - 1) * query.pageSize;

    const rows: ContractRow[] = where
      ? await this.db
          .select()
          .from(contract)
          .where(where)
          .orderBy(desc(contract.createdAt))
          .limit(query.pageSize)
          .offset(offset)
      : await this.db
          .select()
          .from(contract)
          .orderBy(desc(contract.createdAt))
          .limit(query.pageSize)
          .offset(offset);

    const totalResult = where
      ? await this.db.select({ count: count() }).from(contract).where(where)
      : await this.db.select({ count: count() }).from(contract);
    const total: number = Number(totalResult[0]?.count ?? 0);

    const customerIds: string[] = Array.from(
      new Set(rows.map((row: ContractRow) => row.customerId)),
    );
    const nameMap: Map<string, string> = new Map();
    if (customerIds.length > 0) {
      const customerRows = await this.db
        .select({ id: customer.id, name: customer.name })
        .from(customer)
        .where(inArray(customer.id, customerIds));
      customerRows.forEach((item: { id: string; name: string }) => {
        nameMap.set(item.id, item.name);
      });
    }

    const items: Contract[] = rows.map((row: ContractRow) =>
      this.toContract(row, nameMap.get(row.customerId) ?? ''),
    );
    return { items, total };
  }

  async create(
    dto: CreateContractDto,
    operatorId: string,
  ): Promise<{ id: string }> {
    const inserted = await this.db
      .insert(contract)
      .values({
        code: dto.code,
        customerId: dto.customerId,
        contractType: dto.contractType,
        amount: String(dto.amount),
        signDate: new Date(dto.signDate),
        expireDate: new Date(dto.expireDate),
        status: PENDING_STATUS,
        rejectReason: '',
        content: dto.content ?? null,
        createdBy: operatorId,
      })
      .returning({ id: contract.id });
    if (inserted.length === 0) {
      throw new BadRequestException('合同创建失败');
    }
    this.logger.log(`合同创建成功: ${dto.code}`);
    try {
      await this.messageNotificationService.pushApprovalReminder({
        title: '合同待审批',
        content: `合同「${dto.code}」已创建，等待审批，请及时处理。`,
        toRoleCode: 'admin',
        relatedModule: '合同',
        relatedBusinessId: inserted[0].id,
        relatedBusinessNo: dto.code,
        priority: '高',
      });
    } catch (error: unknown) {
      this.logger.warn(
        `合同审批提醒推送失败: ${JSON.stringify({ code: dto.code, error: String(error) })}`,
      );
    }
    publishSyncEvent('contract', inserted[0].id, 'create');
    return { id: inserted[0].id };
  }

  async approve(
    id: string,
    dto: ApproveContractDto,
    operatorId: string,
  ): Promise<{ code: string }> {
    if (dto.action === 'rejected' && !(dto.comment ?? '').trim()) {
      throw new BadRequestException('驳回时必须填写驳回原因');
    }
    let contractCode = '';
    let creatorId: string | null = null;
    await this.db.transaction(async (tx) => {
      const rows: ContractRow[] = await tx
        .select()
        .from(contract)
        .where(eq(contract.id, id));
      if (rows.length === 0) {
        throw new NotFoundException('合同不存在');
      }
      const row: ContractRow = rows[0];
      if (row.status !== PENDING_STATUS) {
        throw new BadRequestException('仅待审批状态的合同可以审批');
      }
      contractCode = row.code;
      creatorId = row.createdBy;
      await tx.insert(contractApproval).values({
        contractId: id,
        action: dto.action,
        comment: dto.comment ?? '',
        createdBy: operatorId,
      });
      const patch: Partial<typeof contract.$inferInsert> = {};
      if (dto.action === 'approved') {
        patch.status = ACTIVE_STATUS;
      } else {
        patch.status = TERMINATED_STATUS;
        patch.rejectReason = dto.comment ?? '';
      }
      patch.updatedAt = new Date();
      patch.updatedBy = operatorId;
      const updated = await tx
        .update(contract)
        .set(patch)
        .where(eq(contract.id, id))
        .returning({ id: contract.id });
      if (updated.length === 0) {
        throw new NotFoundException('合同不存在');
      }
    });
    this.logger.log(`合同审批完成: ${contractCode} -> ${dto.action}`);
    publishSyncEvent('contract', id, 'update');
    if (creatorId) {
      try {
        await this.messageNotificationService.pushApprovalResult({
          title: dto.action === 'approved' ? '合同审批通过' : '合同审批驳回',
          content:
            dto.action === 'approved'
              ? `您的合同「${contractCode}」已审批通过。`
              : `您的合同「${contractCode}」被驳回：${dto.comment ?? ''}`,
          toUserId: creatorId,
          relatedModule: '合同',
          relatedBusinessId: id,
          relatedBusinessNo: contractCode,
        });
      } catch (error: unknown) {
        this.logger.warn(
          `合同审批结果推送失败: ${JSON.stringify({ code: contractCode, error: String(error) })}`,
        );
      }
    }
    return { code: contractCode };
  }

  /** 删除合同：有费用/付款记录/提成申请或已到期、终止状态时返回 409 */
  async remove(id: string, operatorId: string): Promise<{ code: string }> {
    const rows: ContractRow[] = await this.db
      .select()
      .from(contract)
      .where(eq(contract.id, id));
    if (rows.length === 0) {
      throw new NotFoundException('合同不存在');
    }
    const row: ContractRow = rows[0];
    if (NON_DELETABLE_STATUSES.includes(row.status)) {
      throw new ConflictException(
        '该合同已到期或已终止（已归档/已完成），无法删除',
      );
    }

    const expenseRows: { id: number }[] = await this.db
      .select({ id: contractExpenses.id })
      .from(contractExpenses)
      .where(eq(contractExpenses.contractId, id));
    if (expenseRows.length > 0) {
      throw new ConflictException('该合同有关联费用，无法删除');
    }

    const paymentRows: { id: number }[] = await this.db
      .select({ id: contractPaymentRecords.id })
      .from(contractPaymentRecords)
      .where(eq(contractPaymentRecords.contractId, id));
    if (paymentRows.length > 0) {
      throw new ConflictException('该合同有关联付款记录，无法删除');
    }

    const commissionRows: { id: number }[] = await this.db
      .select({ id: contractCommissionApplications.id })
      .from(contractCommissionApplications)
      .where(eq(contractCommissionApplications.contractId, id));
    if (commissionRows.length > 0) {
      throw new ConflictException('该合同有关联提成申请，无法删除');
    }

    await this.db.transaction(async (tx) => {
      await tx
        .delete(contractApproval)
        .where(eq(contractApproval.contractId, id));
      await tx.delete(contractReminders).where(eq(contractReminders.contractId, id));
      const deleted: { id: string }[] = await tx
        .delete(contract)
        .where(eq(contract.id, id))
        .returning({ id: contract.id });
      if (deleted.length === 0) {
        throw new NotFoundException('合同不存在');
      }
    });
    this.logger.log(`合同删除: ${row.code}, 操作人: ${operatorId}`);
    publishSyncEvent('contract', id, 'delete');
    return { code: row.code };
  }

  async findDetail(id: string): Promise<ContractDetail> {
    const rows: ContractRow[] = await this.db
      .select()
      .from(contract)
      .where(eq(contract.id, id));
    if (rows.length === 0) {
      throw new NotFoundException('合同不存在');
    }
    const row: ContractRow = rows[0];

    const customerRows = await this.db
      .select({ name: customer.name })
      .from(customer)
      .where(eq(customer.id, row.customerId));
    const base: Contract = this.toContract(row, customerRows[0]?.name ?? '');

    const approvalRows: ContractApprovalRow[] = await this.db
      .select()
      .from(contractApproval)
      .where(eq(contractApproval.contractId, id))
      .orderBy(asc(contractApproval.createdAt));

    const approverIds: string[] = Array.from(
      new Set(
        approvalRows
          .map((item: ContractApprovalRow) => item.createdBy)
          .filter(
            (userId: string | null): userId is string => Boolean(userId),
          ),
      ),
    );
    const nameMap: Map<string, string> = new Map();
    if (approverIds.length > 0) {
      const users = await this.authn.listUsersByIds(approverIds);
      users.forEach((user, index: number) => {
        if (user) {
          nameMap.set(
            approverIds[index],
            user.name?.zh_cn ?? user.name?.en_us ?? '',
          );
        }
      });
    }

    const approvals: ContractApprovalRecord[] = approvalRows.map(
      (item: ContractApprovalRow) => ({
        action: item.action as ContractApprovalAction,
        comment: item.comment,
        approverName: item.createdBy
          ? nameMap.get(item.createdBy) ?? ''
          : '',
        createdAt: item.createdAt.toISOString(),
      }),
    );

    return { ...base, approvals };
  }
}
