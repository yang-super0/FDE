export const SHANGHAI_OFFSET_MS: number = 8 * 60 * 60 * 1000;

const pad = (value: number): string => String(value).padStart(2, '0');

/** 当前上海时区时间（以 UTC 方法访问） */
export const nowInShanghai = (): Date => new Date(Date.now() + SHANGHAI_OFFSET_MS);

/** Date -> YYYY-MM-DD（按上海时区语义，入参为 nowInShanghai 产物） */
export const toDateString = (d: Date): string =>
  `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

/** 上海时区今天的 YYYY-MM-DD */
export const todayString = (): string => toDateString(nowInShanghai());

export interface DateRange {
  start: string;
  end: string;
}

const shiftDays = (base: string, days: number): string => {
  const [y, m, d] = base.split('-').map((part: string): number => Number(part));
  return toDateString(new Date(Date.UTC(y, m - 1, d + days)));
};

const firstOfMonth = (year: number, month: number): string =>
  `${year}-${pad(month)}-01`;

const nextMonth = (year: number, month: number): string => {
  const nextYear: number = month === 12 ? year + 1 : year;
  const nextMonthNum: number = month === 12 ? 1 : month + 1;
  return firstOfMonth(nextYear, nextMonthNum);
};

/** 今日/本周(周一起)/本月/本年 的半开区间 [start, end) */
export const buildTimeRange = (
  timeRange: '今日' | '本周' | '本月' | '本年',
): DateRange => {
  const today: string = todayString();
  const [y, m, d] = today.split('-').map((part: string): number => Number(part));
  if (timeRange === '今日') {
    return { start: today, end: shiftDays(today, 1) };
  }
  if (timeRange === '本周') {
    const weekday: number = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    const mondayOffset: number = (weekday + 6) % 7;
    const monday: string = shiftDays(today, -mondayOffset);
    return { start: monday, end: shiftDays(monday, 7) };
  }
  if (timeRange === '本月') {
    return { start: firstOfMonth(y, m), end: nextMonth(y, m) };
  }
  return { start: `${y}-01-01`, end: `${y + 1}-01-01` };
};

/** 与给定区间等长且紧邻其前的区间 */
export const previousRange = (range: DateRange): DateRange => {
  const startTime: number = Date.parse(`${range.start}T00:00:00Z`);
  const endTime: number = Date.parse(`${range.end}T00:00:00Z`);
  const lengthMs: number = endTime - startTime;
  const prevStart: Date = new Date(startTime - lengthMs);
  return {
    start: toDateString(prevStart),
    end: range.start,
  };
};

/** 目标统计区间：月度为当月，年度为当年 */
export const targetRange = (
  targetType: string,
  year: number,
  month: number,
): DateRange =>
  targetType === '年度'
    ? { start: `${year}-01-01`, end: `${year + 1}-01-01` }
    : { start: firstOfMonth(year, month), end: nextMonth(year, month) };
