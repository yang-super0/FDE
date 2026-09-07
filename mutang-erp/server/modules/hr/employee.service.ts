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
import { and, count, eq, like } from 'drizzle-orm';
import { department, employee } from '@server/database/schema';
import type { Employee, PageResult } from '@shared/api.interface';
import { OperationLogService } from '../operation-log/operation-log.service';
import type { CreateEmployeeInput, UpdateEmployeeInput } from './hr.dto';

export interface EmployeeListParams {
  departmentId?: string;
  keyword?: string;
  page: number;
  pageSize: number;
}

@Injectable()
export class EmployeeService {
  private readonly logger = new Logger(EmployeeService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
    private readonly operationLog: OperationLogService,
  ) {}

  async list(params: EmployeeListParams): Promise<PageResult<Employee>> {
    const page: number = Math.max(params.page, 1);
    const pageSize: number = Math.min(Math.max(params.pageSize, 1), 100);

    const conditions = [];
    if (params.departmentId) {
      conditions.push(eq(employee.departmentId, params.departmentId));
    }
    if (params.keyword) {
      conditions.push(like(employee.name, `%${params.keyword}%`));
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = where
      ? await this.db
          .select()
          .from(employee)
          .where(where)
          .limit(pageSize)
          .offset((page - 1) * pageSize)
      : await this.db
          .select()
          .from(employee)
          .limit(pageSize)
          .offset((page - 1) * pageSize);

    const totalResult = where
      ? await this.db.select({ count: count() }).from(employee).where(where)
      : await this.db.select({ count: count() }).from(employee);
    const total: number = Number(totalResult[0]?.count ?? 0);

    const departments: Array<{ id: string; name: string }> = await this.db
      .select({ id: department.id, name: department.name })
      .from(department);
    const deptMap: Map<string, string> = new Map(
      departments.map((dept: { id: string; name: string }) => [
        dept.id,
        dept.name,
      ]),
    );

    const items: Employee[] = rows.map((row) => ({
      id: row.id,
      name: row.name,
      employeeNo: row.employeeNo,
      departmentId: row.departmentId ?? '',
      departmentName: row.departmentId
        ? deptMap.get(row.departmentId) ?? ''
        : '',
      position: row.position,
      hireDate: row.hireDate ? row.hireDate.toISOString() : '',
      phone: row.phone,
    }));

    return { items, total };
  }

  async findById(id: string): Promise<Employee> {
    const rows = await this.db
      .select()
      .from(employee)
      .where(eq(employee.id, id));
    if (rows.length === 0) {
      throw new NotFoundException('员工不存在');
    }
    const row = rows[0];
    const departments: Array<{ id: string; name: string }> = await this.db
      .select({ id: department.id, name: department.name })
      .from(department);
    const deptMap: Map<string, string> = new Map(
      departments.map((dept: { id: string; name: string }) => [
        dept.id,
        dept.name,
      ]),
    );
    return {
      id: row.id,
      name: row.name,
      employeeNo: row.employeeNo,
      departmentId: row.departmentId ?? '',
      departmentName: row.departmentId
        ? deptMap.get(row.departmentId) ?? ''
        : '',
      position: row.position,
      hireDate: row.hireDate ? row.hireDate.toISOString() : '',
      phone: row.phone,
    };
  }

  async create(
    input: CreateEmployeeInput,
    operatorId: string,
  ): Promise<{ id: string }> {
    if (!input.name || !input.employeeNo) {
      throw new BadRequestException('姓名与工号不能为空');
    }
    const inserted = await this.db
      .insert(employee)
      .values({
        name: input.name,
        employeeNo: input.employeeNo,
        departmentId: input.departmentId || null,
        position: input.position ?? '',
        hireDate: input.hireDate ? new Date(input.hireDate) : null,
        phone: input.phone ?? '',
      })
      .returning({ id: employee.id });
    this.logger.log(`新增员工: ${input.name} (${input.employeeNo})`);
    await this.operationLog.record({
      module: '人资管理',
      actionType: 'create',
      target: `员工 ${input.name} (${input.employeeNo})`,
      operatorId,
    });
    return { id: inserted[0].id };
  }

  async update(
    id: string,
    input: UpdateEmployeeInput,
    operatorId: string,
  ): Promise<{ success: boolean }> {
    const patch: Partial<typeof employee.$inferInsert> = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.departmentId !== undefined) {
      patch.departmentId = input.departmentId || null;
    }
    if (input.position !== undefined) patch.position = input.position;
    if (input.phone !== undefined) patch.phone = input.phone;

    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }

    const updated = await this.db
      .update(employee)
      .set(patch)
      .where(eq(employee.id, id))
      .returning({ id: employee.id, name: employee.name });
    if (updated.length === 0) {
      throw new NotFoundException('员工不存在');
    }
    await this.operationLog.record({
      module: '人资管理',
      actionType: 'update',
      target: `员工 ${updated[0].name}`,
      operatorId,
    });
    return { success: true };
  }
}
