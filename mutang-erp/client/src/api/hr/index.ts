import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  AttendanceRecord,
  DepartmentNode,
  Employee,
  LeaveRequest,
  LeaveStatus,
  PageResult,
} from '@shared/api.interface';

/* ============ 请求参数 / 请求体类型 ============ */

export interface EmployeeListParams {
  departmentId?: string;
  keyword?: string;
  page: number;
  pageSize: number;
}

export interface CreateEmployeeRequest {
  name: string;
  employeeNo: string;
  departmentId: string;
  position: string;
  hireDate: string;
  phone: string;
}

export interface UpdateEmployeeRequest {
  name?: string;
  departmentId?: string;
  position?: string;
  phone?: string;
}

export interface AttendanceListParams {
  departmentId?: string;
  dateFrom?: string;
  dateTo?: string;
  page: number;
  pageSize: number;
}

export interface CreateLeaveRequest {
  leaveType: string;
  startTime: string;
  endTime: string;
  reason: string;
}

export type LeaveApprovalAction = 'approved' | 'rejected';

/* ============ 部门 ============ */

export async function listDepartments(): Promise<{
  items: DepartmentNode[];
}> {
  const res = await axiosForBackend.get<{ items: DepartmentNode[] }>(
    '/api/departments',
  );
  return res.data;
}

/* ============ 员工 ============ */

export async function listEmployees(
  params: EmployeeListParams,
): Promise<PageResult<Employee>> {
  const res = await axiosForBackend.get<PageResult<Employee>>(
    '/api/employees',
    { params },
  );
  return res.data;
}

export async function createEmployee(
  data: CreateEmployeeRequest,
): Promise<{ id: string }> {
  const res = await axiosForBackend.post<{ id: string }>(
    '/api/employees',
    data,
  );
  return res.data;
}

export async function getEmployee(id: string): Promise<Employee> {
  const res = await axiosForBackend.get<Employee>(`/api/employees/${id}`);
  return res.data;
}

export async function updateEmployee(
  id: string,
  data: UpdateEmployeeRequest,
): Promise<{ success: boolean }> {
  const res = await axiosForBackend.put<{ success: boolean }>(
    `/api/employees/${id}`,
    data,
  );
  return res.data;
}

/* ============ 考勤 ============ */

export async function listAttendances(
  params: AttendanceListParams,
): Promise<PageResult<AttendanceRecord>> {
  const res = await axiosForBackend.get<PageResult<AttendanceRecord>>(
    '/api/attendances',
    { params },
  );
  return res.data;
}

/* ============ 请假 ============ */

export async function listLeaves(status?: LeaveStatus): Promise<{
  items: LeaveRequest[];
}> {
  const res = await axiosForBackend.get<{ items: LeaveRequest[] }>(
    '/api/leaves',
    { params: status ? { status } : {} },
  );
  return res.data;
}

export async function createLeave(
  data: CreateLeaveRequest,
): Promise<{ id: string }> {
  const res = await axiosForBackend.post<{ id: string }>('/api/leaves', data);
  return res.data;
}

export async function approveLeave(
  id: string,
  action: LeaveApprovalAction,
): Promise<{ success: boolean }> {
  const res = await axiosForBackend.post<{ success: boolean }>(
    `/api/leaves/${id}/approval`,
    { action },
  );
  return res.data;
}
