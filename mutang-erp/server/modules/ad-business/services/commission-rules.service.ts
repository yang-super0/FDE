import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { and, count, desc, eq, ilike, inArray, isNull } from 'drizzle-orm';
import { commissionRules } from '@server/database/schema';
import type {
  CommissionRule,
  CommissionRuleListParams,
  CommissionRuleListResult,
  CommissionRuleStatus,
  CommissionRuleType,
  CreateCommissionRuleRequest,
  UpdateCommissionRuleRequest,
} from '@shared/api.interface';

type RuleRow = typeof commissionRules.$inferSelect;
type RuleInsert = typeof commissionRules.$inferInsert;

const STATUS_ENABLED: string = '启用';
const STATUS_DISABLED: string = '停用';
const FIXED_RULE_TYPE: string = '固定金额';
const RATE_RULE_TYPES: CommissionRuleType[] = ['按比例', '阶梯'];

const RULE_TYPES: CommissionRuleType[] = ['按比例', '固定金额', '阶梯'];
const RULE_STATUSES: CommissionRuleStatus[] = ['启用', '停用'];

const toRuleType = (value: string): CommissionRuleType =>
  RULE_TYPES.includes(value as CommissionRuleType)
    ? (value as CommissionRuleType)
    : '按比例';

const toRuleStatus = (value: string): CommissionRuleStatus =>
  RULE_STATUSES.includes(value as CommissionRuleStatus)
    ? (value as CommissionRuleStatus)
    : '启用';

const toNumeric = (value: string | null): number | null =>
  value === null ? null : Number(value);

export const mapCommissionRule = (row: RuleRow): CommissionRule => ({
  id: row.id,
  ruleName: row.ruleName,
  ruleType: toRuleType(row.ruleType),
  platform: row.platform,
  portType: row.portType,
  minAmount: toNumeric(row.minAmount),
  maxAmount: toNumeric(row.maxAmount),
  rate: toNumeric(row.rate),
  fixedAmount: toNumeric(row.fixedAmount),
  status: toRuleStatus(row.status),
  effectiveDate: row.effectiveDate ?? null,
  expireDate: row.expireDate ?? null,
  createdBy: row.createdBy,
  remark: row.remark,
  createdAt: row.createdAt.toISOString(),
});

@Injectable()
export class CommissionRulesService {
  private readonly logger: Logger = new Logger(CommissionRulesService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
  ) {}

  async findAll(
    params: CommissionRuleListParams,
  ): Promise<CommissionRuleListResult> {
    const page: number = Math.max(params.page ?? 1, 1);
    const pageSize: number = Math.min(Math.max(params.pageSize ?? 20, 1), 100);

    const conditions = [isNull(commissionRules.deletedAt)];
    if (params.ruleName) {
      conditions.push(ilike(commissionRules.ruleName, `%${params.ruleName}%`));
    }
    if (params.ruleType) {
      conditions.push(eq(commissionRules.ruleType, params.ruleType));
    }
    if (params.platform) {
      conditions.push(eq(commissionRules.platform, params.platform));
    }
    if (params.status) {
      conditions.push(eq(commissionRules.status, params.status));
    }
    const where = and(...conditions);

    const rows: RuleRow[] = await this.db
      .select()
      .from(commissionRules)
      .where(where)
      .orderBy(desc(commissionRules.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const totalResult: { count: number | string }[] = await this.db
      .select({ count: count() })
      .from(commissionRules)
      .where(where);
    const total: number = Number(totalResult[0]?.count ?? 0);

    return {
      items: rows.map((row: RuleRow): CommissionRule => mapCommissionRule(row)),
      total,
    };
  }

  async create(
    dto: CreateCommissionRuleRequest,
    operatorId: string,
  ): Promise<{ id: string }> {
    if (RATE_RULE_TYPES.includes(dto.ruleType) && dto.rate === undefined) {
      throw new BadRequestException('按比例/阶梯规则必须填写提成比例');
    }
    if (dto.ruleType === FIXED_RULE_TYPE && dto.fixedAmount === undefined) {
      throw new BadRequestException('固定金额规则必须填写固定金额');
    }

    const values: RuleInsert = {
      ruleName: dto.ruleName.trim(),
      ruleType: dto.ruleType,
      platform: dto.platform?.trim() ?? '',
      portType: dto.portType?.trim() ?? '',
      minAmount: dto.minAmount !== undefined ? String(dto.minAmount) : null,
      maxAmount: dto.maxAmount !== undefined ? String(dto.maxAmount) : null,
      rate: dto.rate !== undefined ? String(dto.rate) : null,
      fixedAmount:
        dto.fixedAmount !== undefined ? String(dto.fixedAmount) : null,
      status: STATUS_ENABLED,
      effectiveDate: dto.effectiveDate ?? null,
      expireDate: dto.expireDate ?? null,
      createdBy: operatorId,
      remark: dto.remark ?? '',
    };
    const inserted: { id: string }[] = await this.db
      .insert(commissionRules)
      .values(values)
      .returning({ id: commissionRules.id });
    if (inserted.length === 0) {
      throw new BadRequestException('创建失败');
    }
    this.logger.log(`提成规则创建成功: ${dto.ruleName.trim()}`);
    return { id: inserted[0].id };
  }

  async update(
    id: string,
    dto: UpdateCommissionRuleRequest,
  ): Promise<{ success: boolean }> {
    const patch: Partial<RuleInsert> = {};
    if (dto.ruleName !== undefined) {
      patch.ruleName = dto.ruleName.trim();
    }
    if (dto.ruleType !== undefined) {
      patch.ruleType = dto.ruleType;
    }
    if (dto.platform !== undefined) {
      patch.platform = dto.platform.trim();
    }
    if (dto.portType !== undefined) {
      patch.portType = dto.portType.trim();
    }
    if (dto.minAmount !== undefined) {
      patch.minAmount = String(dto.minAmount);
    }
    if (dto.maxAmount !== undefined) {
      patch.maxAmount = String(dto.maxAmount);
    }
    if (dto.rate !== undefined) {
      patch.rate = String(dto.rate);
    }
    if (dto.fixedAmount !== undefined) {
      patch.fixedAmount = String(dto.fixedAmount);
    }
    if (dto.effectiveDate !== undefined) {
      patch.effectiveDate = dto.effectiveDate;
    }
    if (dto.expireDate !== undefined) {
      patch.expireDate = dto.expireDate;
    }
    if (dto.status !== undefined) {
      patch.status = dto.status;
    }
    if (dto.remark !== undefined) {
      patch.remark = dto.remark;
    }
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }
    patch.updatedAt = new Date();

    const updated: { id: string }[] = await this.db
      .update(commissionRules)
      .set(patch)
      .where(
        and(eq(commissionRules.id, id), isNull(commissionRules.deletedAt)),
      )
      .returning({ id: commissionRules.id });
    if (updated.length === 0) {
      throw new NotFoundException('提成规则不存在');
    }
    return { success: true };
  }

  async remove(id: string): Promise<{ success: boolean }> {
    const now: Date = new Date();
    const updated: { id: string }[] = await this.db
      .update(commissionRules)
      .set({ deletedAt: now, updatedAt: now })
      .where(
        and(eq(commissionRules.id, id), isNull(commissionRules.deletedAt)),
      )
      .returning({ id: commissionRules.id });
    if (updated.length === 0) {
      throw new NotFoundException('提成规则不存在');
    }
    return { success: true };
  }

  async batchStatus(ids: string[], status: string): Promise<{ updated: number }> {
    if (status !== STATUS_ENABLED && status !== STATUS_DISABLED) {
      throw new BadRequestException('状态仅支持启用/停用');
    }
    const updated: { id: string }[] = await this.db
      .update(commissionRules)
      .set({ status, updatedAt: new Date() })
      .where(
        and(inArray(commissionRules.id, ids), isNull(commissionRules.deletedAt)),
      )
      .returning({ id: commissionRules.id });
    return { updated: updated.length };
  }

  async listEnabled(): Promise<CommissionRule[]> {
    const rows: RuleRow[] = await this.db
      .select()
      .from(commissionRules)
      .where(
        and(
          eq(commissionRules.status, STATUS_ENABLED),
          isNull(commissionRules.deletedAt),
        ),
      );
    return rows.map((row: RuleRow): CommissionRule => mapCommissionRule(row));
  }
}
