import { sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import type { CurrentUserRole } from '@shared/api.interface';

/** 全部可配置菜单模块（与角色权限弹窗 ROLE_MENU_MODULES 一致） */
export const ALL_MENU_MODULES: string[] = [
  '工作台',
  '客户管理',
  '公海线索',
  '广告投放',
  '视频业务',
  '合同管理',
  '财务管理',
  '人资管理',
  '行政管理',
  '任务中心',
  '系统管理',
  '支持中心',
];

/** 未配置菜单权限的非管理员角色默认可见的基础模块 */
export const DEFAULT_MENU_MODULES: string[] = [
  '工作台',
  '任务中心',
  '支持中心',
];

/** 未分配角色用户的默认角色（商务） */
export const FALLBACK_ROLE_CODE: string = 'business';
export const FALLBACK_ROLE_NAME: string = '商务';
export const FALLBACK_ROLE_SCOPE: string = '本人';

/** API 路径前缀 → 菜单模块映射（按需补充，未映射前缀不参与权限校验/日志记录） */
const API_PATH_MODULE_MAP: Array<[string, string]> = [
  ['/api/dashboard', '工作台'],
  ['/api/daily-consumption', '工作台'],
  ['/api/department-targets', '工作台'],
  ['/api/performance-tasks', '工作台'],
  ['/api/customers', '客户管理'],
  ['/api/opportunities', '客户管理'],
  ['/api/customer-pool', '公海线索'],
  ['/api/ad-business', '广告投放'],
  ['/api/ad-campaigns', '广告投放'],
  ['/api/finance-records', '广告投放'],
  ['/api/video-core', '视频业务'],
  ['/api/video-projects', '视频业务'],
  ['/api/contracts', '合同管理'],
  ['/api/contract-', '合同管理'],
  ['/api/finance-core', '财务管理'],
  ['/api/finance-enhance', '财务管理'],
  ['/api/report-center', '财务管理'],
  ['/api/hr-enhance', '人资管理'],
  ['/api/employees', '人资管理'],
  ['/api/attendances', '人资管理'],
  ['/api/departments', '人资管理'],
  ['/api/leaves', '人资管理'],
  ['/api/admin-enhance', '行政管理'],
  ['/api/announcements', '行政管理'],
  ['/api/assets', '行政管理'],
  ['/api/tasks', '任务中心'],
  ['/api/task-enhance', '任务中心'],
  ['/api/system-enhance', '系统管理'],
  ['/api/field-permissions', '系统管理'],
  ['/api/message-notifications', '系统管理'],
  ['/api/roles', '系统管理'],
  ['/api/system-users', '系统管理'],
  ['/api/system-configs', '系统管理'],
  ['/api/operation-logs', '系统管理'],
  ['/api/sync', '系统管理'],
  ['/api/support-enhance', '支持中心'],
  ['/api/tickets', '支持中心'],
  ['/api/knowledge-docs', '支持中心'],
];

function extractRows(result: unknown): Record<string, unknown>[] {
  if (Array.isArray(result)) {
    return result.filter(
      (row: unknown): row is Record<string, unknown> =>
        row !== null && typeof row === 'object',
    );
  }
  if (result !== null && typeof result === 'object') {
    const rows: unknown = (result as { rows?: unknown }).rows;
    if (Array.isArray(rows)) {
      return rows.filter(
        (row: unknown): row is Record<string, unknown> =>
          row !== null && typeof row === 'object',
      );
    }
  }
  return [];
}

/** 根据请求路径解析所属菜单模块，未映射返回 null */
export function resolveModuleByPath(path: string): string | null {
  for (const [prefix, moduleName] of API_PATH_MODULE_MAP) {
    if (path === prefix || path.startsWith(`${prefix}/`)) {
      return moduleName;
    }
  }
  return null;
}

/** 解析当前用户生效角色：sys_user.role_id → roles.id 直连；未绑定默认商务 */
export async function resolveUserEffectiveRole(
  db: PostgresJsDatabase,
  userId: string,
): Promise<{
  roleCode: string;
  roleName: string;
  dataScope: string;
}> {
  if (!userId) {
    return {
      roleCode: FALLBACK_ROLE_CODE,
      roleName: FALLBACK_ROLE_NAME,
      dataScope: FALLBACK_ROLE_SCOPE,
    };
  }
  const query = sql`SELECT r.role_code, r.role_name, r.data_scope
    FROM sys_user su
    JOIN roles r ON su.role_id = r.id
    WHERE (su.member).user_id = ${userId}
      AND su.status = 'enabled'
      AND r.deleted_at IS NULL
    LIMIT 1`;
  const rows: Record<string, unknown>[] = extractRows(await db.execute(query));
  const first: Record<string, unknown> | undefined = rows[0];
  const roleCode: string = String(first?.role_code ?? '').trim();
  if (!first || roleCode === '') {
    return {
      roleCode: FALLBACK_ROLE_CODE,
      roleName: FALLBACK_ROLE_NAME,
      dataScope: FALLBACK_ROLE_SCOPE,
    };
  }
  return {
    roleCode,
    roleName: String(first.role_name ?? FALLBACK_ROLE_NAME),
    dataScope: String(first.data_scope ?? FALLBACK_ROLE_SCOPE),
  };
}

/** 角色的菜单权限：admin 全量；未配置给默认基础模块 */
export async function resolveRoleMenus(
  db: PostgresJsDatabase,
  roleCode: string,
): Promise<string[]> {
  if (roleCode === 'admin') return [...ALL_MENU_MODULES];
  const query = sql`SELECT rp.permission_key
    FROM role_permissions rp
    JOIN roles r ON r.id = rp.role_id AND r.role_code = ${roleCode}
    WHERE rp.permission_type = 'menu' AND rp.deleted_at IS NULL
    ORDER BY rp.id`;
  const rows: Record<string, unknown>[] = extractRows(await db.execute(query));
  const menus: string[] = rows
    .map((row: Record<string, unknown>): string =>
      String(row.permission_key ?? '').trim(),
    )
    .filter((key: string): boolean => key !== '');
  if (menus.length === 0) return [...DEFAULT_MENU_MODULES];
  return menus;
}

/** 组装当前用户角色视图（供 /roles/current 与权限校验共用） */
export async function buildCurrentUserRole(
  db: PostgresJsDatabase,
  userId: string,
): Promise<CurrentUserRole> {
  const role = await resolveUserEffectiveRole(db, userId);
  const menus: string[] = await resolveRoleMenus(db, role.roleCode);
  return {
    roleCode: role.roleCode,
    roleName: role.roleName,
    dataScope: role.dataScope,
    menus,
    isAdmin: role.roleCode === 'admin',
  };
}
