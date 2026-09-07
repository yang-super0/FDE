import { Inject, Injectable } from '@nestjs/common';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { and, count, desc, eq, gte, inArray, lte } from 'drizzle-orm';
import { attendance, department, employee } from '@server/database/schema';
import type {
  AttendanceRecord,
  AttendanceStatus,
  PageResult,
} from '@shared/api.interface';

export interface AttendanceListParams {
  departmentId?: string;
  dateFrom?: string;
  dateTo?: string;
  page: number;
  pageSize: number;
}

const ATTENDANCE_STATUSES: AttendanceStatus[] = [
  'normal',
  'late',
  'early',
  'absent',
];

@Injectable()
export class AttendanceService {
  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
  ) {}

  async list(
    params: AttendanceListParams,
  ): Promise<PageResult<AttendanceRecord>> {
    const page: number = Math.max(params.page, 1);
    const pageSize: number = Math.min(Math.max(params.pageSize, 1), 100);

    const conditions = [];
    if (params.departmentId) {
      conditions.push(eq(employee.departmentId, params.departmentId));
    }
    if (params.dateFrom) {
      conditions.push(gte(attendance.attendDate, new Date(params.dateFrom)));
    }
    if (params.dateTo) {
      conditions.push(lte(attendance.attendDate, new Date(params.dateTo)));
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const buildQuery = () =>
      this.db
        .select({
          id: attendance.id,
          employeeId: attendance.employeeId,
          attendDate: attendance.attendDate,
          status: attendance.status,
          employeeName: employee.name,
          departmentId: employee.departmentId,
        })
        .from(attendance)
        .leftJoin(employee, eq(attendance.employeeId, employee.id));

    const rows = where
      ? await buildQuery()
          .where(where)
          .orderBy(desc(attendance.attendDate))
          .limit(pageSize)
          .offset((page - 1) * pageSize)
      : await buildQuery()
          .orderBy(desc(attendance.attendDate))
          .limit(pageSize)
          .offset((page - 1) * pageSize);

    const buildCountQuery = () =>
      this.db
        .select({ count: count() })
        .from(attendance)
        .leftJoin(employee, eq(attendance.employeeId, employee.id));
    const totalResult = where
      ? await buildCountQuery().where(where)
      : await buildCountQuery();
    const total: number = Number(totalResult[0]?.count ?? 0);

    const deptIds: string[] = Array.from(
      new Set(
        rows
          .map((row) => row.departmentId)
          .filter((deptId): deptId is string => Boolean(deptId)),
      ),
    );
    const deptMap: Map<string, string> = new Map();
    if (deptIds.length > 0) {
      const departments: Array<{ id: string; name: string }> = await this.db
        .select({ id: department.id, name: department.name })
        .from(department)
        .where(inArray(department.id, deptIds));
      departments.forEach((dept: { id: string; name: string }) => {
        deptMap.set(dept.id, dept.name);
      });
    }

    const items: AttendanceRecord[] = rows.map((row) => ({
      id: row.id,
      employeeId: row.employeeId,
      employeeName: row.employeeName ?? '',
      departmentName: row.departmentId
        ? deptMap.get(row.departmentId) ?? ''
        : '',
      attendDate: row.attendDate.toISOString(),
      status: ATTENDANCE_STATUSES.includes(row.status as AttendanceStatus)
        ? (row.status as AttendanceStatus)
        : 'normal',
    }));

    return { items, total };
  }
}
