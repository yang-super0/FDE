import { sql, type SQL } from 'drizzle-orm';
import type { PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import type {
  ReportFilterCondition,
  ReportRunResult,
  ReportRunRow,
} from '@shared/api.interface';

/** 报表中心支持的维度 */
export const REPORT_DIMENSIONS: readonly string[] = [
  '时间',
  '部门',
  '客户',
  '端口',
  '行业',
];

/** 报表中心支持的指标 */
export const REPORT_METRICS: readonly string[] = [
  '消耗',
  '收入',
  '成本',
  '支出',
  '利润',
];

/** 维度在指定数据源不存在时的占位值 */
const ALL_DIM_VALUE = '全部';
const SHANGHAI_OFFSET_MS: number = 8 * 60 * 60 * 1000;
const ISO_DATE_PATTERN: RegExp = /^\d{4}-\d{2}-\d{2}$/u;

export interface ReportDateRange {
  /** YYYY-MM-DD（含） */
  rangeStart: string;
  /** YYYY-MM-DD（不含，边界日） */
  rangeEnd: string;
}

interface MetricSource {
  metric: string;
  targetTable: string;
  targetLabel: string;
  fromClause: string;
  amountExpr: string;
  dateExpr: string;
  dateIsTimestamptz: boolean;
  dimExpr: Record<string, string>;
  dimWhere: Record<string, (value: string) => SQL>;
}

/** 对外暴露的数据源信息（供下钻服务复用维度/日期条件映射） */
export interface MetricSourceInfo {
  metric: string;
  targetTable: string;
  targetLabel: string;
  fromClause: string;
  dateExpr: string;
  hasDimension: (dimension: string) => boolean;
  dimensionWhere: (dimension: string, value: string) => SQL | undefined;
  rangeWhere: (range: ReportDateRange) => SQL;
}

const timeDimExpr = (dateExpr: string, isTimestamptz: boolean): string =>
  isTimestamptz
    ? `to_char((${dateExpr} AT TIME ZONE 'Asia/Shanghai')::date, 'YYYY-MM-DD')`
    : `to_char(date_trunc('day', ${dateExpr}), 'YYYY-MM-DD')`;

const rangeWhereOf = (source: MetricSource): ((range: ReportDateRange) => SQL) => {
  return (range: ReportDateRange): SQL => {
    if (source.dateIsTimestamptz) {
      const startIso: string = `${range.rangeStart}T00:00:00+08:00`;
      const endIso: string = `${range.rangeEnd}T00:00:00+08:00`;
      return sql`${sql.raw(source.dateExpr)} >= ${startIso}::timestamptz AND ${sql.raw(
        source.dateExpr,
      )} < ${endIso}::timestamptz`;
    }
    return sql`${sql.raw(source.dateExpr)} >= ${range.rangeStart}::date AND ${sql.raw(
      source.dateExpr,
    )} < ${range.rangeEnd}::date`;
  };
};

/**
 * 指标数据源映射（物理表、金额列、日期列、维度列）。
 * 注意：finance_expenses 表无部门列（见 schema.ts），支出源的部门维度视为"全部"。
 */
const METRIC_SOURCES: Record<string, MetricSource> = {
  消耗: {
    metric: '消耗',
    targetTable: 'finance_consumptions',
    targetLabel: '广告消耗明细',
    fromClause:
      'finance_consumptions t LEFT JOIN finance_ports p ON t.port_id = p.id ' +
      'LEFT JOIN customer cu ON t.customer_id = cu.id::text',
    amountExpr: 't.amount',
    dateExpr: 't.consumption_date',
    dateIsTimestamptz: false,
    dimExpr: {
      时间: timeDimExpr('t.consumption_date', false),
      客户: 't.customer_id',
      端口: 'p.port_name',
      行业: 'cu.industry',
    },
    dimWhere: {
      时间: (value: string) => sql`t.consumption_date = ${value}::date`,
      客户: (value: string) => sql`t.customer_id = ${value}`,
      端口: (value: string) => sql`p.port_name = ${value}`,
      行业: (value: string) => sql`cu.industry = ${value}`,
    },
  },
  收入: {
    metric: '收入',
    targetTable: 'finance_incomes',
    targetLabel: '收入明细',
    fromClause: 'finance_incomes t LEFT JOIN customer cu ON t.customer_name = cu.name',
    amountExpr: 't.amount',
    dateExpr: 't.income_date',
    dateIsTimestamptz: false,
    dimExpr: {
      时间: timeDimExpr('t.income_date', false),
      客户: 't.customer_name',
      行业: 'cu.industry',
    },
    dimWhere: {
      时间: (value: string) => sql`t.income_date = ${value}::date`,
      客户: (value: string) => sql`t.customer_name = ${value}`,
      行业: (value: string) => sql`cu.industry = ${value}`,
    },
  },
  成本: {
    metric: '成本',
    targetTable: 'finance_costs',
    targetLabel: '成本明细',
    fromClause: 'finance_costs t',
    amountExpr: 't.amount',
    dateExpr: 't.cost_date',
    dateIsTimestamptz: true,
    dimExpr: {
      时间: timeDimExpr('t.cost_date', true),
      客户: 't.related_customer',
    },
    dimWhere: {
      时间: (value: string) =>
        sql`(t.cost_date AT TIME ZONE 'Asia/Shanghai')::date = ${value}::date`,
      客户: (value: string) => sql`t.related_customer = ${value}`,
    },
  },
  支出: {
    metric: '支出',
    targetTable: 'finance_expenses',
    targetLabel: '支出明细',
    fromClause: 'finance_expenses t',
    amountExpr: 't.amount',
    dateExpr: 't.apply_date',
    dateIsTimestamptz: false,
    dimExpr: {
      时间: timeDimExpr('t.apply_date', false),
    },
    dimWhere: {
      时间: (value: string) => sql`t.apply_date = ${value}::date`,
    },
  },
};

/** 获取指标数据源信息（消耗/收入/成本/支出），下钻与引擎共用维度映射 */
export function getMetricSource(metric: string): MetricSourceInfo | undefined {
  const source: MetricSource | undefined = METRIC_SOURCES[metric];
  if (!source) return undefined;
  return {
    metric: source.metric,
    targetTable: source.targetTable,
    targetLabel: source.targetLabel,
    fromClause: source.fromClause,
    dateExpr: source.dateExpr,
    hasDimension: (dimension: string): boolean =>
      Object.prototype.hasOwnProperty.call(source.dimWhere, dimension),
    dimensionWhere: (dimension: string, value: string): SQL | undefined => {
      const builder = source.dimWhere[dimension];
      return builder ? builder(value) : undefined;
    },
    rangeWhere: rangeWhereOf(source),
  };
}

/** 按物理表反查指标（下钻 targetTable → 指标） */
export function findMetricByTable(targetTable: string): string | undefined {
  const keys: string[] = Object.keys(METRIC_SOURCES);
  return keys.find(
    (metric: string): boolean =>
      METRIC_SOURCES[metric].targetTable === targetTable,
  );
}

// ---------------------------------------------------------------------------
// 业务时区（Asia/Shanghai）时间范围解析
// ---------------------------------------------------------------------------

interface WallParts {
  year: number;
  month: number;
  day: number;
}

function shanghaiWall(now: Date): WallParts {
  const shifted: Date = new Date(now.getTime() + SHANGHAI_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

function isoDate(year: number, month: number, day: number): string {
  const monthText: string = String(month).padStart(2, '0');
  const dayText: string = String(day).padStart(2, '0');
  return `${year}-${monthText}-${dayText}`;
}

function addDaysIso(iso: string, days: number): string {
  const parts: string[] = iso.split('-');
  const base: number = Date.UTC(
    Number(parts[0]),
    Number(parts[1]) - 1,
    Number(parts[2]),
  );
  const shifted: Date = new Date(base + days * 24 * 60 * 60 * 1000);
  return isoDate(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth() + 1,
    shifted.getUTCDate(),
  );
}

/** 解析时间范围为 [rangeStart, rangeEnd) 半开区间（业务时区 Asia/Shanghai） */
export function resolveDateRange(
  timeRange: string | undefined | null,
  customStartDate?: string | null,
  customEndDate?: string | null,
): ReportDateRange {
  const { year, month, day } = shanghaiWall(new Date());
  const today: string = isoDate(year, month, day);
  const monthStart: string = isoDate(year, month, 1);
  const monthEnd: string =
    month === 12 ? isoDate(year + 1, 1, 1) : isoDate(year, month + 1, 1);

  switch (timeRange) {
    case '今日':
      return { rangeStart: today, rangeEnd: addDaysIso(today, 1) };
    case '本周': {
      const dow: number = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
      const mondayOffset: number = dow === 0 ? -6 : 1 - dow;
      const monday: string = addDaysIso(today, mondayOffset);
      return { rangeStart: monday, rangeEnd: addDaysIso(monday, 7) };
    }
    case '本季': {
      const quarterMonth: number = Math.floor((month - 1) / 3) * 3 + 1;
      const endMonth: number = quarterMonth + 3;
      return {
        rangeStart: isoDate(year, quarterMonth, 1),
        rangeEnd:
          endMonth > 12
            ? isoDate(year + 1, 1, 1)
            : isoDate(year, endMonth, 1),
      };
    }
    case '本年':
      return {
        rangeStart: isoDate(year, 1, 1),
        rangeEnd: isoDate(year + 1, 1, 1),
      };
    case '自定义': {
      const hasStart: boolean =
        typeof customStartDate === 'string' &&
        ISO_DATE_PATTERN.test(customStartDate);
      const hasEnd: boolean =
        typeof customEndDate === 'string' && ISO_DATE_PATTERN.test(customEndDate);
      if (
        hasStart &&
        hasEnd &&
        (customStartDate as string) <= (customEndDate as string)
      ) {
        return {
          rangeStart: customStartDate as string,
          rangeEnd: addDaysIso(customEndDate as string, 1),
        };
      }
      break;
    }
    default:
      break;
  }
  return { rangeStart: monthStart, rangeEnd: monthEnd };
}

// ---------------------------------------------------------------------------
// 报表运行引擎
// ---------------------------------------------------------------------------

export interface RunReportInput {
  dimensions: string[];
  metrics: string[];
  chartType: string;
  timeRange: string;
  customStartDate?: string | null;
  customEndDate?: string | null;
  filters: ReportFilterCondition[];
  /** 叠加的维度等值筛选（SQL 下推，供下钻使用） */
  dimensionFilters?: ReportFilterCondition[];
  sortBy?: string | null;
  sortOrder?: string;
  page?: number;
  pageSize?: number;
}

interface MergedRow {
  dims: Record<string, string>;
  values: Record<string, number>;
}

function extractRows(result: unknown): Record<string, unknown>[] {
  if (Array.isArray(result)) {
    return result.filter(
      (row: unknown): row is Record<string, unknown> =>
        row !== null && typeof row === 'object',
    );
  }
  return [];
}

function toNumber(value: unknown): number {
  const parsed: number = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function rowMatchesFilter(
  row: MergedRow,
  filter: ReportFilterCondition,
  dimensions: string[],
  metrics: string[],
): boolean {
  if (!filter || typeof filter.field !== 'string') return true;
  if (dimensions.includes(filter.field)) {
    const dimValue: string = row.dims[filter.field] ?? ALL_DIM_VALUE;
    const target: string = filter.value ?? '';
    switch (filter.op) {
      case '等于':
        return dimValue === target;
      case '不等于':
        return dimValue !== target;
      case '包含':
        return dimValue.includes(target);
      case '大于':
        return dimValue > target;
      case '小于':
        return dimValue < target;
      default:
        return true;
    }
  }
  if (metrics.includes(filter.field)) {
    const actual: number = row.values[filter.field] ?? 0;
    const expected: number = toNumber(filter.value);
    switch (filter.op) {
      case '等于':
        return actual === expected;
      case '不等于':
        return actual !== expected;
      case '包含':
        return actual === expected;
      case '大于':
        return actual > expected;
      case '小于':
        return actual < expected;
      default:
        return true;
    }
  }
  return true;
}

/** 报表运行引擎：按指标数据源聚合 → 内存合并 → 筛选 → 排序 → 分页 */
export async function runReport(
  db: PostgresJsDatabase,
  input: RunReportInput,
): Promise<ReportRunResult> {
  const dimensions: string[] = input.dimensions.filter((dim: string) =>
    (REPORT_DIMENSIONS as readonly string[]).includes(dim),
  );
  const requested: string[] = input.metrics.filter((metric: string) =>
    (REPORT_METRICS as readonly string[]).includes(metric),
  );
  const queryMetrics: string[] = requested.filter(
    (metric: string): boolean => metric !== '利润',
  );
  if (requested.includes('利润')) {
    if (!queryMetrics.includes('收入')) queryMetrics.push('收入');
    if (!queryMetrics.includes('成本')) queryMetrics.push('成本');
  }

  const range: ReportDateRange = resolveDateRange(
    input.timeRange,
    input.customStartDate,
    input.customEndDate,
  );

  const merged: Map<string, MergedRow> = new Map<string, MergedRow>();
  for (const metric of queryMetrics) {
    const source: MetricSource | undefined = METRIC_SOURCES[metric];
    if (!source) continue;

    const selectParts: string[] = [];
    const groupParts: string[] = [];
    dimensions.forEach((dim: string, index: number) => {
      const expr: string | undefined = source.dimExpr[dim];
      if (expr) {
        selectParts.push(`${expr} AS d${index}`);
        groupParts.push(expr);
      }
    });
    selectParts.push(`SUM(${source.amountExpr}) AS metric_val`);

    const conditions: SQL[] = [rangeWhereOf(source)(range)];
    const dimensionFilters: ReportFilterCondition[] =
      input.dimensionFilters ?? [];
    for (const filter of dimensionFilters) {
      const builder = source.dimWhere[filter.field];
      if (builder && typeof filter.value === 'string') {
        conditions.push(builder(filter.value));
      }
    }
    const whereClause: SQL = sql.join(conditions, sql` AND `);
    const groupClause: string =
      groupParts.length > 0 ? ` GROUP BY ${groupParts.join(', ')}` : '';
    const query: SQL = sql`${sql.raw(
      `SELECT ${selectParts.join(', ')} FROM ${source.fromClause}`,
    )} WHERE ${whereClause}${sql.raw(groupClause)}`;

    const result: unknown = await db.execute(query);
    const rows: Record<string, unknown>[] = extractRows(result);
    for (const row of rows) {
      const dimValues: Record<string, string> = {};
      dimensions.forEach((dim: string, index: number) => {
        const raw: unknown = row[`d${index}`];
        dimValues[dim] =
          raw === null || raw === undefined ? ALL_DIM_VALUE : String(raw);
      });
      const key: string = dimensions
        .map((dim: string): string => dimValues[dim])
        .join('|');
      let mergedRow: MergedRow | undefined = merged.get(key);
      if (!mergedRow) {
        mergedRow = { dims: dimValues, values: {} };
        merged.set(key, mergedRow);
      }
      mergedRow.values[metric] =
        (mergedRow.values[metric] ?? 0) + toNumber(row.metric_val);
    }
  }

  if (requested.includes('利润')) {
    for (const row of merged.values()) {
      row.values['利润'] =
        (row.values['收入'] ?? 0) - (row.values['成本'] ?? 0);
    }
  }

  const filters: ReportFilterCondition[] = Array.isArray(input.filters)
    ? input.filters
    : [];
  const filtered: MergedRow[] = Array.from(merged.values()).filter(
    (row: MergedRow): boolean =>
      filters.every((filter: ReportFilterCondition): boolean =>
        rowMatchesFilter(row, filter, dimensions, requested),
      ),
  );

  if (requested.includes('利润')) {
    for (const row of filtered) {
      row.values['利润'] =
        (row.values['收入'] ?? 0) - (row.values['成本'] ?? 0);
    }
  }

  const sortBy: string | null = input.sortBy ?? null;
  const ascending: boolean = input.sortOrder === '升序';
  let sorted: MergedRow[] = filtered;
  if (sortBy) {
    const direction: number = ascending ? 1 : -1;
    sorted = [...filtered].sort((a: MergedRow, b: MergedRow): number => {
      if (dimensions.includes(sortBy)) {
        const left: string = a.dims[sortBy] ?? ALL_DIM_VALUE;
        const right: string = b.dims[sortBy] ?? ALL_DIM_VALUE;
        return direction * left.localeCompare(right);
      }
      return direction * ((a.values[sortBy] ?? 0) - (b.values[sortBy] ?? 0));
    });
  }

  const totals: Record<string, number> = {};
  for (const metric of requested) {
    totals[metric] = 0;
  }
  for (const row of sorted) {
    for (const metric of requested) {
      totals[metric] += row.values[metric] ?? 0;
    }
  }

  const page: number = Math.max(
    Number.isFinite(input.page) ? Number(input.page) : 1,
    1,
  );
  const pageSize: number = Math.min(
    Math.max(
      Number.isFinite(input.pageSize) ? Number(input.pageSize) : 20,
      1,
    ),
    200,
  );
  const total: number = sorted.length;
  const offset: number = (page - 1) * pageSize;
  const pageRows: MergedRow[] = sorted.slice(offset, offset + pageSize);

  const rows: ReportRunRow[] = pageRows.map((row: MergedRow): ReportRunRow => {
    const values: Record<string, number> = {};
    for (const metric of requested) {
      values[metric] = row.values[metric] ?? 0;
    }
    const key: string = dimensions
      .map((dim: string): string => row.dims[dim])
      .join('|');
    return { key, dims: row.dims, values };
  });

  return {
    rows,
    total,
    totals,
    dimensions,
    metrics: requested,
    chartType: input.chartType,
    timeRange: input.timeRange,
    rangeStart: range.rangeStart,
    rangeEnd: range.rangeEnd,
  };
}
