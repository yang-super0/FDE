import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuthNPaasService,
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { and, count, desc, eq, inArray, isNull } from 'drizzle-orm';
import {
  rolePermissions,
  roles as rolesTable,
  sysConfig,
  sysUser,
} from '@server/database/schema';
import { OperationLogService } from '../operation-log/operation-log.service';
import type {
  PageResult,
  Role,
  SysConfig,
  SystemUser,
  SystemUserStatus,
} from '@shared/api.interface';
import type {
  ConfigItemDto,
  CreateSystemUserDto,
  UpdateSystemUserDto,
} from './dto/system.dto';

export interface RoleListResponse {
  items: Role[];
}

const LOG_MODULE = '系统管理';

@Injectable()
export class SystemService {
  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
    private readonly authn: AuthNPaasService,
    private readonly operationLog: OperationLogService,
  ) {}

  async listSystemUsers(
    page: number,
    pageSize: number,
  ): Promise<PageResult<SystemUser>> {
    const safePage: number = Math.max(page, 1);
    const safePageSize: number = Math.min(Math.max(pageSize, 1), 50);

    const rows = await this.db
      .select()
      .from(sysUser)
      .orderBy(desc(sysUser.createdAt))
      .limit(safePageSize)
      .offset((safePage - 1) * safePageSize);

    const totalResult = await this.db
      .select({ count: count() })
      .from(sysUser);
    const total: number = Number(totalResult[0]?.count ?? 0);

    const memberIds: string[] = Array.from(
      new Set(rows.map((row) => row.member)),
    );
    const nameMap = new Map<string, string>();
    if (memberIds.length > 0) {
      const users = await this.authn.listUsersByIds(memberIds.slice(0, 100));
      users.forEach((user, index: number) => {
        if (user) {
          nameMap.set(
            memberIds[index],
            user.name?.zh_cn ?? user.name?.en_us ?? '',
          );
        }
      });
    }

    const roleIds: number[] = rows
      .map((row) => row.roleId)
      .filter((id): id is number => typeof id === 'number');
    const roleNameMap = new Map<number, string>();
    if (roleIds.length > 0) {
      const roleRows = await this.db
        .select({ id: rolesTable.id, name: rolesTable.roleName })
        .from(rolesTable)
        .where(inArray(rolesTable.id, roleIds));
      roleRows.forEach((row) => roleNameMap.set(row.id, row.name));
    }

    const items: SystemUser[] = rows.map((row) => ({
      id: row.id,
      memberId: row.member,
      memberName: nameMap.get(row.member) ?? '',
      department: row.department,
      roleId: row.roleId === null ? '' : String(row.roleId),
      roleName:
        row.roleId === null ? '' : roleNameMap.get(row.roleId) ?? '',
      status: row.status === 'disabled' ? 'disabled' : 'enabled',
      createdAt: row.createdAt.toISOString(),
    }));

    return { items, total };
  }

  async createSystemUser(
    dto: CreateSystemUserDto,
    operatorId: string,
  ): Promise<{ id: string }> {
    if (dto.roleId) {
      const roleRows = await this.db
        .select({ id: rolesTable.id })
        .from(rolesTable)
        .where(eq(rolesTable.id, Number(dto.roleId)));
      if (roleRows.length === 0) {
        throw new BadRequestException('所选角色不存在');
      }
    }

    const existing = await this.db
      .select({ id: sysUser.id })
      .from(sysUser)
      .where(eq(sysUser.member, dto.memberId));
    if (existing.length > 0) {
      throw new ConflictException('该成员已是系统用户，请勿重复添加');
    }

    const inserted = await this.db
      .insert(sysUser)
      .values({
        member: dto.memberId,
        department: dto.department,
        roleId: dto.roleId ? Number(dto.roleId) : null,
        status: 'enabled',
      })
      .returning({ id: sysUser.id });

    await this.operationLog.record({
      module: LOG_MODULE,
      actionType: 'create',
      target: `系统用户 ${dto.department}`,
      operatorId,
    });

    return { id: inserted[0].id };
  }

  async updateSystemUser(
    id: string,
    dto: UpdateSystemUserDto,
    operatorId: string,
  ): Promise<{ success: boolean }> {
    if (dto.roleId) {
      const roleRows = await this.db
        .select({ id: rolesTable.id })
        .from(rolesTable)
        .where(eq(rolesTable.id, Number(dto.roleId)));
      if (roleRows.length === 0) {
        throw new BadRequestException('所选角色不存在');
      }
    }

    const patch: Partial<typeof sysUser.$inferInsert> = {};
    if (dto.department !== undefined) patch.department = dto.department;
    if (dto.roleId !== undefined) {
      patch.roleId = dto.roleId === null ? null : Number(dto.roleId);
    }
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }

    const updated = await this.db
      .update(sysUser)
      .set(patch)
      .where(eq(sysUser.id, id))
      .returning({ id: sysUser.id });
    if (updated.length === 0) {
      throw new NotFoundException('系统用户不存在');
    }

    await this.operationLog.record({
      module: LOG_MODULE,
      actionType: 'update',
      target: `系统用户 ${dto.department ?? ''}`.trim(),
      operatorId,
    });

    return { success: true };
  }

  async deleteSystemUser(
    id: string,
    operatorId: string,
  ): Promise<{ success: boolean }> {
    const deleted = await this.db
      .delete(sysUser)
      .where(eq(sysUser.id, id))
      .returning({ id: sysUser.id, member: sysUser.member });
    if (deleted.length === 0) {
      throw new NotFoundException('系统用户不存在');
    }

    await this.operationLog.record({
      module: LOG_MODULE,
      actionType: 'delete',
      target: '系统用户绑定',
      operatorId,
    });

    return { success: true };
  }

  async updateSystemUserStatus(
    id: string,
    status: SystemUserStatus,
    operatorId: string,
  ): Promise<{ success: boolean }> {
    const updated = await this.db
      .update(sysUser)
      .set({ status })
      .where(eq(sysUser.id, id))
      .returning({ id: sysUser.id });
    if (updated.length === 0) {
      throw new NotFoundException('系统用户不存在');
    }

    await this.operationLog.record({
      module: LOG_MODULE,
      actionType: 'status_change',
      target: `系统用户状态${status === 'enabled' ? '启用' : '禁用'}`,
      operatorId,
    });

    return { success: true };
  }

  async listRoles(): Promise<RoleListResponse> {
    const roleRows = await this.db
      .select({
        id: rolesTable.id,
        name: rolesTable.roleName,
        description: rolesTable.description,
      })
      .from(rolesTable)
      .where(
        and(eq(rolesTable.status, '启用'), isNull(rolesTable.deletedAt)),
      )
      .orderBy(rolesTable.id);

    const menusByRole = new Map<number, string[]>();
    if (roleRows.length > 0) {
      const permRows = await this.db
        .select({
          roleId: rolePermissions.roleId,
          permissionKey: rolePermissions.permissionKey,
        })
        .from(rolePermissions)
        .where(
          and(
            inArray(
              rolePermissions.roleId,
              roleRows.map((row) => row.id),
            ),
            eq(rolePermissions.permissionType, 'menu'),
            isNull(rolePermissions.deletedAt),
          ),
        );
      permRows.forEach((row) => {
        const current: string[] = menusByRole.get(row.roleId) ?? [];
        current.push(row.permissionKey);
        menusByRole.set(row.roleId, current);
      });
    }

    const items: Role[] = roleRows.map((row) => ({
      id: String(row.id),
      name: row.name,
      description: row.description ?? '',
      permissions: menusByRole.get(row.id) ?? [],
    }));
    return { items };
  }

  async listConfigs(): Promise<{ items: SysConfig[] }> {
    const rows = await this.db
      .select()
      .from(sysConfig)
      .orderBy(sysConfig.configKey);
    const items: SysConfig[] = rows.map((row) => ({
      id: row.id,
      configKey: row.configKey,
      configValue: row.configValue,
      description: row.description,
    }));
    return { items };
  }

  async updateConfigs(
    configs: ConfigItemDto[],
    operatorId: string,
  ): Promise<{ success: boolean }> {
    for (const item of configs) {
      const updated = await this.db
        .update(sysConfig)
        .set({ configValue: item.configValue })
        .where(eq(sysConfig.id, item.id))
        .returning({ id: sysConfig.id });
      if (updated.length === 0) {
        throw new NotFoundException(`配置项不存在: ${item.id}`);
      }
    }

    await this.operationLog.record({
      module: LOG_MODULE,
      actionType: 'update',
      target: `系统参数（${configs.length} 项）`,
      operatorId,
    });

    return { success: true };
  }
}
