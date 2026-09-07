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
import { and, asc, count, eq, inArray, isNull, type SQL } from 'drizzle-orm';
import {
  hrEmployees,
  orgDepartments,
  orgPositions,
} from '@server/database/schema';
import type {
  OrgDepartment,
  OrgDepartmentCreateDto,
  OrgDepartmentTreeNode,
  OrgDepartmentUpdateDto,
  OrgPosition,
  OrgPositionCreateDto,
  OrgPositionUpdateDto,
  OrgStats,
  OrgSortDto,
} from '@shared/api.interface';
import { insertWithSeqNo } from '../finance-core/fin-seq.util';
import {
  assertSystemEnhanceEnum,
  assertSystemEnhanceRequired,
  toSystemEnhanceIsoOrNull,
} from './system-enhance-shared.util';

type DeptRow = typeof orgDepartments.$inferSelect;
type DeptInsert = typeof orgDepartments.$inferInsert;
type PositionRow = typeof orgPositions.$inferSelect;
type PositionInsert = typeof orgPositions.$inferInsert;

const ORG_DEPT_NO_PREFIX: string = 'BM';
const ORG_POSITION_NO_PREFIX: string = 'GW';
const ORG_STATUSES: string[] = ['启用', '停用'];
const ORG_STATUS_DEFAULT: string = '启用';
const DEPT_TREE_MAX_DEPTH: number = 50;

function mapDeptRow(row: DeptRow, parentName: string | null): OrgDepartment {
  return {
    id: row.id,
    deptNo: row.deptNo,
    deptName: row.deptName,
    parentId: row.parentId,
    parentName,
    deptLevel: row.deptLevel,
    deptManager: row.deptManager,
    sortOrder: row.sortOrder,
    status: row.status,
    positionCount: 0,
    employeeCount: 0,
    remark: row.remark,
    createdAt: toSystemEnhanceIsoOrNull(row.createdAt) ?? '',
    updatedAt: toSystemEnhanceIsoOrNull(row.updatedAt) ?? '',
  };
}

function mapPositionRow(
  row: PositionRow,
  deptName: string | null,
  parentPositionName: string | null,
): OrgPosition {
  return {
    id: row.id,
    positionNo: row.positionNo,
    positionName: row.positionName,
    deptId: row.deptId,
    deptName,
    positionLevel: row.positionLevel,
    parentPositionId: row.parentPositionId,
    parentPositionName,
    sortOrder: row.sortOrder,
    status: row.status,
    remark: row.remark,
    createdAt: toSystemEnhanceIsoOrNull(row.createdAt) ?? '',
    updatedAt: toSystemEnhanceIsoOrNull(row.updatedAt) ?? '',
  };
}

@Injectable()
export class OrgService {
  private readonly logger = new Logger(OrgService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
  ) {}

  // ---------- 部门 ----------

  async listDepartments(): Promise<OrgDepartment[]> {
    const rows: DeptRow[] = await this.db
      .select()
      .from(orgDepartments)
      .where(isNull(orgDepartments.deletedAt))
      .orderBy(asc(orgDepartments.sortOrder), asc(orgDepartments.id));
    const deptMap: Map<number, DeptRow> = new Map(
      rows.map((row: DeptRow): [number, DeptRow] => [row.id, row]),
    );
    const positionCounts: Map<number, number> =
      await this.countPositionsByDeptIds(rows.map((row: DeptRow) => row.id));
    const employeeCounts: Map<string, number> =
      await this.countEmployeesByDeptNames(
        rows.map((row: DeptRow) => row.deptName),
      );
    return rows.map((row: DeptRow): OrgDepartment => {
      const parent: DeptRow | undefined =
        row.parentId !== null ? deptMap.get(row.parentId) : undefined;
      const mapped: OrgDepartment = mapDeptRow(
        row,
        parent !== undefined ? parent.deptName : null,
      );
      return {
        ...mapped,
        positionCount: positionCounts.get(row.id) ?? 0,
        employeeCount: employeeCounts.get(row.deptName) ?? 0,
      };
    });
  }

  async departmentTree(): Promise<OrgDepartmentTreeNode[]> {
    const flat: OrgDepartment[] = await this.listDepartments();
    const nodeMap: Map<number, OrgDepartmentTreeNode> = new Map();
    for (const dept of flat) {
      nodeMap.set(dept.id, {
        id: dept.id,
        deptNo: dept.deptNo,
        deptName: dept.deptName,
        parentId: dept.parentId,
        deptLevel: dept.deptLevel,
        deptManager: dept.deptManager,
        sortOrder: dept.sortOrder,
        status: dept.status,
        positionCount: dept.positionCount,
        employeeCount: dept.employeeCount,
        children: [],
      });
    }
    const roots: OrgDepartmentTreeNode[] = [];
    for (const dept of flat) {
      const node: OrgDepartmentTreeNode | undefined = nodeMap.get(dept.id);
      if (node === undefined) continue;
      const parent: OrgDepartmentTreeNode | undefined =
        dept.parentId !== null ? nodeMap.get(dept.parentId) : undefined;
      if (parent !== undefined) {
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    }
    return roots;
  }

  async createDepartment(
    dto: OrgDepartmentCreateDto,
    userId: string,
  ): Promise<OrgDepartment> {
    const deptName: string = assertSystemEnhanceRequired(dto?.deptName, '部门名称');
    let parentId: number | null = null;
    let deptLevel: number = 1;
    if (dto?.parentId !== undefined && dto.parentId !== null) {
      const parent: DeptRow = await this.findDepartmentOrThrow(dto.parentId);
      parentId = parent.id;
      deptLevel = parent.deptLevel + 1;
    }
    const status: string =
      dto?.status !== undefined
        ? assertSystemEnhanceEnum(dto.status, ORG_STATUSES, '部门状态')
        : ORG_STATUS_DEFAULT;
    const values: DeptInsert = {
      deptNo: '',
      deptName,
      parentId,
      deptLevel,
      deptManager: dto?.deptManager ?? null,
      sortOrder: dto?.sortOrder ?? 0,
      status,
      remark: dto?.remark ?? null,
      createdBy: userId,
      updatedBy: userId,
    };
    const { row } = await insertWithSeqNo<DeptRow>({
      db: this.db,
      table: orgDepartments,
      noColumn: orgDepartments.deptNo,
      prefix: ORG_DEPT_NO_PREFIX,
      insert: (no: string) =>
        this.db
          .insert(orgDepartments)
          .values({ ...values, deptNo: no })
          .returning(),
    });
    this.logger.log(`部门创建成功 id=${String(row.id)} no=${row.deptNo}`);
    const parentName: string | null = await this.resolveDeptName(row.parentId);
    return mapDeptRow(row, parentName);
  }

  async updateDepartment(
    id: number,
    dto: OrgDepartmentUpdateDto,
    userId: string,
  ): Promise<OrgDepartment> {
    await this.findDepartmentOrThrow(id);
    const patch: Partial<DeptInsert> = {};
    if (dto?.deptName !== undefined) {
      patch.deptName = assertSystemEnhanceRequired(dto.deptName, '部门名称');
    }
    if (dto?.parentId !== undefined) {
      if (dto.parentId === null) {
        patch.parentId = null;
      } else {
        await this.findDepartmentOrThrow(dto.parentId);
        await this.assertNewParentNotSelfOrDescendant(dto.parentId, id);
        patch.parentId = dto.parentId;
      }
    }
    if (dto?.deptManager !== undefined) {
      patch.deptManager = dto.deptManager === null ? null : dto.deptManager;
    }
    if (dto?.sortOrder !== undefined) patch.sortOrder = dto.sortOrder;
    if (dto?.status !== undefined) {
      patch.status = assertSystemEnhanceEnum(
        dto.status,
        ORG_STATUSES,
        '部门状态',
      );
    }
    if (dto?.remark !== undefined) patch.remark = dto.remark;
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }
    patch.updatedAt = new Date();
    patch.updatedBy = userId;
    const updated: DeptRow[] = await this.db
      .update(orgDepartments)
      .set(patch)
      .where(and(eq(orgDepartments.id, id), isNull(orgDepartments.deletedAt)))
      .returning();
    if (updated.length === 0) {
      throw new NotFoundException('部门不存在');
    }
    const parentName: string | null = await this.resolveDeptName(
      updated[0].parentId,
    );
    return mapDeptRow(updated[0], parentName);
  }

  async removeDepartment(
    id: number,
    userId: string,
  ): Promise<{ success: boolean }> {
    const existing: DeptRow = await this.findDepartmentOrThrow(id);
    const childRows: { count: number | string }[] = await this.db
      .select({ count: count() })
      .from(orgDepartments)
      .where(
        and(eq(orgDepartments.parentId, id), isNull(orgDepartments.deletedAt)),
      );
    if (Number(childRows[0]?.count ?? 0) > 0) {
      throw new ConflictException('存在子部门，无法删除');
    }
    const positionRows: { count: number | string }[] = await this.db
      .select({ count: count() })
      .from(orgPositions)
      .where(and(eq(orgPositions.deptId, id), isNull(orgPositions.deletedAt)));
    if (Number(positionRows[0]?.count ?? 0) > 0) {
      throw new ConflictException('部门下存在岗位，无法删除');
    }
    const employeeRows: { count: number | string }[] = await this.db
      .select({ count: count() })
      .from(hrEmployees)
      .where(
        and(
          eq(hrEmployees.department, existing.deptName),
          isNull(hrEmployees.deletedAt),
        ),
      );
    if (Number(employeeRows[0]?.count ?? 0) > 0) {
      throw new ConflictException('部门下存在员工，无法删除');
    }
    const updated: { id: number }[] = await this.db
      .update(orgDepartments)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(and(eq(orgDepartments.id, id), isNull(orgDepartments.deletedAt)))
      .returning({ id: orgDepartments.id });
    if (updated.length === 0) {
      throw new NotFoundException('部门不存在');
    }
    return { success: true };
  }

  async sortDepartments(
    dto: OrgSortDto,
    userId: string,
  ): Promise<{ updated: number }> {
    if (!Array.isArray(dto?.items) || dto.items.length === 0) {
      throw new BadRequestException('请提供要排序的部门');
    }
    let updated: number = 0;
    for (const item of dto.items) {
      const rows: { id: number }[] = await this.db
        .update(orgDepartments)
        .set({
          sortOrder: item.sortOrder,
          updatedAt: new Date(),
          updatedBy: userId,
        })
        .where(
          and(eq(orgDepartments.id, item.id), isNull(orgDepartments.deletedAt)),
        )
        .returning({ id: orgDepartments.id });
      updated += rows.length;
    }
    return { updated };
  }

  // ---------- 岗位 ----------

  async listPositions(params: {
    deptId?: number;
    status?: string;
  }): Promise<OrgPosition[]> {
    const conditions: SQL[] = [isNull(orgPositions.deletedAt)];
    if (params.deptId) conditions.push(eq(orgPositions.deptId, params.deptId));
    if (params.status) conditions.push(eq(orgPositions.status, params.status));
    const rows: PositionRow[] = await this.db
      .select()
      .from(orgPositions)
      .where(and(...conditions))
      .orderBy(
        asc(orgPositions.deptId),
        asc(orgPositions.sortOrder),
        asc(orgPositions.id),
      );
    const deptIds: number[] = [];
    const parentIds: number[] = [];
    for (const row of rows) {
      deptIds.push(row.deptId);
      if (row.parentPositionId !== null) parentIds.push(row.parentPositionId);
    }
    const deptNameMap: Map<number, string> =
      await this.loadDeptNameMap(deptIds);
    const parentNameMap: Map<number, string> =
      await this.loadPositionNameMap(parentIds);
    return rows.map(
      (row: PositionRow): OrgPosition =>
        mapPositionRow(
          row,
          deptNameMap.get(row.deptId) ?? null,
          row.parentPositionId !== null
            ? parentNameMap.get(row.parentPositionId) ?? null
            : null,
        ),
    );
  }

  async createPosition(
    dto: OrgPositionCreateDto,
    userId: string,
  ): Promise<OrgPosition> {
    const positionName: string = assertSystemEnhanceRequired(
      dto?.positionName,
      '岗位名称',
    );
    const deptId: number = Number(dto?.deptId);
    if (!Number.isInteger(deptId) || deptId <= 0) {
      throw new BadRequestException('所属部门不能为空');
    }
    const dept: DeptRow = await this.findDepartmentOrThrow(deptId);
    let parentPositionId: number | null = null;
    if (dto?.parentPositionId !== undefined && dto.parentPositionId !== null) {
      await this.findPositionOrThrow(dto.parentPositionId);
      parentPositionId = dto.parentPositionId;
    }
    const status: string =
      dto?.status !== undefined
        ? assertSystemEnhanceEnum(dto.status, ORG_STATUSES, '岗位状态')
        : ORG_STATUS_DEFAULT;
    const values: PositionInsert = {
      positionNo: '',
      positionName,
      deptId: dept.id,
      positionLevel: dto?.positionLevel ?? 'P3',
      parentPositionId,
      sortOrder: dto?.sortOrder ?? 0,
      status,
      remark: dto?.remark ?? null,
      createdBy: userId,
      updatedBy: userId,
    };
    const { row } = await insertWithSeqNo<PositionRow>({
      db: this.db,
      table: orgPositions,
      noColumn: orgPositions.positionNo,
      prefix: ORG_POSITION_NO_PREFIX,
      insert: (no: string) =>
        this.db
          .insert(orgPositions)
          .values({ ...values, positionNo: no })
          .returning(),
    });
    this.logger.log(`岗位创建成功 id=${String(row.id)} no=${row.positionNo}`);
    return mapPositionRow(row, dept.deptName, null);
  }

  async updatePosition(
    id: number,
    dto: OrgPositionUpdateDto,
    userId: string,
  ): Promise<OrgPosition> {
    await this.findPositionOrThrow(id);
    const patch: Partial<PositionInsert> = {};
    if (dto?.positionName !== undefined) {
      patch.positionName = assertSystemEnhanceRequired(
        dto.positionName,
        '岗位名称',
      );
    }
    if (dto?.deptId !== undefined) {
      await this.findDepartmentOrThrow(dto.deptId);
      patch.deptId = dto.deptId;
    }
    if (dto?.positionLevel !== undefined) patch.positionLevel = dto.positionLevel;
    if (dto?.parentPositionId !== undefined) {
      if (dto.parentPositionId === null) {
        patch.parentPositionId = null;
      } else {
        await this.findPositionOrThrow(dto.parentPositionId);
        patch.parentPositionId = dto.parentPositionId;
      }
    }
    if (dto?.sortOrder !== undefined) patch.sortOrder = dto.sortOrder;
    if (dto?.status !== undefined) {
      patch.status = assertSystemEnhanceEnum(
        dto.status,
        ORG_STATUSES,
        '岗位状态',
      );
    }
    if (dto?.remark !== undefined) patch.remark = dto.remark;
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }
    patch.updatedAt = new Date();
    patch.updatedBy = userId;
    const updated: PositionRow[] = await this.db
      .update(orgPositions)
      .set(patch)
      .where(and(eq(orgPositions.id, id), isNull(orgPositions.deletedAt)))
      .returning();
    if (updated.length === 0) {
      throw new NotFoundException('岗位不存在');
    }
    const deptName: string | null = await this.resolveDeptName(
      updated[0].deptId,
    );
    const parentName: string | null =
      updated[0].parentPositionId !== null
        ? await this.resolvePositionName(updated[0].parentPositionId)
        : null;
    return mapPositionRow(updated[0], deptName, parentName);
  }

  async removePosition(
    id: number,
    userId: string,
  ): Promise<{ success: boolean }> {
    await this.findPositionOrThrow(id);
    const childRows: { count: number | string }[] = await this.db
      .select({ count: count() })
      .from(orgPositions)
      .where(
        and(
          eq(orgPositions.parentPositionId, id),
          isNull(orgPositions.deletedAt),
        ),
      );
    if (Number(childRows[0]?.count ?? 0) > 0) {
      throw new ConflictException('存在下级岗位，无法删除');
    }
    const updated: { id: number }[] = await this.db
      .update(orgPositions)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(and(eq(orgPositions.id, id), isNull(orgPositions.deletedAt)))
      .returning({ id: orgPositions.id });
    if (updated.length === 0) {
      throw new NotFoundException('岗位不存在');
    }
    return { success: true };
  }

  // ---------- 统计 ----------

  async stats(): Promise<OrgStats> {
    const depts: DeptRow[] = await this.db
      .select()
      .from(orgDepartments)
      .where(isNull(orgDepartments.deletedAt))
      .orderBy(asc(orgDepartments.id));
    const positionTotalRows: { count: number | string }[] = await this.db
      .select({ count: count() })
      .from(orgPositions)
      .where(isNull(orgPositions.deletedAt));
    const employeeTotalRows: { count: number | string }[] = await this.db
      .select({ count: count() })
      .from(hrEmployees)
      .where(isNull(hrEmployees.deletedAt));
    const positionCounts: Map<number, number> =
      await this.countPositionsByDeptIds(depts.map((row: DeptRow) => row.id));
    const employeeCounts: Map<string, number> =
      await this.countEmployeesByDeptNames(
        depts.map((row: DeptRow) => row.deptName),
      );
    const activeDepts: DeptRow[] = depts.filter(
      (row: DeptRow): boolean => row.status === '启用',
    );
    return {
      departmentCount: depts.length,
      positionCount: Number(positionTotalRows[0]?.count ?? 0),
      employeeCount: Number(employeeTotalRows[0]?.count ?? 0),
      byDepartment: activeDepts.map(
        (row: DeptRow): { name: string; positionCount: number; employeeCount: number } => ({
          name: row.deptName,
          positionCount: positionCounts.get(row.id) ?? 0,
          employeeCount: employeeCounts.get(row.deptName) ?? 0,
        }),
      ),
    };
  }

  // ---------- 私有辅助 ----------

  private async findDepartmentOrThrow(id: number): Promise<DeptRow> {
    const rows: DeptRow[] = await this.db
      .select()
      .from(orgDepartments)
      .where(
        and(eq(orgDepartments.id, id), isNull(orgDepartments.deletedAt)),
      )
      .limit(1);
    if (rows.length === 0) {
      throw new NotFoundException('部门不存在');
    }
    return rows[0];
  }

  private async findPositionOrThrow(id: number): Promise<PositionRow> {
    const rows: PositionRow[] = await this.db
      .select()
      .from(orgPositions)
      .where(and(eq(orgPositions.id, id), isNull(orgPositions.deletedAt)))
      .limit(1);
    if (rows.length === 0) {
      throw new NotFoundException('岗位不存在');
    }
    return rows[0];
  }

  /** 校验新上级不是自身且其祖先链不含当前部门（自身/下级 → 400） */
  private async assertNewParentNotSelfOrDescendant(
    newParentId: number,
    deptId: number,
  ): Promise<void> {
    let currentId: number | null = newParentId;
    for (
      let depth: number = 0;
      depth < DEPT_TREE_MAX_DEPTH && currentId !== null;
      depth += 1
    ) {
      if (currentId === deptId) {
        throw new BadRequestException('不能选择自身或下级部门作为上级');
      }
      const rows: { parentId: number | null }[] = await this.db
        .select({ parentId: orgDepartments.parentId })
        .from(orgDepartments)
        .where(
          and(
            eq(orgDepartments.id, currentId),
            isNull(orgDepartments.deletedAt),
          ),
        )
        .limit(1);
      currentId = rows.length > 0 ? rows[0].parentId : null;
    }
  }

  private async resolveDeptName(
    parentId: number | null,
  ): Promise<string | null> {
    if (parentId === null) return null;
    const rows: { deptName: string }[] = await this.db
      .select({ deptName: orgDepartments.deptName })
      .from(orgDepartments)
      .where(
        and(
          eq(orgDepartments.id, parentId),
          isNull(orgDepartments.deletedAt),
        ),
      )
      .limit(1);
    return rows.length > 0 ? rows[0].deptName : null;
  }

  private async resolvePositionName(
    positionId: number,
  ): Promise<string | null> {
    const rows: { positionName: string }[] = await this.db
      .select({ positionName: orgPositions.positionName })
      .from(orgPositions)
      .where(and(eq(orgPositions.id, positionId)))
      .limit(1);
    return rows.length > 0 ? rows[0].positionName : null;
  }

  private async loadDeptNameMap(
    deptIds: number[],
  ): Promise<Map<number, string>> {
    const map: Map<number, string> = new Map();
    if (deptIds.length === 0) return map;
    const rows: { id: number; deptName: string }[] = await this.db
      .select({ id: orgDepartments.id, deptName: orgDepartments.deptName })
      .from(orgDepartments)
      .where(
        and(
          isNull(orgDepartments.deletedAt),
          inArray(orgDepartments.id, deptIds),
        ),
      );
    for (const row of rows) map.set(row.id, row.deptName);
    return map;
  }

  private async loadPositionNameMap(
    positionIds: number[],
  ): Promise<Map<number, string>> {
    const map: Map<number, string> = new Map();
    if (positionIds.length === 0) return map;
    const rows: { id: number; positionName: string }[] = await this.db
      .select({ id: orgPositions.id, positionName: orgPositions.positionName })
      .from(orgPositions)
      .where(inArray(orgPositions.id, positionIds));
    for (const row of rows) map.set(row.id, row.positionName);
    return map;
  }

  private async countPositionsByDeptIds(
    deptIds: number[],
  ): Promise<Map<number, number>> {
    const map: Map<number, number> = new Map();
    if (deptIds.length === 0) return map;
    const rows: { deptId: number; count: number | string }[] = await this.db
      .select({ deptId: orgPositions.deptId, count: count() })
      .from(orgPositions)
      .where(
        and(
          isNull(orgPositions.deletedAt),
          inArray(orgPositions.deptId, deptIds),
        ),
      )
      .groupBy(orgPositions.deptId);
    for (const row of rows) map.set(row.deptId, Number(row.count));
    return map;
  }

  private async countEmployeesByDeptNames(
    deptNames: string[],
  ): Promise<Map<string, number>> {
    const map: Map<string, number> = new Map();
    if (deptNames.length === 0) return map;
    const rows: { department: string; count: number | string }[] = await this.db
      .select({ department: hrEmployees.department, count: count() })
      .from(hrEmployees)
      .where(
        and(
          isNull(hrEmployees.deletedAt),
          inArray(hrEmployees.department, deptNames),
        ),
      )
      .groupBy(hrEmployees.department);
    for (const row of rows) map.set(row.department, Number(row.count));
    return map;
  }
}
