import {
  BadRequestException,
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
import { and, count, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { fieldPermissions, roles } from '@server/database/schema';
import type {
  FieldPermissionItem,
  FieldPermissionListParams,
  FieldPermissionListResponse,
  FieldPermissionUpsertDto,
  MyFieldPermissionItem,
  MyFieldPermissionsResponse,
  SensitiveFieldCatalogItem,
} from '@shared/api.interface';
import { insertWithSeqNo } from '../finance-core/fin-seq.util';
import { MAX_BATCH_ITEMS } from '../finance-core/query.util';

type FieldPermRow = typeof fieldPermissions.$inferSelect;
type FieldPermInsert = typeof fieldPermissions.$inferInsert;

const FIELD_PERM_NO_PREFIX: string = 'QD';
const DEFAULT_ROLE_CODE: string = 'business';
const MASKED_VALUE: string = '****';
const DEFAULT_PAGE: number = 1;
const DEFAULT_PAGE_SIZE: number = 20;
const MAX_PAGE_SIZE: number = 100;

/** 敏感字段清单（模块 + field_name + 中文显示名） */
export const SENSITIVE_FIELD_CATALOG: SensitiveFieldCatalogItem[] = [
  // 人资
  { module: '人资', fieldName: 'base_salary', fieldLabel: '基本工资' },
  { module: '人资', fieldName: 'performance_salary', fieldLabel: '绩效工资' },
  { module: '人资', fieldName: 'allowance', fieldLabel: '补贴' },
  { module: '人资', fieldName: 'deduction', fieldLabel: '扣款' },
  { module: '人资', fieldName: 'tax', fieldLabel: '个税' },
  { module: '人资', fieldName: 'social_insurance', fieldLabel: '社保' },
  { module: '人资', fieldName: 'actual_salary', fieldLabel: '实发工资' },
  // 财务
  { module: '财务', fieldName: 'cost', fieldLabel: '成本' },
  { module: '财务', fieldName: 'profit', fieldLabel: '利润' },
  { module: '财务', fieldName: 'margin', fieldLabel: '毛利' },
  { module: '财务', fieldName: 'balance', fieldLabel: '账户余额' },
  { module: '财务', fieldName: 'receipt_amount', fieldLabel: '收款金额' },
  { module: '财务', fieldName: 'payment_amount', fieldLabel: '付款金额' },
  // 合同
  { module: '合同', fieldName: 'contract_amount', fieldLabel: '合同金额' },
  { module: '合同', fieldName: 'commission_rate', fieldLabel: '佣金比例' },
  { module: '合同', fieldName: 'commission_amount', fieldLabel: '佣金金额' },
  // 广告
  { module: '广告', fieldName: 'ad_cost', fieldLabel: '广告成本' },
  { module: '广告', fieldName: 'ad_profit', fieldLabel: '广告利润' },
  { module: '广告', fieldName: 'rebate_rate', fieldLabel: '返点比例' },
];

/** db.execute 结果兼容提取：数组或 { rows } 两种形态 */
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

function mapPerm(row: FieldPermRow): FieldPermissionItem {
  return {
    id: row.id,
    fieldPermNo: row.fieldPermNo,
    roleId: row.roleId,
    roleCode: row.roleCode,
    roleName: row.roleName,
    module: row.module,
    fieldName: row.fieldName,
    fieldLabel: row.fieldLabel,
    visible: row.visible,
    editable: row.editable,
    masked: row.masked,
    remark: row.remark,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

const assertRequiredText = (value: unknown, label: string): string => {
  const text: string = typeof value === 'string' ? value.trim() : '';
  if (text === '') {
    throw new BadRequestException(`请提供${label}`);
  }
  return text;
};

const parsePositiveId = (value: unknown, label: string): number => {
  const parsed: number = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new BadRequestException(`请提供有效的${label}`);
  }
  return parsed;
};

@Injectable()
export class FieldPermissionService {
  private readonly logger: Logger = new Logger(FieldPermissionService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
  ) {}

  // ---------- 查询 ----------

  async list(
    params: FieldPermissionListParams,
  ): Promise<FieldPermissionListResponse> {
    const pageParsed: number = parseInt(params.page ?? '', 10);
    const page: number = Number.isNaN(pageParsed) || pageParsed < 1
      ? DEFAULT_PAGE
      : pageParsed;
    const sizeParsed: number = parseInt(params.pageSize ?? '', 10);
    const pageSize: number =
      Number.isNaN(sizeParsed) || sizeParsed < 1
        ? DEFAULT_PAGE_SIZE
        : Math.min(sizeParsed, MAX_PAGE_SIZE);

    const conditions = [isNull(fieldPermissions.deletedAt)];
    if (params.roleId) {
      const roleId: number = parsePositiveId(params.roleId, '角色 ID');
      conditions.push(eq(fieldPermissions.roleId, roleId));
    }
    if (params.module) {
      conditions.push(eq(fieldPermissions.module, params.module));
    }
    const where = and(...conditions);

    const totalRows: { count: number | string }[] = await this.db
      .select({ count: count() })
      .from(fieldPermissions)
      .where(where);
    const rows: FieldPermRow[] = await this.db
      .select()
      .from(fieldPermissions)
      .where(where)
      .orderBy(desc(fieldPermissions.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return {
      items: rows.map((row: FieldPermRow): FieldPermissionItem => mapPerm(row)),
      total: Number(totalRows[0]?.count ?? 0),
      page,
      pageSize,
    };
  }

  // ---------- 角色解析与过滤（供其他模块注入使用） ----------

  /**
   * 当前用户生效角色：sys_user.role_id → roles.id 直连。
   * 查不到映射时返回 business（未分配角色的用户默认商务）。
   */
  async resolveUserRole(
    userId: string,
  ): Promise<{ roleCode: string; roleName: string | null }> {
    const fallback: { roleCode: string; roleName: string | null } = {
      roleCode: DEFAULT_ROLE_CODE,
      roleName: null,
    };
    if (!userId) {
      return fallback;
    }
    const query = sql`SELECT r.role_code, r.role_name FROM sys_user su JOIN roles r ON su.role_id = r.id WHERE (su.member).user_id = ${userId} LIMIT 1`;
    const rows: Record<string, unknown>[] = extractRows(
      await this.db.execute(query),
    );
    const first: Record<string, unknown> | undefined = rows[0];
    if (!first) {
      return fallback;
    }
    const roleCode: string = String(first.role_code ?? '').trim();
    if (roleCode === '') {
      return fallback;
    }
    const roleName: string | null =
      first.role_name === null || first.role_name === undefined
        ? null
        : String(first.role_name);
    return { roleCode, roleName };
  }

  /**
   * 角色的字段权限映射，key = `${module}:${fieldName}`。
   * admin 或表中无配置的字段默认 visible/editable=true、masked=false。
   */
  async getFieldPerms(
    roleCode: string,
  ): Promise<Map<string, MyFieldPermissionItem>> {
    const map: Map<string, MyFieldPermissionItem> = new Map();
    for (const item of SENSITIVE_FIELD_CATALOG) {
      map.set(`${item.module}:${item.fieldName}`, {
        module: item.module,
        fieldName: item.fieldName,
        visible: true,
        editable: true,
        masked: false,
      });
    }
    if (roleCode === DEFAULT_ROLE_CODE) {
      return map;
    }
    const rows = await this.db
      .select({
        module: fieldPermissions.module,
        fieldName: fieldPermissions.fieldName,
        visible: fieldPermissions.visible,
        editable: fieldPermissions.editable,
        masked: fieldPermissions.masked,
      })
      .from(fieldPermissions)
      .where(
        and(
          eq(fieldPermissions.roleCode, roleCode),
          isNull(fieldPermissions.deletedAt),
        ),
      );
    for (const row of rows) {
      map.set(`${row.module}:${row.fieldName}`, {
        module: row.module,
        fieldName: row.fieldName,
        visible: row.visible,
        editable: row.editable,
        masked: row.masked,
      });
    }
    return map;
  }

  /**
   * 就地过滤行数据：不可见字段置 null，脱敏字段置 '****'。
   * fieldMap 为「对象属性名 → field_name」映射；一次查出该角色该 module 配置后内存处理。
   */
  async filterRows<T extends object>(
    rows: T[],
    roleCode: string,
    module: string,
    fieldMap: Record<string, string>,
  ): Promise<void> {
    if (rows.length === 0 || roleCode === DEFAULT_ROLE_CODE) {
      return;
    }
    const permRows = await this.db
      .select({
        fieldName: fieldPermissions.fieldName,
        visible: fieldPermissions.visible,
        masked: fieldPermissions.masked,
      })
      .from(fieldPermissions)
      .where(
        and(
          eq(fieldPermissions.roleCode, roleCode),
          eq(fieldPermissions.module, module),
          isNull(fieldPermissions.deletedAt),
        ),
      );
    if (permRows.length === 0) {
      return;
    }
    const perms: Map<string, { visible: boolean; masked: boolean }> = new Map();
    for (const row of permRows) {
      perms.set(row.fieldName, { visible: row.visible, masked: row.masked });
    }
    const props: string[] = Object.keys(fieldMap);
    for (const row of rows) {
      for (const prop of props) {
        const perm: { visible: boolean; masked: boolean } | undefined =
          perms.get(fieldMap[prop]);
        if (!perm) {
          continue;
        }
        if (!perm.visible) {
          Object.assign(row, { [prop]: null });
        } else if (perm.masked) {
          Object.assign(row, { [prop]: MASKED_VALUE });
        }
      }
    }
  }

  /** 任一字段 editable=false 抛 ForbiddenException（无权修改字段：fieldLabel） */
  async assertEditable(
    roleCode: string,
    module: string,
    fieldNames: string[],
  ): Promise<void> {
    if (roleCode === DEFAULT_ROLE_CODE || fieldNames.length === 0) {
      return;
    }
    const rows = await this.db
      .select({
        fieldName: fieldPermissions.fieldName,
        fieldLabel: fieldPermissions.fieldLabel,
        editable: fieldPermissions.editable,
      })
      .from(fieldPermissions)
      .where(
        and(
          eq(fieldPermissions.roleCode, roleCode),
          eq(fieldPermissions.module, module),
          inArray(fieldPermissions.fieldName, fieldNames),
          isNull(fieldPermissions.deletedAt),
        ),
      );
    for (const row of rows) {
      if (!row.editable) {
        const catalogHit: SensitiveFieldCatalogItem | undefined =
          SENSITIVE_FIELD_CATALOG.find(
            (item: SensitiveFieldCatalogItem): boolean =>
              item.module === module && item.fieldName === row.fieldName,
          );
        const label: string =
          row.fieldLabel || catalogHit?.fieldLabel || row.fieldName;
        throw new ForbiddenException(`无权修改字段：${label}`);
      }
    }
  }

  // ---------- 当前用户生效权限 ----------

  async my(
    userId: string,
    previewRoleCode?: string,
  ): Promise<MyFieldPermissionsResponse> {
    let roleCode: string = DEFAULT_ROLE_CODE;
    let roleName: string | null = null;
    const preview: string = (previewRoleCode ?? '').trim();
    if (preview !== '') {
      roleCode = preview;
      roleName = await this.lookupRoleNameByCode(preview);
    } else {
      const resolved: { roleCode: string; roleName: string | null } =
        await this.resolveUserRole(userId);
      roleCode = resolved.roleCode;
      roleName = resolved.roleName;
    }
    const perms: Map<string, MyFieldPermissionItem> =
      await this.getFieldPerms(roleCode);
    const fields: MyFieldPermissionItem[] = [...perms.values()];
    return { roleCode, roleName, fields };
  }

  // ---------- 写接口 ----------

  /** 单条 upsert：roleId+module+fieldName 冲突时更新 */
  async upsert(
    dto: FieldPermissionUpsertDto,
    userId: string,
  ): Promise<FieldPermissionItem> {
    const module: string = assertRequiredText(dto?.module, '模块');
    const fieldName: string = assertRequiredText(dto?.fieldName, '字段名');
    const fieldLabel: string = assertRequiredText(dto?.fieldLabel, '字段显示名');
    const roleId: number = parsePositiveId(dto?.roleId, '角色 ID');
    const role: { roleCode: string; roleName: string } =
      await this.findRoleById(roleId);
    const { row } = await insertWithSeqNo<FieldPermRow>({
      db: this.db,
      table: fieldPermissions,
      noColumn: fieldPermissions.fieldPermNo,
      prefix: FIELD_PERM_NO_PREFIX,
      insert: (no: string): Promise<FieldPermRow[]> =>
        this.db
          .insert(fieldPermissions)
          .values({
            fieldPermNo: no,
            roleId,
            roleCode: role.roleCode,
            roleName: role.roleName,
            module,
            fieldName,
            fieldLabel,
            visible: dto.visible === true,
            editable: dto.editable === true,
            masked: dto.masked === true,
            remark: dto.remark ?? null,
            updatedBy: userId,
          } satisfies FieldPermInsert)
          .onConflictDoUpdate({
            target: [
              fieldPermissions.roleId,
              fieldPermissions.module,
              fieldPermissions.fieldName,
            ],
            set: {
              roleCode: role.roleCode,
              roleName: role.roleName,
              fieldLabel,
              visible: dto.visible === true,
              editable: dto.editable === true,
              masked: dto.masked === true,
              remark: dto.remark ?? null,
              updatedAt: new Date(),
              updatedBy: userId,
            },
          })
          .returning(),
    });
    this.logger.log(
      `字段权限已保存 role=${role.roleCode} module=${module} field=${fieldName}`,
    );
    return mapPerm(row);
  }

  /** 批量 upsert（事务内逐条） */
  async batchUpsert(
    dto: { items?: FieldPermissionUpsertDto[] },
    userId: string,
  ): Promise<number> {
    const items: FieldPermissionUpsertDto[] = Array.isArray(dto?.items)
      ? dto.items
      : [];
    if (items.length === 0) {
      throw new BadRequestException('请提供要保存的字段权限');
    }
    if (items.length > MAX_BATCH_ITEMS) {
      throw new BadRequestException(
        `单次批量最多 ${String(MAX_BATCH_ITEMS)} 条`,
      );
    }
    return this.db.transaction(async (tx: PostgresJsDatabase): Promise<number> => {
      let updated: number = 0;
      for (const item of items) {
        await this.upsertWithTx(tx, item, userId);
        updated += 1;
      }
      return updated;
    });
  }

  /** PATCH：仅 visible/editable/masked/remark 可选更新 */
  async update(
    id: number,
    dto: {
      visible?: boolean;
      editable?: boolean;
      masked?: boolean;
      remark?: string;
    },
    userId: string,
  ): Promise<FieldPermissionItem> {
    const patch: Partial<FieldPermInsert> = {};
    if (dto?.visible !== undefined) {
      patch.visible = dto.visible;
    }
    if (dto?.editable !== undefined) {
      patch.editable = dto.editable;
    }
    if (dto?.masked !== undefined) {
      patch.masked = dto.masked;
    }
    if (dto?.remark !== undefined) {
      patch.remark = dto.remark;
    }
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }
    patch.updatedAt = new Date();
    patch.updatedBy = userId;
    const updated: FieldPermRow[] = await this.db
      .update(fieldPermissions)
      .set(patch)
      .where(eq(fieldPermissions.id, id))
      .returning();
    if (updated.length === 0) {
      throw new NotFoundException('字段权限不存在');
    }
    return mapPerm(updated[0]);
  }

  /** 硬删除，0 行生效抛 NotFoundException */
  async remove(id: number): Promise<{ success: boolean }> {
    const deleted: { id: number }[] = await this.db
      .delete(fieldPermissions)
      .where(eq(fieldPermissions.id, id))
      .returning({ id: fieldPermissions.id });
    if (deleted.length === 0) {
      throw new NotFoundException('字段权限不存在');
    }
    this.logger.log(`字段权限已删除 id=${String(id)}`);
    return { success: true };
  }

  // ---------- 私有方法 ----------

  private async findRoleById(
    roleId: number,
  ): Promise<{ roleCode: string; roleName: string }> {
    const rows: { roleCode: string; roleName: string }[] = await this.db
      .select({ roleCode: roles.roleCode, roleName: roles.roleName })
      .from(roles)
      .where(and(eq(roles.id, roleId), isNull(roles.deletedAt)));
    if (rows.length === 0) {
      throw new BadRequestException('角色不存在');
    }
    return rows[0];
  }

  private async lookupRoleNameByCode(roleCode: string): Promise<string | null> {
    const rows: { roleName: string }[] = await this.db
      .select({ roleName: roles.roleName })
      .from(roles)
      .where(
        and(eq(roles.roleCode, roleCode), isNull(roles.deletedAt)),
      )
      .limit(1);
    return rows.length > 0 ? rows[0].roleName : null;
  }

  /** 事务内单条 upsert（batch 复用，事务内只用 tx） */
  private async upsertWithTx(
    tx: PostgresJsDatabase,
    dto: FieldPermissionUpsertDto,
    userId: string,
  ): Promise<FieldPermRow> {
    const module: string = assertRequiredText(dto?.module, '模块');
    const fieldName: string = assertRequiredText(dto?.fieldName, '字段名');
    const fieldLabel: string = assertRequiredText(dto?.fieldLabel, '字段显示名');
    const roleId: number = parsePositiveId(dto?.roleId, '角色 ID');
    const role: { roleCode: string; roleName: string } =
      await this.findRoleByIdWithTx(tx, roleId);
    const { row } = await insertWithSeqNo<FieldPermRow>({
      db: tx,
      table: fieldPermissions,
      noColumn: fieldPermissions.fieldPermNo,
      prefix: FIELD_PERM_NO_PREFIX,
      insert: (no: string): Promise<FieldPermRow[]> =>
        tx
          .insert(fieldPermissions)
          .values({
            fieldPermNo: no,
            roleId,
            roleCode: role.roleCode,
            roleName: role.roleName,
            module,
            fieldName,
            fieldLabel,
            visible: dto.visible === true,
            editable: dto.editable === true,
            masked: dto.masked === true,
            remark: dto.remark ?? null,
            updatedBy: userId,
          } satisfies FieldPermInsert)
          .onConflictDoUpdate({
            target: [
              fieldPermissions.roleId,
              fieldPermissions.module,
              fieldPermissions.fieldName,
            ],
            set: {
              roleCode: role.roleCode,
              roleName: role.roleName,
              fieldLabel,
              visible: dto.visible === true,
              editable: dto.editable === true,
              masked: dto.masked === true,
              remark: dto.remark ?? null,
              updatedAt: new Date(),
              updatedBy: userId,
            },
          })
          .returning(),
    });
    return row;
  }

  private async findRoleByIdWithTx(
    tx: PostgresJsDatabase,
    roleId: number,
  ): Promise<{ roleCode: string; roleName: string }> {
    const rows: { roleCode: string; roleName: string }[] = await tx
      .select({ roleCode: roles.roleCode, roleName: roles.roleName })
      .from(roles)
      .where(and(eq(roles.id, roleId), isNull(roles.deletedAt)));
    if (rows.length === 0) {
      throw new BadRequestException('角色不存在');
    }
    return rows[0];
  }
}
