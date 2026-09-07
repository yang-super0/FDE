import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import type { TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';

export interface ColumnSettingMeta {
  id: string;
  label: string;
}

export const COLUMN_SETTINGS_PREFIX = 'columnSettings:';

const getColumnId = <T,>(column: TableColumnsType<T>[number]): string => {
  if (column.key !== undefined && column.key !== null) return String(column.key);
  if (!('dataIndex' in column)) return '';
  const dataIndex: unknown = column.dataIndex;
  if (Array.isArray(dataIndex)) return String(dataIndex[0]);
  return dataIndex === undefined || dataIndex === null ? '' : String(dataIndex);
};

const extractColumnMeta = <T,>(columns: TableColumnsType<T>): ColumnSettingMeta[] => {
  const metas: ColumnSettingMeta[] = [];
  for (const column of columns) {
    if (!column) continue;
    const id = getColumnId(column);
    if (!id) continue;
    const label = typeof column.title === 'string' && column.title.trim() !== ''
      ? column.title
      : id;
    metas.push({ id, label });
  }
  return metas;
};

const readHiddenIds = (storageKey: string): string[] => {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
};

export const useColumnSettings = <T,>(
  columns: TableColumnsType<T>,
): {
  visibleColumns: TableColumnsType<T>;
  columnMetas: ColumnSettingMeta[];
  hiddenIds: string[];
  toggleColumn: (id: string, visible: boolean) => void;
  resetColumns: () => void;
  setAllColumns: (visible: boolean) => void;
} => {
  const { pathname } = useLocation();
  const storageKey = `${COLUMN_SETTINGS_PREFIX}${pathname}`;
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);

  useEffect(() => {
    setHiddenIds(readHiddenIds(storageKey));
  }, [storageKey]);

  const persist = useCallback((next: string[]): void => {
    setHiddenIds(next);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // localStorage 不可用时仅保留内存态
    }
  }, [storageKey]);

  const toggleColumn = useCallback((id: string, visible: boolean): void => {
    setHiddenIds((prev: string[]) => {
      const next = visible ? prev.filter((item: string) => item !== id) : [...prev, id];
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, [storageKey]);

  const resetColumns = useCallback((): void => persist([]), [persist]);

  const setAllColumns = useCallback((visible: boolean): void => {
    if (visible) {
      persist([]);
      return;
    }
    setHiddenIds((prev: string[]) => {
      const all = extractColumnMeta(columns).map((meta: ColumnSettingMeta) => meta.id);
      const next = all.length > 0 ? all : prev;
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, [columns, persist, storageKey]);

  const columnMetas = useMemo(
    () => extractColumnMeta(columns),
    [columns],
  );

  const visibleColumns = useMemo(
    () => columns.filter((column) => {
      if (!column) return false;
      const id = getColumnId(column);
      if (!id) return true;
      return !hiddenIds.includes(id);
    }),
    [columns, hiddenIds],
  );

  return {
    visibleColumns, columnMetas, hiddenIds, toggleColumn, resetColumns, setAllColumns,
  };
};
