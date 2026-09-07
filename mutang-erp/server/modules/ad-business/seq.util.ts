import { BadRequestException, ConflictException } from '@nestjs/common';
import { count, like } from 'drizzle-orm';
import type { Column } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';
import type { PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';

export const MAX_SEQ_RETRY: number = 5;
const SEQ_NO_LENGTH: number = 4;
const UNIQUE_VIOLATION_CODE: string = '23505';

/** cause-aware PostgreSQL 错误码提取（Drizzle 可能把原始错误包在 cause 链里） */
export function extractPostgresErrorCode(error: unknown): string | undefined {
  let current: unknown = error;
  for (
    let depth: number = 0;
    depth < 4 && current && typeof current === 'object';
    depth += 1
  ) {
    const wrapped = current as { code?: unknown; cause?: unknown };
    if (typeof wrapped.code === 'string') {
      return wrapped.code;
    }
    current = wrapped.cause;
  }
  return undefined;
}

export const isUniqueViolation = (error: unknown): boolean =>
  extractPostgresErrorCode(error) === UNIQUE_VIOLATION_CODE;

const buildYearMonth = (): string => {
  const now: Date = new Date();
  const year: string = String(now.getFullYear()).slice(2);
  const month: string = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}${month}`;
};

export const buildSeqNo = (
  prefix: string,
  yearMonth: string,
  seq: number,
): string =>
  `${prefix}${yearMonth}${String(seq).padStart(SEQ_NO_LENGTH, '0')}`;

export async function countExistingSeq(
  db: PostgresJsDatabase,
  table: PgTable,
  noColumn: Column,
  prefix: string,
  yearMonth: string,
): Promise<number> {
  const rows: { count: number | string }[] = await db
    .select({ count: count() })
    .from(table)
    .where(like(noColumn, `${prefix}${yearMonth}%`));
  return Number(rows[0]?.count ?? 0);
}

/** 生成候选编号：前缀 + 年月(4位) + 4位序号，如 KH26090001 */
export async function nextSeqNo(
  db: PostgresJsDatabase,
  table: PgTable,
  noColumn: Column,
  prefix: string,
): Promise<string> {
  const yearMonth: string = buildYearMonth();
  const existing: number = await countExistingSeq(
    db,
    table,
    noColumn,
    prefix,
    yearMonth,
  );
  return buildSeqNo(prefix, yearMonth, existing + 1);
}

/** 批量生成连续不重复的候选编号 */
export async function nextSeqNoRange(
  db: PostgresJsDatabase,
  table: PgTable,
  noColumn: Column,
  prefix: string,
  size: number,
): Promise<string[]> {
  const yearMonth: string = buildYearMonth();
  const existing: number = await countExistingSeq(
    db,
    table,
    noColumn,
    prefix,
    yearMonth,
  );
  const nos: string[] = [];
  for (let index: number = 0; index < size; index += 1) {
    nos.push(buildSeqNo(prefix, yearMonth, existing + 1 + index));
  }
  return nos;
}

/** 单条插入：编号冲突(23505)时序号 +1 重试，最多 5 次 */
export async function insertWithSeqNo(opts: {
  db: PostgresJsDatabase;
  table: PgTable;
  noColumn: Column;
  prefix: string;
  insert: (no: string) => Promise<{ id: string }[]>;
}): Promise<{ id: string; no: string }> {
  const yearMonth: string = buildYearMonth();
  let seq: number =
    (await countExistingSeq(
      opts.db,
      opts.table,
      opts.noColumn,
      opts.prefix,
      yearMonth,
    )) + 1;
  for (let attempt: number = 0; attempt < MAX_SEQ_RETRY; attempt += 1) {
    const no: string = buildSeqNo(opts.prefix, yearMonth, seq);
    try {
      const inserted: { id: string }[] = await opts.insert(no);
      if (inserted.length === 0) {
        throw new BadRequestException('创建失败');
      }
      return { id: inserted[0].id, no };
    } catch (error: unknown) {
      if (isUniqueViolation(error)) {
        if (attempt < MAX_SEQ_RETRY - 1) {
          seq += 1;
          continue;
        }
        throw new ConflictException('编号生成冲突，请重试');
      }
      throw error;
    }
  }
  throw new ConflictException('编号生成冲突，请重试');
}

/** 批量插入：预生成连续编号，冲突时重算起始序号重试，最多 5 次 */
export async function batchInsertWithSeqNo<V>(opts: {
  db: PostgresJsDatabase;
  table: PgTable;
  noColumn: Column;
  prefix: string;
  size: number;
  buildValues: (nos: string[]) => V[];
  insert: (values: V[]) => Promise<{ id: string }[]>;
}): Promise<number> {
  const yearMonth: string = buildYearMonth();
  let baseSeq: number =
    (await countExistingSeq(
      opts.db,
      opts.table,
      opts.noColumn,
      opts.prefix,
      yearMonth,
    )) + 1;
  for (let attempt: number = 0; attempt < MAX_SEQ_RETRY; attempt += 1) {
    const nos: string[] = [];
    for (let index: number = 0; index < opts.size; index += 1) {
      nos.push(buildSeqNo(opts.prefix, yearMonth, baseSeq + index));
    }
    try {
      const inserted: { id: string }[] = await opts.insert(
        opts.buildValues(nos),
      );
      return inserted.length;
    } catch (error: unknown) {
      if (isUniqueViolation(error)) {
        if (attempt < MAX_SEQ_RETRY - 1) {
          const existing: number = await countExistingSeq(
            opts.db,
            opts.table,
            opts.noColumn,
            opts.prefix,
            yearMonth,
          );
          baseSeq = Math.max(baseSeq + opts.size, existing + 1);
          continue;
        }
        throw new ConflictException('编号生成冲突，请重试');
      }
      throw error;
    }
  }
  throw new ConflictException('编号生成冲突，请重试');
}
