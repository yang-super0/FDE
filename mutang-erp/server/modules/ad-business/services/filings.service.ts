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
import { adAccounts, adFilings } from '@server/database/schema';
import type {
  AdFiling,
  AdFilingListParams,
  AdFilingListResult,
  AdFilingStatus,
  CreateAdFilingRequest,
  ReviewFilingRequest,
} from '@shared/api.interface';
import {
  batchInsertWithSeqNo,
  insertWithSeqNo,
} from '../seq.util';

type FilingRow = typeof adFilings.$inferSelect;
type FilingInsert = typeof adFilings.$inferInsert;
type AccountRow = typeof adAccounts.$inferSelect;

/** 与 CreateAdFilingRequest 对应的更新请求（shared 未单独定义） */
export type UpdateAdFilingRequest = Partial<CreateAdFilingRequest>;

const FILING_NO_PREFIX: string = 'BB';
const PENDING_STATUS: string = '待审核';
const FILED_STATUS: string = '已报备';
const REJECTED_STATUS: string = '驳回';

const FILING_STATUSES: AdFilingStatus[] = [
  '待审核',
  '通过',
  '驳回',
  '已报备',
];

const toFilingStatus = (value: string): AdFilingStatus =>
  FILING_STATUSES.includes(value as AdFilingStatus)
    ? (value as AdFilingStatus)
    : '待审核';

const mapFiling = (row: FilingRow): AdFiling => ({
  id: row.id,
  filingNo: row.filingNo,
  accountId: row.accountId ?? null,
  accountName: row.accountName,
  groupName: row.groupName,
  subjectName: row.subjectName,
  platform: row.platform,
  industry: row.industry,
  productName: row.productName,
  status: toFilingStatus(row.status),
  applicant: row.applicant,
  reviewer: row.reviewer ?? '',
  reviewedAt: row.reviewedAt ? row.reviewedAt.toISOString() : null,
  rejectReason: row.rejectReason ?? '',
  filingMaterial: row.filingMaterial,
  remark: row.remark,
  createdAt: row.createdAt.toISOString(),
});

const buildInsertValues = (
  item: CreateAdFilingRequest,
  account: AccountRow,
  filingNo: string,
  applicant: string,
): FilingInsert => ({
  filingNo,
  accountId: account.id,
  accountName: account.accountName,
  groupName: account.groupName,
  subjectName: account.subjectName,
  platform: account.platform,
  industry: item.industry?.trim() ?? '',
  productName: item.productName?.trim() ?? '',
  status: PENDING_STATUS,
  applicant,
  filingMaterial: item.filingMaterial?.trim() ?? '',
  remark: item.remark ?? '',
});

@Injectable()
export class FilingsService {
  private readonly logger: Logger = new Logger(FilingsService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
  ) {}

  async findAll(params: AdFilingListParams): Promise<AdFilingListResult> {
    const page: number = Math.max(params.page ?? 1, 1);
    const pageSize: number = Math.min(Math.max(params.pageSize ?? 20, 1), 100);

    const conditions = [isNull(adFilings.deletedAt)];
    if (params.filingNo) {
      conditions.push(ilike(adFilings.filingNo, `%${params.filingNo}%`));
    }
    if (params.accountName) {
      conditions.push(ilike(adFilings.accountName, `%${params.accountName}%`));
    }
    if (params.groupName) {
      conditions.push(eq(adFilings.groupName, params.groupName));
    }
    if (params.subjectName) {
      conditions.push(eq(adFilings.subjectName, params.subjectName));
    }
    if (params.platform) {
      conditions.push(eq(adFilings.platform, params.platform));
    }
    if (params.industry) {
      conditions.push(eq(adFilings.industry, params.industry));
    }
    if (params.status) {
      conditions.push(eq(adFilings.status, params.status));
    }
    if (params.startTime) {
      conditions.push(gte(adFilings.createdAt, new Date(params.startTime)));
    }
    if (params.endTime) {
      conditions.push(lt(adFilings.createdAt, new Date(params.endTime)));
    }
    const where = and(...conditions);

    const rows: FilingRow[] = await this.db
      .select()
      .from(adFilings)
      .where(where)
      .orderBy(desc(adFilings.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const totalResult: { count: number | string }[] = await this.db
      .select({ count: count() })
      .from(adFilings)
      .where(where);
    const total: number = Number(totalResult[0]?.count ?? 0);

    return {
      items: rows.map((row: FilingRow): AdFiling => mapFiling(row)),
      total,
    };
  }

  private async findActiveAccount(
    accountId: string,
  ): Promise<AccountRow | null> {
    const rows: AccountRow[] = await this.db
      .select()
      .from(adAccounts)
      .where(
        and(eq(adAccounts.id, accountId), isNull(adAccounts.deletedAt)),
      );
    return rows.length > 0 ? rows[0] : null;
  }

  async create(
    dto: CreateAdFilingRequest,
    applicant: string,
  ): Promise<{ id: string }> {
    const account: AccountRow | null = await this.findActiveAccount(
      dto.accountId,
    );
    if (!account) {
      throw new BadRequestException('广告账户不存在');
    }
    const result: { id: string; no: string } = await insertWithSeqNo({
      db: this.db,
      table: adFilings,
      noColumn: adFilings.filingNo,
      prefix: FILING_NO_PREFIX,
      insert: (filingNo: string): Promise<{ id: string }[]> =>
        this.db
          .insert(adFilings)
          .values(buildInsertValues(dto, account, filingNo, applicant))
          .returning({ id: adFilings.id }),
    });
    this.logger.log(`广告报备创建成功: ${result.no}`);
    return { id: result.id };
  }

  async batchCreate(
    items: CreateAdFilingRequest[],
    applicant: string,
  ): Promise<{ created: number }> {
    const accountIds: string[] = Array.from(
      new Set<string>(
        items.map((item: CreateAdFilingRequest): string => item.accountId),
      ),
    );
    const accountRows: AccountRow[] = await this.db
      .select()
      .from(adAccounts)
      .where(
        and(inArray(adAccounts.id, accountIds), isNull(adAccounts.deletedAt)),
      );
    const accountMap: Map<string, AccountRow> = new Map<string, AccountRow>(
      accountRows.map((row: AccountRow): [string, AccountRow] => [
        row.id,
        row,
      ]),
    );
    const missing: boolean = accountIds.some(
      (accountId: string): boolean => !accountMap.has(accountId),
    );
    if (missing) {
      throw new BadRequestException('部分广告账户不存在');
    }

    const created: number = await batchInsertWithSeqNo<FilingInsert>({
      db: this.db,
      table: adFilings,
      noColumn: adFilings.filingNo,
      prefix: FILING_NO_PREFIX,
      size: items.length,
      buildValues: (nos: string[]): FilingInsert[] =>
        items.map(
          (item: CreateAdFilingRequest, index: number): FilingInsert =>
            buildInsertValues(
              item,
              accountMap.get(item.accountId) as AccountRow,
              nos[index],
              applicant,
            ),
        ),
      insert: (values: FilingInsert[]): Promise<{ id: string }[]> =>
        this.db
          .insert(adFilings)
          .values(values)
          .returning({ id: adFilings.id }),
    });
    this.logger.log(`广告报备批量创建成功: ${created} 条`);
    return { created };
  }

  async update(
    id: string,
    dto: UpdateAdFilingRequest,
    operatorId: string,
  ): Promise<{ success: boolean }> {
    const rows: FilingRow[] = await this.db
      .select()
      .from(adFilings)
      .where(and(eq(adFilings.id, id), isNull(adFilings.deletedAt)));
    if (rows.length === 0) {
      throw new NotFoundException('广告报备不存在');
    }
    if (rows[0].status !== PENDING_STATUS) {
      throw new BadRequestException('仅待审核的报备可以编辑');
    }

    const patch: Partial<FilingInsert> = {};
    if (dto.industry !== undefined) {
      patch.industry = dto.industry.trim();
    }
    if (dto.productName !== undefined) {
      patch.productName = dto.productName.trim();
    }
    if (dto.filingMaterial !== undefined) {
      patch.filingMaterial = dto.filingMaterial.trim();
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
      .update(adFilings)
      .set(patch)
      .where(and(eq(adFilings.id, id), isNull(adFilings.deletedAt)))
      .returning({ id: adFilings.id });
    if (updated.length === 0) {
      throw new NotFoundException('广告报备不存在');
    }
    return { success: true };
  }

  async remove(id: string): Promise<{ success: boolean }> {
    const now: Date = new Date();
    const updated: { id: string }[] = await this.db
      .update(adFilings)
      .set({ deletedAt: now, updatedAt: now })
      .where(and(eq(adFilings.id, id), isNull(adFilings.deletedAt)))
      .returning({ id: adFilings.id });
    if (updated.length === 0) {
      throw new NotFoundException('广告报备不存在');
    }
    return { success: true };
  }

  async detail(id: string): Promise<AdFiling> {
    const rows: FilingRow[] = await this.db
      .select()
      .from(adFilings)
      .where(and(eq(adFilings.id, id), isNull(adFilings.deletedAt)));
    if (rows.length === 0) {
      throw new NotFoundException('广告报备不存在');
    }
    return mapFiling(rows[0]);
  }

  async approve(
    id: string,
    dto: ReviewFilingRequest,
    operatorId: string,
  ): Promise<{ success: boolean }> {
    const rows: FilingRow[] = await this.db
      .select()
      .from(adFilings)
      .where(and(eq(adFilings.id, id), isNull(adFilings.deletedAt)));
    if (rows.length === 0) {
      throw new NotFoundException('广告报备不存在');
    }
    if (rows[0].status !== PENDING_STATUS) {
      throw new ConflictException('仅待审核的报备可以审核');
    }
    if (!dto.approved && !dto.rejectReason?.trim()) {
      throw new BadRequestException('请填写驳回原因');
    }

    const now: Date = new Date();
    const updated: { id: string }[] = await this.db
      .update(adFilings)
      .set({
        status: dto.approved ? FILED_STATUS : REJECTED_STATUS,
        rejectReason: dto.approved ? null : (dto.rejectReason ?? ''),
        reviewer: operatorId,
        reviewedAt: now,
        updatedAt: now,
        updatedBy: operatorId,
      })
      .where(and(eq(adFilings.id, id), isNull(adFilings.deletedAt)))
      .returning({ id: adFilings.id });
    if (updated.length === 0) {
      throw new NotFoundException('广告报备不存在');
    }
    this.logger.log(`广告报备审核完成: ${id}, 结果 ${dto.approved ? '已报备' : '驳回'}`);
    return { success: true };
  }
}
