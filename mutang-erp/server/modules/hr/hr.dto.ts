export interface CreateEmployeeInput {
  name: string;
  employeeNo: string;
  departmentId: string;
  position: string;
  hireDate: string;
  phone: string;
}

export interface UpdateEmployeeInput {
  name?: string;
  departmentId?: string;
  position?: string;
  phone?: string;
}

export interface CreateLeaveInput {
  leaveType: string;
  startTime: string;
  endTime: string;
  reason: string;
}

export type LeaveApprovalAction = 'approved' | 'rejected';

export interface ApprovalInput {
  action: LeaveApprovalAction;
}
