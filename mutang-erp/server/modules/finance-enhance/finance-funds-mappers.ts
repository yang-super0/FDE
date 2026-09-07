import type {
  CustomerFinanceDetail,
  FinanceBankAccount,
  FinanceCoinReturn,
  FinancePort,
  FinanceRecharge,
  FinanceRefund,
} from '@shared/api.interface';
import {
  customerFinanceDetails,
  financeBankAccounts,
  financeCoinReturns,
  financePorts,
  financeRecharges,
  financeRefunds,
} from '@server/database/schema';

type DetailRow = typeof customerFinanceDetails.$inferSelect;
type RechargeRow = typeof financeRecharges.$inferSelect;
type RefundRow = typeof financeRefunds.$inferSelect;
type CoinReturnRow = typeof financeCoinReturns.$inferSelect;
type PortRow = typeof financePorts.$inferSelect;
type BankAccountRow = typeof financeBankAccounts.$inferSelect;

const toIsoString = (value: Date | null): string | null =>
  value === null ? null : value.toISOString();

export const mapCustomerFinanceDetail = (
  row: DetailRow,
): CustomerFinanceDetail => ({
  id: row.id,
  detailNo: row.detailNo,
  customerId: row.customerId,
  customerName: row.customerName,
  accountId: row.accountId,
  transactionType: row.transactionType,
  amount: Number(row.amount),
  balanceAfter: Number(row.balanceAfter),
  relatedOrderNo: row.relatedOrderNo,
  remark: row.remark,
  transactionTime: row.transactionTime.toISOString(),
});

export const mapFinanceRecharge = (row: RechargeRow): FinanceRecharge => ({
  id: row.id,
  rechargeNo: row.rechargeNo,
  customerId: row.customerId,
  customerName: row.customerName,
  adAccountId: row.adAccountId,
  accountId: row.accountId,
  amount: Number(row.amount),
  paymentMethod: row.paymentMethod,
  status: row.status,
  confirmTime: toIsoString(row.confirmTime),
  operator: row.operator,
  remark: row.remark,
  createdAt: row.createdAt.toISOString(),
});

export const mapFinanceRefund = (row: RefundRow): FinanceRefund => ({
  id: row.id,
  refundNo: row.refundNo,
  customerId: row.customerId,
  customerName: row.customerName,
  accountId: row.accountId,
  amount: Number(row.amount),
  reason: row.reason,
  status: row.status,
  approver: row.approver,
  approveTime: toIsoString(row.approveTime),
  approveRemark: row.approveRemark,
  refundTime: toIsoString(row.refundTime),
  operator: row.operator,
  createdAt: row.createdAt.toISOString(),
});

export const mapFinanceCoinReturn = (
  row: CoinReturnRow,
): FinanceCoinReturn => ({
  id: row.id,
  returnNo: row.returnNo,
  customerId: row.customerId,
  adAccountId: row.adAccountId,
  platform: row.platform,
  coinAmount: Number(row.coinAmount),
  rmbEquivalent: Number(row.rmbEquivalent),
  status: row.status,
  operator: row.operator,
  finishTime: toIsoString(row.finishTime),
  remark: row.remark,
  createdAt: row.createdAt.toISOString(),
});

export const mapFinancePort = (row: PortRow): FinancePort => ({
  id: row.id,
  portNo: row.portNo,
  portName: row.portName,
  portType: row.portType,
  platform: row.platform,
  balance: Number(row.balance),
  frozenBalance: Number(row.frozenBalance),
  contactPerson: row.contactPerson,
  contactPhone: row.contactPhone,
  status: row.status,
  remark: row.remark,
  createdAt: row.createdAt.toISOString(),
});

export const mapFinanceBankAccount = (
  row: BankAccountRow,
): FinanceBankAccount => ({
  id: row.id,
  bankNo: row.bankNo,
  bankName: row.bankName,
  accountName: row.accountName,
  accountNo: row.accountNo,
  branch: row.branch,
  accountType: row.accountType,
  balance: Number(row.balance),
  status: row.status,
  remark: row.remark,
  createdAt: row.createdAt.toISOString(),
});
