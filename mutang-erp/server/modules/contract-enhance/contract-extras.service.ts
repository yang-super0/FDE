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
import { and, count, desc, eq, gte, isNull, lte } from 'drizzle-orm';
import {
  contract,
  contractCommissionApplications,
  contractExpenses,
  contractReminders,
  customer,
} from '@server/database/schema';
import type {
  ContractCommissionApplication,
  ContractCommissionApplicationListParams,
  ContractCommissionApplicationListResult,
  ContractReminder,
  CreateContractReminderRequest,
  ApplyContractCommissionRequest,
} from '@shared/api.interface';
import { insertWithSeqNo } from '@server/modules/finance-core/fin-seq.util';

type ReminderRow = typeof contractReminders.$inferSelect;
type CommissionRow = typeof contractCommissionApplications.$inferSelect;

interface CommissionJoinRow {
  row: CommissionRow;
  contractCode: string | null;
  customerName: string | null;
  contractAmount: string | null;
}

const EXPIRE_REMIND_TYPE: string = '合同到期提醒';
const APPROVAL_REMIND_TYPE: string = '待审批提醒';
const PAYMENT_REMIND_TYPE: string = '付款到期提醒';
const REMIND_TYPES: string[] = [
  EXPIRE_REMIND_TYPE,
  APPROVAL_REMIND_TYPE,
  PAYMENT_REMIND_TYPE,
];

const PENDING_STATUS: string = '待审批';
const APPROVED_STATUS: string = '已通过';
const REJECTED_STATUS: string = '已驳回';

const CONTRACT_PENDING_STATUS: string = 'pending';
const CONTRACT_EXPIRED_STATUS: string = 'expired';
const CONTRACT_TERMINATED_STATUS: string = 'terminated';

const COMMISSION_NO_PREFIX: string = 'HTTC';
const PAYMENT_WINDOW_MS: number = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_TARGETS: string[] = ['负责人'];

@Injectable()
export class ContractExtrasService {
  private readonly logger: Logger = new Logger(ContractExtrasService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
  ) {}

  private parseTargets(raw: string | null): string[] {
    if (!raw) return [];
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((item: unknown): string => String(item));
    } catch {
      return [];
    }
  }

  private mapReminder(row: ReminderRow): ContractReminder {
    return {
      id: row.id,
      contractId: row.contractId,
      remindType: row.remindType as ContractReminder['remindType'],
      content: row.content,
      targets: this.parseTargets(row.targets ?? null),
      isRead: row.isRead,
      createdBy: row.createdBy ?? '',
      createdAt: row.createdAt.toISOString(),
    };
  }

  private mapApplication(item: CommissionJoinRow): ContractCommissionApplication {
    const row: CommissionRow = item.row;
    return {
      id: row.id,
      applicationNo: row.applicationNo,
      contractId: row.contractId,
      contractCode: item.contractCode ?? '',
      customerName: item.customerName ?? '',
      contractAmount: Number(item.contractAmount ?? 0),
      commissionRate: Number(row.commissionRate),
      commissionAmount: Number(row.commissionAmount),
      applicant: row.applicant ?? '',
      remark: row.remark ?? '',
      status: row.status as ContractCommissionApplication['status'],
      approver: row.approver ?? '',
      approvedAt: row.approvedAt ? row.approvedAt.toISOString() : null,
      rejectReason: row.rejectReason ?? '',
      createdAt: row.createdAt.toISOString(),
    };
  }

  private async loadApplication(id: number): Promise<ContractCommissionApplication> {
    const rows: CommissionJoinRow[] = await this.db
      .select({
        row: contractCommissionApplications,
        contractCode: contract.code,
        customerName: customer.name,
        contractAmount: contract.amount,
      })
      .from(contractCommissionApplications)
      .leftJoin(
        contract,
        eq(contractCommissionApplications.contractId, contract.id),
      )
      .leftJoin(customer, eq(contract.customerId, customer.id))
      .where(
        and(
          eq(contractCommissionApplications.id, id),
          isNull(contractCommissionApplications.deletedAt),
        ),
      );
    if (rows.length === 0) {
      throw new NotFoundException('提成申请不存在');
    }
    return this.mapApplication(rows[0]);
  }

  async createReminder(
    contractId: string,
    dto: CreateContractReminderRequest,
    userId: string,
  ): Promise<ContractReminder> {
    if (!REMIND_TYPES.includes(dto.remindType)) {
      throw new BadRequestException('无效的提醒类型');
    }
    const contractRows: { code: string; status: string; expireDate: Date | null }[] =
      await this.db
        .select({
          code: contract.code,
          status: contract.status,
          expireDate: contract.expireDate,
        })
        .from(contract)
        .where(eq(contract.id, contractId));
    if (contractRows.length === 0) {
      throw new NotFoundException('合同不存在');
    }
    const { code, status, expireDate } = contractRows[0];

    let content: string;
    if (dto.remindType === EXPIRE_REMIND_TYPE) {
      if (!expireDate) {
        throw new BadRequestException('该合同无到期日期');
      }
      const expireDateStr: string = expireDate.toISOString().slice(0, 10);
      content = `合同${code}将于${expireDateStr}到期，请及时处理`;
    } else if (dto.remindType === APPROVAL_REMIND_TYPE) {
      if (status !== CONTRACT_PENDING_STATUS) {
        throw new BadRequestException('仅待审批合同可发送审批提醒');
      }
      content = `合同${code}待审批，请及时处理`;
    } else {
      const now: Date = new Date();
      const deadline: Date = new Date(now.getTime() + PAYMENT_WINDOW_MS);
      const expenseRows: { expenseNo: string }[] = await this.db
        .select({ expenseNo: contractExpenses.expenseNo })
        .from(contractExpenses)
        .where(
          and(
            eq(contractExpenses.contractId, contractId),
            isNull(contractExpenses.deletedAt),
            gte(contractExpenses.plannedPaymentDate, now),
            lte(contractExpenses.plannedPaymentDate, deadline),
          ),
        );
      if (expenseRows.length === 0) {
        throw new BadRequestException('该合同暂无7天内临近付款的费用');
      }
      const expenseNos: string[] = expenseRows.map(
        (item: { expenseNo: string }): string => item.expenseNo,
      );
      content = `合同${code}有${expenseNos.length}笔费用临近计划付款日期（${expenseNos.join('、')}），请及时安排付款`;
    }

    const targets: string[] =
      dto.targets && dto.targets.length > 0 ? dto.targets : DEFAULT_TARGETS;

    const inserted: ReminderRow[] = await this.db
      .insert(contractReminders)
      .values({
        contractId,
        remindType: dto.remindType,
        content,
        targets: JSON.stringify(targets),
        isRead: false,
        createdBy: userId,
      })
      .returning();
    if (inserted.length === 0) {
      throw new BadRequestException('提醒创建失败');
    }
    this.logger.log(`合同提醒创建成功: ${code} / ${dto.remindType}`);
    return this.mapReminder(inserted[0]);
  }

  async listReminders(contractId: string): Promise<ContractReminder[]> {
    const rows: ReminderRow[] = await this.db
      .select()
      .from(contractReminders)
      .where(
        and(
          eq(contractReminders.contractId, contractId),
          isNull(contractReminders.deletedAt),
        ),
      )
      .orderBy(desc(contractReminders.createdAt));
    return rows.map((row: ReminderRow): ContractReminder =>
      this.mapReminder(row),
    );
  }

  async applyCommission(
    contractId: string,
    dto: ApplyContractCommissionRequest,
    applicantName: string,
    userId: string,
  ): Promise<ContractCommissionApplication> {
    const contractRows: { code: string; status: string }[] = await this.db
      .select({ code: contract.code, status: contract.status })
      .from(contract)
      .where(eq(contract.id, contractId));
    if (contractRows.length === 0) {
      throw new NotFoundException('合同不存在');
    }
    const status: string = contractRows[0].status;
    if (
      status !== CONTRACT_EXPIRED_STATUS &&
      status !== CONTRACT_TERMINATED_STATUS
    ) {
      throw new ConflictException('仅已完成或已归档合同可申请提成');
    }
    if (!(dto.commissionRate > 0) || !(dto.commissionAmount > 0)) {
      throw new BadRequestException('提成比例和提成金额必须大于0');
    }
    const pendingRows: { count: number | string }[] = await this.db
      .select({ count: count() })
      .from(contractCommissionApplications)
      .where(
        and(
          eq(contractCommissionApplications.contractId, contractId),
          eq(contractCommissionApplications.status, PENDING_STATUS),
          isNull(contractCommissionApplications.deletedAt),
        ),
      );
    if (Number(pendingRows[0]?.count ?? 0) > 0) {
      throw new ConflictException('该合同已有待审批的提成申请');
    }

    const result = await insertWithSeqNo<CommissionRow>({
      db: this.db,
      table: contractCommissionApplications,
      noColumn: contractCommissionApplications.applicationNo,
      prefix: COMMISSION_NO_PREFIX,
      insert: (applicationNo: string): Promise<CommissionRow[]> =>
        this.db
          .insert(contractCommissionApplications)
          .values({
            applicationNo,
            contractId,
            commissionRate: String(dto.commissionRate),
            commissionAmount: String(dto.commissionAmount),
            applicant: applicantName,
            remark: dto.remark ?? '',
            status: PENDING_STATUS,
            createdBy: userId,
          })
          .returning(),
    });
    this.logger.log(`提成申请创建成功: ${result.no}`);
    return this.loadApplication(result.id);
  }

  async listApplications(
    params: ContractCommissionApplicationListParams,
  ): Promise<ContractCommissionApplicationListResult> {
    const page: number = Math.max(params.page ?? 1, 1);
    const pageSize: number = Math.min(Math.max(params.pageSize ?? 20, 1), 100);

    const conditions = [isNull(contractCommissionApplications.deletedAt)];
    if (params.status) {
      conditions.push(eq(contractCommissionApplications.status, params.status));
    }
    if (params.contractId) {
      conditions.push(
        eq(contractCommissionApplications.contractId, params.contractId),
      );
    }
    const where = and(...conditions);

    const rows: CommissionJoinRow[] = await this.db
      .select({
        row: contractCommissionApplications,
        contractCode: contract.code,
        customerName: customer.name,
        contractAmount: contract.amount,
      })
      .from(contractCommissionApplications)
      .leftJoin(
        contract,
        eq(contractCommissionApplications.contractId, contract.id),
      )
      .leftJoin(customer, eq(contract.customerId, customer.id))
      .where(where)
      .orderBy(desc(contractCommissionApplications.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const totalResult: { count: number | string }[] = await this.db
      .select({ count: count() })
      .from(contractCommissionApplications)
      .where(where);
    const total: number = Number(totalResult[0]?.count ?? 0);

    const result: ContractCommissionApplicationListResult & {
      page: number;
      pageSize: number;
    } = {
      items: rows.map(
        (item: CommissionJoinRow): ContractCommissionApplication =>
          this.mapApplication(item),
      ),
      total,
      page,
      pageSize,
    };
    return result;
  }

  async approveApplication(
    id: number,
    approverName: string,
  ): Promise<ContractCommissionApplication> {
    const rows: { status: string }[] = await this.db
      .select({ status: contractCommissionApplications.status })
      .from(contractCommissionApplications)
      .where(
        and(
          eq(contractCommissionApplications.id, id),
          isNull(contractCommissionApplications.deletedAt),
        ),
      );
    if (rows.length === 0) {
      throw new NotFoundException('提成申请不存在');
    }
    if (rows[0].status !== PENDING_STATUS) {
      throw new ConflictException('该申请已审批过');
    }
    const updated: { id: number }[] = await this.db
      .update(contractCommissionApplications)
      .set({
        status: APPROVED_STATUS,
        approver: approverName,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(contractCommissionApplications.id, id),
          isNull(contractCommissionApplications.deletedAt),
        ),
      )
      .returning({ id: contractCommissionApplications.id });
    if (updated.length === 0) {
      throw new NotFoundException('提成申请不存在');
    }
    this.logger.log(`提成申请审批通过: ${id}`);
    return this.loadApplication(id);
  }

  async rejectApplication(
    id: number,
    reason: string,
    approverName: string,
  ): Promise<ContractCommissionApplication> {
    if (!reason || reason.trim().length === 0) {
      throw new BadRequestException('驳回时必须填写驳回原因');
    }
    const rows: { status: string }[] = await this.db
      .select({ status: contractCommissionApplications.status })
      .from(contractCommissionApplications)
      .where(
        and(
          eq(contractCommissionApplications.id, id),
          isNull(contractCommissionApplications.deletedAt),
        ),
      );
    if (rows.length === 0) {
      throw new NotFoundException('提成申请不存在');
    }
    if (rows[0].status !== PENDING_STATUS) {
      throw new ConflictException('该申请已审批过');
    }
    const updated: { id: number }[] = await this.db
      .update(contractCommissionApplications)
      .set({
        status: REJECTED_STATUS,
        rejectReason: reason,
        approver: approverName,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(contractCommissionApplications.id, id),
          isNull(contractCommissionApplications.deletedAt),
        ),
      )
      .returning({ id: contractCommissionApplications.id });
    if (updated.length === 0) {
      throw new NotFoundException('提成申请不存在');
    }
    this.logger.log(`提成申请驳回: ${id}`);
    return this.loadApplication(id);
  }
}
