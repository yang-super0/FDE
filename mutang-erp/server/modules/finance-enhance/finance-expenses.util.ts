import { BadRequestException } from '@nestjs/common';
import type {
  FinanceDeposit,
  FinanceExpense,
  FinanceFee,
  FinanceIncome,
} from '@shared/api.interface';
import type {
  financeDeposits,
  financeExpenses,
  financeFees,
  financeIncomes,
} from '@server/database/schema';

type IncomeRow = typeof financeIncomes.$inferSelect;
type ExpenseRow = typeof financeExpenses.$inferSelect;
type FeeRow = typeof financeFees.$inferSelect;
type DepositRow = typeof financeDeposits.$inferSelect;

export interface FinanceIncomeSummaryItem {
  incomeType: string;
  totalAmount: number;
  count: number;
}

export interface FinanceIncomeSummaryResult {
  items: FinanceIncomeSummaryItem[];
}

export const INCOME_NO_PREFIX = 'SR';
export const EXPENSE_NO_PREFIX = 'ZC';
export const FEE_NO_PREFIX = 'FY';
export const DEPOSIT_NO_PREFIX = 'BZJ';

export const INCOME_PENDING = '待确认';
export const INCOME_CONFIRMED = '已确认';

export const EXPENSE_PENDING = '待审批';
export const EXPENSE_APPROVED = '已通过';
export const EXPENSE_REJECTED = '已驳回';
export const EXPENSE_PAID = '已支付';

export const FEE_DRAFT = '待提交';
export const FEE_PENDING = '待审批';
export const FEE_APPROVED = '已通过';
export const FEE_REJECTED = '已驳回';
export const FEE_REIMBURSED = '已报销';

export const FEE_EDITABLE_STATUSES: readonly string[] = [
  FEE_DRAFT,
  FEE_REJECTED,
];

export const DEPOSIT_COLLECTED = '已收取';
export const DEPOSIT_PARTIAL_RETURNED = '部分退还';
export const DEPOSIT_RETURNED = '已退还';
export const DEPOSIT_CONFISCATED = '已没收';

export const parseAccountId = (value: unknown): number => {
  const parsed: number = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new BadRequestException('请提供有效的资金账户 ID');
  }
  return parsed;
};

export const requireText = (value: unknown, label: string): string => {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new BadRequestException(`${label}不能为空`);
  }
  return value.trim();
};

export const appendRejectReason = (remark: string, reason: string): string =>
  remark ? `${remark}；驳回原因：${reason}` : `驳回原因：${reason}`;

export const toIsoOrNull = (value: Date | null): string | null =>
  value ? value.toISOString() : null;

export const formatToday = (): string => {
  const now: Date = new Date();
  const y: number = now.getFullYear();
  const m: string = String(now.getMonth() + 1).padStart(2, '0');
  const d: string = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const mapIncome = (row: IncomeRow): FinanceIncome => ({
  id: row.id,
  incomeNo: row.incomeNo,
  incomeType: row.incomeType,
  customerId: row.customerId,
  customerName: row.customerName,
  amount: Number(row.amount),
  accountId: row.accountId,
  incomeDate: row.incomeDate,
  relatedOrderNo: row.relatedOrderNo,
  status: row.status,
  operator: row.operator,
  remark: row.remark,
  createdAt: row.createdAt.toISOString(),
});

export const mapExpense = (row: ExpenseRow): FinanceExpense => ({
  id: row.id,
  expenseNo: row.expenseNo,
  expenseType: row.expenseType,
  amount: Number(row.amount),
  applicant: row.applicant,
  applyDate: row.applyDate,
  status: row.status,
  approver: row.approver,
  approveTime: toIsoOrNull(row.approveTime),
  payTime: toIsoOrNull(row.payTime),
  accountId: row.accountId,
  operator: row.operator,
  remark: row.remark,
  createdAt: row.createdAt.toISOString(),
});

export const mapFee = (row: FeeRow): FinanceFee => ({
  id: row.id,
  feeNo: row.feeNo,
  feeType: row.feeType,
  applicant: row.applicant,
  department: row.department,
  amount: Number(row.amount),
  expenseDate: row.expenseDate,
  invoiceNo: row.invoiceNo,
  status: row.status,
  approver: row.approver,
  approveTime: toIsoOrNull(row.approveTime),
  reimburseTime: toIsoOrNull(row.reimburseTime),
  accountId: row.accountId,
  attachmentUrl: row.attachmentUrl,
  remark: row.remark,
  createdAt: row.createdAt.toISOString(),
});

export const mapDeposit = (row: DepositRow): FinanceDeposit => ({
  id: row.id,
  depositNo: row.depositNo,
  customerId: row.customerId,
  customerName: row.customerName,
  depositType: row.depositType,
  amount: Number(row.amount),
  collectDate: row.collectDate,
  collectAccount: row.collectAccount,
  status: row.status,
  returnedAmount: Number(row.returnedAmount),
  returnDate: row.returnDate,
  returnAccount: row.returnAccount,
  operator: row.operator,
  remark: row.remark,
  createdAt: row.createdAt.toISOString(),
});

export const paginationFrom = (params: {
  page?: number;
  pageSize?: number;
}): { limit: number; offset: number } => {
  const pageSize: number = params.pageSize ?? 20;
  const page: number = params.page ?? 1;
  return { limit: pageSize, offset: Math.max(0, (page - 1) * pageSize) };
};
