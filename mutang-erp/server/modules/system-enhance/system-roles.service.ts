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
  inArray,
  isNull,
  type SQL,
} from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { rolePermissions, roles } from '@server/database/schema';
import type {
  CurrentUserRole,
  RoleCopyDto,
  RolePermissionItem,
  RolePermissionSaveDto,
  SystemRole,
  SystemRoleCreateDto,
  SystemRoleListParams,
  SystemRoleUpdateDto,
  TaskEnhanceListResponse,
} from '@shared/api.interface';
import { insertWithSeqNo, isUniqueViolation } from '../finance-core/fin-seq.util';
import {
  assertSystemEnhanceEnum,
  assertSystemEnhanceRequired,
  parseSystemEnhanceJson,
  resolveSystemEnhancePagination,
  resolveSystemEnhanceSortColumn,
  resolveSystemEnhanceSortOrder,
  toSystemEnhanceIsoOrNull,
} from './system-enhance-shared.util';
import { buildCurrentUserRole } from './role-permission.util';

/** 角色权限：编号 JS、权限全量替换、角色复制 */
type RoleRow = typeof roles.$inferSelect;
type RoleInsert = typeof roles.$inferInsert;
type RolePermissionRow = typeof rolePermissions.$inferSelect;
type RolePermissionInsert = typeof rolePermissions.$inferInsert;

const ROLE_NO_PREFIX: string = 'JS';
const ROLE_STATUSES: string[] = ['启用', '停用'];
const DATA_SCOPES: string[] = [
  '全部数据',
  '本部门',
  '本部门及下级',
  '仅本人',
  '自定义',
];
const PERMISSION_TYPES: string[] = ['菜单', '按钮', '数据', '字段'];

function mapRole(row: RoleRow, permissionCount: number): SystemRole {
  return {
    id: row.id,
    roleNo: row.roleNo,
    roleName: row.roleName,
    roleCode: row.roleCode,
    description: row.description,
    dataScope: row.dataScope,
    status: row.status,
    isSystem: row.isSystem,
    permissionCount,
    remark: row.remark,
    createdAt: toSystemEnhanceIsoOrNull(row.createdAt) ?? '',
    updatedAt: toSystemEnhanceIsoOrNull(row.updatedAt) ?? '',
  };
}

function mapPermission(row: RolePermissionRow): RolePermissionItem {
  const rawValue: unknown = row.permissionValue;
  const parsed: Record<string, unknown> | null =
    parseSystemEnhanceJson(rawValue);
  const value: unknown = parsed ?? rawValue;
  return {
    id: row.id,
    roleId: row.roleId,
    permissionType: row.permissionType,
    permissionKey: row.permissionKey,
    permissionValue: value,
  };
}

const ROLE_SORT_COLUMN_MAP: Record<string, AnyPgColumn> = {
  createdAt: roles.createdAt,
  roleNo: roles.roleNo,
};

@Injectable()
export class SystemRolesService {
  private readonly logger = new Logger(SystemRolesService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
  ) {}

  /** 当前登录用户的生效角色与菜单权限 */
  async current(userId: string): Promise<CurrentUserRole> {
    return buildCurrentUserRole(this.db, userId);
  }

  async list(
    params: SystemRoleListParams,
  ): Promise<TaskEnhanceListResponse<SystemRole>> {
    const { page, pageSize, offset } = resolveSystemEnhancePagination(
      params.page,
      params.pageSize,
    );
    const conditions: SQL[] = [isNull(roles.deletedAt)];
    if (params.roleName) {
      conditions.push(ilike(roles.roleName, `%${params.roleName}%`));
    }
    if (params.roleCode) {
      conditions.push(ilike(roles.roleCode, `%${params.roleCode}%`));
    }
    if (params.status) {
      conditions.push(eq(roles.status, params.status));
    }
    const where = and(...conditions);
    const sortColumn =
      resolveSystemEnhanceSortColumn(params.sortBy, ROLE_SORT_COLUMN_MAP) ??
      roles.createdAt;
    const orderBy =
      resolveSystemEnhanceSortOrder(params.sortOrder) === 'asc'
        ? asc(sortColumn)
        : desc(sortColumn);
    const totalRows: { count: number | string }[] = await this.db
      .select({ count: count() })
      .from(roles)
      .where(where);
    const rows: RoleRow[] = await this.db
      .select()
      .from(roles)
      .where(where)
      .orderBy(orderBy)
      .limit(pageSize)
      .offset(offset);
    const permissionCounts: Map<number, number> =
      await this.countPermissionsByRole(
        rows.map((row: RoleRow): number => row.id),
      );
    return {
      items: rows.map(
        (row: RoleRow): SystemRole =>
          mapRole(row, permissionCounts.get(row.id) ?? 0),
      ),
      total: Number(totalRows[0]?.count ?? 0),
      page,
      pageSize,
    };
  }

  async listPermissions(id: number): Promise<RolePermissionItem[]> {
    await this.findRoleOrThrow(id);
    const rows: RolePermissionRow[] = await this.db
      .select()
      .from(rolePermissions)
      .where(
        and(
          eq(rolePermissions.roleId, id),
          isNull(rolePermissions.deletedAt),
        ),
      )
      .orderBy(asc(rolePermissions.id));
    return rows.map(
      (row: RolePermissionRow): RolePermissionItem => mapPermission(row),
    );
  }

  async create(dto: SystemRoleCreateDto, userId: string): Promise<SystemRole> {
    const roleName: string = assertSystemEnhanceRequired(dto?.roleName, '角色名称');
    const roleCode: string = assertSystemEnhanceRequired(dto?.roleCode, '角色编码');
    await this.assertRoleCodeAvailable(roleCode);
    const dataScope: string =
      dto?.dataScope !== undefined
        ? assertSystemEnhanceEnum(dto.dataScope, DATA_SCOPES, '数据范围')
        : '全部数据';
    const values: RoleInsert = {
      roleNo: '',
      roleName,
      roleCode,
      description: dto?.description ?? null,
      dataScope,
      status: '启用',
      isSystem: false,
      remark: dto?.remark ?? null,
      createdBy: userId,
      updatedBy: userId,
    };
    try {
      const { row } = await insertWithSeqNo<RoleRow>({
        db: this.db,
        table: roles,
        noColumn: roles.roleNo,
        prefix: ROLE_NO_PREFIX,
        insert: (no: string) =>
          this.db
            .insert(roles)
            .values({ ...values, roleNo: no })
            .returning(),
      });
      this.logger.log(`角色创建成功 id=${String(row.id)} no=${row.roleNo}`);
      return mapRole(row, 0);
    } catch (error: unknown) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('角色编码已存在');
      }
      throw error;
    }
  }

  async update(
    id: number,
    dto: SystemRoleUpdateDto,
    userId: string,
  ): Promise<SystemRole> {
    await this.findRoleOrThrow(id);
    const patch: Partial<RoleInsert> = {};
    if (dto?.roleName !== undefined) {
      patch.roleName = assertSystemEnhanceRequired(dto.roleName, '角色名称');
    }
    if (dto?.description !== undefined) patch.description = dto.description;
    if (dto?.dataScope !== undefined) {
      patch.dataScope = assertSystemEnhanceEnum(
        dto.dataScope,
        DATA_SCOPES,
        '数据范围',
      );
    }
    if (dto?.status !== undefined) {
      patch.status = assertSystemEnhanceEnum(dto.status, ROLE_STATUSES, '角色状态');
    }
    if (dto?.remark !== undefined) patch.remark = dto.remark;
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }
    patch.updatedAt = new Date();
    patch.updatedBy = userId;
    const updated: RoleRow[] = await this.db
      .update(roles)
      .set(patch)
      .where(and(eq(roles.id, id), isNull(roles.deletedAt)))
      .returning();
    if (updated.length === 0) {
      throw new NotFoundException('角色不存在');
    }
    const permissionCounts: Map<number, number> =
      await this.countPermissionsByRole([id]);
    return mapRole(updated[0], permissionCounts.get(id) ?? 0);
  }

  /** 全量替换角色权限：旧权限软删 + 插入新权限，事务保证整体成功/失败 */
  async savePermissions(
    id: number,
    dto: RolePermissionSaveDto,
    userId: string,
  ): Promise<{ count: number }> {
    await this.findRoleOrThrow(id);
    const items = dto?.permissions;
    if (!Array.isArray(items)) {
      throw new BadRequestException('请提供权限列表');
    }
    const inserts: RolePermissionInsert[] = items.map(
      (
        item: {
          permissionType: string;
          permissionKey: string;
          permissionValue?: unknown;
        },
      ): RolePermissionInsert => ({
        roleId: id,
        permissionType: assertSystemEnhanceEnum(
          item?.permissionType,
          PERMISSION_TYPES,
          '权限类型',
        ),
        permissionKey: assertSystemEnhanceRequired(
          item?.permissionKey,
          '权限标识',
        ),
        permissionValue: item?.permissionValue ?? null,
        createdBy: userId,
        updatedBy: userId,
      }),
    );
    await this.db.transaction(async (tx) => {
      await tx
        .update(rolePermissions)
        .set({
          deletedAt: new Date(),
          updatedAt: new Date(),
          updatedBy: userId,
        })
        .where(
          and(
            eq(rolePermissions.roleId, id),
            isNull(rolePermissions.deletedAt),
          ),
        );
      if (inserts.length > 0) {
        await tx.insert(rolePermissions).values(inserts);
      }
    });
    this.logger.log(
      `角色权限全量替换 roleId=${String(id)} count=${String(inserts.length)}`,
    );
    return { count: inserts.length };
  }

  async copy(id: number, dto: RoleCopyDto, userId: string): Promise<SystemRole> {
    const source: RoleRow = await this.findRoleOrThrow(id);
    const roleName: string = assertSystemEnhanceRequired(dto?.roleName, '角色名称');
    const roleCode: string = assertSystemEnhanceRequired(dto?.roleCode, '角色编码');
    const includePermissions: boolean = dto?.includePermissions === true;
    await this.assertRoleCodeAvailable(roleCode);
    const values: RoleInsert = {
      roleNo: '',
      roleName,
      roleCode,
      description: source.description,
      dataScope: source.dataScope,
      status: '启用',
      isSystem: false,
      remark: source.remark,
      createdBy: userId,
      updatedBy: userId,
    };
    try {
      const { row } = await insertWithSeqNo<RoleRow>({
        db: this.db,
        table: roles,
        noColumn: roles.roleNo,
        prefix: ROLE_NO_PREFIX,
        insert: (no: string) =>
          this.db
            .insert(roles)
            .values({ ...values, roleNo: no })
            .returning(),
      });
      let permissionCount: number = 0;
      if (includePermissions) {
        const sourcePermissions: RolePermissionRow[] = await this.db
          .select()
          .from(rolePermissions)
          .where(
            and(
              eq(rolePermissions.roleId, id),
              isNull(rolePermissions.deletedAt),
            ),
          );
        if (sourcePermissions.length > 0) {
          await this.db
            .insert(rolePermissions)
            .values(
              sourcePermissions.map(
                (item: RolePermissionRow): RolePermissionInsert => ({
                  roleId: row.id,
                  permissionType: item.permissionType,
                  permissionKey: item.permissionKey,
                  permissionValue: item.permissionValue,
                  createdBy: userId,
                  updatedBy: userId,
                }),
              ),
            );
          permissionCount = sourcePermissions.length;
        }
      }
      this.logger.log(
        `角色复制成功 sourceId=${String(id)} newId=${String(row.id)} no=${row.roleNo}`,
      );
      return mapRole(row, permissionCount);
    } catch (error: unknown) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('角色编码已存在');
      }
      throw error;
    }
  }

  async updateStatus(
    id: number,
    status: string,
    userId: string,
  ): Promise<SystemRole> {
    const validated: string = assertSystemEnhanceEnum(
      status,
      ROLE_STATUSES,
      '角色状态',
    );
    const updated: RoleRow[] = await this.db
      .update(roles)
      .set({
        status: validated,
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(and(eq(roles.id, id), isNull(roles.deletedAt)))
      .returning();
    if (updated.length === 0) {
      throw new NotFoundException('角色不存在');
    }
    const permissionCounts: Map<number, number> =
      await this.countPermissionsByRole([id]);
    return mapRole(updated[0], permissionCounts.get(id) ?? 0);
  }

  async remove(id: number, userId: string): Promise<{ success: boolean }> {
    const existing: RoleRow = await this.findRoleOrThrow(id);
    if (existing.isSystem) {
      throw new ConflictException('系统内置角色不可删除');
    }
    const permissionRows: { count: number | string }[] = await this.db
      .select({ count: count() })
      .from(rolePermissions)
      .where(
        and(eq(rolePermissions.roleId, id), isNull(rolePermissions.deletedAt)),
      );
    if (Number(permissionRows[0]?.count ?? 0) > 0) {
      throw new ConflictException('角色已配置权限，无法删除');
    }
    const deleted: { id: number }[] = await this.db
      .update(roles)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(and(eq(roles.id, id), isNull(roles.deletedAt)))
      .returning({ id: roles.id });
    if (deleted.length === 0) {
      throw new NotFoundException('角色不存在');
    }
    return { success: true };
  }

  /** 一次分组查询回填角色权限计数，禁 N+1 */
  private async countPermissionsByRole(
    roleIds: number[],
  ): Promise<Map<number, number>> {
    const result = new Map<number, number>();
    if (roleIds.length === 0) return result;
    const rows: { roleId: number; count: number | string }[] = await this.db
      .select({ roleId: rolePermissions.roleId, count: count() })
      .from(rolePermissions)
      .where(
        and(
          inArray(rolePermissions.roleId, roleIds),
          isNull(rolePermissions.deletedAt),
        ),
      )
      .groupBy(rolePermissions.roleId);
    for (const row of rows) {
      result.set(row.roleId, Number(row.count));
    }
    return result;
  }

  private async assertRoleCodeAvailable(roleCode: string): Promise<void> {
    const duplicated: { id: number }[] = await this.db
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.roleCode, roleCode))
      .limit(1);
    if (duplicated.length > 0) {
      throw new ConflictException('角色编码已存在');
    }
  }

  private async findRoleOrThrow(id: number): Promise<RoleRow> {
    const rows: RoleRow[] = await this.db
      .select()
      .from(roles)
      .where(and(eq(roles.id, id), isNull(roles.deletedAt)))
      .limit(1);
    if (rows.length === 0) {
      throw new NotFoundException('角色不存在');
    }
    return rows[0];
  }
}
