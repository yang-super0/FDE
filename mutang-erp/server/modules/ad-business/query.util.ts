export interface UserContextRequest {
  userContext: { userId: string };
}

const DEFAULT_PAGE: number = 1;
const DEFAULT_PAGE_SIZE: number = 20;
const MAX_PAGE_SIZE: number = 100;

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

/** YYYY-MM-DD 本地日期字符串 */
export const formatYMD = (date: Date): string => {
  const month: string = String(date.getMonth() + 1).padStart(2, '0');
  const day: string = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};
