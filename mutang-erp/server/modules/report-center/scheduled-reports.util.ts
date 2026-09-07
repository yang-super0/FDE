import type {
  ReportFilterCondition,
  ScheduledReportRecord,
} from '@shared/api.interface';
import { scheduledReports } from '@server/database/schema';

export const SCHEDULE_FREQUENCIES: string[] = [
  '每日',
  '每周',
  '每月',
  '每季度',
  '每年',
];
export const SCHEDULE_TARGET_TYPES: string[] = ['飞书群', '飞书用户', '邮件'];
export const SCHEDULE_FILE_FORMATS: string[] = ['Excel', 'PDF', '图片'];
export const SCHEDULE_STATUS_ENABLED: string = '启用';
export const SCHEDULE_STATUS_DISABLED: string = '停用';
export const SCHEDULE_MODULE: string = 'report-center-schedule';
export const SCHEDULE_RUN_MAX_ATTEMPTS: number = 3;
export const TEMPLATE_MODULE: string = 'report-center-template';

const BEIJING_OFFSET_MS: number = 8 * 60 * 60 * 1000;
const SCHEDULE_TIME_PATTERN: RegExp = /^\d{2}:\d{2}$/u;

export type ScheduleRow = typeof scheduledReports.$inferSelect;

export function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter(
      (item: unknown): item is string => typeof item === 'string',
    );
  }
  if (typeof value === 'string' && value.length > 0) {
    try {
      const parsed: unknown = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (item: unknown): item is string => typeof item === 'string',
        );
      }
    } catch {
      return [];
    }
  }
  return [];
}

export function toFilterArray(value: unknown): ReportFilterCondition[] {
  const source: unknown[] = Array.isArray(value)
    ? value
    : typeof value === 'string' && value.length > 0
      ? safeParseArray(value)
      : [];
  return source.filter(
    (item: unknown): item is ReportFilterCondition => {
      if (item === null || typeof item !== 'object') return false;
      const record: Record<string, unknown> = item as Record<string, unknown>;
      return (
        typeof record.field === 'string' &&
        typeof record.op === 'string' &&
        typeof record.value === 'string'
      );
    },
  );
}

function safeParseArray(raw: string): unknown[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function truncateText(value: string, maxLength: number): string {
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}

export function isValidScheduleTime(value: string): boolean {
  return SCHEDULE_TIME_PATTERN.test(value);
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

export function mapScheduleRow(row: ScheduleRow): ScheduledReportRecord {
  return {
    id: row.id,
    scheduleNo: row.scheduleNo,
    scheduleName: row.scheduleName,
    reportId: row.reportId,
    reportTemplateId: row.reportTemplateId,
    frequency: row.frequency,
    scheduleTime: row.scheduleTime,
    dayOfWeek: row.dayOfWeek,
    dayOfMonth: row.dayOfMonth,
    targetType: row.targetType,
    targetId: row.targetId,
    targetName: row.targetName,
    fileFormat: row.fileFormat,
    includeChart: row.includeChart,
    status: row.status,
    lastRunAt: row.lastRunAt ? row.lastRunAt.toISOString() : null,
    lastRunStatus: row.lastRunStatus,
    lastRunError: row.lastRunError,
    nextRunAt: row.nextRunAt ? row.nextRunAt.toISOString() : null,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    remark: row.remark,
  };
}

export function computeNextRunAt(
  now: Date,
  frequency: string,
  scheduleTime: string,
  dayOfWeek?: number | null,
  dayOfMonth?: number | null,
): Date {
  const beijing: Date = new Date(now.getTime() + BEIJING_OFFSET_MS);
  const year: number = beijing.getUTCFullYear();
  const month: number = beijing.getUTCMonth();
  const day: number = beijing.getUTCDate();
  const parts: string[] = scheduleTime.split(':');
  const hours: number = Number(parts[0]);
  const minutes: number = Number(parts[1]);

  const toDate = (y: number, m: number, d: number): Date =>
    new Date(Date.UTC(y, m, d, hours, minutes) - BEIJING_OFFSET_MS);
  const thisMonth = (d: number): Date => toDate(year, month, d);

  if (frequency === '每日') {
    let candidate: Date = thisMonth(day);
    if (candidate.getTime() <= now.getTime()) {
      const nextDay: Date = new Date(beijing.getTime() + 24 * 60 * 60 * 1000);
      candidate = toDate(
        nextDay.getUTCFullYear(),
        nextDay.getUTCMonth(),
        nextDay.getUTCDate(),
      );
    }
    return candidate;
  }

  if (frequency === '每周') {
    const currentDow: number =
      beijing.getUTCDay() === 0 ? 7 : beijing.getUTCDay();
    const targetDow: number = dayOfWeek ?? 1;
    const delta: number = (targetDow - currentDow + 7) % 7;
    let candidate: Date = thisMonth(day + delta);
    if (candidate.getTime() <= now.getTime()) {
      candidate = new Date(candidate.getTime() + 7 * 24 * 60 * 60 * 1000);
    }
    return candidate;
  }

  if (frequency === '每月') {
    const targetDom: number = dayOfMonth ?? 1;
    let candidate: Date = thisMonth(
      Math.min(targetDom, lastDayOfMonth(year, month)),
    );
    if (candidate.getTime() <= now.getTime()) {
      const nextYear: number = month === 11 ? year + 1 : year;
      const nextMonth: number = month === 11 ? 0 : month + 1;
      candidate = toDate(
        nextYear,
        nextMonth,
        Math.min(targetDom, lastDayOfMonth(nextYear, nextMonth)),
      );
    }
    return candidate;
  }

  if (frequency === '每季度') {
    const quarterFirstMonth: number = Math.floor(month / 3) * 3;
    let nextYear: number = year;
    let nextMonth: number = quarterFirstMonth + 3;
    if (nextMonth > 11) {
      nextMonth = 0;
      nextYear = year + 1;
    }
    return toDate(nextYear, nextMonth, 1);
  }

  return toDate(year + 1, 0, 1);
}
