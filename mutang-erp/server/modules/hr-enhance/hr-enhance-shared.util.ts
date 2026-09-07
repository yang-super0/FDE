import { BadRequestException } from '@nestjs/common';

export const HR_PAGE_SIZE_MAX: number = 100;

export interface HrPagination {
  page: number;
  pageSize: number;
  offset: number;
}

export function resolveHrPagination(
  page?: string,
  pageSize?: string,
): HrPagination {
  const parsedPage: number = Math.max(1, Number(page ?? 1) || 1);
  const parsedSize: number = Math.min(
    HR_PAGE_SIZE_MAX,
    Math.max(1, Number(pageSize ?? 10) || 10),
  );
  return {
    page: parsedPage,
    pageSize: parsedSize,
    offset: (parsedPage - 1) * parsedSize,
  };
}

/** 必填校验：undefined / null / 空白字符串 → 400 */
export function assertHrRequired(value: unknown, label: string): void {
  if (value === undefined || value === null || String(value).trim() === '') {
    throw new BadRequestException(`${label}不能为空`);
  }
}

/** 数值区间校验（含边界），返回解析后的数字；非法 → 400 */
export function assertHrNumberInRange(
  value: unknown,
  label: string,
  min: number,
  max: number,
): number {
  const num: number = Number(value);
  if (!Number.isFinite(num) || num < min || num > max) {
    throw new BadRequestException(`${label}必须在${min}-${max}之间`);
  }
  return num;
}

/** 正数校验（金额/时长），非正数 → 400 */
export function assertHrPositiveNumber(value: unknown, label: string): number {
  const num: number = Number(value);
  if (!Number.isFinite(num) || num <= 0) {
    throw new BadRequestException(`${label}必须大于0`);
  }
  return num;
}

/** 非负数校验（可为 0 的金额字段），负数 → 400 */
export function assertHrNonNegativeNumber(
  value: unknown,
  label: string,
): number {
  const num: number = Number(value);
  if (!Number.isFinite(num) || num < 0) {
    throw new BadRequestException(`${label}不能为负数`);
  }
  return num;
}
