import { randomBytes, scryptSync } from 'crypto';
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
  ilike,
  isNull,
  type SQL,
} from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { customer, customerAccounts } from '@server/database/schema';
import type {
  CustomerAccount,
  CustomerAccountCreateDto,
  CustomerAccountListParams,
  CustomerAccountUpdateDto,
  LoginLog,
  TaskEnhanceListResponse,
} from '@shared/api.interface';
import { insertWithSeqNo, isUniqueViolation } from '../finance-core/fin-seq.util';
import { MessageNotificationService } from '../message-notification/message-notification.service';
import { LoginLogsService } from './login-logs.service';
import {
  assertSystemEnhanceEnum,
  assertSystemEnhanceRequired,
  resolveSystemEnhancePagination,
  resolveSystemEnhanceSortColumn,
  resolveSystemEnhanceSortOrder,
  toSystemEnhanceIsoOrNull,
} from './system-enhance-shared.util';

/** 客户账户管理：编号 KH、scrypt 密码哈希、状态门控与审计列 */
type AccountRow = typeof customerAccounts.$inferSelect;
type AccountInsert = typeof customerAccounts.$inferInsert;

const ACCOUNT_NO_PREFIX: string = 'KH';
const ACCOUNT_STATUSES: string[] = ['启用', '停用', '锁定'];
const PASSWORD_MIN_LENGTH: number = 8;
const RANDOM_PASSWORD_LENGTH: number = 12;
const UUID_PATTERN: RegExp =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
const PASSWORD_UPPER: string = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const PASSWORD_LOWER: string = 'abcdefghijkmnpqrstuvwxyz';
const PASSWORD_DIGIT: string = '23456789';

function hashPassword(pw: string): string {
  const salt: string = randomBytes(16).toString('hex');
  return `scrypt:${salt}:${scryptSync(pw, salt, 32).toString('hex')}`;
}

/** 12 位随机密码：至少含一个大写、一个小写、一个数字 */
function generateRandomPassword(): string {
  const pool: string = PASSWORD_UPPER + PASSWORD_LOWER + PASSWORD_DIGIT;
  const bytes: Buffer = randomBytes(RANDOM_PASSWORD_LENGTH);
  const chars: string[] = [
    PASSWORD_UPPER[bytes[0] % PASSWORD_UPPER.length],
    PASSWORD_LOWER[bytes[1] % PASSWORD_LOWER.length],
    PASSWORD_DIGIT[bytes[2] % PASSWORD_DIGIT.length],
  ];
  for (let index: number = chars.length; index < RANDOM_PASSWORD_LENGTH; index += 1) {
    chars.push(pool[bytes[index] % pool.length]);
  }
  return chars.join('');
}

function assertPasswordStrength(pw: string): void {
  const ok: boolean =
    pw.length >= PASSWORD_MIN_LENGTH &&
    /[A-Z]/u.test(pw) &&
    /[a-z]/u.test(pw) &&
    /[0-9]/u.test(pw);
  if (!ok) {
    throw new BadRequestException('密码至少8位，需包含大小写字母和数字');
  }
}

const ACCOUNT_SORT_COLUMN_MAP: Record<string, AnyPgColumn> = {
  loginCount: customerAccounts.loginCount,
  lastLoginAt: customerAccounts.lastLoginAt,
  createdAt: customerAccounts.createdAt,
};

function mapAccount(row: AccountRow): CustomerAccount {
  return {
    id: row.id,
    accountNo: row.accountNo,
    customerId: row.customerId,
    customerName: row.customerName,
    username: row.username,
    phone: row.phone,
    email: row.email,
    status: row.status,
    lastLoginAt: toSystemEnhanceIsoOrNull(row.lastLoginAt),
    lastLoginIp: row.lastLoginIp,
    loginCount: row.loginCount,
    remark: row.remark,
    createdAt: toSystemEnhanceIsoOrNull(row.createdAt) ?? '',
    updatedAt: toSystemEnhanceIsoOrNull(row.updatedAt) ?? '',
  };
}

@Injectable()
export class CustomerAccountsService {
  private readonly logger = new Logger(CustomerAccountsService.name);

  constructor(
    private readonly messageNotificationService: MessageNotificationService,
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
    private readonly loginLogsService: LoginLogsService,
  ) {}

  async list(
    params: CustomerAccountListParams,
  ): Promise<TaskEnhanceListResponse<CustomerAccount>> {
    const { page, pageSize, offset } = resolveSystemEnhancePagination(
      params.page,
      params.pageSize,
    );
    const conditions: SQL[] = [isNull(customerAccounts.deletedAt)];
    if (params.customerId) {
      conditions.push(eq(customerAccounts.customerId, params.customerId));
    }
    if (params.customerName) {
      conditions.push(
        ilike(customerAccounts.customerName, `%${params.customerName}%`),
      );
    }
    if (params.username) {
      conditions.push(ilike(customerAccounts.username, `%${params.username}%`));
    }
    if (params.status) {
      conditions.push(eq(customerAccounts.status, params.status));
    }
    const where = and(...conditions);
    const sortColumn =
      resolveSystemEnhanceSortColumn(
        params.sortBy,
        ACCOUNT_SORT_COLUMN_MAP,
      ) ?? customerAccounts.createdAt;
    const orderBy =
      resolveSystemEnhanceSortOrder(params.sortOrder) === 'asc'
        ? asc(sortColumn)
        : desc(sortColumn);
    const totalRows: { count: number | string }[] = await this.db
      .select({ count: count() })
      .from(customerAccounts)
      .where(where);
    const rows: AccountRow[] = await this.db
      .select()
      .from(customerAccounts)
      .where(where)
      .orderBy(orderBy)
      .limit(pageSize)
      .offset(offset);
    return {
      items: rows.map((row: AccountRow): CustomerAccount => mapAccount(row)),
      total: Number(totalRows[0]?.count ?? 0),
      page,
      pageSize,
    };
  }

  async create(
    dto: CustomerAccountCreateDto,
    userId: string,
  ): Promise<CustomerAccount> {
    const customerId: string = assertSystemEnhanceRequired(
      dto?.customerId,
      '客户ID',
    );
    const username: string = assertSystemEnhanceRequired(
      dto?.username,
      '登录名',
    );
    const password: string = assertSystemEnhanceRequired(dto?.password, '密码');
    assertPasswordStrength(password);
    const duplicated: { id: number }[] = await this.db
      .select({ id: customerAccounts.id })
      .from(customerAccounts)
      .where(eq(customerAccounts.username, username))
      .limit(1);
    if (duplicated.length > 0) {
      throw new ConflictException('登录名已存在');
    }
    const customers: { id: string; name: string }[] =
      UUID_PATTERN.test(customerId)
        ? await this.db
            .select({ id: customer.id, name: customer.name })
            .from(customer)
            .where(eq(customer.id, customerId))
            .limit(1)
        : [];
    if (customers.length === 0) {
      throw new NotFoundException('客户不存在');
    }
    const values: AccountInsert = {
      accountNo: '',
      customerId,
      customerName: customers[0].name,
      username,
      passwordHash: hashPassword(password),
      phone: dto?.phone ?? null,
      email: dto?.email ?? null,
      status: '启用',
      loginCount: 0,
      remark: dto?.remark ?? null,
      createdBy: userId,
      updatedBy: userId,
    };
    try {
      const { row } = await insertWithSeqNo<AccountRow>({
        db: this.db,
        table: customerAccounts,
        noColumn: customerAccounts.accountNo,
        prefix: ACCOUNT_NO_PREFIX,
        insert: (no: string) =>
          this.db
            .insert(customerAccounts)
            .values({ ...values, accountNo: no })
            .returning(),
      });
      this.logger.log(`客户账户创建成功 id=${String(row.id)} no=${row.accountNo}`);
      try {
        await this.messageNotificationService.pushSystemNotice({
          title: '客户账户创建成功',
          content: `客户「${row.customerName}」的登录账号「${row.username}」已创建（编号 ${row.accountNo}）。`,
          toUserId: userId,
          relatedModule: '系统',
          relatedBusinessId: String(row.id),
          relatedBusinessNo: row.accountNo,
        });
      } catch (error: unknown) {
        this.logger.warn(
          `客户账户创建通知推送失败: ${JSON.stringify({ no: row.accountNo, error: String(error) })}`,
        );
      }
      return mapAccount(row);
    } catch (error: unknown) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('登录名已存在');
      }
      throw error;
    }
  }

  async update(
    id: number,
    dto: CustomerAccountUpdateDto,
    userId: string,
  ): Promise<CustomerAccount> {
    const patch: Partial<AccountInsert> = {};
    if (dto?.phone !== undefined) patch.phone = dto.phone;
    if (dto?.email !== undefined) patch.email = dto.email;
    if (dto?.status !== undefined) {
      patch.status = assertSystemEnhanceEnum(
        dto.status,
        ACCOUNT_STATUSES,
        '账户状态',
      );
    }
    if (dto?.remark !== undefined) patch.remark = dto.remark;
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }
    patch.updatedAt = new Date();
    patch.updatedBy = userId;
    const updated: AccountRow[] = await this.db
      .update(customerAccounts)
      .set(patch)
      .where(
        and(eq(customerAccounts.id, id), isNull(customerAccounts.deletedAt)),
      )
      .returning();
    if (updated.length === 0) {
      throw new NotFoundException('账户不存在');
    }
    return mapAccount(updated[0]);
  }

  async resetPassword(
    id: number,
    userId: string,
  ): Promise<{ password: string }> {
    const existing: AccountRow = await this.findAccountOrThrow(id);
    if (existing.status === '停用') {
      throw new BadRequestException('账户已停用');
    }
    if (existing.status === '锁定') {
      throw new BadRequestException('账户已锁定，请先解锁');
    }
    const password: string = generateRandomPassword();
    const updated: { id: number }[] = await this.db
      .update(customerAccounts)
      .set({
        passwordHash: hashPassword(password),
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(
        and(eq(customerAccounts.id, id), isNull(customerAccounts.deletedAt)),
      )
      .returning({ id: customerAccounts.id });
    if (updated.length === 0) {
      throw new NotFoundException('账户不存在');
    }
    this.logger.log(`客户账户密码重置 id=${String(id)}`);
    return { password };
  }

  async unlock(id: number, userId: string): Promise<CustomerAccount> {
    const existing: AccountRow = await this.findAccountOrThrow(id);
    if (existing.status !== '锁定') {
      throw new BadRequestException('账户未锁定');
    }
    const updated: AccountRow[] = await this.db
      .update(customerAccounts)
      .set({
        status: '启用',
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(
        and(
          eq(customerAccounts.id, id),
          eq(customerAccounts.status, '锁定'),
          isNull(customerAccounts.deletedAt),
        ),
      )
      .returning();
    if (updated.length === 0) {
      throw new ConflictException('账户状态已变更，请刷新后重试');
    }
    return mapAccount(updated[0]);
  }

  async loginLogs(id: number): Promise<LoginLog[]> {
    const account: AccountRow = await this.findAccountOrThrow(id);
    return this.loginLogsService.listByUsername(account.username, 50);
  }

  async remove(id: number, userId: string): Promise<{ success: boolean }> {
    const deleted: { id: number }[] = await this.db
      .update(customerAccounts)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(
        and(eq(customerAccounts.id, id), isNull(customerAccounts.deletedAt)),
      )
      .returning({ id: customerAccounts.id });
    if (deleted.length === 0) {
      throw new NotFoundException('账户不存在');
    }
    return { success: true };
  }

  private async findAccountOrThrow(id: number): Promise<AccountRow> {
    const rows: AccountRow[] = await this.db
      .select()
      .from(customerAccounts)
      .where(
        and(eq(customerAccounts.id, id), isNull(customerAccounts.deletedAt)),
      )
      .limit(1);
    if (rows.length === 0) {
      throw new NotFoundException('账户不存在');
    }
    return rows[0];
  }
}
