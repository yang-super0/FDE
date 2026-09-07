import { BadRequestException } from '@nestjs/common';
import type {
  financeConsumptions,
  financeDeductions,
  financeRebates,
} from '@server/database/schema';
import type {
  FinanceConsumption,
  FinanceDeduction,
  FinanceRebate,
} from '@shared/api.interface';

export const REBATE_NO_PREFIX: string = 'HF';
export const DEDUCTION_NO_PREFIX: string = 'KJ';
export const CONSUMPTION_NO_PREFIX: string = 'XH';

export interface RebateListQuery {
  customerName?: string;
  status?: string;
  period?: string;
  page: number;
  pageSize: number;
}

export interface DeductionListQuery {
  customerName?: string;
  status?: string;
  page: number;
  pageSize: number;
}

export interface ConsumptionListQuery {
  consumptionDateFrom?: string;
  consumptionDateTo?: string;
  status?: string;
  page: number;
  pageSize: number;
}

export interface UpdateRebateInput {
  customerId?: string;
  customerName?: string;
  portId?: number;
  period?: string;
  consumptionBase?: number;
  rebateRate?: number;
  remark?: string;
}

export interface UpdateConsumptionInput {
  customerId?: string;
  adAccountId?: string;
  portId?: number;
  consumptionDate?: string;
  amount?: number;
  platformData?: number;
  systemData?: number;
  remark?: string;
}

export const REBATE_PENDING_CALC_STATUS: string = '待核算';
export const REBATE_CALCULATED_STATUS: string = '已核算';
export const REBATE_ISSUED_STATUS: string = '已发放';
export const REBATE_CANCELLED_STATUS: string = '已取消';
export const REBATE_CANCELLABLE_STATUSES: string[] = [
  REBATE_PENDING_CALC_STATUS,
  REBATE_CALCULATED_STATUS,
];

export const DEDUCTION_PENDING_APPROVE_STATUS: string = '待审批';
export const DEDUCTION_APPROVED_STATUS: string = '已通过';
export const DEDUCTION_REJECTED_STATUS: string = '已驳回';
export const DEDUCTION_EXECUTED_STATUS: string = '已执行';

export const CONSUMPTION_PENDING_CHECK_STATUS: string = '待核对';
export const CONSUMPTION_DIFFERENCE_STATUS: string = '有差异';
export const CONSUMPTION_CHECKED_STATUS: string = '已核对';

const DATE_PATTERN: RegExp = /^\d{4}-\d{2}-\d{2}$/u;

export const requireText = (value: unknown, label: string): string => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new BadRequestException(`请填写${label}`);
  }
  return value.trim();
};

export const requireIdValue = (value: unknown, label: string): number => {
  const parsed: number = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new BadRequestException(`请提供有效的${label}`);
  }
  return parsed;
};

export const validateRate = (value: unknown, label: string): number => {
  const parsed: number = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 1) {
    throw new BadRequestException(`${label}必须在(0,1]区间`);
  }
  return parsed;
};

export const validateDateText = (
  value: unknown,
  label: string,
): string => {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) {
    throw new BadRequestException(`${label}格式应为YYYY-MM-DD`);
  }
  return value;
};

type RebateRow = typeof financeRebates.$inferSelect;
type DeductionRow = typeof financeDeductions.$inferSelect;
type ConsumptionRow = typeof financeConsumptions.$inferSelect;

const toIso = (value: Date | null): string | null =>
  value === null ? null : value.toISOString();

export const mapRebate = (row: RebateRow, portName: string): FinanceRebate => ({
  id: row.id,
  rebateNo: row.rebateNo,
  customerId: row.customerId,
  customerName: row.customerName,
  portId: row.portId,
  portName,
  period: row.period,
  consumptionBase: Number(row.consumptionBase),
  rebateRate: Number(row.rebateRate),
  rebateAmount: Number(row.rebateAmount),
  status: row.status,
  calculateTime: toIso(row.calculateTime),
  issueTime: toIso(row.issueTime),
  operator: row.operator,
  remark: row.remark,
  createdAt: toIso(row.createdAt) ?? '',
});

export const mapDeduction = (row: DeductionRow): FinanceDeduction => ({
  id: row.id,
  deductionNo: row.deductionNo,
  customerId: row.customerId,
  customerName: row.customerName,
  accountId: row.accountId,
  amount: Number(row.amount),
  reason: row.reason,
  deductionType: row.deductionType,
  status: row.status,
  approver: row.approver,
  approveTime: toIso(row.approveTime),
  executeTime: toIso(row.executeTime),
  operator: row.operator,
  createdAt: toIso(row.createdAt) ?? '',
});

export const mapConsumption = (
  row: ConsumptionRow,
): FinanceConsumption => ({
  id: row.id,
  consumptionNo: row.consumptionNo,
  customerId: row.customerId,
  adAccountId: row.adAccountId,
  portId: row.portId,
  consumptionDate: row.consumptionDate,
  amount: Number(row.amount),
  platformData: Number(row.platformData),
  systemData: Number(row.systemData),
  difference: Number(row.difference),
  status: row.status,
  checker: row.checker,
  checkTime: toIso(row.checkTime),
  remark: row.remark,
  createdAt: toIso(row.createdAt) ?? '',
});
