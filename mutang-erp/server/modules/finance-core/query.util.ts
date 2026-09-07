import { BadRequestException } from '@nestjs/common';

export interface UserContextRequest {
  userContext: { userId: string };
}

const DEFAULT_PAGE: number = 1;
const DEFAULT_PAGE_SIZE: number = 20;
const MAX_PAGE_SIZE: number = 50;
export const MAX_BATCH_ITEMS: number = 500;

export const parsePage = (value?: string): number => {
  const parsed: number = value ? parseInt(value, 10) : DEFAULT_PAGE;
  return Number.isNaN(parsed) || parsed < 1 ? DEFAULT_PAGE : parsed;
};

export const parsePageSize = (value?: string): number => {
  const parsed: number = value ? parseInt(value, 10) : DEFAULT_PAGE_SIZE;
  if (Number.isNaN(parsed) || parsed < 1) {
    return DEFAULT_PAGE_SIZE;
  }
  return Math.min(parsed, MAX_PAGE_SIZE);
};

/** @Param 取到的 id 为 string，转 number 并校验（bigint mode number） */
export const parseIdParam = (value: string): number => {
  const parsed: number = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new BadRequestException('无效的记录 ID');
  }
  return parsed;
};

/** 批量 ID 校验：非空数组、上限 500、每个元素为正整数 */
export const parseIdList = (ids: unknown): number[] => {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new BadRequestException('请提供要处理的记录');
  }
  if (ids.length > MAX_BATCH_ITEMS) {
    throw new BadRequestException(
      `单次批量最多 ${String(MAX_BATCH_ITEMS)} 条`,
    );
  }
  return ids.map((item: unknown): number => {
    const parsed: number = Number(item);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new BadRequestException('记录 ID 无效');
    }
    return parsed;
  });
};

/** 金额校验：NaN / <= 0 一律 400 */
export const parseAmountParam = (
  value: unknown,
  fieldName: string = '金额',
): number => {
  const parsed: number = Number(value);
  if (Number.isNaN(parsed) || parsed <= 0) {
    throw new BadRequestException(`${fieldName}必须大于 0`);
  }
  return parsed;
};

export const round2 = (value: number): number =>
  Math.round(value * 100) / 100;

const DATE_PATTERN: RegExp = /^\d{4}-\d{2}-\d{2}$/u;

/** 解析 'YYYY-MM-DD' 日期字符串，非法格式 400 */
export const parseDateParam = (value: string): Date => {
  if (!DATE_PATTERN.test(value)) {
    throw new BadRequestException(`日期格式应为 YYYY-MM-DD: ${value}`);
  }
  const parsed: Date = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException(`无效日期: ${value}`);
  }
  return parsed;
};

export const addDays = (date: Date, days: number): Date =>
  new Date(date.getTime() + days * 86400000);

export interface TimeRange {
  start: Date;
  end: Date;
}

/**
 * 时间范围解析（半开区间 [start, end)）：
 * preset: month=本月 / lastMonth=上月 / quarter=本季度 / year=本年；
 * 或显式 startDate/endDate（'YYYY-MM-DD'，endDate 取次日作为开区间上界）；
 * 无参数默认本年。
 */
export const resolveTimeRange = (params: {
  preset?: string;
  startDate?: string;
  endDate?: string;
}): TimeRange => {
  if (params.startDate || params.endDate) {
    if (!params.startDate || !params.endDate) {
      throw new BadRequestException('请同时提供开始日期与结束日期');
    }
    const start: Date = parseDateParam(params.startDate);
    const end: Date = addDays(parseDateParam(params.endDate), 1);
    return { start, end };
  }

  const now: Date = new Date();
  const year: number = now.getFullYear();
  const month: number = now.getMonth();
  switch (params.preset) {
    case 'month':
      return {
        start: new Date(year, month, 1),
        end: new Date(year, month + 1, 1),
      };
    case 'lastMonth':
      return {
        start: new Date(year, month - 1, 1),
        end: new Date(year, month, 1),
      };
    case 'quarter': {
      const quarterStartMonth: number = Math.floor(month / 3) * 3;
      return {
        start: new Date(year, quarterStartMonth, 1),
        end: new Date(year, quarterStartMonth + 3, 1),
      };
    }
    default:
      return {
        start: new Date(year, 0, 1),
        end: new Date(year + 1, 0, 1),
      };
  }
};
