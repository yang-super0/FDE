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
  count,
  desc,
  eq,
  ilike,
  isNull,
  or,
  type SQL,
} from 'drizzle-orm';
import { hrEmployees } from '@server/database/schema';
import type {
  CreateHrEmployeeBody,
  HrEmployee,
  HrEmployeePage,
  HrEmployeeRegularBody,
  HrEmployeeTransferConfirmBody,
  HrEmployeeLeaveApplyBody,
  UpdateHrEmployeeBody,
} from '@shared/api.interface';
import { insertWithSeqNo } from '../finance-core/fin-seq.util';
import { assertHrRequired, resolveHrPagination } from './hr-enhance-shared.util';
import { publishSyncEvent } from '@server/modules/feishu-sync/sync-event.publisher';

type EmployeeRow = typeof hrEmployees.$inferSelect;
type EmployeeInsert = typeof hrEmployees.$inferInsert;

const EMPLOYEE_NO_PREFIX: string = 'YG';

export const HR_EMP_STATUS_PROBATION: string = '试用期';
export const HR_EMP_STATUS_REGULAR: string = '正式';
export const HR_EMP_STATUS_TRANSFERRING: string = '调岗中';
export const HR_EMP_STATUS_LEAVING: string = '离职中';
export const HR_EMP_STATUS_LEFT: string = '已离职';

const TRANSFER_APPLICABLE_STATUSES: string[] = [
  HR_EMP_STATUS_PROBATION,
  HR_EMP_STATUS_REGULAR,
];

const LEAVE_APPLICABLE_STATUSES: string[] = [
  HR_EMP_STATUS_PROBATION,
  HR_EMP_STATUS_REGULAR,
  HR_EMP_STATUS_TRANSFERRING,
];

export interface HrEmployeeListQuery {
  department?: string;
  status?: string;
  keyword?: string;
  page?: string;
  pageSize?: string;
}

export interface HrEmployeeTransferApplyBody {
  reason?: string;
}

function mapHrEmployee(row: EmployeeRow): HrEmployee {
  return {
    id: row.id,
    employeeNo: row.employeeNo,
    name: row.name,
    gender: row.gender,
    phone: row.phone,
    email: row.email,
    idCard: row.idCard,
    department: row.department,
    position: row.position,
    level: row.level,
    entryDate: row.entryDate,
    regularDate: row.regularDate,
    status: row.status,
    leaveDate: row.leaveDate,
    leaveReason: row.leaveReason,
    emergencyContact: row.emergencyContact,
    emergencyPhone: row.emergencyPhone,
    bankAccount: row.bankAccount,
    bankName: row.bankName,
    remark: row.remark,
    createdAt: row.createdAt.toISOString(),
    createdBy: row.createdBy ?? '',
    updatedAt: row.updatedAt.toISOString(),
    updatedBy: row.updatedBy ?? '',
    deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
  };
}

@Injectable()
export class HrEmployeesService {
  private readonly logger = new Logger(HrEmployeesService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
  ) {}

  async listEmployees(
    params: HrEmployeeListQuery,
  ): Promise<HrEmployeePage> {
    const pagination = resolveHrPagination(params.page, params.pageSize);
    const conditions: SQL[] = [isNull(hrEmployees.deletedAt)];
    if (params.department) {
      conditions.push(eq(hrEmployees.department, params.department));
    }
    if (params.status) {
      conditions.push(eq(hrEmployees.status, params.status));
    }
    if (params.keyword) {
      const pattern: string = `%${params.keyword}%`;
      const keywordCondition:
        | SQL
        | undefined = or(
        ilike(hrEmployees.name, pattern),
        ilike(hrEmployees.employeeNo, pattern),
        ilike(hrEmployees.phone, pattern),
      );
      if (keywordCondition) {
        conditions.push(keywordCondition);
      }
    }
    const where = and(...conditions);
    const totalRows: { count: number | string }[] = await this.db
      .select({ count: count() })
      .from(hrEmployees)
      .where(where);
    const rows: EmployeeRow[] = await this.db
      .select()
      .from(hrEmployees)
      .where(where)
      .orderBy(desc(hrEmployees.id))
      .limit(pagination.pageSize)
      .offset(pagination.offset);
    return {
      items: rows.map((row: EmployeeRow) => mapHrEmployee(row)),
      total: Number(totalRows[0]?.count ?? 0),
      page: pagination.page,
      pageSize: pagination.pageSize,
    };
  }

  async createEmployee(
    dto: CreateHrEmployeeBody,
    userId: string,
  ): Promise<HrEmployee> {
    const name: string = String(dto?.name ?? '').trim();
    assertHrRequired(name, '员工姓名');
    const department: string = String(dto?.department ?? '').trim();
    assertHrRequired(department, '部门');
    const position: string = String(dto?.position ?? '').trim();
    assertHrRequired(position, '职位');
    const entryDate: string = String(dto?.entryDate ?? '').trim();
    assertHrRequired(entryDate, '入职日期');

    const buildValues = (employeeNo: string): EmployeeInsert => ({
      employeeNo,
      name,
      gender: dto.gender ?? '男',
      phone: dto.phone ?? '',
      email: dto.email ?? '',
      idCard: dto.idCard ?? '',
      department,
      position,
      level: dto.level ?? 'P4',
      entryDate,
      regularDate: dto.regularDate ?? null,
      status: dto.status ?? HR_EMP_STATUS_PROBATION,
      leaveDate: dto.leaveDate ?? null,
      leaveReason: dto.leaveReason ?? '',
      emergencyContact: dto.emergencyContact ?? '',
      emergencyPhone: dto.emergencyPhone ?? '',
      bankAccount: dto.bankAccount ?? '',
      bankName: dto.bankName ?? '',
      remark: dto.remark ?? '',
      createdBy: userId,
      updatedBy: userId,
    });

    const { row } = await insertWithSeqNo<EmployeeRow>({
      db: this.db,
      table: hrEmployees,
      noColumn: hrEmployees.employeeNo,
      prefix: EMPLOYEE_NO_PREFIX,
      insert: (employeeNo: string) =>
        this.db.insert(hrEmployees).values(buildValues(employeeNo)).returning(),
    });
    this.logger.log(`员工入职登记成功 id=${row.id} no=${row.employeeNo}`);
    publishSyncEvent('hr_employees', row.id, 'create');
    return mapHrEmployee(row);
  }

  async getEmployee(id: number): Promise<HrEmployee> {
    const row: EmployeeRow | undefined = await this.findActiveRow(id);
    return mapHrEmployee(row);
  }

  async updateEmployee(
    id: number,
    dto: UpdateHrEmployeeBody,
    userId: string,
  ): Promise<HrEmployee> {
    const row: EmployeeRow = await this.findActiveRow(id);
    if (row.status === HR_EMP_STATUS_LEFT) {
      throw new ConflictException('已离职员工不允许修改');
    }
    if (dto?.status === HR_EMP_STATUS_LEFT) {
      throw new ConflictException('离职状态请通过离职流程操作');
    }
    const patch: Partial<EmployeeInsert> = {};
    if (dto?.name !== undefined) patch.name = dto.name;
    if (dto?.phone !== undefined) patch.phone = dto.phone;
    if (dto?.email !== undefined) patch.email = dto.email;
    if (dto?.idCard !== undefined) patch.idCard = dto.idCard;
    if (dto?.department !== undefined) patch.department = dto.department;
    if (dto?.position !== undefined) patch.position = dto.position;
    if (dto?.gender !== undefined) patch.gender = dto.gender;
    if (dto?.level !== undefined) patch.level = dto.level;
    if (dto?.entryDate !== undefined) patch.entryDate = dto.entryDate;
    if (dto?.regularDate !== undefined) patch.regularDate = dto.regularDate;
    if (dto?.status !== undefined) patch.status = dto.status;
    if (dto?.leaveDate !== undefined) patch.leaveDate = dto.leaveDate;
    if (dto?.leaveReason !== undefined) patch.leaveReason = dto.leaveReason;
    if (dto?.emergencyContact !== undefined) {
      patch.emergencyContact = dto.emergencyContact;
    }
    if (dto?.emergencyPhone !== undefined) {
      patch.emergencyPhone = dto.emergencyPhone;
    }
    if (dto?.bankAccount !== undefined) patch.bankAccount = dto.bankAccount;
    if (dto?.bankName !== undefined) patch.bankName = dto.bankName;
    if (dto?.remark !== undefined) patch.remark = dto.remark;
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }
    patch.updatedAt = new Date();
    patch.updatedBy = userId;
    const updated: EmployeeRow[] = await this.db
      .update(hrEmployees)
      .set(patch)
      .where(and(eq(hrEmployees.id, id), isNull(hrEmployees.deletedAt)))
      .returning();
    if (updated.length === 0) {
      throw new NotFoundException('员工不存在');
    }
    publishSyncEvent('hr_employees', id, 'update');
    return mapHrEmployee(updated[0]);
  }

  async deleteEmployee(id: number, userId: string): Promise<HrEmployee> {
    const row: EmployeeRow = await this.findActiveRow(id);
    if (row.status === HR_EMP_STATUS_LEFT) {
      throw new ConflictException('已离职员工不允许删除');
    }
    const updated: EmployeeRow[] = await this.db
      .update(hrEmployees)
      .set({ deletedAt: new Date(), updatedBy: userId })
      .where(and(eq(hrEmployees.id, id), isNull(hrEmployees.deletedAt)))
      .returning();
    if (updated.length === 0) {
      throw new NotFoundException('员工不存在');
    }
    this.logger.log(`员工软删除成功 id=${id}`);
    publishSyncEvent('hr_employees', id, 'delete');
    return mapHrEmployee(updated[0]);
  }

  async regularizeEmployee(
    id: number,
    dto: HrEmployeeRegularBody,
    userId: string,
  ): Promise<HrEmployee> {
    assertHrRequired(dto?.regularDate, '转正日期');
    const row: EmployeeRow = await this.findActiveRow(id);
    if (row.status !== HR_EMP_STATUS_PROBATION) {
      throw new ConflictException('仅试用期员工可办理转正');
    }
    const updated: EmployeeRow[] = await this.db
      .update(hrEmployees)
      .set({
        regularDate: dto.regularDate,
        status: HR_EMP_STATUS_REGULAR,
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(and(eq(hrEmployees.id, id), isNull(hrEmployees.deletedAt)))
      .returning();
    if (updated.length === 0) {
      throw new NotFoundException('员工不存在');
    }
    publishSyncEvent('hr_employees', id, 'update');
    return mapHrEmployee(updated[0]);
  }

  async applyTransfer(
    id: number,
    dto: HrEmployeeTransferApplyBody,
    userId: string,
  ): Promise<HrEmployee> {
    const row: EmployeeRow = await this.findActiveRow(id);
    if (!TRANSFER_APPLICABLE_STATUSES.includes(row.status)) {
      throw new ConflictException('仅试用期或正式员工可申请调岗');
    }
    const reason: string = String(dto?.reason ?? '').trim();
    const patch: Partial<EmployeeInsert> = {
      status: HR_EMP_STATUS_TRANSFERRING,
      updatedAt: new Date(),
      updatedBy: userId,
    };
    if (reason) {
      patch.remark = `调岗原因：${reason}`;
    }
    const updated: EmployeeRow[] = await this.db
      .update(hrEmployees)
      .set(patch)
      .where(and(eq(hrEmployees.id, id), isNull(hrEmployees.deletedAt)))
      .returning();
    if (updated.length === 0) {
      throw new NotFoundException('员工不存在');
    }
    publishSyncEvent('hr_employees', id, 'update');
    return mapHrEmployee(updated[0]);
  }

  async confirmTransfer(
    id: number,
    dto: HrEmployeeTransferConfirmBody,
    userId: string,
  ): Promise<HrEmployee> {
    assertHrRequired(dto?.department, '调岗后部门');
    assertHrRequired(dto?.position, '调岗后职位');
    const row: EmployeeRow = await this.findActiveRow(id);
    if (row.status !== HR_EMP_STATUS_TRANSFERRING) {
      throw new ConflictException('仅调岗中员工可确认调岗');
    }
    const updated: EmployeeRow[] = await this.db
      .update(hrEmployees)
      .set({
        department: dto.department,
        position: dto.position,
        status: HR_EMP_STATUS_REGULAR,
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(and(eq(hrEmployees.id, id), isNull(hrEmployees.deletedAt)))
      .returning();
    if (updated.length === 0) {
      throw new NotFoundException('员工不存在');
    }
    publishSyncEvent('hr_employees', id, 'update');
    return mapHrEmployee(updated[0]);
  }

  async applyLeave(
    id: number,
    dto: HrEmployeeLeaveApplyBody,
    userId: string,
  ): Promise<HrEmployee> {
    assertHrRequired(dto?.leaveReason, '离职原因');
    assertHrRequired(dto?.leaveDate, '离职日期');
    const row: EmployeeRow = await this.findActiveRow(id);
    if (!LEAVE_APPLICABLE_STATUSES.includes(row.status)) {
      throw new ConflictException('仅在职员工可申请离职');
    }
    const updated: EmployeeRow[] = await this.db
      .update(hrEmployees)
      .set({
        leaveReason: dto.leaveReason,
        leaveDate: dto.leaveDate,
        status: HR_EMP_STATUS_LEAVING,
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(and(eq(hrEmployees.id, id), isNull(hrEmployees.deletedAt)))
      .returning();
    if (updated.length === 0) {
      throw new NotFoundException('员工不存在');
    }
    publishSyncEvent('hr_employees', id, 'update');
    return mapHrEmployee(updated[0]);
  }

  async confirmLeave(id: number, userId: string): Promise<HrEmployee> {
    const row: EmployeeRow = await this.findActiveRow(id);
    if (row.status === HR_EMP_STATUS_LEFT) {
      throw new ConflictException('员工已离职，请勿重复确认');
    }
    if (row.status !== HR_EMP_STATUS_LEAVING) {
      throw new ConflictException('仅离职中员工可确认离职');
    }
    const updated: EmployeeRow[] = await this.db
      .update(hrEmployees)
      .set({
        status: HR_EMP_STATUS_LEFT,
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(and(eq(hrEmployees.id, id), isNull(hrEmployees.deletedAt)))
      .returning();
    if (updated.length === 0) {
      throw new NotFoundException('员工不存在');
    }
    publishSyncEvent('hr_employees', id, 'update');
    return mapHrEmployee(updated[0]);
  }

  private async findActiveRow(id: number): Promise<EmployeeRow> {
    const rows: EmployeeRow[] = await this.db
      .select()
      .from(hrEmployees)
      .where(and(eq(hrEmployees.id, id), isNull(hrEmployees.deletedAt)));
    if (rows.length === 0) {
      throw new NotFoundException('员工不存在');
    }
    return rows[0];
  }
}
