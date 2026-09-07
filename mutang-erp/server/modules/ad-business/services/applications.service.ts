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
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNull,
  lt,
} from 'drizzle-orm';
import { adAccountApplications, adAccounts } from '@server/database/schema';
import type {
  AdApplication,
  AdApplicationDetail,
  AdApplicationListParams,
  AdApplicationListResult,
  AdApplicationStatus,
  ApproveApplicationRequest,
  CreateAdApplicationRequest,
  UpdateAdApplicationRequest,
} from '@shared/api.interface';
import {
  MAX_SEQ_RETRY,
  batchInsertWithSeqNo,
  insertWithSeqNo,
  isUniqueViolation,
  nextSeqNoRange,
} from '../seq.util';
import { MessageNotificationService } from '../../message-notification/message-notification.service';
import { mapAdAccount } from './accounts.service';
import { publishSyncEvent } from '@server/modules/feishu-sync/sync-event.publisher';

type ApplicationRow = typeof adAccountApplications.$inferSelect;
type ApplicationInsert = typeof adAccountApplications.$inferInsert;
type AccountRow = typeof adAccounts.$inferSelect;
type AccountInsert = typeof adAccounts.$inferInsert;

const APPLICATION_NO_PREFIX: string = 'KH';
const ACCOUNT_NO_PREFIX: string = 'AC';
const PENDING_STATUS: string = '待审批';
const APPROVED_STATUS: string = '通过';
const REJECTED_STATUS: string = '驳回';
const OPENED_STATUS: string = '已开户';
const ACCOUNT_NORMAL_STATUS: string = '正常';

const APPLICATION_STATUSES: AdApplicationStatus[] = [
  '待审批',
  '通过',
  '驳回',
  '已开户',
  '取消',
];

const toApplicationStatus = (value: string): AdApplicationStatus =>
  APPLICATION_STATUSES.includes(value as AdApplicationStatus)
    ? (value as AdApplicationStatus)
    : '待审批';

const assertRequiredFields = (item: CreateAdApplicationRequest): void => {
  if (!item.groupName || item.groupName.trim().length === 0) {
    throw new BadRequestException('请填写集团名称');
  }
  if (!item.subjectName || item.subjectName.trim().length === 0) {
    throw new BadRequestException('请填写主体名称');
  }
  if (!item.platform || item.platform.trim().length === 0) {
    throw new BadRequestException('请填写投放平台');
  }
};

const buildInsertValues = (
  item: CreateAdApplicationRequest,
  applicationNo: string,
  applicant: string,
): ApplicationInsert => ({
  applicationNo,
  groupName: item.groupName.trim(),
  subjectName: item.subjectName.trim(),
  platform: item.platform.trim(),
  portType: item.portType?.trim() || undefined,
  accountType: item.accountType?.trim() ?? '',
  status: PENDING_STATUS,
  applicant,
  remark: item.remark ?? '',
});

@Injectable()
export class ApplicationsService {
  private readonly logger: Logger = new Logger(ApplicationsService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
    private readonly messageNotificationService: MessageNotificationService,
  ) {}

  private mapApplication(row: ApplicationRow): AdApplication {
    return {
      id: row.id,
      applicationNo: row.applicationNo,
      groupName: row.groupName,
      subjectName: row.subjectName,
      platform: row.platform,
      portType: row.portType,
      accountType: row.accountType,
      status: toApplicationStatus(row.status),
      applicant: row.applicant,
      approver: row.approver ?? '',
      approvedAt: row.approvedAt ? row.approvedAt.toISOString() : null,
      rejectReason: row.rejectReason ?? '',
      remark: row.remark,
      createdAt: row.createdAt.toISOString(),
    };
  }

  async findAll(
    params: AdApplicationListParams,
  ): Promise<AdApplicationListResult> {
    const page: number = Math.max(params.page ?? 1, 1);
    const pageSize: number = Math.min(Math.max(params.pageSize ?? 20, 1), 100);

    const conditions = [isNull(adAccountApplications.deletedAt)];
    if (params.applicationNo) {
      conditions.push(
        ilike(
          adAccountApplications.applicationNo,
          `%${params.applicationNo}%`,
        ),
      );
    }
    if (params.groupName) {
      conditions.push(
        ilike(adAccountApplications.groupName, `%${params.groupName}%`),
      );
    }
    if (params.subjectName) {
      conditions.push(
        ilike(adAccountApplications.subjectName, `%${params.subjectName}%`),
      );
    }
    if (params.platform) {
      conditions.push(eq(adAccountApplications.platform, params.platform));
    }
    if (params.portType) {
      conditions.push(eq(adAccountApplications.portType, params.portType));
    }
    if (params.status) {
      conditions.push(eq(adAccountApplications.status, params.status));
    }
    if (params.startTime) {
      conditions.push(
        gte(adAccountApplications.createdAt, new Date(params.startTime)),
      );
    }
    if (params.endTime) {
      conditions.push(
        lt(adAccountApplications.createdAt, new Date(params.endTime)),
      );
    }
    const where = and(...conditions);

    const rows: ApplicationRow[] = await this.db
      .select()
      .from(adAccountApplications)
      .where(where)
      .orderBy(desc(adAccountApplications.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const totalResult: { count: number | string }[] = await this.db
      .select({ count: count() })
      .from(adAccountApplications)
      .where(where);
    const total: number = Number(totalResult[0]?.count ?? 0);

    return {
      items: rows.map(
        (row: ApplicationRow): AdApplication => this.mapApplication(row),
      ),
      total,
    };
  }

  async create(
    dto: CreateAdApplicationRequest,
    applicant: string,
  ): Promise<{ id: string }> {
    assertRequiredFields(dto);
    const result: { id: string; no: string } = await insertWithSeqNo({
      db: this.db,
      table: adAccountApplications,
      noColumn: adAccountApplications.applicationNo,
      prefix: APPLICATION_NO_PREFIX,
      insert: (applicationNo: string): Promise<{ id: string }[]> =>
        this.db
          .insert(adAccountApplications)
          .values(buildInsertValues(dto, applicationNo, applicant))
          .returning({ id: adAccountApplications.id }),
    });
    this.logger.log(`开户申请创建成功: ${result.no}`);
    try {
      await this.messageNotificationService.pushApprovalReminder({
        title: '开户申请待审批',
        content: `开户申请「${result.no}」（主体：${dto.subjectName.trim()}）已提交，等待审批。`,
        toRoleCode: 'admin',
        relatedModule: '广告业务',
        relatedBusinessId: result.id,
        relatedBusinessNo: result.no,
        priority: '高',
      });
    } catch (error: unknown) {
      this.logger.warn(
        `开户申请审批提醒推送失败: ${JSON.stringify({ no: result.no, error: String(error) })}`,
      );
    }
    publishSyncEvent('ad_account_applications', result.id, 'create');
    return { id: result.id };
  }

  async batchCreate(
    items: CreateAdApplicationRequest[],
    applicant: string,
  ): Promise<{ created: number }> {
    items.forEach((item: CreateAdApplicationRequest) =>
      assertRequiredFields(item),
    );
    const created: number = await batchInsertWithSeqNo<ApplicationInsert>({
      db: this.db,
      table: adAccountApplications,
      noColumn: adAccountApplications.applicationNo,
      prefix: APPLICATION_NO_PREFIX,
      size: items.length,
      buildValues: (nos: string[]): ApplicationInsert[] =>
        items.map(
          (
            item: CreateAdApplicationRequest,
            index: number,
          ): ApplicationInsert => buildInsertValues(item, nos[index], applicant),
        ),
      insert: async (
        values: ApplicationInsert[],
      ): Promise<{ id: string }[]> => {
        const inserted: { id: string }[] = await this.db
          .insert(adAccountApplications)
          .values(values)
          .returning({ id: adAccountApplications.id });
        inserted.forEach((row: { id: string }) => {
          publishSyncEvent('ad_account_applications', row.id, 'create');
        });
        return inserted;
      },
    });
    this.logger.log(`开户申请批量创建成功: ${created} 条`);
    return { created };
  }

  async update(
    id: string,
    dto: UpdateAdApplicationRequest,
    operatorId: string,
  ): Promise<{ success: boolean }> {
    const rows: ApplicationRow[] = await this.db
      .select()
      .from(adAccountApplications)
      .where(
        and(
          eq(adAccountApplications.id, id),
          isNull(adAccountApplications.deletedAt),
        ),
      );
    if (rows.length === 0) {
      throw new NotFoundException('开户申请不存在');
    }
    if (rows[0].status !== PENDING_STATUS) {
      throw new BadRequestException('仅待审批的申请可以编辑');
    }

    const patch: Partial<ApplicationInsert> = {};
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
    if (dto.accountType !== undefined) {
      patch.accountType = dto.accountType;
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
      .update(adAccountApplications)
      .set(patch)
      .where(
        and(
          eq(adAccountApplications.id, id),
          isNull(adAccountApplications.deletedAt),
        ),
      )
      .returning({ id: adAccountApplications.id });
    if (updated.length === 0) {
      throw new NotFoundException('开户申请不存在');
    }
    publishSyncEvent('ad_account_applications', updated[0].id, 'update');
    return { success: true };
  }

  async remove(id: string): Promise<{ success: boolean }> {
    const now: Date = new Date();
    const updated: { id: string }[] = await this.db
      .update(adAccountApplications)
      .set({ deletedAt: now, updatedAt: now })
      .where(
        and(
          eq(adAccountApplications.id, id),
          isNull(adAccountApplications.deletedAt),
        ),
      )
      .returning({ id: adAccountApplications.id });
    if (updated.length === 0) {
      throw new NotFoundException('开户申请不存在');
    }
    publishSyncEvent('ad_account_applications', updated[0].id, 'delete');
    return { success: true };
  }

  async detail(id: string): Promise<AdApplicationDetail> {
    const rows: ApplicationRow[] = await this.db
      .select()
      .from(adAccountApplications)
      .where(
        and(
          eq(adAccountApplications.id, id),
          isNull(adAccountApplications.deletedAt),
        ),
      );
    if (rows.length === 0) {
      throw new NotFoundException('开户申请不存在');
    }

    const accountRows: AccountRow[] = await this.db
      .select()
      .from(adAccounts)
      .where(
        and(eq(adAccounts.applicationId, id), isNull(adAccounts.deletedAt)),
      )
      .orderBy(asc(adAccounts.createdAt))
      .limit(1);

    return {
      ...this.mapApplication(rows[0]),
      account: accountRows.length > 0 ? mapAdAccount(accountRows[0]) : null,
    };
  }

  async approve(
    id: string,
    dto: ApproveApplicationRequest,
    operatorId: string,
  ): Promise<{ success: boolean }> {
    const rows: ApplicationRow[] = await this.db
      .select()
      .from(adAccountApplications)
      .where(
        and(
          eq(adAccountApplications.id, id),
          isNull(adAccountApplications.deletedAt),
        ),
      );
    if (rows.length === 0) {
      throw new NotFoundException('开户申请不存在');
    }
    if (rows[0].status !== PENDING_STATUS) {
      throw new ConflictException('仅待审批的申请可以审批');
    }
    if (!dto.approved && !dto.rejectReason?.trim()) {
      throw new BadRequestException('请填写驳回原因');
    }

    const now: Date = new Date();
    const updated: { id: string }[] = await this.db
      .update(adAccountApplications)
      .set({
        status: dto.approved ? APPROVED_STATUS : REJECTED_STATUS,
        rejectReason: dto.approved ? null : (dto.rejectReason ?? ''),
        approver: operatorId,
        approvedAt: now,
        updatedAt: now,
        updatedBy: operatorId,
      })
      .where(
        and(
          eq(adAccountApplications.id, id),
          isNull(adAccountApplications.deletedAt),
        ),
      )
      .returning({ id: adAccountApplications.id });
    if (updated.length === 0) {
      throw new NotFoundException('开户申请不存在');
    }
    publishSyncEvent('ad_account_applications', updated[0].id, 'update');
    this.logger.log(`开户申请审批完成: ${id}, 结果 ${dto.approved ? '通过' : '驳回'}`);
    if (rows[0].applicant) {
      try {
        await this.messageNotificationService.pushApprovalResult({
          title: dto.approved ? '开户申请审批通过' : '开户申请被驳回',
          content: dto.approved
            ? `您的开户申请「${rows[0].applicationNo}」已审批通过。`
            : `您的开户申请「${rows[0].applicationNo}」被驳回：${dto.rejectReason ?? ''}`,
          toUserId: rows[0].applicant,
          relatedModule: '广告业务',
          relatedBusinessId: id,
          relatedBusinessNo: rows[0].applicationNo,
        });
      } catch (error: unknown) {
        this.logger.warn(
          `开户申请审批结果推送失败: ${JSON.stringify({ id, error: String(error) })}`,
        );
      }
    }
    return { success: true };
  }

  private async openAccountsOnce(
    apps: ApplicationRow[],
    operatorId: string,
  ): Promise<number> {
    const nos: string[] = await nextSeqNoRange(
      this.db,
      adAccounts,
      adAccounts.accountNo,
      ACCOUNT_NO_PREFIX,
      apps.length,
    );
    const accountValues: AccountInsert[] = [];
    const syncedApplicationIds: string[] = [];
    const syncedAccountIds: string[] = [];
    await this.db.transaction(async (tx) => {
      const now: Date = new Date();
      for (
        let index: number = 0;
        index < apps.length;
        index += 1
      ) {
        const app: ApplicationRow = apps[index];
        const updated: { id: string }[] = await tx
          .update(adAccountApplications)
          .set({
            status: OPENED_STATUS,
            updatedAt: now,
            updatedBy: operatorId,
          })
          .where(
            and(
              eq(adAccountApplications.id, app.id),
              inArray(adAccountApplications.status, [
                PENDING_STATUS,
                APPROVED_STATUS,
              ]),
              isNull(adAccountApplications.deletedAt),
            ),
          )
          .returning({ id: adAccountApplications.id });
        if (updated.length === 0) {
          continue;
        }
        syncedApplicationIds.push(app.id);
        accountValues.push({
          accountNo: nos[index],
          accountName: app.subjectName,
          groupName: app.groupName,
          subjectName: app.subjectName,
          platform: app.platform,
          portType: app.portType,
          status: ACCOUNT_NORMAL_STATUS,
          salesperson: app.applicant,
          openedAt: now,
          applicationId: app.id,
          remark: '',
        });
      }
      if (accountValues.length > 0) {
        const insertedAccounts: { id: string }[] = await tx
          .insert(adAccounts)
          .values(accountValues)
          .returning({ id: adAccounts.id });
        insertedAccounts.forEach((row: { id: string }) => {
          syncedAccountIds.push(row.id);
        });
      }
    });
    syncedApplicationIds.forEach((applicationId: string) => {
      publishSyncEvent('ad_account_applications', applicationId, 'update');
    });
    syncedAccountIds.forEach((accountId: string) => {
      publishSyncEvent('ad_accounts', accountId, 'create');
    });
    return accountValues.length;
  }

  async batchOpen(
    ids: string[],
    operatorId: string,
  ): Promise<{ opened: number }> {
    const apps: ApplicationRow[] = await this.db
      .select()
      .from(adAccountApplications)
      .where(
        and(
          inArray(adAccountApplications.id, ids),
          inArray(adAccountApplications.status, [PENDING_STATUS, APPROVED_STATUS]),
          isNull(adAccountApplications.deletedAt),
        ),
      );
    if (apps.length === 0) {
      throw new ConflictException('申请状态不允许开户或已开户');
    }

    let opened: number = 0;
    for (let attempt: number = 0; attempt < MAX_SEQ_RETRY; attempt += 1) {
      try {
        opened = await this.openAccountsOnce(apps, operatorId);
        break;
      } catch (error: unknown) {
        if (isUniqueViolation(error) && attempt < MAX_SEQ_RETRY - 1) {
          this.logger.log(`批量开户编号冲突，重试第 ${attempt + 1} 次`);
          continue;
        }
        throw error;
      }
    }
    this.logger.log(`批量开户成功: ${opened} 个账户`);
    return { opened };
  }
}
