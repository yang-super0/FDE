import { Inject, Injectable } from '@nestjs/common';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { department, employee } from '@server/database/schema';
import type { DepartmentNode } from '@shared/api.interface';

interface DepartmentRow {
  id: string;
  name: string;
  parentId: string | null;
}

@Injectable()
export class DepartmentService {
  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
  ) {}

  async listTree(): Promise<{ items: DepartmentNode[] }> {
    const departments: DepartmentRow[] = await this.db
      .select({
        id: department.id,
        name: department.name,
        parentId: department.parentId,
      })
      .from(department);

    const employeeRows: Array<{ departmentId: string | null }> =
      await this.db
        .select({ departmentId: employee.departmentId })
        .from(employee);

    const ownCount: Map<string, number> = new Map();
    for (const row of employeeRows) {
      if (row.departmentId) {
        ownCount.set(
          row.departmentId,
          (ownCount.get(row.departmentId) ?? 0) + 1,
        );
      }
    }

    const childrenMap: Map<string | null, DepartmentRow[]> = new Map();
    for (const dept of departments) {
      const key: string | null = dept.parentId ?? null;
      childrenMap.set(key, [...(childrenMap.get(key) ?? []), dept]);
    }

    const build = (dept: DepartmentRow): DepartmentNode => {
      const children: DepartmentNode[] = (childrenMap.get(dept.id) ?? []).map(
        (child: DepartmentRow) => build(child),
      );
      const headcount: number =
        (ownCount.get(dept.id) ?? 0) +
        children.reduce(
          (sum: number, child: DepartmentNode) => sum + child.headcount,
          0,
        );
      return {
        id: dept.id,
        name: dept.name,
        parentId: dept.parentId,
        headcount,
        children,
      };
    };

    const items: DepartmentNode[] = (childrenMap.get(null) ?? []).map(
      (dept: DepartmentRow) => build(dept),
    );
    return { items };
  }
}
