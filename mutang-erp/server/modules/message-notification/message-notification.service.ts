import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
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
  isNull,
  lt,
  lte,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import {
  adminInventory,
  contract,
  financeAccounts,
  messageNotifications,
} from '@server/database/schema';
import type {
  MessageNotificationCreateDto,
  MessageNotificationItem,
  MessageNotificationListParams,
  MessageNotificationListResponse,
  MessageNotificationPushStatsResponse,
} from '@shared/api.interface';
import { insertWithSeqNo } from '../finance-core/fin-seq.util';

type NotificationRow = typeof messageNotifications.$inferSelect;

export interface MessagePushTarget {
  targetType: string;
  targetId: string | null;
  targetName: string | null;
}

export interface MessagePushOptions {
  msgType: string;
  title: string;
  content: string;
  targetType: string;
  targetId?: string;
  targetName?: string;
  relatedModule?: string;
  relatedBusinessId?: string;
  relatedBusinessNo?: string;
  priority?: string;
  remark?: string;
}

export interface SemanticPushInput {
  title: string;
  content: string;
  toRoleCode?: string;
  toUserId?: string;
  relatedModule?: string;
  relatedBusinessId?: string;
  relatedBusinessNo?: string;
  priority?: string;
}

export interface PushLogListParams {
  msgType?: string;
  pushStatus?: string;
  page?: string;
  pageSize?: string;
}

const MSG_NO_PREFIX: string = 'MSG';
const PUSH_MAX_ATTEMPTS: number = 3;
const PUSH_STATUS_PUSHED: string = '已推送';
const PUSH_STATUS_FAILED: string = '推送失败';
const STATUS_UNREAD: string = '未读';
const STATUS_READ: string = '已读';
const ROLE_CODE_ADMIN: string = 'admin';
const ROLE_CODE_FINANCE: string = 'finance';
const ROLE_CODE_BUSINESS: string = 'business';
const MSG_TYPES: string[] = ['审批提醒', '预警通知', '系统通知', '任务提醒'];
const TARGET_TYPES: string[] = ['用户', '角色', '部门', '全员'];
const PRIORITIES: string[] = ['高', '中', '低'];
const LOW_BALANCE_THRESHOLD: string = '1000';
const LOW_STOCK_THRESHOLD: number = 10;
const EXPIRING_WINDOW_MS: number = 30 * 24 * 60 * 60 * 1000;
const REMARK_PUSH_MOCK: string = '模拟推送成功';

const parsePositiveInt = (
  value: string | undefined,
  fallback: number,
  max: number,
): number => {
  const parsed: number = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
};

@Injectable()
export class MessageNotificationService {
  private readonly logger = new Logger(MessageNotificationService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
  ) {}

  // ===== 推送核心（模拟飞书） =====

  /** 核心推送：生成编号并插入待推送记录，随后执行模拟推送 */
  async push(opts: MessagePushOptions): Promise<MessageNotificationItem[]> {
    const targets: MessagePushTarget[] = await this.resolveTargets(opts);
    const items: MessageNotificationItem[] = [];
    for (const target of targets) {
      const inserted: NotificationRow = await this.insertPending(opts, target);
      const pushed: NotificationRow = await this.executePush(inserted);
      items.push(this.toItem(pushed));
    }
    return items;
  }

  /** 角色 → 用户 展开：有成员则逐人一行（target_type='用户'），无成员保留角色行 */
  private async resolveTargets(
    opts: MessagePushOptions,
  ): Promise<MessagePushTarget[]> {
    if (opts.targetType !== '角色' || !opts.targetId) {
      return [
        {
          targetType: opts.targetType,
          targetId: opts.targetId ?? null,
          targetName: opts.targetName ?? null,
        },
      ];
    }
    const roleCode: string = opts.targetId;
    const userIds: string[] = await this.expandRoleUsers(roleCode);
    if (userIds.length === 0) {
      return [
        {
          targetType: '角色',
          targetId: roleCode,
          targetName: opts.targetName ?? roleCode,
        },
      ];
    }
    return userIds.map(
      (userId: string): MessagePushTarget => ({
        targetType: '用户',
        targetId: userId,
        targetName: opts.targetName ?? null,
      }),
    );
  }

  private async expandRoleUsers(roleCode: string): Promise<string[]> {
    const result: unknown = await this.db.execute(sql`
      SELECT (su.member).user_id AS uid
      FROM sys_user su
      JOIN roles r ON su.role_id = r.id
      WHERE r.role_code = ${roleCode}
    `);
    const rows: Record<string, unknown>[] = Array.isArray(result)
      ? result.filter(
          (row: unknown): row is Record<string, unknown> =>
            row !== null && typeof row === 'object',
        )
      : [];
    return rows
      .map((row: Record<string, unknown>): string => String(row.uid ?? ''))
      .filter((uid: string): boolean => uid.length > 0);
  }

  private async insertPending(
    opts: MessagePushOptions,
    target: MessagePushTarget,
  ): Promise<NotificationRow> {
    const { row } = await insertWithSeqNo<NotificationRow>({
      db: this.db,
      table: messageNotifications,
      noColumn: messageNotifications.msgNo,
      prefix: MSG_NO_PREFIX,
      insert: (no: string): Promise<NotificationRow[]> =>
        this.db
          .insert(messageNotifications)
          .values({
            msgNo: no,
            msgType: opts.msgType,
            title: opts.title,
            content: opts.content,
            targetType: target.targetType,
            targetId: target.targetId,
            targetName: target.targetName,
            relatedModule: opts.relatedModule ?? null,
            relatedBusinessId: opts.relatedBusinessId ?? null,
            relatedBusinessNo: opts.relatedBusinessNo ?? null,
            priority: opts.priority ?? '中',
            status: STATUS_UNREAD,
            pushStatus: '待推送',
            pushAttempts: 0,
            remark: opts.remark ?? null,
          })
          .returning(),
    });
    return row;
  }

  /** 模拟推送：配置 webhook 则真实 POST（累计最多 3 次），否则直接标记成功 */
  private async executePush(row: NotificationRow): Promise<NotificationRow> {
    const webhookUrl: string | undefined = process.env.FEISHU_WEBHOOK_URL;
    if (!webhookUrl) {
      const updated: NotificationRow[] = await this.db
        .update(messageNotifications)
        .set({
          pushStatus: PUSH_STATUS_PUSHED,
          pushAt: new Date(),
          remark: this.appendRemark(row.remark, REMARK_PUSH_MOCK),
          updatedAt: new Date(),
        })
        .where(eq(messageNotifications.id, row.id))
        .returning();
      return updated[0] ?? row;
    }
    return this.attemptWebhookPush(row, webhookUrl);
  }

  private async attemptWebhookPush(
    row: NotificationRow,
    webhookUrl: string,
  ): Promise<NotificationRow> {
    let attempts: number = row.pushAttempts;
    let lastError: string = '';
    let success: boolean = false;
    while (attempts < PUSH_MAX_ATTEMPTS) {
      attempts += 1;
      try {
        await this.postToWebhook(webhookUrl, `${row.title}\n${row.content}`);
        success = true;
        break;
      } catch (error: unknown) {
        lastError = error instanceof Error ? error.message : String(error);
      }
    }
    const now: Date = new Date();
    const updated: NotificationRow[] = await this.db
      .update(messageNotifications)
      .set({
        pushStatus: success ? PUSH_STATUS_PUSHED : PUSH_STATUS_FAILED,
        pushAt: success ? now : null,
        pushError: success ? null : lastError.slice(0, 500),
        pushAttempts: attempts,
        updatedAt: now,
      })
      .where(eq(messageNotifications.id, row.id))
      .returning();
    return updated[0] ?? row;
  }

  private async postToWebhook(
    webhookUrl: string,
    text: string,
  ): Promise<void> {
    const response: Response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ msg_type: 'text', content: { text } }),
    });
    if (!response.ok) {
      throw new Error(`飞书 webhook 响应异常: HTTP ${String(response.status)}`);
    }
  }

  private appendRemark(current: string | null, addition: string): string {
    const base: string = current ?? '';
    if (base.length === 0) return addition;
    return `${base}；${addition}`.slice(0, 500);
  }

  // ===== 语义推送方法 =====

  async pushApprovalReminder(
    input: SemanticPushInput,
  ): Promise<number> {
    const items: MessageNotificationItem[] = await this.push({
      msgType: '审批提醒',
      title: input.title,
      content: input.content,
      targetType: input.toRoleCode ? '角色' : '用户',
      targetId: input.toRoleCode ?? input.toUserId,
      relatedModule: input.relatedModule,
      relatedBusinessId: input.relatedBusinessId,
      relatedBusinessNo: input.relatedBusinessNo,
      priority: input.priority,
    });
    return items.length;
  }

  async pushApprovalResult(input: SemanticPushInput): Promise<number> {
    const items: MessageNotificationItem[] = await this.push({
      msgType: '审批提醒',
      title: input.title,
      content: input.content,
      targetType: '用户',
      targetId: input.toUserId,
      relatedModule: input.relatedModule,
      relatedBusinessId: input.relatedBusinessId,
      relatedBusinessNo: input.relatedBusinessNo,
      priority: input.priority,
    });
    return items.length;
  }

  async pushWarning(input: SemanticPushInput): Promise<number> {
    const items: MessageNotificationItem[] = await this.push({
      msgType: '预警通知',
      title: input.title,
      content: input.content,
      targetType: input.toRoleCode ? '角色' : '用户',
      targetId: input.toRoleCode ?? input.toUserId,
      relatedModule: input.relatedModule,
      relatedBusinessId: input.relatedBusinessId,
      relatedBusinessNo: input.relatedBusinessNo,
      priority: input.priority ?? '高',
    });
    return items.length;
  }

  async pushSystemNotice(input: SemanticPushInput): Promise<number> {
    const items: MessageNotificationItem[] = await this.push({
      msgType: '系统通知',
      title: input.title,
      content: input.content,
      targetType: input.toRoleCode ? '角色' : '用户',
      targetId: input.toRoleCode ?? input.toUserId,
      relatedModule: input.relatedModule,
      relatedBusinessId: input.relatedBusinessId,
      relatedBusinessNo: input.relatedBusinessNo,
      priority: input.priority,
    });
    return items.length;
  }

  async pushTaskReminder(input: SemanticPushInput): Promise<number> {
    const items: MessageNotificationItem[] = await this.push({
      msgType: '任务提醒',
      title: input.title,
      content: input.content,
      targetType: input.toRoleCode ? '角色' : '用户',
      targetId: input.toRoleCode ?? input.toUserId,
      relatedModule: input.relatedModule,
      relatedBusinessId: input.relatedBusinessId,
      relatedBusinessNo: input.relatedBusinessNo,
      priority: input.priority,
    });
    return items.length;
  }

  // ===== 查询 =====

  async listMyMessages(
    userId: string,
    params: MessageNotificationListParams,
  ): Promise<MessageNotificationListResponse> {
    const page: number = parsePositiveInt(params.page, 1, 100000);
    const pageSize: number = parsePositiveInt(params.pageSize, 10, 100);
    const scope: SQL | undefined = this.myMessageScope(userId);
    const conditions: SQL[] = [];
    if (scope) conditions.push(scope);
    const deletedCond: SQL | undefined = isNull(messageNotifications.deletedAt);
    if (deletedCond) conditions.push(deletedCond);
    if (params.msgType) {
      conditions.push(eq(messageNotifications.msgType, params.msgType));
    }
    if (params.status) {
      conditions.push(eq(messageNotifications.status, params.status));
    }
    if (params.keyword && params.keyword.trim().length > 0) {
      conditions.push(
        ilike(messageNotifications.title, `%${params.keyword.trim()}%`),
      );
    }
    const where: SQL | undefined =
      conditions.length > 0 ? and(...conditions) : undefined;

    const rows: NotificationRow[] = where
      ? await this.db
          .select()
          .from(messageNotifications)
          .where(where)
          .orderBy(desc(messageNotifications.createdAt), desc(messageNotifications.id))
          .limit(pageSize)
          .offset((page - 1) * pageSize)
      : await this.db
          .select()
          .from(messageNotifications)
          .orderBy(desc(messageNotifications.createdAt), desc(messageNotifications.id))
          .limit(pageSize)
          .offset((page - 1) * pageSize);

    const totalResult = where
      ? await this.db
          .select({ value: count() })
          .from(messageNotifications)
          .where(where)
      : await this.db.select({ value: count() }).from(messageNotifications);
    const total: number = Number(totalResult[0]?.value ?? 0);
    const unreadCount: number = await this.getUnreadCount(userId);
    return {
      items: rows.map((row: NotificationRow): MessageNotificationItem =>
        this.toItem(row),
      ),
      total,
      page,
      pageSize,
      unreadCount,
    };
  }

  async getUnreadCount(userId: string): Promise<number> {
    const scope: SQL | undefined = this.myMessageScope(userId);
    const conditions: SQL[] = [];
    if (scope) conditions.push(scope);
    const unreadCond: SQL | undefined = eq(messageNotifications.status, STATUS_UNREAD);
    if (unreadCond) conditions.push(unreadCond);
    const result = await this.db
      .select({ value: count() })
      .from(messageNotifications)
      .where(and(...conditions));
    return Number(result[0]?.value ?? 0);
  }

  async listPushLogs(params: PushLogListParams): Promise<{
    items: MessageNotificationItem[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const page: number = parsePositiveInt(params.page, 1, 100000);
    const pageSize: number = parsePositiveInt(params.pageSize, 10, 100);
    const conditions: SQL[] = [];
    const deletedCond: SQL | undefined = isNull(messageNotifications.deletedAt);
    if (deletedCond) conditions.push(deletedCond);
    if (params.msgType) {
      conditions.push(eq(messageNotifications.msgType, params.msgType));
    }
    if (params.pushStatus) {
      conditions.push(eq(messageNotifications.pushStatus, params.pushStatus));
    }
    const where: SQL | undefined =
      conditions.length > 0 ? and(...conditions) : undefined;

    const rows: NotificationRow[] = where
      ? await this.db
          .select()
          .from(messageNotifications)
          .where(where)
          .orderBy(desc(messageNotifications.createdAt), desc(messageNotifications.id))
          .limit(pageSize)
          .offset((page - 1) * pageSize)
      : await this.db
          .select()
          .from(messageNotifications)
          .orderBy(desc(messageNotifications.createdAt), desc(messageNotifications.id))
          .limit(pageSize)
          .offset((page - 1) * pageSize);

    const totalResult = where
      ? await this.db
          .select({ value: count() })
          .from(messageNotifications)
          .where(where)
      : await this.db.select({ value: count() }).from(messageNotifications);
    const total: number = Number(totalResult[0]?.value ?? 0);
    return {
      items: rows.map((row: NotificationRow): MessageNotificationItem =>
        this.toItem(row),
      ),
      total,
      page,
      pageSize,
    };
  }

  async getPushStats(): Promise<MessageNotificationPushStatsResponse> {
    const totals = await this.db
      .select({
        total: count(),
        pushed: sql<number>`count(*) filter (where ${messageNotifications.pushStatus} = ${PUSH_STATUS_PUSHED})`,
        failed: sql<number>`count(*) filter (where ${messageNotifications.pushStatus} = ${PUSH_STATUS_FAILED})`,
        pending: sql<number>`count(*) filter (where ${messageNotifications.pushStatus} = '待推送')`,
      })
      .from(messageNotifications)
      .where(isNull(messageNotifications.deletedAt));
    const byTypeRows = await this.db
      .select({
        msgType: messageNotifications.msgType,
        total: count(),
        pushed: sql<number>`count(*) filter (where ${messageNotifications.pushStatus} = ${PUSH_STATUS_PUSHED})`,
        failed: sql<number>`count(*) filter (where ${messageNotifications.pushStatus} = ${PUSH_STATUS_FAILED})`,
      })
      .from(messageNotifications)
      .where(isNull(messageNotifications.deletedAt))
      .groupBy(messageNotifications.msgType);
    return {
      total: Number(totals[0]?.total ?? 0),
      pushed: Number(totals[0]?.pushed ?? 0),
      failed: Number(totals[0]?.failed ?? 0),
      pending: Number(totals[0]?.pending ?? 0),
      byType: byTypeRows.map(
        (row: {
          msgType: string;
          total: number | string;
          pushed: number | string;
          failed: number | string;
        }): {
          msgType: string;
          total: number;
          pushed: number;
          failed: number;
        } => ({
          msgType: row.msgType,
          total: Number(row.total),
          pushed: Number(row.pushed),
          failed: Number(row.failed),
        }),
      ),
    };
  }

  // ===== 已读 =====

  async markRead(id: number, userId: string): Promise<MessageNotificationItem> {
    const rows: NotificationRow[] = await this.db
      .select()
      .from(messageNotifications)
      .where(
        and(eq(messageNotifications.id, id), isNull(messageNotifications.deletedAt)),
      )
      .limit(1);
    if (rows.length === 0) {
      throw new NotFoundException('消息不存在');
    }
    const row: NotificationRow = rows[0];
    if (row.targetType === '用户' && row.targetId !== userId) {
      throw new ForbiddenException('只能标记自己的消息为已读');
    }
    if (row.status === STATUS_READ) {
      return this.toItem(row);
    }
    const updated: NotificationRow[] = await this.db
      .update(messageNotifications)
      .set({
        status: STATUS_READ,
        readAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(messageNotifications.id, id))
      .returning();
    if (updated.length === 0) {
      throw new NotFoundException('消息不存在');
    }
    return this.toItem(updated[0]);
  }

  async markAllRead(userId: string): Promise<{ updated: number }> {
    const scope: SQL | undefined = this.myMessageScope(userId);
    const conditions: SQL[] = [];
    if (scope) conditions.push(scope);
    const unreadCond: SQL | undefined = eq(messageNotifications.status, STATUS_UNREAD);
    if (unreadCond) conditions.push(unreadCond);
    const now: Date = new Date();
    const updated: { id: number }[] = await this.db
      .update(messageNotifications)
      .set({
        status: STATUS_READ,
        readAt: now,
        updatedAt: now,
      })
      .where(and(...conditions))
      .returning({ id: messageNotifications.id });
    return { updated: updated.length };
  }

  // ===== 重试推送 =====

  async retryPush(id: number): Promise<MessageNotificationItem> {
    const rows: NotificationRow[] = await this.db
      .select()
      .from(messageNotifications)
      .where(
        and(eq(messageNotifications.id, id), isNull(messageNotifications.deletedAt)),
      )
      .limit(1);
    if (rows.length === 0) {
      throw new NotFoundException('消息不存在');
    }
    const row: NotificationRow = rows[0];
    if (row.pushStatus !== PUSH_STATUS_FAILED) {
      throw new ConflictException('仅推送失败的消息可重试推送');
    }
    if (row.pushAttempts >= PUSH_MAX_ATTEMPTS) {
      throw new ConflictException('推送重试次数已达上限');
    }
    const pushed: NotificationRow = await this.executePush(row);
    return this.toItem(pushed);
  }

  // ===== 手动创建 =====

  async create(
    dto: MessageNotificationCreateDto,
    operatorId: string,
  ): Promise<MessageNotificationItem> {
    const title: string = (dto?.title ?? '').trim();
    const content: string = (dto?.content ?? '').trim();
    if (title.length === 0) throw new BadRequestException('消息标题不能为空');
    if (content.length === 0) throw new BadRequestException('消息内容不能为空');
    if (!MSG_TYPES.includes(dto?.msgType)) {
      throw new BadRequestException('消息类型必须为 审批提醒/预警通知/系统通知/任务提醒');
    }
    if (!TARGET_TYPES.includes(dto?.targetType)) {
      throw new BadRequestException('目标类型必须为 用户/角色/部门/全员');
    }
    if (dto?.priority !== undefined && !PRIORITIES.includes(dto.priority)) {
      throw new BadRequestException('优先级必须为 高/中/低');
    }
    if (dto?.targetType === '用户' && !(dto?.targetId ?? '').trim()) {
      throw new BadRequestException('指定用户目标时必须提供目标用户ID');
    }
    const items: MessageNotificationItem[] = await this.push({
      msgType: dto.msgType,
      title,
      content,
      targetType: dto.targetType,
      targetId: dto?.targetId,
      targetName: dto?.targetName,
      relatedModule: dto?.relatedModule,
      relatedBusinessId: dto?.relatedBusinessId,
      relatedBusinessNo: dto?.relatedBusinessNo,
      priority: dto?.priority,
      remark: dto?.remark,
    });
    this.logger.log(
      `手动创建系统通知: ${items[0]?.msgNo ?? ''}, 操作人: ${operatorId}`,
    );
    return items[0];
  }

  // ===== 预警检查 =====

  async runWarnings(): Promise<{ created: number }> {
    let created: number = 0;
    created += await this.checkLowBalances();
    created += await this.checkExpiringContracts();
    created += await this.checkLowStocks();
    return { created };
  }

  /** 客户余额不足：余额 < 1000 → 财务角色 */
  private async checkLowBalances(): Promise<number> {
    try {
      const rows: { id: number; accountName: string; balance: string }[] =
        await this.db
          .select({
            id: financeAccounts.id,
            accountName: financeAccounts.accountName,
            balance: financeAccounts.balance,
          })
          .from(financeAccounts)
          .where(
            and(
              isNull(financeAccounts.deletedAt),
              lt(financeAccounts.balance, LOW_BALANCE_THRESHOLD),
            ),
          );
      let created: number = 0;
      for (const row of rows) {
        created += await this.pushWarning({
          title: '客户余额不足预警',
          content: `账户「${row.accountName}」当前余额 ${row.balance} 元，低于 ${LOW_BALANCE_THRESHOLD} 元警戒线，请及时关注。`,
          toRoleCode: ROLE_CODE_FINANCE,
          relatedModule: '财务',
          relatedBusinessId: String(row.id),
        });
      }
      return created;
    } catch (error: unknown) {
      this.logger.warn(
        `余额预警检查失败: ${JSON.stringify({ error: String(error) })}`,
      );
      return 0;
    }
  }

  /** 合同 30 天内到期 → 商务角色 */
  private async checkExpiringContracts(): Promise<number> {
    try {
      const now: Date = new Date();
      const windowEnd: Date = new Date(now.getTime() + EXPIRING_WINDOW_MS);
      const rows: { id: string; code: string; expireDate: Date | null }[] =
        await this.db
          .select({
            id: contract.id,
            code: contract.code,
            expireDate: contract.expireDate,
          })
        .from(contract)
        .where(
          and(
            eq(contract.status, 'active'),
            gte(contract.expireDate, now),
            lte(contract.expireDate, windowEnd),
          ),
        );
      let created: number = 0;
      for (const row of rows) {
        created += await this.pushWarning({
          title: '合同即将到期预警',
          content: `合同「${row.code}」将于 ${row.expireDate ? row.expireDate.toISOString().slice(0, 10) : ''} 到期，请及时跟进续约。`,
          toRoleCode: ROLE_CODE_BUSINESS,
          relatedModule: '合同',
          relatedBusinessId: row.id,
          relatedBusinessNo: row.code,
        });
      }
      return created;
    } catch (error: unknown) {
      this.logger.warn(
        `合同到期预警检查失败: ${JSON.stringify({ error: String(error) })}`,
      );
      return 0;
    }
  }

  /** 库存不足：quantity < 10 → admin 角色 */
  private async checkLowStocks(): Promise<number> {
    try {
      const rows: { id: number; inventoryNo: string; itemName: string; quantity: number }[] =
        await this.db
          .select({
            id: adminInventory.id,
            inventoryNo: adminInventory.inventoryNo,
            itemName: adminInventory.itemName,
            quantity: adminInventory.quantity,
          })
          .from(adminInventory)
          .where(
            and(
              isNull(adminInventory.deletedAt),
              lt(adminInventory.quantity, LOW_STOCK_THRESHOLD),
            ),
          );
      let created: number = 0;
      for (const row of rows) {
        created += await this.pushWarning({
          title: '库存不足预警',
          content: `物品「${row.itemName}」（${row.inventoryNo}）当前库存 ${String(row.quantity)}，低于 ${String(LOW_STOCK_THRESHOLD)} 件警戒线，请及时补货。`,
          toRoleCode: ROLE_CODE_ADMIN,
          relatedModule: '行政',
          relatedBusinessId: String(row.id),
          relatedBusinessNo: row.inventoryNo,
        });
      }
      return created;
    } catch (error: unknown) {
      this.logger.warn(
        `库存预警检查失败: ${JSON.stringify({ error: String(error) })}`,
      );
      return 0;
    }
  }

  // ===== 工具 =====

  private myMessageScope(userId: string): SQL | undefined {
    return or(
      eq(messageNotifications.targetType, '全员'),
      and(
        eq(messageNotifications.targetType, '用户'),
        eq(messageNotifications.targetId, userId),
      ),
    );
  }

  private toItem(row: NotificationRow): MessageNotificationItem {
    return {
      id: row.id,
      msgNo: row.msgNo,
      msgType: row.msgType,
      title: row.title,
      content: row.content,
      targetType: row.targetType,
      targetId: row.targetId,
      targetName: row.targetName,
      relatedModule: row.relatedModule,
      relatedBusinessId: row.relatedBusinessId,
      relatedBusinessNo: row.relatedBusinessNo,
      priority: row.priority,
      status: row.status,
      readAt: row.readAt ? row.readAt.toISOString() : null,
      pushStatus: row.pushStatus,
      pushAt: row.pushAt ? row.pushAt.toISOString() : null,
      pushError: row.pushError,
      pushAttempts: row.pushAttempts,
      remark: row.remark,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
