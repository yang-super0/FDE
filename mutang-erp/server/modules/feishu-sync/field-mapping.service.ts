import { Injectable } from '@nestjs/common';
import { getTableColumns, type Column } from 'drizzle-orm';
import type { SyncFieldMappingItem } from '@shared/api.interface';
import { SYNC_TABLE_MAP, type SyncFieldValues } from './sync-tables.constants';

const NUMBER_COLUMN_TYPES: ReadonlySet<string> = new Set([
  'PgNumeric',
  'PgInteger',
  'PgSerial',
  'PgBigInt53',
  'PgBigInt64',
  'PgSmallInt',
  'PgSmallSerial',
]);

const CHECKBOX_COLUMN_TYPES: ReadonlySet<string> = new Set(['PgBoolean']);

const DATE_COLUMN_TYPES: ReadonlySet<string> = new Set([
  'PgTimestamp',
  'PgTimestampString',
  'PgDate',
  'PgDateString',
]);

@Injectable()
export class FieldMappingService {
  /**
   * 读取 drizzle 表的列定义，生成默认字段映射。
   * 列类型映射：文本类/JSON/UUID/user_profile → text；
   * 数值类 → number；布尔 → checkbox；时间/日期类 → date。
   */
  getTableMapping(tableName: string): SyncFieldMappingItem[] {
    const entry = SYNC_TABLE_MAP.get(tableName);
    if (!entry) return [];
    const columns = getTableColumns(entry.table);
    return Object.keys(columns)
      .filter((key: string): boolean => key !== 'id')
      .map((key: string): SyncFieldMappingItem => {
        const column = columns[key];
        return {
          fieldName: key,
          fieldType: this.resolveFieldType(column as Column),
        };
      });
  }

  /**
   * 将一行业务数据转换为多维表格 fields 对象。
   * 首字段 `id` 恒为 String(row.id)；null/undefined 字段跳过。
   */
  convertRowToFields(
    tableName: string,
    mapping: SyncFieldMappingItem[],
    row: Record<string, unknown>,
  ): SyncFieldValues {
    const fields: SyncFieldValues = { id: String(row['id'] ?? '') };
    for (const item of mapping) {
      if (item.fieldName === 'id') continue;
      const raw: unknown = row[item.fieldName];
      if (raw === null || raw === undefined) continue;
      const value = this.convertValue(item.fieldType, raw);
      if (value !== null) {
        fields[item.fieldName] = value;
      }
    }
    return fields;
  }

  private resolveFieldType(column: Column): SyncFieldMappingItem['fieldType'] {
    const columnType: string = column.columnType;
    if (NUMBER_COLUMN_TYPES.has(columnType)) return 'number';
    if (CHECKBOX_COLUMN_TYPES.has(columnType)) return 'checkbox';
    if (DATE_COLUMN_TYPES.has(columnType)) return 'date';
    if (columnType === 'PgCustomColumn') {
      // 自定义列：customTimestamptz → date；user_profile/file_attachment → text
      const sqlType: string = column.getSQLType();
      return /^(timestamp|date)/u.test(sqlType) ? 'date' : 'text';
    }
    return 'text';
  }

  private convertValue(
    fieldType: SyncFieldMappingItem['fieldType'],
    raw: unknown,
  ): string | number | boolean | null {
    if (fieldType === 'date') {
      if (raw instanceof Date) return raw.getTime();
      if (typeof raw === 'string') return new Date(raw).getTime();
      if (typeof raw === 'number') return raw;
      return String(raw);
    }
    if (fieldType === 'number') {
      if (typeof raw === 'number') return raw;
      if (typeof raw === 'boolean') return Number(raw);
      const num: number = Number(raw);
      return Number.isNaN(num) ? String(raw) : num;
    }
    if (fieldType === 'checkbox') {
      if (typeof raw === 'boolean') return raw;
      return raw === true || raw === 1 || raw === '1' || raw === 'true';
    }
    // text：对象（jsonb 等）序列化，其余转字符串
    if (typeof raw === 'object') return JSON.stringify(raw);
    return String(raw);
  }
}
