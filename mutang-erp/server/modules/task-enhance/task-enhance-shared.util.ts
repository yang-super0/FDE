import { BadRequestException } from '@nestjs/common';

export const TASK_ENHANCE_PAGE_SIZE_MAX: number = 100;
export const TASK_ENHANCE_PAGE_SIZE_DEFAULT: number = 10;
const TASK_ENHANCE_DAY_MS: number = 86400000;
const TASK_ENHANCE_DATE_PATTERN: RegExp = /^\d{4}-\d{2}-\d{2}$/u;

export interface TaskEnhancePagination {
  page: number;
  pageSize: number;
  offset: number;
}

export interface TaskEnhanceUserContextRequest {
  userContext?: { userId?: string };
}

export function resolveTaskEnhanceUserId(
  req: TaskEnhanceUserContextRequest,
): string {
  return req.userContext?.userId ?? '';
}

/** 分页参数解析：page 默认 1，pageSize 默认 10，上限 100，非法值回退默认 */
export function resolveTaskEnhancePagination(
  page?: string,
  pageSize?: string,
): TaskEnhancePagination {
  const parsedPage: number = Math.max(
    1,
    parseInt(page ?? '1', 10) || 1,
  );
  const parsedSizeRaw: number =
    parseInt(pageSize ?? '10', 10) || TASK_ENHANCE_PAGE_SIZE_DEFAULT;
  const parsedSize: number = Math.min(
    Math.max(1, parsedSizeRaw),
    TASK_ENHANCE_PAGE_SIZE_MAX,
  );
  return {
    page: parsedPage,
    pageSize: parsedSize,
    offset: (parsedPage - 1) * parsedSize,
  };
}

/** 排序方向归一化：仅接受 asc，其余（含缺省）一律 desc */
export function resolveTaskEnhanceSortOrder(
  sortOrder?: string,
): 'asc' | 'desc' {
  return sortOrder === 'asc' ? 'asc' : 'desc';
}

/** 排序字段白名单解析：不在映射内返回 undefined，由调用方回退默认列 */
export function resolveTaskEnhanceSortColumn<T extends Record<string, unknown>>(
  sortBy: string | undefined,
  columnMap: T,
): T[keyof T] | undefined {
  if (!sortBy) return undefined;
  return (columnMap as Record<string, T[keyof T]>)[sortBy];
}

/** timestamptz 出口统一 ISO 字符串 */
export function toIsoOrNull(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

/** 必填校验：undefined / null / 空白字符串 → 400，返回 trim 后的值 */
export function assertTaskEnhanceRequired(
  value: unknown,
  label: string,
): string {
  if (value === undefined || value === null || String(value).trim() === '') {
    throw new BadRequestException(`${label}不能为空`);
  }
  return String(value).trim();
}

/** 枚举校验：不在允许列表 → 400 */
export function assertTaskEnhanceEnum(
  value: unknown,
  allowed: string[],
  label: string,
): string {
  if (typeof value !== 'string' || !allowed.includes(value)) {
    throw new BadRequestException(`${label}必须为以下之一：${allowed.join('/')}`);
  }
  return value;
}

/** 非负整数校验：负数 / 非整数 → 400 */
export function assertTaskEnhanceNonNegativeInt(
  value: unknown,
  label: string,
): number {
  const num: number = Number(value);
  if (!Number.isInteger(num) || num < 0) {
    throw new BadRequestException(`${label}必须为非负整数`);
  }
  return num;
}

/** 'YYYY-MM-DD' 日期字符串校验 */
export function assertTaskEnhanceDateString(
  value: unknown,
  label: string,
): string {
  if (
    typeof value !== 'string' ||
    !TASK_ENHANCE_DATE_PATTERN.test(value) ||
    Number.isNaN(new Date(value).getTime())
  ) {
    throw new BadRequestException(`${label}格式应为 YYYY-MM-DD`);
  }
  return value;
}

export interface TaskEnhanceDateRange {
  from: Date | null;
  to: Date | null;
}

/** dateFrom/dateTo → [from, to) 半开区间（dateTo 含当天，上界取次日） */
export function resolveTaskEnhanceDateRange(
  dateFrom?: string,
  dateTo?: string,
): TaskEnhanceDateRange {
  const from: Date | null = dateFrom
    ? new Date(assertTaskEnhanceDateString(dateFrom, '开始日期'))
    : null;
  let to: Date | null = null;
  if (dateTo) {
    const endDay: Date = new Date(assertTaskEnhanceDateString(dateTo, '结束日期'));
    to = new Date(endDay.getTime() + TASK_ENHANCE_DAY_MS);
  }
  return { from, to };
}

/** 业务时区（Asia/Shanghai）当天日期，YYYY-MM-DD */
export function taskEnhanceToday(): string {
  return new Date(Date.now() + 8 * 3600 * 1000)
    .toISOString()
    .slice(0, 10);
}

/** jsonb 列读出值 → string[]（非数组返回 null） */
export function castTaskEnhanceStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const result: string[] = [];
  for (const item of value) {
    if (typeof item === 'string') result.push(item);
  }
  return result;
}

/** jsonb 列读出值 → Record<string, string>（非对象返回 null） */
export function castTaskEnhanceRecord(
  value: unknown,
): Record<string, string> | null {
  if (
    value === null ||
    value === undefined ||
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    return null;
  }
  const result: Record<string, string> = {};
  const entries: [string, unknown][] = Object.entries(
    value as Record<string, unknown>,
  );
  for (const [key, item] of entries) {
    if (typeof item === 'string') result[key] = item;
  }
  return result;
}
