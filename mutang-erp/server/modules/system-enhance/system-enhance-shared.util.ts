import { BadRequestException } from '@nestjs/common';

export const SYSTEM_ENHANCE_PAGE_SIZE_MAX: number = 100;
export const SYSTEM_ENHANCE_PAGE_SIZE_DEFAULT: number = 10;
const SYSTEM_ENHANCE_DATE_PATTERN: RegExp = /^\d{4}-\d{2}-\d{2}$/u;

export interface SystemEnhancePagination {
  page: number;
  pageSize: number;
  offset: number;
}

export interface SystemEnhanceUserContextRequest {
  userContext?: { userId?: string; userName?: string };
}

export function resolveSystemEnhanceUserId(
  req: SystemEnhanceUserContextRequest,
): string {
  return req.userContext?.userId ?? '';
}

export function resolveSystemEnhanceUsername(
  req: SystemEnhanceUserContextRequest,
): string {
  return req.userContext?.userName ?? '未知用户';
}

/** 分页参数解析：page 默认 1，pageSize 默认 10，上限 100，非法值回退默认 */
export function resolveSystemEnhancePagination(
  page?: string,
  pageSize?: string,
): SystemEnhancePagination {
  const parsedPage: number = Math.max(1, parseInt(page ?? '1', 10) || 1);
  const parsedSizeRaw: number =
    parseInt(pageSize ?? '10', 10) || SYSTEM_ENHANCE_PAGE_SIZE_DEFAULT;
  const parsedSize: number = Math.min(
    Math.max(1, parsedSizeRaw),
    SYSTEM_ENHANCE_PAGE_SIZE_MAX,
  );
  return {
    page: parsedPage,
    pageSize: parsedSize,
    offset: (parsedPage - 1) * parsedSize,
  };
}

/** 排序方向归一化：仅接受 asc，其余（含缺省）一律 desc */
export function resolveSystemEnhanceSortOrder(
  sortOrder?: string,
): 'asc' | 'desc' {
  return sortOrder === 'asc' ? 'asc' : 'desc';
}

/** 排序字段白名单解析：不在映射内返回 undefined，由调用方回退默认列 */
export function resolveSystemEnhanceSortColumn<
  T extends Record<string, unknown>,
>(sortBy: string | undefined, columnMap: T): T[keyof T] | undefined {
  if (!sortBy) return undefined;
  return (columnMap as Record<string, T[keyof T]>)[sortBy];
}

/** timestamptz 出口统一 ISO 字符串 */
export function toSystemEnhanceIsoOrNull(
  value: Date | null | undefined,
): string | null {
  return value ? value.toISOString() : null;
}

/** 必填校验：undefined / null / 空白字符串 → 400，返回 trim 后的值 */
export function assertSystemEnhanceRequired(
  value: unknown,
  label: string,
): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new BadRequestException(`${label}不能为空`);
  }
  return value.trim();
}

/** 枚举校验：不在白名单 → 400 */
export function assertSystemEnhanceEnum(
  value: unknown,
  allowed: readonly string[],
  label: string,
): string {
  const v: string = String(value ?? '');
  if (!allowed.includes(v)) {
    throw new BadRequestException(`${label}非法，允许值：${allowed.join('/')}`);
  }
  return v;
}

/** 日期校验：YYYY-MM-DD → 400 */
export function assertSystemEnhanceDate(
  value: unknown,
  label: string,
): string {
  const v: string = String(value ?? '');
  if (!SYSTEM_ENHANCE_DATE_PATTERN.test(v)) {
    throw new BadRequestException(`${label}格式必须为 YYYY-MM-DD`);
  }
  return v;
}

/** JSONB 出口统一解析：字符串 → 解析对象，null/undefined → null */
export function parseSystemEnhanceJson(
  value: unknown,
): Record<string, unknown> | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value);
      if (parsed && typeof parsed === 'object') {
        return parsed as Record<string, unknown>;
      }
      return null;
    } catch {
      return null;
    }
  }
  if (typeof value === 'object') return value as Record<string, unknown>;
  return null;
}
