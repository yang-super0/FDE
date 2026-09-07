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
import { and, count, desc, eq, gte, ilike, isNull, lt } from 'drizzle-orm';
import { adAccountTransfers, adAccounts } from '@server/database/schema';
import type {
  AdTransfer,
  AdTransferListParams,
  AdTransferListResult,
  AdTransferStatus,
  ApproveTransferRequest,
  CreateAdTransferRequest,
} from '@shared/api.interface';
import { insertWithSeqNo } from '../seq.util';
import { publishSyncEvent } from '@server/modules/feishu-sync/sync-event.publisher';

type TransferRow = typeof adAccountTransfers.$inferSelect;
type TransferInsert = typeof adAccountTransfers.$inferInsert;
type AccountRow = typeof adAccounts.$inferSelect;

const TRANSFER_NO_PREFIX: string = 'ZH';
const PENDING_STATUS: string = '待审批';
const TRANSFERRED_STATUS: string = '已转户';
const REJECTED_STATUS: string = '驳回';

const TRANSFER_STATUSES: AdTransferStatus[] = [
  '待审批',
  '通过',
  '驳回',
  '已转户',
  '取消',
];

const toTransferStatus = (value: string): AdTransferStatus =>
  TRANSFER_STATUSES.includes(value as AdTransferStatus)
    ? (value as AdTransferStatus)
    : '待审批';

const mapTransfer = (row: TransferRow): AdTransfer => ({
  id: row.id,
  transferNo: row.transferNo,
  accountId: row.accountId ?? null,
  accountName: row.accountName,
  fromSubject: row.fromSubject,
  toSubject: row.toSubject,
  fromPort: row.fromPort,
  toPort: row.toPort,
  status: toTransferStatus(row.status),
  applicant: row.applicant,
  approver: row.approver ?? '',
  approvedAt: row.approvedAt ? row.approvedAt.toISOString() : null,
  rejectReason: row.rejectReason ?? '',
  transferReason: row.transferReason,
  remark: row.remark,
  createdAt: row.createdAt.toISOString(),
});

const buildInsertValues = (
  dto: CreateAdTransferRequest,
  account: AccountRow,
  transferNo: string,
  applicant: string,
): TransferInsert => ({
  transferNo,
  accountId: account.id,
  accountName: account.accountName,
  fromSubject: account.subjectName,
  toSubject: dto.toSubject.trim(),
  fromPort: account.portType,
  toPort: dto.toPort.trim(),
  status: PENDING_STATUS,
  applicant,
  transferReason: dto.transferReason?.trim() ?? '',
  remark: '',
});

@Injectable()
export class TransfersService {
  private readonly logger: Logger = new Logger(TransfersService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
  ) {}

  async findAll(params: AdTransferListParams): Promise<AdTransferListResult> {
    const page: number = Math.max(params.page ?? 1, 1);
    const pageSize: number = Math.min(Math.max(params.pageSize ?? 20, 1), 100);

    const conditions = [isNull(adAccountTransfers.deletedAt)];
    if (params.transferNo) {
      conditions.push(
        ilike(adAccountTransfers.transferNo, `%${params.transferNo}%`),
      );
    }
    if (params.accountName) {
      conditions.push(
        ilike(adAccountTransfers.accountName, `%${params.accountName}%`),
      );
    }
    if (params.fromSubject) {
      conditions.push(
        ilike(adAccountTransfers.fromSubject, `%${params.fromSubject}%`),
      );
    }
    if (params.toSubject) {
      conditions.push(
        ilike(adAccountTransfers.toSubject, `%${params.toSubject}%`),
      );
    }
    if (params.status) {
      conditions.push(eq(adAccountTransfers.status, params.status));
    }
    if (params.startTime) {
      conditions.push(
        gte(adAccountTransfers.createdAt, new Date(params.startTime)),
      );
    }
    if (params.endTime) {
      conditions.push(
        lt(adAccountTransfers.createdAt, new Date(params.endTime)),
      );
    }
    const where = and(...conditions);

    const rows: TransferRow[] = await this.db
      .select()
      .from(adAccountTransfers)
      .where(where)
      .orderBy(desc(adAccountTransfers.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const totalResult: { count: number | string }[] = await this.db
      .select({ count: count() })
      .from(adAccountTransfers)
      .where(where);
    const total: number = Number(totalResult[0]?.count ?? 0);

    return {
      items: rows.map((row: TransferRow): AdTransfer => mapTransfer(row)),
      total,
    };
  }

  async create(
    dto: CreateAdTransferRequest,
    applicant: string,
  ): Promise<{ id: string }> {
    const accounts: AccountRow[] = await this.db
      .select()
      .from(adAccounts)
      .where(
        and(eq(adAccounts.id, dto.accountId), isNull(adAccounts.deletedAt)),
      );
    if (accounts.length === 0) {
      throw new BadRequestException('广告账户不存在');
    }
    const account: AccountRow = accounts[0];

    const result: { id: string; no: string } = await insertWithSeqNo({
      db: this.db,
      table: adAccountTransfers,
      noColumn: adAccountTransfers.transferNo,
      prefix: TRANSFER_NO_PREFIX,
      insert: (transferNo: string): Promise<{ id: string }[]> =>
        this.db
          .insert(adAccountTransfers)
          .values(buildInsertValues(dto, account, transferNo, applicant))
          .returning({ id: adAccountTransfers.id }),
    });
    this.logger.log(`转户申请创建成功: ${result.no}`);
    return { id: result.id };
  }

  async detail(id: string): Promise<AdTransfer> {
    const rows: TransferRow[] = await this.db
      .select()
      .from(adAccountTransfers)
      .where(
        and(
          eq(adAccountTransfers.id, id),
          isNull(adAccountTransfers.deletedAt),
        ),
      );
    if (rows.length === 0) {
      throw new NotFoundException('转户记录不存在');
    }
    return mapTransfer(rows[0]);
  }

  async remove(id: string): Promise<{ success: boolean }> {
    const now: Date = new Date();
    const updated: { id: string }[] = await this.db
      .update(adAccountTransfers)
      .set({ deletedAt: now, updatedAt: now })
      .where(
        and(
          eq(adAccountTransfers.id, id),
          isNull(adAccountTransfers.deletedAt),
        ),
      )
      .returning({ id: adAccountTransfers.id });
    if (updated.length === 0) {
      throw new NotFoundException('转户记录不存在');
    }
    return { success: true };
  }

  async approve(
    id: string,
    dto: ApproveTransferRequest,
    operatorId: string,
  ): Promise<{ success: boolean }> {
    const rows: TransferRow[] = await this.db
      .select()
      .from(adAccountTransfers)
      .where(
        and(
          eq(adAccountTransfers.id, id),
          isNull(adAccountTransfers.deletedAt),
        ),
      );
    if (rows.length === 0) {
      throw new NotFoundException('转户记录不存在');
    }
    const transfer: TransferRow = rows[0];
    if (transfer.status !== PENDING_STATUS) {
      throw new ConflictException('仅待审批的转户可以审批');
    }
    if (!dto.approved && !dto.rejectReason?.trim()) {
      throw new BadRequestException('请填写驳回原因');
    }

    const now: Date = new Date();
    if (dto.approved) {
      await this.db.transaction(async (tx) => {
        const updatedTransfers: { id: string }[] = await tx
          .update(adAccountTransfers)
          .set({
            status: TRANSFERRED_STATUS,
            rejectReason: null,
            approver: operatorId,
            approvedAt: now,
            updatedAt: now,
            updatedBy: operatorId,
          })
          .where(
            and(
              eq(adAccountTransfers.id, id),
              isNull(adAccountTransfers.deletedAt),
            ),
          )
          .returning({ id: adAccountTransfers.id });
        if (updatedTransfers.length === 0) {
          throw new NotFoundException('转户记录不存在');
        }
        if (!transfer.accountId) {
          throw new NotFoundException('关联广告账户不存在');
        }
        const updatedAccounts: { id: string }[] = await tx
          .update(adAccounts)
          .set({
            subjectName: transfer.toSubject,
            portType: transfer.toPort,
            updatedAt: now,
            updatedBy: operatorId,
          })
          .where(
            and(
              eq(adAccounts.id, transfer.accountId),
              isNull(adAccounts.deletedAt),
            ),
          )
          .returning({ id: adAccounts.id });
        if (updatedAccounts.length === 0) {
          throw new NotFoundException('广告账户不存在');
        }
      });
      if (transfer.accountId) {
        publishSyncEvent('ad_accounts', transfer.accountId, 'update');
      }
    } else {
      const updated: { id: string }[] = await this.db
        .update(adAccountTransfers)
        .set({
          status: REJECTED_STATUS,
          rejectReason: dto.rejectReason ?? '',
          approver: operatorId,
          approvedAt: now,
          updatedAt: now,
          updatedBy: operatorId,
        })
        .where(
          and(
            eq(adAccountTransfers.id, id),
            isNull(adAccountTransfers.deletedAt),
          ),
        )
        .returning({ id: adAccountTransfers.id });
      if (updated.length === 0) {
        throw new NotFoundException('转户记录不存在');
      }
    }
    this.logger.log(
      `转户审批完成: ${id}, 结果 ${dto.approved ? '已转户' : '驳回'}`,
    );
    return { success: true };
  }
}
