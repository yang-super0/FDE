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
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNull,
  lt,
  type SQL,
} from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { loginLogs, systemSettings } from '@server/database/schema';
import type {
  LoginLog,
  LoginLogCreateDto,
  LoginLogListParams,
  LoginLogRecordResult,
  LoginLogStats,
  TaskEnhanceListResponse,
} from '@shared/api.interface';
import { insertWithSeqNo } from '../finance-core/fin-seq.util';
import {
  assertSystemEnhanceDate,
  assertSystemEnhanceEnum,
  assertSystemEnhanceRequired,
  parseSystemEnhanceJson,
  resolveSystemEnhancePagination,
  resolveSystemEnhanceSortColumn,
  resolveSystemEnhanceSortOrder,
  toSystemEnhanceIsoOrNull,
} from './system-enhance-shared.util';

/** 登录日志：编号 DL、自动锁定策略、风险标记批量计算 */
type LoginLogRow = typeof loginLogs.$inferSelect;
type LoginLogInsert = typeof loginLogs.$inferInsert;

const LOGIN_LOG_NO_PREFIX: string = 'DL';
const LOGIN_TYPES: string[] = ['账号密码', '飞书授权', 'SSO'];
const LOGIN_STATUSES: string[] = ['成功', '失败', '锁定'];
const LOGIN_FAIL_REASONS: string[] = [
  '密码错误',
  '账号不存在',
  '账号锁定',
  '验证码错误',
];
const STATUS_SUCCESS: string = '成功';
const STATUS_FAIL: string = '失败';
const STATUS_LOCK: string = '锁定';
const RISK_FLAG_DIFF_LOCATION: string = '异地登录';
const RISK_FLAG_MULTI_FAIL: string = '多次失败';
const RISK_FLAG_DIFF_DEVICE: string = '非常用设备';
const MULTI_FAIL_WINDOW: number = 5;
const MULTI_FAIL_THRESHOLD: number = 3;
const SHANGHAI_OFFSET_MS: number = 8 * 3600000;
const ONE_DAY_MS: number = 86400000;
const TREND_DAYS: number = 14;
const DEFAULT_MAX_FAIL_COUNT: number = 5;
const SETTING_KEY_MAX_FAIL: string = 'login.max_fail_count';

/** 风险判定所需的登录记录轻量结构 */
interface LoginHistoryLite {
  username: string;
  loginStatus: string;
  ipLocation: string | null;
  deviceInfo: string | null;
  createdAt: Date;
}

function toLite(row: LoginLogRow): LoginHistoryLite {
  return {
    username: row.username,
    loginStatus: row.loginStatus,
    ipLocation: row.ipLocation,
    deviceInfo: row.deviceInfo,
    createdAt: row.createdAt,
  };
}

function computeLoginRiskFlags(
  row: LoginHistoryLite,
  history: LoginHistoryLite[],
): string[] {
  const flags: string[] = [];
  const sameUser: LoginHistoryLite[] = history.filter(
    (item: LoginHistoryLite): boolean => item.username === row.username,
  );
  const earlier: LoginHistoryLite[] = sameUser.filter(
    (item: LoginHistoryLite): boolean =>
      item.createdAt.getTime() < row.createdAt.getTime(),
  );
  if (
    earlier.some(
      (item: LoginHistoryLite): boolean =>
        (item.ipLocation ?? '') !== '' && item.ipLocation !== row.ipLocation,
    )
  ) {
    flags.push(RISK_FLAG_DIFF_LOCATION);
  }
  if (
    earlier.some(
      (item: LoginHistoryLite): boolean =>
        (item.deviceInfo ?? '') !== '' && item.deviceInfo !== row.deviceInfo,
    )
  ) {
    flags.push(RISK_FLAG_DIFF_DEVICE);
  }
  const recent: LoginHistoryLite[] = sameUser
    .filter(
      (item: LoginHistoryLite): boolean =>
        item.createdAt.getTime() <= row.createdAt.getTime(),
    )
    .sort(
      (a: LoginHistoryLite, b: LoginHistoryLite): number =>
        b.createdAt.getTime() - a.createdAt.getTime(),
    )
    .slice(0, MULTI_FAIL_WINDOW);
  if (
    recent.filter(
      (item: LoginHistoryLite): boolean => item.loginStatus === STATUS_FAIL,
    ).length >= MULTI_FAIL_THRESHOLD
  ) {
    flags.push(RISK_FLAG_MULTI_FAIL);
  }
  return flags;
}

function shanghaiDayKey(value: Date): string {
  return new Date(value.getTime() + SHANGHAI_OFFSET_MS)
    .toISOString()
    .slice(0, 10);
}

function mapLoginLogRow(row: LoginLogRow, riskFlags: string[]): LoginLog {
  return {
    id: row.id,
    logNo: row.logNo,
    userId: row.userId,
    username: row.username,
    loginType: row.loginType,
    loginStatus: row.loginStatus,
    failReason: row.failReason,
    ipAddress: row.ipAddress,
    ipLocation: row.ipLocation,
    userAgent: row.userAgent,
    deviceInfo: row.deviceInfo,
    riskFlags,
    remark: row.remark,
    createdAt: toSystemEnhanceIsoOrNull(row.createdAt) ?? '',
  };
}

const LOGIN_LOG_SORT_COLUMN_MAP: Record<string, AnyPgColumn> = {
  createdAt: loginLogs.createdAt,
};

@Injectable()
export class LoginLogsService {
  private readonly logger = new Logger(LoginLogsService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
  ) {}

  private buildFilterConditions(params: LoginLogListParams): SQL[] {
    const conditions: SQL[] = [isNull(loginLogs.deletedAt)];
    if (params.loginStatus) {
      conditions.push(eq(loginLogs.loginStatus, params.loginStatus));
    }
    if (params.loginType) {
      conditions.push(eq(loginLogs.loginType, params.loginType));
    }
    if (params.username) {
      conditions.push(ilike(loginLogs.username, `%${params.username}%`));
    }
    if (params.dateFrom) {
      const from: string = assertSystemEnhanceDate(
        params.dateFrom,
        '开始日期',
      );
      conditions.push(gte(loginLogs.createdAt, new Date(from)));
    }
    if (params.dateTo) {
      const to: string = assertSystemEnhanceDate(params.dateTo, '结束日期');
      conditions.push(
        lt(loginLogs.createdAt, new Date(new Date(to).getTime() + ONE_DAY_MS)),
      );
    }
    return conditions;
  }

  async list(
    params: LoginLogListParams,
  ): Promise<TaskEnhanceListResponse<LoginLog>> {
    const { page, pageSize, offset } = resolveSystemEnhancePagination(
      params.page,
      params.pageSize,
    );
    const conditions: SQL[] = this.buildFilterConditions(params);
    const where = and(...conditions);
    const sortColumn =
      resolveSystemEnhanceSortColumn(
        params.sortBy,
        LOGIN_LOG_SORT_COLUMN_MAP,
      ) ?? loginLogs.createdAt;
    const orderBy =
      resolveSystemEnhanceSortOrder(params.sortOrder) === 'asc'
        ? asc(sortColumn)
        : desc(sortColumn);
    const totalRows: { count: number | string }[] = await this.db
      .select({ count: count() })
      .from(loginLogs)
      .where(where);
    const rows: LoginLogRow[] = await this.db
      .select()
      .from(loginLogs)
      .where(where)
      .orderBy(orderBy)
      .limit(pageSize)
      .offset(offset);
    return {
      items: await this.mapWithRiskFlags(rows),
      total: Number(totalRows[0]?.count ?? 0),
      page,
      pageSize,
    };
  }

  async stats(params?: LoginLogListParams): Promise<LoginLogStats> {
    const filterConditions: SQL[] =
      params === undefined
        ? []
        : this.buildFilterConditions(params).slice(1);
    const rows: LoginLogRow[] = await this.db
      .select()
      .from(loginLogs)
      .where(and(...filterConditions));
    const history: LoginHistoryLite[] = rows.map(toLite);
    let successCount: number = 0;
    let failCount: number = 0;
    let lockCount: number = 0;
    const byUserMap = new Map<
      string,
      { successCount: number; failCount: number }
    >();
    const trendMap = new Map<string, { successCount: number; failCount: number }>();
    const shiftedNow: Date = new Date(Date.now() + SHANGHAI_OFFSET_MS);
    for (let index: number = TREND_DAYS - 1; index >= 0; index -= 1) {
      const dayKey: string = new Date(
        shiftedNow.getTime() - index * ONE_DAY_MS,
      )
        .toISOString()
        .slice(0, 10);
      trendMap.set(dayKey, { successCount: 0, failCount: 0 });
    }
    for (const row of rows) {
      if (row.loginStatus === STATUS_SUCCESS) successCount += 1;
      else if (row.loginStatus === STATUS_FAIL) failCount += 1;
      else if (row.loginStatus === STATUS_LOCK) lockCount += 1;
      const userStat = byUserMap.get(row.username) ?? {
        successCount: 0,
        failCount: 0,
      };
      if (row.loginStatus === STATUS_SUCCESS) userStat.successCount += 1;
      if (row.loginStatus === STATUS_FAIL) userStat.failCount += 1;
      byUserMap.set(row.username, userStat);
      const dayKey: string = shanghaiDayKey(row.createdAt);
      const dayStat = trendMap.get(dayKey);
      if (dayStat) {
        if (row.loginStatus === STATUS_SUCCESS) dayStat.successCount += 1;
        if (row.loginStatus === STATUS_FAIL) dayStat.failCount += 1;
      }
    }
    const total: number = rows.length;
    const byUser = [...byUserMap.entries()]
      .map(
        (entry: [string, { successCount: number; failCount: number }]): {
          name: string;
          successCount: number;
          failCount: number;
        } => ({
          name: entry[0],
          successCount: entry[1].successCount,
          failCount: entry[1].failCount,
        }),
      )
      .sort(
        (
          a: { successCount: number; failCount: number },
          b: { successCount: number; failCount: number },
        ): number =>
          b.successCount +
          b.failCount -
          (a.successCount + a.failCount),
      )
      .slice(0, 10);
    const trend = [...trendMap.entries()].map(
      (entry: [string, { successCount: number; failCount: number }]): {
        date: string;
        successCount: number;
        failCount: number;
      } => ({
        date: entry[0],
        successCount: entry[1].successCount,
        failCount: entry[1].failCount,
      }),
    );
    const abnormalCount: number = rows.filter(
      (row: LoginLogRow): boolean =>
        computeLoginRiskFlags(toLite(row), history).length > 0,
    ).length;
    const successRate: number =
      total > 0 ? Math.round((successCount / total) * 1000) / 10 : 0;
    return {
      successCount,
      failCount,
      lockCount,
      successRate,
      byUser,
      trend,
      abnormalCount,
    };
  }

  async detail(id: number): Promise<LoginLog> {
    const rows: LoginLogRow[] = await this.db
      .select()
      .from(loginLogs)
      .where(and(eq(loginLogs.id, id), isNull(loginLogs.deletedAt)))
      .limit(1);
    if (rows.length === 0) {
      throw new NotFoundException('登录日志不存在');
    }
    const mapped: LoginLog[] = await this.mapWithRiskFlags([rows[0]]);
    return mapped[0];
  }

  /** 登录上报：飞书登录成功后由前端调用，同用户 10 分钟内去重 */
  async recordLogin(
    userId: string,
    username: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<LoginLogRecordResult> {
    if (userId === '') {
      throw new BadRequestException('缺少用户身份');
    }
    const dedupeWindow: Date = new Date(Date.now() - 10 * 60 * 1000);
    const recent: { id: number }[] = await this.db
      .select({ id: loginLogs.id })
      .from(loginLogs)
      .where(
        and(
          eq(loginLogs.userId, userId),
          eq(loginLogs.loginStatus, '成功'),
          isNull(loginLogs.deletedAt),
          gte(loginLogs.createdAt, dedupeWindow),
        ),
      )
      .limit(1);
    if (recent.length > 0) {
      return { recorded: false };
    }
    await this.create({
      userId,
      username,
      loginType: '飞书授权',
      loginStatus: '成功',
      ipAddress,
      userAgent,
      remark: '飞书登录自动上报',
    });
    return { recorded: true };
  }

  async create(dto: LoginLogCreateDto): Promise<LoginLog> {
    const userId: string = assertSystemEnhanceRequired(dto?.userId, '用户ID');
    const username: string = assertSystemEnhanceRequired(
      dto?.username,
      '登录名',
    );
    const loginType: string = assertSystemEnhanceEnum(
      dto?.loginType,
      LOGIN_TYPES,
      '登录方式',
    );
    let loginStatus: string = assertSystemEnhanceEnum(
      dto?.loginStatus,
      LOGIN_STATUSES,
      '登录状态',
    );
    let failReason: string | null = null;
    if (dto?.failReason !== undefined && dto.failReason !== null && dto.failReason !== '') {
      failReason = assertSystemEnhanceEnum(
        dto.failReason,
        LOGIN_FAIL_REASONS,
        '失败原因',
      );
    }
    const maxFailCount: number = await this.readMaxFailCount();
    if (loginStatus === STATUS_FAIL) {
      const recent: { loginStatus: string }[] = await this.db
        .select({ loginStatus: loginLogs.loginStatus })
        .from(loginLogs)
        .where(and(eq(loginLogs.username, username), isNull(loginLogs.deletedAt)))
        .orderBy(desc(loginLogs.createdAt))
        .limit(maxFailCount);
      if (
        recent.length >= maxFailCount &&
        recent.every(
          (item: { loginStatus: string }): boolean =>
            item.loginStatus === STATUS_FAIL,
        )
      ) {
        loginStatus = STATUS_LOCK;
        failReason = '账号锁定';
      }
    }
    const values: LoginLogInsert = {
      logNo: '',
      userId,
      username,
      loginType,
      loginStatus,
      failReason,
      ipAddress: dto?.ipAddress ?? null,
      ipLocation: dto?.ipLocation ?? null,
      userAgent: dto?.userAgent ?? null,
      deviceInfo: dto?.deviceInfo ?? null,
      remark: dto?.remark ?? null,
      createdBy: userId,
      updatedBy: userId,
    };
    const { row } = await insertWithSeqNo<LoginLogRow>({
      db: this.db,
      table: loginLogs,
      noColumn: loginLogs.logNo,
      prefix: LOGIN_LOG_NO_PREFIX,
      insert: (no: string) =>
        this.db
          .insert(loginLogs)
          .values({ ...values, logNo: no })
          .returning(),
    });
    this.logger.log(`登录日志记录成功 id=${String(row.id)} no=${row.logNo}`);
    const mapped: LoginLog[] = await this.mapWithRiskFlags([row]);
    return mapped[0];
  }

  async remove(id: number, userId: string): Promise<{ success: boolean }> {
    const deleted: { id: number }[] = await this.db
      .update(loginLogs)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(and(eq(loginLogs.id, id), isNull(loginLogs.deletedAt)))
      .returning({ id: loginLogs.id });
    if (deleted.length === 0) {
      throw new NotFoundException('登录日志不存在');
    }
    return { success: true };
  }

  /** 按登录名精确查询最近登录记录（供客户账户关联查询） */
  async listByUsername(username: string, limit: number): Promise<LoginLog[]> {
    const rows: LoginLogRow[] = await this.db
      .select()
      .from(loginLogs)
      .where(
        and(
          eq(loginLogs.username, username),
          isNull(loginLogs.deletedAt),
        ),
      )
      .orderBy(desc(loginLogs.createdAt))
      .limit(limit);
    return this.mapWithRiskFlags(rows);
  }

  /** 批量计算风险标记：一次 inArray 查询当页用户名全量历史，内存计算，禁 N+1 */
  private async mapWithRiskFlags(rows: LoginLogRow[]): Promise<LoginLog[]> {
    if (rows.length === 0) return [];
    const usernames: string[] = [
      ...new Set(
        rows.map((row: LoginLogRow): string => row.username),
      ),
    ];
    const historyRows: LoginLogRow[] = await this.db
      .select()
      .from(loginLogs)
      .where(
        and(inArray(loginLogs.username, usernames), isNull(loginLogs.deletedAt)),
      )
      .orderBy(asc(loginLogs.createdAt));
    const history: LoginHistoryLite[] = historyRows.map(toLite);
    return rows.map(
      (row: LoginLogRow): LoginLog =>
        mapLoginLogRow(row, computeLoginRiskFlags(toLite(row), history)),
    );
  }

  /** 读取自动锁定阈值：system_settings key='login.max_fail_count'，缺省 5 */
  private async readMaxFailCount(): Promise<number> {
    const rows: { value: unknown }[] = await this.db
      .select({ value: systemSettings.settingValue })
      .from(systemSettings)
      .where(
        and(
          eq(systemSettings.settingKey, SETTING_KEY_MAX_FAIL),
          isNull(systemSettings.deletedAt),
        ),
      )
      .limit(1);
    const raw: unknown = rows[0]?.value;
    if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) {
      return Math.floor(raw);
    }
    if (typeof raw === 'string') {
      const parsed: number = Number(raw);
      if (Number.isFinite(parsed) && parsed > 0) {
        return Math.floor(parsed);
      }
    }
    if (raw !== null && raw !== undefined && typeof raw === 'object') {
      const parsedValue: unknown = parseSystemEnhanceJson(raw);
      if (
        parsedValue !== null &&
        typeof (parsedValue as { value?: unknown }).value !== 'undefined'
      ) {
        const inner: unknown = (parsedValue as { value: unknown }).value;
        const parsed: number = Number(inner);
        if (Number.isFinite(parsed) && parsed > 0) {
          return Math.floor(parsed);
        }
      }
    }
    return DEFAULT_MAX_FAIL_COUNT;
  }
}
