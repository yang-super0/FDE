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
import {
  and,
  count,
  desc,
  eq,
  ilike,
  isNull,
  lt,
  sql,
} from 'drizzle-orm';
import {
  adAccountTransfers,
  adAccounts,
  adFilings,
} from '@server/database/schema';
import type {
  AdAccount,
  AdAccountDetail,
  AdAccountListParams,
  AdAccountListResult,
  AdAccountStatus,
  AdFilingBrief,
  AdTransferBrief,
  CreateAdAccountRequest,
  RechargeRequest,
  UpdateAdAccountRequest,
} from '@shared/api.interface';
import {
  batchInsertWithSeqNo,
  insertWithSeqNo,
} from '../seq.util';
import { publishSyncEvent } from '@server/modules/feishu-sync/sync-event.publisher';

type AccountRow = typeof adAccounts.$inferSelect;
type AccountInsert = typeof adAccounts.$inferInsert;

const ACCOUNT_NO_PREFIX: string = 'AC';
const STATUS_NORMAL: string = '正常';
const LOW_BALANCE_THRESHOLD: string = '500';
const DETAIL_SUB_LIMIT: number = 20;

const ACCOUNT_STATUSES: AdAccountStatus[] = [
  '正常',
  '暂停',
  '欠费',
  '注销',
];

const toAccountStatus = (value: string): AdAccountStatus =>
  ACCOUNT_STATUSES.includes(value as AdAccountStatus)
    ? (value as AdAccountStatus)
    : '正常';

export const mapAdAccount = (row: AccountRow): AdAccount => ({
  id: row.id,
  accountNo: row.accountNo,
  accountName: row.accountName,
  groupName: row.groupName,
  subjectName: row.subjectName,
  platform: row.platform,
  portType: row.portType,
  status: toAccountStatus(row.status),
  balance: Number(row.balance),
  totalRecharge: Number(row.totalRecharge),
  totalConsume: Number(row.totalConsume),
  salesperson: row.salesperson,
  openedAt: row.openedAt ? row.openedAt.toISOString() : null,
  applicationId: row.applicationId ?? null,
  remark: row.remark,
  createdAt: row.createdAt.toISOString(),
});

const buildInsertValues = (
  item: CreateAdAccountRequest,
  accountNo: string,
  operatorId: string,
): AccountInsert => ({
  accountNo,
  accountName: item.accountName.trim(),
  groupName: item.groupName?.trim() ?? '',
  subjectName: item.subjectName?.trim() ?? '',
  platform: item.platform.trim(),
  portType: item.portType?.trim() || undefined,
  status: STATUS_NORMAL,
  balance: String(item.balance ?? 0),
  totalRecharge: String(item.balance ?? 0),
  salesperson: item.salesperson ?? operatorId,
  openedAt: new Date(),
  remark: item.remark ?? '',
});

@Injectable()
export class AccountsService {
  private readonly logger: Logger = new Logger(AccountsService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
  ) {}

  async findAll(params: AdAccountListParams): Promise<AdAccountListResult> {
    const page: number = Math.max(params.page ?? 1, 1);
    const pageSize: number = Math.min(Math.max(params.pageSize ?? 20, 1), 100);

    const conditions = [isNull(adAccounts.deletedAt)];
    if (params.accountNo) {
      conditions.push(ilike(adAccounts.accountNo, `%${params.accountNo}%`));
    }
    if (params.accountName) {
      conditions.push(
        ilike(adAccounts.accountName, `%${params.accountName}%`),
      );
    }
    if (params.groupName) {
      conditions.push(ilike(adAccounts.groupName, `%${params.groupName}%`));
    }
    if (params.subjectName) {
      conditions.push(
        ilike(adAccounts.subjectName, `%${params.subjectName}%`),
      );
    }
    if (params.platform) {
      conditions.push(eq(adAccounts.platform, params.platform));
    }
    if (params.portType) {
      conditions.push(eq(adAccounts.portType, params.portType));
    }
    if (params.status) {
      conditions.push(eq(adAccounts.status, params.status));
    }
    if (params.salesperson) {
      conditions.push(eq(adAccounts.salesperson, params.salesperson));
    }
    if (params.lowBalance) {
      conditions.push(lt(adAccounts.balance, LOW_BALANCE_THRESHOLD));
    }
    const where = and(...conditions);

    const rows: AccountRow[] = await this.db
      .select()
      .from(adAccounts)
      .where(where)
      .orderBy(desc(adAccounts.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const totalResult: { count: number | string }[] = await this.db
      .select({ count: count() })
      .from(adAccounts)
      .where(where);
    const total: number = Number(totalResult[0]?.count ?? 0);

    return {
      items: rows.map((row: AccountRow): AdAccount => mapAdAccount(row)),
      total,
    };
  }

  async create(
    dto: CreateAdAccountRequest,
    operatorId: string,
  ): Promise<{ id: string }> {
    const result: { id: string; no: string } = await insertWithSeqNo({
      db: this.db,
      table: adAccounts,
      noColumn: adAccounts.accountNo,
      prefix: ACCOUNT_NO_PREFIX,
      insert: (accountNo: string): Promise<{ id: string }[]> =>
        this.db
          .insert(adAccounts)
          .values(buildInsertValues(dto, accountNo, operatorId))
          .returning({ id: adAccounts.id }),
    });
    this.logger.log(`广告账户创建成功: ${result.no}`);
    publishSyncEvent('ad_accounts', result.id, 'create');
    return { id: result.id };
  }

  async batchCreate(
    items: CreateAdAccountRequest[],
    operatorId: string,
  ): Promise<{ created: number }> {
    const created: number = await batchInsertWithSeqNo<AccountInsert>({
      db: this.db,
      table: adAccounts,
      noColumn: adAccounts.accountNo,
      prefix: ACCOUNT_NO_PREFIX,
      size: items.length,
      buildValues: (nos: string[]): AccountInsert[] =>
        items.map(
          (item: CreateAdAccountRequest, index: number): AccountInsert =>
            buildInsertValues(item, nos[index], operatorId),
        ),
      insert: async (
        values: AccountInsert[],
      ): Promise<{ id: string }[]> => {
        const inserted: { id: string }[] = await this.db
          .insert(adAccounts)
          .values(values)
          .returning({ id: adAccounts.id });
        inserted.forEach((row: { id: string }) => {
          publishSyncEvent('ad_accounts', row.id, 'create');
        });
        return inserted;
      },
    });
    this.logger.log(`广告账户批量创建成功: ${created} 条`);
    return { created };
  }

  async update(
    id: string,
    dto: UpdateAdAccountRequest,
    operatorId: string,
  ): Promise<{ success: boolean }> {
    const patch: Partial<AccountInsert> = {};
    if (dto.accountName !== undefined) {
      patch.accountName = dto.accountName.trim();
    }
    if (dto.groupName !== undefined) {
      patch.groupName = dto.groupName.trim();
    }
    if (dto.subjectName !== undefined) {
      patch.subjectName = dto.subjectName.trim();
    }
    if (dto.platform !== undefined) {
      patch.platform = dto.platform.trim();
    }
    if (dto.portType !== undefined) {
      patch.portType = dto.portType;
    }
    if (dto.balance !== undefined) {
      patch.balance = String(dto.balance);
    }
    if (dto.salesperson !== undefined) {
      patch.salesperson = dto.salesperson;
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
    patch.updatedBy = operatorId;

    const updated: { id: string }[] = await this.db
      .update(adAccounts)
      .set(patch)
      .where(and(eq(adAccounts.id, id), isNull(adAccounts.deletedAt)))
      .returning({ id: adAccounts.id });
    if (updated.length === 0) {
      throw new NotFoundException('广告账户不存在');
    }
    publishSyncEvent('ad_accounts', updated[0].id, 'update');
    return { success: true };
  }

  async remove(id: string): Promise<{ success: boolean }> {
    const now: Date = new Date();
    const updated: { id: string }[] = await this.db
      .update(adAccounts)
      .set({ deletedAt: now, updatedAt: now })
      .where(and(eq(adAccounts.id, id), isNull(adAccounts.deletedAt)))
      .returning({ id: adAccounts.id });
    if (updated.length === 0) {
      throw new NotFoundException('广告账户不存在');
    }
    publishSyncEvent('ad_accounts', updated[0].id, 'delete');
    return { success: true };
  }

  async detail(id: string): Promise<AdAccountDetail> {
    const rows: AccountRow[] = await this.db
      .select()
      .from(adAccounts)
      .where(and(eq(adAccounts.id, id), isNull(adAccounts.deletedAt)));
    if (rows.length === 0) {
      throw new NotFoundException('广告账户不存在');
    }
    const account: AdAccount = mapAdAccount(rows[0]);

    const filingRows: {
      id: string;
      filingNo: string;
      productName: string;
      status: string;
      createdAt: Date;
    }[] = await this.db
      .select({
        id: adFilings.id,
        filingNo: adFilings.filingNo,
        productName: adFilings.productName,
        status: adFilings.status,
        createdAt: adFilings.createdAt,
      })
      .from(adFilings)
      .where(and(eq(adFilings.accountId, id), isNull(adFilings.deletedAt)))
      .orderBy(desc(adFilings.createdAt))
      .limit(DETAIL_SUB_LIMIT);

    const transferRows: {
      id: string;
      transferNo: string;
      toSubject: string;
      status: string;
      createdAt: Date;
    }[] = await this.db
      .select({
        id: adAccountTransfers.id,
        transferNo: adAccountTransfers.transferNo,
        toSubject: adAccountTransfers.toSubject,
        status: adAccountTransfers.status,
        createdAt: adAccountTransfers.createdAt,
      })
      .from(adAccountTransfers)
      .where(
        and(
          eq(adAccountTransfers.accountId, id),
          isNull(adAccountTransfers.deletedAt),
        ),
      )
      .orderBy(desc(adAccountTransfers.createdAt))
      .limit(DETAIL_SUB_LIMIT);

    return {
      ...account,
      filings: filingRows.map(
        (row: {
          id: string;
          filingNo: string;
          productName: string;
          status: string;
          createdAt: Date;
        }): AdFilingBrief => ({
          id: row.id,
          filingNo: row.filingNo,
          productName: row.productName,
          status: row.status,
          createdAt: row.createdAt.toISOString(),
        }),
      ),
      transfers: transferRows.map(
        (row: {
          id: string;
          transferNo: string;
          toSubject: string;
          status: string;
          createdAt: Date;
        }): AdTransferBrief => ({
          id: row.id,
          transferNo: row.transferNo,
          toSubject: row.toSubject,
          status: row.status,
          createdAt: row.createdAt.toISOString(),
        }),
      ),
    };
  }

  async recharge(
    id: string,
    dto: RechargeRequest,
    operatorId: string,
  ): Promise<{ success: boolean }> {
    const amount: number = dto.amount;
    const updated: { id: string }[] = await this.db
      .update(adAccounts)
      .set({
        balance: sql`${adAccounts.balance} + ${amount}`,
        totalRecharge: sql`${adAccounts.totalRecharge} + ${amount}`,
        updatedAt: new Date(),
        updatedBy: operatorId,
      })
      .where(and(eq(adAccounts.id, id), isNull(adAccounts.deletedAt)))
      .returning({ id: adAccounts.id });
    if (updated.length === 0) {
      throw new NotFoundException('广告账户不存在');
    }
    this.logger.log(`广告账户充值成功: ${id}, 金额 ${String(amount)}`);
    publishSyncEvent('ad_accounts', updated[0].id, 'update');
    return { success: true };
  }
}
