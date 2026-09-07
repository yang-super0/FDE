import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, isNull, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import {
  customerFinanceDetails,
  financeAccounts,
} from '@server/database/schema';
import { insertWithSeqNo } from '../finance-core/fin-seq.util';

export const DETAIL_NO_PREFIX = 'KHMX';

export function assertPositiveAmount(amount: unknown, label: string): void {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) {
    throw new BadRequestException(`${label}必须大于0`);
  }
}

export function assertAmountRange(amount: number, label: string): void {
  if (amount > 9999999999.99) {
    throw new BadRequestException(`${label}超出可记录范围`);
  }
}

export interface InsertCustomerDetailInput {
  customerId: string;
  customerName: string;
  accountId: number | null;
  transactionType: string;
  amount: number;
  balanceAfter: number;
  relatedOrderNo: string;
  remark?: string;
}

export async function insertCustomerFinanceDetail(
  db: PostgresJsDatabase,
  input: InsertCustomerDetailInput,
): Promise<number> {
  const { id } = await insertWithSeqNo<{ id: number }>({
    db,
    table: customerFinanceDetails,
    noColumn: customerFinanceDetails.detailNo,
    prefix: DETAIL_NO_PREFIX,
    insert: async (no: string) =>
      db
        .insert(customerFinanceDetails)
        .values({
          detailNo: no,
          customerId: input.customerId,
          customerName: input.customerName,
          accountId: input.accountId,
          transactionType: input.transactionType,
          amount: input.amount.toFixed(2),
          balanceAfter: input.balanceAfter.toFixed(2),
          relatedOrderNo: input.relatedOrderNo,
          remark: input.remark ?? '',
        })
        .returning({ id: customerFinanceDetails.id }),
  });
  return id;
}

/** 账户余额原子增加，返回新余额；账户不存在抛 404 */
export async function increaseAccountBalance(
  db: PostgresJsDatabase,
  accountId: number,
  amount: number,
): Promise<number> {
  const rows: { balance: string }[] = await db
    .update(financeAccounts)
    .set({
      balance: sql`${financeAccounts.balance} + ${amount.toFixed(2)}`,
      updatedAt: new Date(),
    })
    .where(and(eq(financeAccounts.id, accountId), isNull(financeAccounts.deletedAt)))
    .returning({ balance: financeAccounts.balance });
  if (rows.length === 0) {
    throw new NotFoundException('资金账户不存在');
  }
  return Number(rows[0].balance);
}

/** 账户余额原子扣减（乐观锁：balance >= amount 进 WHERE），余额不足抛 409 */
export async function decreaseAccountBalance(
  db: PostgresJsDatabase,
  accountId: number,
  amount: number,
): Promise<number> {
  const rows: { balance: string }[] = await db
    .update(financeAccounts)
    .set({
      balance: sql`${financeAccounts.balance} - ${amount.toFixed(2)}`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(financeAccounts.id, accountId),
        isNull(financeAccounts.deletedAt),
        sql`${financeAccounts.balance} >= ${amount.toFixed(2)}`,
      ),
    )
    .returning({ balance: financeAccounts.balance });
  if (rows.length === 0) {
    const exists = await db
      .select({ id: financeAccounts.id })
      .from(financeAccounts)
      .where(eq(financeAccounts.id, accountId));
    if (exists.length === 0) {
      throw new NotFoundException('资金账户不存在');
    }
    throw new ConflictException('账户余额不足');
  }
  return Number(rows[0].balance);
}
