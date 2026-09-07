import {
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
} from 'drizzle-orm';
import {
  adAccounts,
  commissionRecords,
  commissionRules,
} from '@server/database/schema';
import type {
  CalculateCommissionRequest,
  CommissionRecord,
  CommissionRecordDetail,
  CommissionRecordListParams,
  CommissionRecordListResult,
  CommissionRecordStatus,
  CommissionRule,
} from '@shared/api.interface';
import { MAX_SEQ_RETRY, buildSeqNo, isUniqueViolation } from '../seq.util';
import { formatYMD } from '../query.util';
import { mapCommissionRule } from './commission-rules.service';

type RecordRow = typeof commissionRecords.$inferSelect;
type RecordInsert = typeof commissionRecords.$inferInsert;
type AccountRow = typeof adAccounts.$inferSelect;
type RuleRow = typeof commissionRules.$inferSelect;

const RECORD_NO_PREFIX: string = 'TC';
const PENDING_STATUS: string = '待发放';
const PAID_STATUS: string = '已发放';
const ACCOUNT_CANCELLED_STATUS: string = '注销';
const FIXED_RULE_TYPE: string = '固定金额';

const RECORD_STATUSES: CommissionRecordStatus[] = ['待发放', '已发放', '取消'];

const toRecordStatus = (value: string): CommissionRecordStatus =>
  RECORD_STATUSES.includes(value as CommissionRecordStatus)
    ? (value as CommissionRecordStatus)
    : '待发放';

const mapCommissionRecord = (row: RecordRow): CommissionRecord => ({
  id: row.id,
  recordNo: row.recordNo,
  salesperson: row.salesperson,
  accountId: row.accountId ?? null,
  accountName: row.accountName,
  groupName: row.groupName,
  platform: row.platform,
  period: row.period,
  consumeAmount: Number(row.consumeAmount),
  ruleId: row.ruleId ?? null,
  commissionAmount: Number(row.commissionAmount),
  status: toRecordStatus(row.status),
  calculatedAt: row.calculatedAt ? row.calculatedAt.toISOString() : null,
  paidAt: row.paidAt ? row.paidAt.toISOString() : null,
  paidBy: row.paidBy ?? '',
  remark: row.remark,
  createdAt: row.createdAt.toISOString(),
});

@Injectable()
export class CommissionRecordsService {
  private readonly logger: Logger = new Logger(CommissionRecordsService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
  ) {}

  async findAll(
    params: CommissionRecordListParams,
  ): Promise<CommissionRecordListResult> {
    const page: number = Math.max(params.page ?? 1, 1);
    const pageSize: number = Math.min(Math.max(params.pageSize ?? 20, 1), 100);

    const conditions = [isNull(commissionRecords.deletedAt)];
    if (params.recordNo) {
      conditions.push(
        ilike(commissionRecords.recordNo, `%${params.recordNo}%`),
      );
    }
    if (params.salesperson) {
      conditions.push(eq(commissionRecords.salesperson, params.salesperson));
    }
    if (params.accountName) {
      conditions.push(
        ilike(commissionRecords.accountName, `%${params.accountName}%`),
      );
    }
    if (params.groupName) {
      conditions.push(
        ilike(commissionRecords.groupName, `%${params.groupName}%`),
      );
    }
    if (params.platform) {
      conditions.push(eq(commissionRecords.platform, params.platform));
    }
    if (params.period) {
      conditions.push(eq(commissionRecords.period, params.period));
    }
    if (params.status) {
      conditions.push(eq(commissionRecords.status, params.status));
    }
    const where = and(...conditions);

    const rows: RecordRow[] = await this.db
      .select()
      .from(commissionRecords)
      .where(where)
      .orderBy(desc(commissionRecords.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const totalResult: { count: number | string }[] = await this.db
      .select({ count: count() })
      .from(commissionRecords)
      .where(where);
    const total: number = Number(totalResult[0]?.count ?? 0);

    return {
      items: rows.map(
        (row: RecordRow): CommissionRecord => mapCommissionRecord(row),
      ),
      total,
    };
  }

  async detail(id: string): Promise<CommissionRecordDetail> {
    const rows: RecordRow[] = await this.db
      .select()
      .from(commissionRecords)
      .where(
        and(eq(commissionRecords.id, id), isNull(commissionRecords.deletedAt)),
      );
    if (rows.length === 0) {
      throw new NotFoundException('提成记录不存在');
    }
    const record: CommissionRecord = mapCommissionRecord(rows[0]);

    let rule: CommissionRule | null = null;
    if (record.ruleId) {
      const ruleRows: RuleRow[] = await this.db
        .select()
        .from(commissionRules)
        .where(eq(commissionRules.id, record.ruleId));
      if (ruleRows.length > 0) {
        rule = mapCommissionRule(ruleRows[0]);
      }
    }
    return { ...record, rule };
  }

  /** 匹配提成规则：平台/端口一致或规则侧为空、消耗在区间内、当天在生效期内；多条命中取 minAmount 最大 */
  private matchRule(
    account: AccountRow,
    rules: CommissionRule[],
    today: string,
  ): CommissionRule | null {
    const consume: number = Number(account.totalConsume);
    const matched: CommissionRule[] = rules.filter(
      (rule: CommissionRule): boolean => {
        if (rule.platform !== '' && rule.platform !== account.platform) {
          return false;
        }
        if (rule.portType !== '' && rule.portType !== account.portType) {
          return false;
        }
        if (rule.minAmount !== null && consume < rule.minAmount) {
          return false;
        }
        if (rule.maxAmount !== null && consume >= rule.maxAmount) {
          return false;
        }
        if (rule.effectiveDate !== null && today < rule.effectiveDate) {
          return false;
        }
        if (rule.expireDate !== null && today > rule.expireDate) {
          return false;
        }
        return true;
      },
    );
    if (matched.length === 0) {
      return null;
    }
    return matched.reduce(
      (best: CommissionRule, rule: CommissionRule): CommissionRule =>
        (rule.minAmount ?? -1) > (best.minAmount ?? -1) ? rule : best,
      matched[0],
    );
  }

  private buildCommissionAmount(rule: CommissionRule, consume: number): number {
    if (rule.ruleType === FIXED_RULE_TYPE) {
      return rule.fixedAmount ?? 0;
    }
    const amount: number = (consume * (rule.rate ?? 0)) / 100;
    return Math.round(amount * 100) / 100;
  }

  private async calculateOnce(
    dto: CalculateCommissionRequest,
    rules: CommissionRule[],
  ): Promise<number> {
    let created: number = 0;
    await this.db.transaction(async (tx) => {
      const conditions = [
        isNull(adAccounts.deletedAt),
        ne(adAccounts.status, ACCOUNT_CANCELLED_STATUS),
      ];
      if (dto.salesperson) {
        conditions.push(eq(adAccounts.salesperson, dto.salesperson));
      }
      const accounts: AccountRow[] = await tx
        .select()
        .from(adAccounts)
        .where(and(...conditions));
      if (accounts.length === 0) {
        return;
      }

      const now: Date = new Date();
      const today: string = formatYMD(now);
      const yearMonth: string = `${String(now.getFullYear()).slice(2)}${String(
        now.getMonth() + 1,
      ).padStart(2, '0')}`;
      const existingRows: { count: number | string }[] = await tx
        .select({ count: count() })
        .from(commissionRecords)
        .where(
          like(
            commissionRecords.recordNo,
            `${RECORD_NO_PREFIX}${yearMonth}%`,
          ),
        );
      const baseSeq: number = Number(existingRows[0]?.count ?? 0) + 1;

      const values: RecordInsert[] = [];
      for (let index: number = 0; index < accounts.length; index += 1) {
        const account: AccountRow = accounts[index];
        const rule: CommissionRule | null = this.matchRule(
          account,
          rules,
          today,
        );
        if (rule === null) {
          continue;
        }
        const consume: number = Number(account.totalConsume);
        values.push({
          recordNo: buildSeqNo(
            RECORD_NO_PREFIX,
            yearMonth,
            baseSeq + values.length,
          ),
          salesperson: account.salesperson,
          accountId: account.id,
          accountName: account.accountName,
          groupName: account.groupName,
          platform: account.platform,
          period: dto.period,
          consumeAmount: String(consume),
          ruleId: rule.id,
          commissionAmount: String(this.buildCommissionAmount(rule, consume)),
          status: PENDING_STATUS,
          calculatedAt: now,
          remark: '',
        });
      }
      if (values.length === 0) {
        return;
      }
      const inserted: { id: string }[] = await tx
        .insert(commissionRecords)
        .values(values)
        .returning({ id: commissionRecords.id });
      created = inserted.length;
    });
    return created;
  }

  async calculate(
    dto: CalculateCommissionRequest,
    rules: CommissionRule[],
  ): Promise<{ created: number }> {
    let created: number = 0;
    for (let attempt: number = 0; attempt < MAX_SEQ_RETRY; attempt += 1) {
      try {
        created = await this.calculateOnce(dto, rules);
        break;
      } catch (error: unknown) {
        if (isUniqueViolation(error) && attempt < MAX_SEQ_RETRY - 1) {
          this.logger.log(`提成记录编号冲突，重试第 ${attempt + 1} 次`);
          continue;
        }
        throw error;
      }
    }
    this.logger.log(`提成计算完成: 生成 ${created} 条记录`);
    return { created };
  }

  async pay(ids: string[], operatorId: string): Promise<{ paid: number }> {
    const now: Date = new Date();
    const updated: { id: string }[] = await this.db
      .update(commissionRecords)
      .set({
        status: PAID_STATUS,
        paidAt: now,
        paidBy: operatorId,
        updatedAt: now,
        updatedBy: operatorId,
      })
      .where(
        and(
          inArray(commissionRecords.id, ids),
          eq(commissionRecords.status, PENDING_STATUS),
          isNull(commissionRecords.deletedAt),
        ),
      )
      .returning({ id: commissionRecords.id });
    this.logger.log(`提成发放完成: ${updated.length} 条`);
    return { paid: updated.length };
  }

  async remove(id: string): Promise<{ success: boolean }> {
    const now: Date = new Date();
    const updated: { id: string }[] = await this.db
      .update(commissionRecords)
      .set({ deletedAt: now, updatedAt: now })
      .where(
        and(eq(commissionRecords.id, id), isNull(commissionRecords.deletedAt)),
      )
      .returning({ id: commissionRecords.id });
    if (updated.length === 0) {
      throw new NotFoundException('提成记录不存在');
    }
    return { success: true };
  }
}
