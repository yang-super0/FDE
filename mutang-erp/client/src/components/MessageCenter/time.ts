import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

/** 相对时间，如「5 分钟前」 */
export function formatRelativeTime(value: string | null): string {
  if (!value) return '-';
  const time = dayjs(value);
  if (!time.isValid()) return '-';
  return time.fromNow();
}

/** 绝对时间，如 2026-09-03 14:20 */
export function formatDateTime(value: string | null): string {
  if (!value) return '-';
  const time = dayjs(value);
  if (!time.isValid()) return '-';
  return time.format('YYYY-MM-DD HH:mm');
}
