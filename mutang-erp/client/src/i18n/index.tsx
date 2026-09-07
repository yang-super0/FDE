import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import dayjs from 'dayjs';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { zhCN, type Messages } from './locales/zh-CN';
import { enUS } from './locales/en-US';

export type Locale = 'zh-CN' | 'en-US';

const STORAGE_KEY = 'app_lang';

const DATE_FORMAT: Record<Locale, string> = {
  'zh-CN': 'YYYY-MM-DD HH:mm:ss',
  'en-US': 'MM/DD/YYYY hh:mm A',
};

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string>) => string;
  tEnum: (value: string) => string;
  formatDate: (value: string | number | Date) => string;
  formatNumber: (value: number) => string;
  formatCurrency: (value: number) => string;
}

type StringDict = { [key: string]: string | StringDict };

const readStoredLocale = (): Locale => {
  try {
    const stored: string | null = localStorage.getItem(STORAGE_KEY);
    return stored === 'en-US' ? 'en-US' : 'zh-CN';
  } catch (error) {
    logger.error('读取本地语言设置失败', JSON.stringify(error));
    return 'zh-CN';
  }
};

const lookup = (dict: StringDict, key: string): string | undefined => {
  const segments: string[] = key.split('.');
  let current: string | StringDict | undefined = dict;
  for (const segment of segments) {
    if (typeof current !== 'object' || current === null) return undefined;
    current = current[segment];
  }
  return typeof current === 'string' ? current : undefined;
};

const interpolate = (
  text: string,
  params?: Record<string, string>,
): string => {
  if (!params) return text;
  let result: string = text;
  for (const [name, value] of Object.entries(params)) {
    result = result.split(`{${name}}`).join(value);
  }
  return result;
};

const I18nContext = createContext<I18nContextValue | null>(null);

interface I18nProviderProps {
  children: ReactNode;
}

const I18nProvider = ({ children }: I18nProviderProps) => {
  const [locale, setLocaleState] = useState<Locale>(readStoredLocale);

  const dict: Messages = locale === 'en-US' ? enUS : zhCN;
  const root: StringDict = dict;
  const enumsDict: StringDict = dict.enums;

  const setLocale = useCallback((next: Locale): void => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch (error) {
      logger.error('保存语言设置失败', JSON.stringify(error));
    }
    setLocaleState(next);
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string>): string =>
      interpolate(lookup(root, key) ?? key, params),
    [root],
  );

  const tEnum = useCallback(
    (value: string): string => {
      const hit: string | StringDict | undefined = enumsDict[value];
      return typeof hit === 'string' ? hit : value;
    },
    [enumsDict],
  );

  const formatDate = useCallback(
    (value: string | number | Date): string =>
      dayjs(value).format(DATE_FORMAT[locale]),
    [locale],
  );

  const formatNumber = useCallback(
    (value: number): string =>
      value.toLocaleString(locale === 'zh-CN' ? 'zh-CN' : 'en-US'),
    [locale],
  );

  const formatCurrency = useCallback(
    (value: number): string => `¥ ${formatNumber(value)}`,
    [formatNumber],
  );

  const value: I18nContextValue = useMemo(
    () => ({
      locale,
      setLocale,
      t,
      tEnum,
      formatDate,
      formatNumber,
      formatCurrency,
    }),
    [locale, setLocale, t, tEnum, formatDate, formatNumber, formatCurrency],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

const useI18n = (): I18nContextValue => {
  const context: I18nContextValue | null = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
};

export { I18nProvider, useI18n };
export type { I18nContextValue };
