import {
  ForbiddenException,
  Injectable,
  Logger,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_DATABASE } from '@lark-apaas/fullstack-nestjs-core';
import type { PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { tap, type Observable } from 'rxjs';
import { OperationLogsEnhanceService } from './operation-logs-enhance.service';
import { buildCurrentUserRole, resolveModuleByPath } from './role-permission.util';

interface OperationLogRequest {
  method: string;
  path: string;
  userContext?: { userId?: string; userName?: string };
  headers: Record<string, unknown>;
  socket?: { remoteAddress?: string };
}

const WRITE_METHODS: Set<string> = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** 免拦截路径：日志自身/登录上报/当前角色查询，避免递归与死锁 */
const SKIP_PATH_PREFIXES: string[] = [
  '/api/system-enhance/login-logs',
  '/api/system-enhance/operation-logs',
  '/api/system-enhance/roles/current',
  '/api/hello',
];

const METHOD_OPERATION_MAP: Record<string, string> = {
  POST: '新增',
  PUT: '编辑',
  PATCH: '编辑',
  DELETE: '删除',
};

function extractClientIp(req: OperationLogRequest): string {
  const forwarded: unknown = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim() !== '') {
    return forwarded.split(',')[0].trim();
  }
  const realIp: unknown = req.headers['x-real-ip'];
  if (typeof realIp === 'string' && realIp.trim() !== '') {
    return realIp.trim();
  }
  return req.socket?.remoteAddress ?? '';
}

function extractTargetName(data: unknown): string | null {
  if (data === null || typeof data !== 'object') return null;
  const record: Record<string, unknown> = data as Record<string, unknown>;
  const nameKeys: string[] = [
    'name',
    'title',
    'customerName',
    'projectName',
    'roleName',
    'settingName',
    'contractNo',
    'orderNo',
    'taskNo',
    'templateName',
    'materialName',
    'logNo',
  ];
  for (const key of nameKeys) {
    const value: unknown = record[key];
    if (typeof value === 'string' && value.trim() !== '') {
      return value.slice(0, 255);
    }
  }
  return null;
}

function extractTargetId(path: string, data: unknown): string | null {
  const record: Record<string, unknown> =
    data !== null && typeof data === 'object'
      ? (data as Record<string, unknown>)
      : {};
  const dataId: unknown = record.id;
  if (typeof dataId === 'string' || typeof dataId === 'number') {
    return String(dataId).slice(0, 100);
  }
  const segments: string[] = path.split('/').filter(Boolean);
  const last: string | undefined = segments[segments.length - 1];
  if (last && /^[a-zA-Z0-9-]{6,}$/.test(last)) {
    return last.slice(0, 100);
  }
  return null;
}

/**
 * 全局操作日志拦截器：
 * 1. 写操作（POST/PUT/PATCH/DELETE）按角色菜单权限做接口层校验（admin 全放行）；
 * 2. 成功响应后自动写入操作日志（删除=高风险，新建/编辑=普通）。
 */
@Injectable()
export class OperationLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(OperationLogInterceptor.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly operationLogsService: OperationLogsEnhanceService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    if (context.getType<string>() !== 'http') {
      return next.handle();
    }
    const req: OperationLogRequest = context.switchToHttp().getRequest();
    const method: string = String(req.method ?? '').toUpperCase();
    // 网关下 req.path 带 /app/<appId> 挂载前缀，统一截取 /api/ 起始段
    const rawPath: string = String(req.path ?? '');
    const apiIndex: number = rawPath.indexOf('/api/');
    const path: string = apiIndex >= 0 ? rawPath.slice(apiIndex) : rawPath;
    if (
      !WRITE_METHODS.has(method) ||
      !path.startsWith('/api/') ||
      SKIP_PATH_PREFIXES.some(
        (prefix: string): boolean => path.startsWith(prefix),
      )
    ) {
      return next.handle();
    }

    const module: string | null = resolveModuleByPath(path);
    const userId: string = req.userContext?.userId ?? '';
    const username: string =
      req.userContext?.userName || userId || '匿名用户';

    // 接口层权限校验：非 admin 角色仅允许其菜单权限内的写操作
    if (userId && module) {
      const role = await buildCurrentUserRole(this.db, userId);
      if (!role.isAdmin && !role.menus.includes(module)) {
        throw new ForbiddenException(
          `当前角色（${role.roleName}）无「${module}」模块的操作权限`,
        );
      }
    }

    const ipAddress: string = extractClientIp(req);
    const userAgent: string = String(req.headers['user-agent'] ?? '').slice(
      0,
      490,
    );

    return next.handle().pipe(
      tap((data: unknown) => {
        // 后台异步落库，失败仅记错误日志，不影响主流程
        void this.operationLogsService
          .create(
            {
              module: module ?? '系统管理',
              operation: METHOD_OPERATION_MAP[method] ?? '其他',
              targetType: module ?? '系统管理',
              targetId: extractTargetId(path, data),
              targetName: extractTargetName(data),
              ipAddress,
              userAgent,
              remark: `自动记录（${method} ${path}）`.slice(0, 500),
            },
            userId || 'anonymous',
            username,
          )
          .catch((error: unknown): void => {
            this.logger.error(
              `操作日志自动记录失败 path=${path} error=${String(error)}`,
            );
          });
      }),
    );
  }
}
