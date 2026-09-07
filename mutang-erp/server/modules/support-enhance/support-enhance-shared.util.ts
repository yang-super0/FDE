import { BadRequestException } from '@nestjs/common';

export const SUPPORT_ENHANCE_PAGE_SIZE_MAX: number = 100;
export const SUPPORT_ENHANCE_PAGE_SIZE_DEFAULT: number = 10;
const SUPPORT_ENHANCE_DATE_PATTERN: RegExp = /^\d{4}-\d{2}-\d{2}$/u;

export interface SupportEnhancePagination {
  page: number;
  pageSize: number;
  offset: number;
}

export interface SupportEnhanceUserContextRequest {
  userContext?: { userId?: string; userName?: string };
}

export function resolveSupportEnhanceUserId(
  req: SupportEnhanceUserContextRequest,
): string {
  return req.userContext?.userId ?? '';
}

export function resolveSupportEnhanceUsername(
  req: SupportEnhanceUserContextRequest,
): string {
  return req.userContext?.userName ?? '未知用户';
}

/** 分页参数解析：page 默认 1，pageSize 默认 10，上限 100，非法值回退默认 */
export function resolveSupportEnhancePagination(
  page?: string,
  pageSize?: string,
): SupportEnhancePagination {
  const parsedPage: number = Math.max(1, parseInt(page ?? '1', 10) || 1);
  const parsedSizeRaw: number =
    parseInt(pageSize ?? '10', 10) || SUPPORT_ENHANCE_PAGE_SIZE_DEFAULT;
  const parsedSize: number = Math.min(
    Math.max(1, parsedSizeRaw),
    SUPPORT_ENHANCE_PAGE_SIZE_MAX,
  );
  return {
    page: parsedPage,
    pageSize: parsedSize,
    offset: (parsedPage - 1) * parsedSize,
  };
}

/** 排序方向归一化：仅接受 asc，其余（含缺省）一律 desc */
export function resolveSupportEnhanceSortOrder(
  sortOrder?: string,
): 'asc' | 'desc' {
  return sortOrder === 'asc' ? 'asc' : 'desc';
}

/** 排序字段白名单解析：不在映射内返回 undefined，由调用方回退默认列 */
export function resolveSupportEnhanceSortColumn<
  T extends Record<string, unknown>,
>(sortBy: string | undefined, columnMap: T): T[keyof T] | undefined {
  if (!sortBy) return undefined;
  return (columnMap as Record<string, T[keyof T]>)[sortBy];
}

/** 日期字符串校验：YYYY-MM-DD，非法抛 400 */
export function assertSupportEnhanceDate(
  value: string | undefined,
  field: string,
): string {
  if (!value || !SUPPORT_ENHANCE_DATE_PATTERN.test(value)) {
    throw new BadRequestException(`${field} 必须为 YYYY-MM-DD 格式`);
  }
  return value;
}

/** 数值列读取：numeric 在 driver 侧返回 string，统一转 number */
export function toSupportEnhanceNumber(
  value: string | number | null | undefined,
): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const num: number = Number(value);
  return Number.isFinite(num) ? num : null;
}

/** 时间列输出：timestamptz 为 Date，出口统一 ISO 字符串 */
export function toSupportEnhanceIso(
  value: Date | string | null | undefined,
): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  return value === null || value === undefined ? '' : String(value);
}
