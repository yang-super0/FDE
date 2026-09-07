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
  lte,
  type SQL,
} from 'drizzle-orm';
import {
  financeConsumptions,
  financeDeductions,
  financePorts,
  financeRebates,
} from '@server/database/schema';
import type {
  CreateFinanceConsumptionRequest,
  CreateFinanceDeductionRequest,
  CreateFinanceRebateRequest,
  FinanceConsumption,
  FinanceConsumptionListResult,
  FinanceDeduction,
  FinanceDeductionListResult,
  FinanceRebate,
  FinanceRebateListResult,
} from '@shared/api.interface';
import { insertWithSeqNo } from '../finance-core/fin-seq.util';
import { round2 } from '../finance-core/query.util';
import {
  assertPositiveAmount,
  decreaseAccountBalance,
  increaseAccountBalance,
  insertCustomerFinanceDetail,
} from './finance-enhance-shared.util';
import {
  CONSUMPTION_CHECKED_STATUS,
  CONSUMPTION_DIFFERENCE_STATUS,
  CONSUMPTION_PENDING_CHECK_STATUS,
  CONSUMPTION_NO_PREFIX,
  DEDUCTION_APPROVED_STATUS,
  DEDUCTION_EXECUTED_STATUS,
  DEDUCTION_NO_PREFIX,
  DEDUCTION_PENDING_APPROVE_STATUS,
  DEDUCTION_REJECTED_STATUS,
  REBATE_CALCULATED_STATUS,
  REBATE_CANCELLABLE_STATUSES,
  REBATE_CANCELLED_STATUS,
  REBATE_ISSUED_STATUS,
  REBATE_NO_PREFIX,
  REBATE_PENDING_CALC_STATUS,
  mapConsumption,
  mapDeduction,
  mapRebate,
  requireIdValue,
  requireText,
  validateDateText,
  validateRate,
  type ConsumptionListQuery,
  type DeductionListQuery,
  type RebateListQuery,
  type UpdateConsumptionInput,
  type UpdateRebateInput,
} from './finance-rebates-mappers';
import { publishSyncEvent } from '@server/modules/feishu-sync/sync-event.publisher';

type RebateRow = typeof financeRebates.$inferSelect;
type DeductionRow = typeof financeDeductions.$inferSelect;
type ConsumptionRow = typeof financeConsumptions.$inferSelect;

@Injectable()
export class FinanceRebatesService {
  private readonly logger: Logger = new Logger(FinanceRebatesService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
  ) {}

  async findRebates(query: RebateListQuery): Promise<FinanceRebateListResult> {
    const conditions: (SQL | undefined)[] = [
      isNull(financeRebates.deletedAt),
    ];
    if (query.customerName) {
      conditions.push(ilike(financeRebates.customerName, `%${query.customerName}%`));
    }
    if (query.status) {
      conditions.push(eq(financeRebates.status, query.status));
    }
    if (query.period) {
      conditions.push(eq(financeRebates.period, query.period));
    }
    const totalRows: { count: number | string }[] = await this.db
      .select({ count: count() })
      .from(financeRebates)
      .where(and(...conditions));
    const rows: RebateRow[] = await this.db
      .select()
      .from(financeRebates)
      .where(and(...conditions))
      .orderBy(desc(financeRebates.id))
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize);
    const portNameById: Map<number, string> = await this.loadPortNames(
      rows.map((row: RebateRow): number => row.portId),
    );
    return {
      items: rows.map((row: RebateRow): FinanceRebate =>
        mapRebate(row, portNameById.get(row.portId) ?? ''),
      ),
      total: Number(totalRows[0]?.count ?? 0),
    };
  }

  async createRebate(
    dto: CreateFinanceRebateRequest,
    operator: string,
  ): Promise<FinanceRebate> {
    requireText(dto.customerId, '客户ID');
    requireText(dto.customerName, '客户名称');
    requireText(dto.period, '账期');
    const portId: number = requireIdValue(dto.portId, '端口');
    const consumptionBase: number = Number(dto.consumptionBase);
    assertPositiveAmount(consumptionBase, '消费基数');
    const rebateRate: number = validateRate(dto.rebateRate, '返点比例');
    const rebateAmount: number = round2(consumptionBase * rebateRate);
    const result = await insertWithSeqNo<RebateRow>({
      db: this.db,
      table: financeRebates,
      noColumn: financeRebates.rebateNo,
      prefix: REBATE_NO_PREFIX,
      insert: (rebateNo: string): Promise<RebateRow[]> =>
        this.db
          .insert(financeRebates)
          .values({
            rebateNo,
            customerId: dto.customerId,
            customerName: dto.customerName,
            portId,
            period: dto.period,
            consumptionBase: consumptionBase.toFixed(2),
            rebateRate: rebateRate.toFixed(2),
            rebateAmount: rebateAmount.toFixed(2),
            status: REBATE_PENDING_CALC_STATUS,
            operator,
            remark: dto.remark ?? '',
          })
          .returning(),
    });
    this.logger.log(`后返创建成功: ${result.no}`);
    const portNameById: Map<number, string> = await this.loadPortNames([portId]);
    return mapRebate(result.row, portNameById.get(portId) ?? '');
  }

  async calculateRebate(id: number): Promise<{ success: boolean }> {
    const row: RebateRow = await this.getRebate(id);
    if (row.status !== REBATE_PENDING_CALC_STATUS) {
      throw new ConflictException('仅待核算状态的后返可核算');
    }
    const rebateAmount: number = round2(
      Number(row.consumptionBase) * Number(row.rebateRate),
    );
    const now: Date = new Date();
    const updated: { id: number }[] = await this.db
      .update(financeRebates)
      .set({
        rebateAmount: rebateAmount.toFixed(2),
        status: REBATE_CALCULATED_STATUS,
        calculateTime: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(financeRebates.id, id),
          isNull(financeRebates.deletedAt),
          eq(financeRebates.status, REBATE_PENDING_CALC_STATUS),
        ),
      )
      .returning({ id: financeRebates.id });
    if (updated.length === 0) {
      throw new ConflictException('仅待核算状态的后返可核算');
    }
    return { success: true };
  }

  async issueRebate(
    id: number,
    accountId: number,
  ): Promise<{ success: boolean }> {
    const row: RebateRow = await this.getRebate(id);
    if (row.status !== REBATE_CALCULATED_STATUS) {
      throw new ConflictException('仅已核算状态的后返可发放');
    }
    const amount: number = Number(row.rebateAmount);
    const now: Date = new Date();
    await this.db.transaction(async (tx) => {
      const balanceAfter: number = await increaseAccountBalance(
        tx,
        accountId,
        amount,
      );
      await insertCustomerFinanceDetail(tx, {
        customerId: row.customerId,
        customerName: row.customerName,
        accountId,
        transactionType: '返点',
        amount,
        balanceAfter,
        relatedOrderNo: row.rebateNo,
      });
      const updated: { id: number }[] = await tx
        .update(financeRebates)
        .set({
          status: REBATE_ISSUED_STATUS,
          issueTime: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(financeRebates.id, id),
            isNull(financeRebates.deletedAt),
            eq(financeRebates.status, REBATE_CALCULATED_STATUS),
          ),
        )
        .returning({ id: financeRebates.id });
      if (updated.length === 0) {
        throw new ConflictException('后返发放失败');
      }
    });
    this.logger.log(`后返发放成功: ${row.rebateNo}`);
    return { success: true };
  }

  async cancelRebate(id: number): Promise<{ success: boolean }> {
    const row: RebateRow = await this.getRebate(id);
    if (!REBATE_CANCELLABLE_STATUSES.includes(row.status)) {
      throw new ConflictException(
        row.status === REBATE_ISSUED_STATUS
          ? '已发放的后返不可取消'
          : '当前状态的后返不可取消',
      );
    }
    const now: Date = new Date();
    const updated: { id: number }[] = await this.db
      .update(financeRebates)
      .set({ status: REBATE_CANCELLED_STATUS, updatedAt: now })
      .where(
        and(
          eq(financeRebates.id, id),
          isNull(financeRebates.deletedAt),
          inArray(financeRebates.status, REBATE_CANCELLABLE_STATUSES),
        ),
      )
      .returning({ id: financeRebates.id });
    if (updated.length === 0) {
      throw new ConflictException('当前状态的后返不可取消');
    }
    return { success: true };
  }

  async updateRebate(
    id: number,
    dto: UpdateRebateInput,
  ): Promise<{ success: boolean }> {
    const row: RebateRow = await this.getRebate(id);
    if (row.status === REBATE_ISSUED_STATUS) {
      throw new ConflictException('已发放的后返不可修改');
    }
    const patch: Partial<typeof financeRebates.$inferInsert> = {};
    if (dto.customerId !== undefined) {
      patch.customerId = requireText(dto.customerId, '客户ID');
    }
    if (dto.customerName !== undefined) {
      patch.customerName = requireText(dto.customerName, '客户名称');
    }
    if (dto.portId !== undefined) {
      patch.portId = requireIdValue(dto.portId, '端口');
    }
    if (dto.period !== undefined) {
      patch.period = requireText(dto.period, '账期');
    }
    if (dto.consumptionBase !== undefined) {
      assertPositiveAmount(dto.consumptionBase, '消费基数');
    }
    if (dto.rebateRate !== undefined) {
      validateRate(dto.rebateRate, '返点比例');
    }
    if (dto.remark !== undefined) {
      patch.remark = dto.remark;
    }
    if (Object.keys(patch).length === 0 && dto.consumptionBase === undefined && dto.rebateRate === undefined) {
      throw new BadRequestException('未提供可更新字段');
    }
    if (dto.consumptionBase !== undefined) {
      patch.consumptionBase = Number(dto.consumptionBase).toFixed(2);
    }
    if (dto.rebateRate !== undefined) {
      patch.rebateRate = Number(dto.rebateRate).toFixed(2);
    }
    if (dto.consumptionBase !== undefined || dto.rebateRate !== undefined) {
      const base: number =
        dto.consumptionBase !== undefined
          ? Number(dto.consumptionBase)
          : Number(row.consumptionBase);
      const rate: number =
        dto.rebateRate !== undefined
          ? Number(dto.rebateRate)
          : Number(row.rebateRate);
      patch.rebateAmount = round2(base * rate).toFixed(2);
    }
    patch.updatedAt = new Date();
    const updated: { id: number }[] = await this.db
      .update(financeRebates)
      .set(patch)
      .where(and(eq(financeRebates.id, id), isNull(financeRebates.deletedAt)))
      .returning({ id: financeRebates.id });
    if (updated.length === 0) {
      throw new NotFoundException('后返不存在');
    }
    return { success: true };
  }

  async removeRebate(id: number): Promise<{ success: boolean }> {
    const row: RebateRow = await this.getRebate(id);
    if (row.status === REBATE_ISSUED_STATUS) {
      throw new ConflictException('已发放的后返不可删除');
    }
    const now: Date = new Date();
    const updated: { id: number }[] = await this.db
      .update(financeRebates)
      .set({ deletedAt: now, updatedAt: now })
      .where(and(eq(financeRebates.id, id), isNull(financeRebates.deletedAt)))
      .returning({ id: financeRebates.id });
    if (updated.length === 0) {
      throw new NotFoundException('后返不存在');
    }
    return { success: true };
  }

  async findDeductions(
    query: DeductionListQuery,
  ): Promise<FinanceDeductionListResult> {
    const conditions: (SQL | undefined)[] = [
      isNull(financeDeductions.deletedAt),
    ];
    if (query.customerName) {
      conditions.push(
        ilike(financeDeductions.customerName, `%${query.customerName}%`),
      );
    }
    if (query.status) {
      conditions.push(eq(financeDeductions.status, query.status));
    }
    const totalRows: { count: number | string }[] = await this.db
      .select({ count: count() })
      .from(financeDeductions)
      .where(and(...conditions));
    const rows: DeductionRow[] = await this.db
      .select()
      .from(financeDeductions)
      .where(and(...conditions))
      .orderBy(desc(financeDeductions.id))
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize);
    return {
      items: rows.map((row: DeductionRow): FinanceDeduction =>
        mapDeduction(row),
      ),
      total: Number(totalRows[0]?.count ?? 0),
    };
  }

  async createDeduction(
    dto: CreateFinanceDeductionRequest,
    operator: string,
  ): Promise<FinanceDeduction> {
    requireText(dto.customerId, '客户ID');
    requireText(dto.customerName, '客户名称');
    const accountId: number = requireIdValue(dto.accountId, '资金账户');
    const reason: string = requireText(dto.reason, '扣减原因');
    const amount: number = Number(dto.amount);
    assertPositiveAmount(amount, '扣减金额');
    const result = await insertWithSeqNo<DeductionRow>({
      db: this.db,
      table: financeDeductions,
      noColumn: financeDeductions.deductionNo,
      prefix: DEDUCTION_NO_PREFIX,
      insert: (deductionNo: string): Promise<DeductionRow[]> =>
        this.db
          .insert(financeDeductions)
          .values({
            deductionNo,
            customerId: dto.customerId,
            customerName: dto.customerName,
            accountId,
            amount: amount.toFixed(2),
            reason,
            deductionType: dto.deductionType ?? '其他',
            status: DEDUCTION_PENDING_APPROVE_STATUS,
            approver: '',
            operator,
          })
          .returning(),
    });
    this.logger.log(`扣减创建成功: ${result.no}`);
    return mapDeduction(result.row);
  }

  async approveDeduction(
    id: number,
    approved: boolean,
    rejectReason: string | undefined,
    approver: string,
  ): Promise<{ success: boolean }> {
    const row: DeductionRow = await this.getDeduction(id);
    if (row.status !== DEDUCTION_PENDING_APPROVE_STATUS) {
      throw new ConflictException('仅待审批状态的扣减可审批');
    }
    const now: Date = new Date();
    const patch: Partial<typeof financeDeductions.$inferInsert> = {
      approver,
      approveTime: now,
      updatedAt: now,
    };
    if (approved) {
      patch.status = DEDUCTION_APPROVED_STATUS;
    } else {
      const reasonText: string = requireText(rejectReason, '驳回原因');
      patch.status = DEDUCTION_REJECTED_STATUS;
      patch.reason = `${row.reason}；驳回原因：${reasonText}`;
    }
    const updated: { id: number }[] = await this.db
      .update(financeDeductions)
      .set(patch)
      .where(
        and(
          eq(financeDeductions.id, id),
          isNull(financeDeductions.deletedAt),
          eq(financeDeductions.status, DEDUCTION_PENDING_APPROVE_STATUS),
        ),
      )
      .returning({ id: financeDeductions.id });
    if (updated.length === 0) {
      throw new ConflictException('仅待审批状态的扣减可审批');
    }
    return { success: true };
  }

  async executeDeduction(id: number): Promise<{ success: boolean }> {
    const row: DeductionRow = await this.getDeduction(id);
    if (row.status !== DEDUCTION_APPROVED_STATUS) {
      throw new ConflictException('仅已通过状态的扣减可执行');
    }
    const amount: number = Number(row.amount);
    const now: Date = new Date();
    await this.db.transaction(async (tx) => {
      const balanceAfter: number = await decreaseAccountBalance(
        tx,
        row.accountId,
        amount,
      );
      await insertCustomerFinanceDetail(tx, {
        customerId: row.customerId,
        customerName: row.customerName,
        accountId: row.accountId,
        transactionType: '扣减',
        amount,
        balanceAfter,
        relatedOrderNo: row.deductionNo,
      });
      const updated: { id: number }[] = await tx
        .update(financeDeductions)
        .set({
          status: DEDUCTION_EXECUTED_STATUS,
          executeTime: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(financeDeductions.id, id),
            isNull(financeDeductions.deletedAt),
            eq(financeDeductions.status, DEDUCTION_APPROVED_STATUS),
          ),
        )
        .returning({ id: financeDeductions.id });
      if (updated.length === 0) {
        throw new ConflictException('扣减执行失败');
      }
    });
    this.logger.log(`扣减执行成功: ${row.deductionNo}`);
    return { success: true };
  }

  async removeDeduction(id: number): Promise<{ success: boolean }> {
    const row: DeductionRow = await this.getDeduction(id);
    if (row.status === DEDUCTION_EXECUTED_STATUS) {
      throw new ConflictException('已执行的扣减不可删除');
    }
    const now: Date = new Date();
    const updated: { id: number }[] = await this.db
      .update(financeDeductions)
      .set({ deletedAt: now, updatedAt: now })
      .where(
        and(
          eq(financeDeductions.id, id),
          isNull(financeDeductions.deletedAt),
        ),
      )
      .returning({ id: financeDeductions.id });
    if (updated.length === 0) {
      throw new NotFoundException('扣减记录不存在');
    }
    return { success: true };
  }

  async findConsumptions(
    query: ConsumptionListQuery,
  ): Promise<FinanceConsumptionListResult> {
    const conditions: (SQL | undefined)[] = [
      isNull(financeConsumptions.deletedAt),
    ];
    if (query.consumptionDateFrom) {
      conditions.push(
        gte(
          financeConsumptions.consumptionDate,
          validateDateText(query.consumptionDateFrom, '开始日期'),
        ),
      );
    }
    if (query.consumptionDateTo) {
      conditions.push(
        lte(
          financeConsumptions.consumptionDate,
          validateDateText(query.consumptionDateTo, '结束日期'),
        ),
      );
    }
    if (query.status) {
      conditions.push(eq(financeConsumptions.status, query.status));
    }
    const totalRows: { count: number | string }[] = await this.db
      .select({ count: count() })
      .from(financeConsumptions)
      .where(and(...conditions));
    const rows: ConsumptionRow[] = await this.db
      .select()
      .from(financeConsumptions)
      .where(and(...conditions))
      .orderBy(desc(financeConsumptions.id))
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize);
    return {
      items: rows.map((row: ConsumptionRow): FinanceConsumption =>
        mapConsumption(row),
      ),
      total: Number(totalRows[0]?.count ?? 0),
    };
  }

  async createConsumption(
    dto: CreateFinanceConsumptionRequest,
  ): Promise<FinanceConsumption> {
    requireText(dto.customerId, '客户ID');
    const consumptionDate: string = validateDateText(
      dto.consumptionDate,
      '消耗日期',
    );
    const amount: number = Number(dto.amount);
    assertPositiveAmount(amount, '消耗金额');
    const platformData: number =
      dto.platformData !== undefined ? Number(dto.platformData) : amount;
    const systemData: number =
      dto.systemData !== undefined ? Number(dto.systemData) : amount;
    const difference: number = round2(platformData - systemData);
    const result = await insertWithSeqNo<ConsumptionRow>({
      db: this.db,
      table: financeConsumptions,
      noColumn: financeConsumptions.consumptionNo,
      prefix: CONSUMPTION_NO_PREFIX,
      insert: (consumptionNo: string): Promise<ConsumptionRow[]> =>
        this.db
          .insert(financeConsumptions)
          .values({
            consumptionNo,
            customerId: dto.customerId,
            adAccountId: dto.adAccountId ?? '',
            portId: dto.portId ?? null,
            consumptionDate,
            amount: amount.toFixed(2),
            platformData: platformData.toFixed(2),
            systemData: systemData.toFixed(2),
            difference: difference.toFixed(2),
            status: CONSUMPTION_PENDING_CHECK_STATUS,
            checker: '',
            remark: dto.remark ?? '',
          })
          .returning(),
    });
    this.logger.log(`消耗记录创建成功: ${result.no}`);
    publishSyncEvent('finance_consumptions', result.id, 'create');
    return mapConsumption(result.row);
  }

  async updateConsumption(
    id: number,
    dto: UpdateConsumptionInput,
  ): Promise<{ success: boolean }> {
    const row: ConsumptionRow = await this.getConsumption(id);
    if (row.status === CONSUMPTION_CHECKED_STATUS) {
      throw new ConflictException('已核对的消耗记录不可修改');
    }
    const patch: Partial<typeof financeConsumptions.$inferInsert> = {};
    if (dto.customerId !== undefined) {
      patch.customerId = requireText(dto.customerId, '客户ID');
    }
    if (dto.adAccountId !== undefined) {
      patch.adAccountId = dto.adAccountId;
    }
    if (dto.portId !== undefined) {
      patch.portId = dto.portId;
    }
    if (dto.consumptionDate !== undefined) {
      patch.consumptionDate = validateDateText(dto.consumptionDate, '消耗日期');
    }
    if (dto.amount !== undefined) {
      assertPositiveAmount(dto.amount, '消耗金额');
      patch.amount = Number(dto.amount).toFixed(2);
    }
    if (dto.platformData !== undefined) {
      patch.platformData = Number(dto.platformData).toFixed(2);
    }
    if (dto.systemData !== undefined) {
      patch.systemData = Number(dto.systemData).toFixed(2);
    }
    if (dto.remark !== undefined) {
      patch.remark = dto.remark;
    }
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }
    if (dto.platformData !== undefined || dto.systemData !== undefined) {
      const platform: number =
        dto.platformData !== undefined
          ? Number(dto.platformData)
          : Number(row.platformData);
      const system: number =
        dto.systemData !== undefined
          ? Number(dto.systemData)
          : Number(row.systemData);
      patch.difference = round2(platform - system).toFixed(2);
    }
    patch.updatedAt = new Date();
    const updated: { id: number }[] = await this.db
      .update(financeConsumptions)
      .set(patch)
      .where(
        and(
          eq(financeConsumptions.id, id),
          isNull(financeConsumptions.deletedAt),
        ),
      )
      .returning({ id: financeConsumptions.id });
    if (updated.length === 0) {
      throw new NotFoundException('消耗记录不存在');
    }
    publishSyncEvent('finance_consumptions', updated[0].id, 'update');
    return { success: true };
  }

  async checkConsumption(
    id: number,
    checker: string,
  ): Promise<{ success: boolean }> {
    const row: ConsumptionRow = await this.getConsumption(id);
    if (row.status === CONSUMPTION_CHECKED_STATUS) {
      throw new ConflictException('已核对的消耗记录无需再次核对');
    }
    const difference: number = Number(row.difference);
    const now: Date = new Date();
    const updated: { id: number }[] = await this.db
      .update(financeConsumptions)
      .set({
        status:
          difference !== 0
            ? CONSUMPTION_DIFFERENCE_STATUS
            : CONSUMPTION_CHECKED_STATUS,
        checker,
        checkTime: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(financeConsumptions.id, id),
          isNull(financeConsumptions.deletedAt),
        ),
      )
      .returning({ id: financeConsumptions.id });
    if (updated.length === 0) {
      throw new NotFoundException('消耗记录不存在');
    }
    publishSyncEvent('finance_consumptions', updated[0].id, 'update');
    return { success: true };
  }

  private async getRebate(id: number): Promise<RebateRow> {
    const rows: RebateRow[] = await this.db
      .select()
      .from(financeRebates)
      .where(and(eq(financeRebates.id, id), isNull(financeRebates.deletedAt)));
    if (rows.length === 0) {
      throw new NotFoundException('后返记录不存在');
    }
    return rows[0];
  }

  private async getDeduction(id: number): Promise<DeductionRow> {
    const rows: DeductionRow[] = await this.db
      .select()
      .from(financeDeductions)
      .where(
        and(
          eq(financeDeductions.id, id),
          isNull(financeDeductions.deletedAt),
        ),
      );
    if (rows.length === 0) {
      throw new NotFoundException('扣减记录不存在');
    }
    return rows[0];
  }

  private async getConsumption(id: number): Promise<ConsumptionRow> {
    const rows: ConsumptionRow[] = await this.db
      .select()
      .from(financeConsumptions)
      .where(
        and(
          eq(financeConsumptions.id, id),
          isNull(financeConsumptions.deletedAt),
        ),
      );
    if (rows.length === 0) {
      throw new NotFoundException('消耗记录不存在');
    }
    return rows[0];
  }

  private async loadPortNames(portIds: number[]): Promise<Map<number, string>> {
    const uniqueIds: number[] = [
      ...new Set(portIds.filter((value: number): boolean => value > 0)),
    ];
    const portNameById: Map<number, string> = new Map<number, string>();
    if (uniqueIds.length === 0) {
      return portNameById;
    }
    const ports: { id: number; portName: string }[] = await this.db
      .select({ id: financePorts.id, portName: financePorts.portName })
      .from(financePorts)
      .where(inArray(financePorts.id, uniqueIds));
    for (const port of ports) {
      portNameById.set(port.id, port.portName);
    }
    return portNameById;
  }
}
