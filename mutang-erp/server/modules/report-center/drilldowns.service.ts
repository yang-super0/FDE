import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import {
  and,
  count,
  desc,
  eq,
  isNull,
  sql,
  type SQL,
} from 'drizzle-orm';
import type {
  DrilldownConfigResponse,
  DrilldownDetailRow,
  DrilldownExecuteInput,
  DrilldownExecuteResult,
  DrilldownListParams,
  DrilldownListResponse,
  DrilldownPathItem,
  DrilldownRecord,
  ReportFilterCondition,
  ReportRunRow,
} from '@shared/api.interface';
import { customReports, reportDrilldowns } from '@server/database/schema';
import { insertWithSeqNo } from '@server/modules/finance-core/fin-seq.util';
import {
  findMetricByTable,
  getMetricSource,
  REPORT_METRICS,
  resolveDateRange,
  runReport,
  type MetricSourceInfo,
  type ReportDateRange,
} from './report-engine.util';
import { toFilterArray, toStringArray } from './scheduled-reports.util';

type ReportRow = typeof customReports.$inferSelect;
type DrilldownRow = typeof reportDrilldowns.$inferSelect;

interface DimensionTarget {
  dimension: string;
  targetTable: string;
  targetLabel: string;
}

interface DetailFieldConfig {
  name: string;
  expr: string;
}

const DRILLDOWN_NO_PREFIX: string = 'ZX';
const DETAIL_ROW_LIMIT: number = 100;
const DETAIL_LEVELS: string[] = ['明细', '单据'];

/** 允许下钻的明细表白名单（其他表名一律 400） */
const DETAIL_TABLES: string[] = [
  'finance_consumptions',
  'finance_incomes',
  'finance_costs',
  'finance_expenses',
];

/** 各明细表的展示字段（编号/日期/客户/金额/状态） */
const DETAIL_FIELDS: Record<string, DetailFieldConfig[]> = {
  finance_consumptions: [
    { name: '编号', expr: 't.consumption_no' },
    {
      name: '日期',
      expr: "to_char(t.consumption_date, 'YYYY-MM-DD')",
    },
    { name: '客户', expr: 't.customer_id' },
    { name: '金额', expr: 't.amount' },
    { name: '状态', expr: 't.status' },
  ],
  finance_incomes: [
    { name: '编号', expr: 't.income_no' },
    {
      name: '日期',
      expr: "to_char(t.income_date, 'YYYY-MM-DD')",
    },
    { name: '客户', expr: 't.customer_name' },
    { name: '金额', expr: 't.amount' },
    { name: '状态', expr: 't.status' },
  ],
  finance_costs: [
    { name: '编号', expr: 't.cost_no' },
    {
      name: '日期',
      expr: "to_char((t.cost_date AT TIME ZONE 'Asia/Shanghai')::date, 'YYYY-MM-DD')",
    },
    { name: '客户', expr: 't.related_customer' },
    { name: '金额', expr: 't.amount' },
    { name: '状态', expr: 't.status' },
  ],
  finance_expenses: [
    { name: '编号', expr: 't.expense_no' },
    {
      name: '日期',
      expr: "to_char(t.apply_date, 'YYYY-MM-DD')",
    },
    { name: '申请人', expr: 't.applicant' },
    { name: '金额', expr: 't.amount' },
    { name: '状态', expr: 't.status' },
  ],
};

/** 维度 × 指标 的下钻目标白名单 */
const DIMENSION_TARGETS: DimensionTarget[] = [
  {
    dimension: '客户',
    targetTable: 'finance_consumptions',
    targetLabel: '广告消耗明细（按客户）',
  },
  {
    dimension: '客户',
    targetTable: 'finance_incomes',
    targetLabel: '收入明细（按客户）',
  },
  {
    dimension: '客户',
    targetTable: 'finance_costs',
    targetLabel: '成本明细（按客户）',
  },
  {
    dimension: '端口',
    targetTable: 'finance_consumptions',
    targetLabel: '广告消耗明细（按端口）',
  },
  {
    dimension: '行业',
    targetTable: 'finance_consumptions',
    targetLabel: '广告消耗明细（按行业）',
  },
  {
    dimension: '行业',
    targetTable: 'finance_incomes',
    targetLabel: '收入明细（按行业）',
  },
  {
    dimension: '时间',
    targetTable: 'finance_consumptions',
    targetLabel: '广告消耗明细（按日期）',
  },
  {
    dimension: '时间',
    targetTable: 'finance_incomes',
    targetLabel: '收入明细（按日期）',
  },
  {
    dimension: '时间',
    targetTable: 'finance_costs',
    targetLabel: '成本明细（按日期）',
  },
  {
    dimension: '时间',
    targetTable: 'finance_expenses',
    targetLabel: '支出明细（按日期）',
  },
];

function extractRows(result: unknown): Record<string, unknown>[] {
  if (Array.isArray(result)) {
    return result.filter(
      (row: unknown): row is Record<string, unknown> =>
        row !== null && typeof row === 'object',
    );
  }
  return [];
}

function safeParseArray(raw: string): unknown[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function toPathArray(value: unknown): DrilldownPathItem[] {
  const source: unknown[] = Array.isArray(value)
    ? value
    : typeof value === 'string' && value.length > 0
      ? safeParseArray(value)
      : [];
  return source.filter(
    (item: unknown): item is DrilldownPathItem => {
      if (item === null || typeof item !== 'object') return false;
      const record: Record<string, unknown> = item as Record<
        string,
        unknown
      >;
      return (
        typeof record.level === 'string' &&
        typeof record.dimension === 'string' &&
        typeof record.value === 'string'
      );
    },
  );
}

function mapDrilldownRow(row: DrilldownRow): DrilldownRecord {
  return {
    id: row.id,
    drilldownNo: row.drilldownNo,
    reportId: row.reportId,
    sourceLevel: row.sourceLevel,
    sourceDimension: row.sourceDimension,
    sourceValue: row.sourceValue,
    targetLevel: row.targetLevel,
    targetTable: row.targetTable,
    targetId: row.targetId,
    targetNo: row.targetNo,
    drilldownPath: toPathArray(row.drilldownPath),
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
  };
}

@Injectable()
export class DrilldownsService {
  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  getConfig(): DrilldownConfigResponse {
    return {
      dimensionTargets: DIMENSION_TARGETS.map(
        (item: DimensionTarget): DimensionTarget => ({ ...item }),
      ),
    };
  }

  async execute(
    dto: DrilldownExecuteInput,
    operatorId: string,
  ): Promise<DrilldownExecuteResult> {
    const reportId: number = Number(dto?.reportId);
    if (!Number.isInteger(reportId) || reportId <= 0) {
      throw new BadRequestException('无效的报表 ID');
    }
    const report: ReportRow = await this.findReportRow(reportId);
    const rawPath: unknown = dto?.path;
    const path: DrilldownPathItem[] = Array.isArray(rawPath)
      ? toPathArray(rawPath)
      : [];
    const lastLevel: string =
      path.length > 0 ? path[path.length - 1].level : '';
    const isDetail: boolean = DETAIL_LEVELS.includes(lastLevel);
    const range: ReportDateRange = resolveDateRange(
      report.timeRange,
      report.customStartDate,
      report.customEndDate,
    );

    const reportDimensions: string[] = toStringArray(report.dimensions);
    const reportMetrics: string[] = toStringArray(report.metrics);
    let rows: ReportRunRow[] = [];
    let detailRows: DrilldownDetailRow[] = [];
    let columns: string[] = [];
    let dimensions: string[] = reportDimensions;
    let metrics: string[] = reportMetrics;
    let rangeStart: string = range.rangeStart;
    let rangeEnd: string = range.rangeEnd;

    if (isDetail) {
      const targetTable: string = dto?.targetTable ?? '';
      if (!DETAIL_TABLES.includes(targetTable)) {
        throw new BadRequestException('不支持下钻的明细表');
      }
      const detail = await this.queryDetailRows(
        targetTable,
        path,
        range,
      );
      detailRows = detail.rows;
      columns = detail.columns;
      dimensions = reportDimensions;
      metrics = reportMetrics;
    } else {
      const fixedDimensions: Set<string> = new Set(
        path.map((item: DrilldownPathItem): string => item.dimension),
      );
      const drillDimensions: string[] = reportDimensions.filter(
        (dimension: string): boolean => !fixedDimensions.has(dimension),
      );
      if (drillDimensions.length === 0) drillDimensions.push('时间');
      const requestedMetric: string | undefined = dto?.metric;
      if (
        requestedMetric !== undefined &&
        !(REPORT_METRICS as readonly string[]).includes(requestedMetric)
      ) {
        throw new BadRequestException('不支持的指标');
      }
      const usedMetrics: string[] =
        requestedMetric !== undefined ? [requestedMetric] : reportMetrics;
      const pathFilters: ReportFilterCondition[] = path.map(
        (item: DrilldownPathItem): ReportFilterCondition => ({
          field: item.dimension,
          op: '等于',
          value: item.value,
        }),
      );
      const result = await runReport(this.db, {
        dimensions: drillDimensions,
        metrics: usedMetrics,
        chartType: report.chartType,
        timeRange: report.timeRange,
        customStartDate: report.customStartDate,
        customEndDate: report.customEndDate,
        filters: [...toFilterArray(report.filters), ...pathFilters],
        dimensionFilters: pathFilters,
      });
      rows = result.rows;
      columns = [...drillDimensions, ...result.metrics];
      dimensions = drillDimensions;
      metrics = result.metrics;
      rangeStart = result.rangeStart;
      rangeEnd = result.rangeEnd;
    }

    const sourceLevel: string =
      path.length >= 2 ? path[path.length - 2].level : '汇总';
    const lastItem: DrilldownPathItem | null =
      path.length > 0 ? path[path.length - 1] : null;
    const firstDetail: DrilldownDetailRow | undefined = detailRows[0];
    const level: string = isDetail
      ? '明细'
      : path.length === 0
        ? '汇总'
        : '分组';
    const { row: record } = await insertWithSeqNo<DrilldownRow>({
      db: this.db,
      table: reportDrilldowns,
      noColumn: reportDrilldowns.drilldownNo,
      prefix: DRILLDOWN_NO_PREFIX,
      insert: (no: string) =>
        this.db
          .insert(reportDrilldowns)
          .values({
            drilldownNo: no,
            reportId,
            sourceLevel,
            sourceDimension: lastItem ? lastItem.dimension : null,
            sourceValue: lastItem ? lastItem.value : null,
            targetLevel: isDetail ? '明细' : '分组',
            targetTable: isDetail ? (dto?.targetTable ?? null) : null,
            targetId: firstDetail ? firstDetail.targetId : null,
            targetNo: firstDetail ? firstDetail.targetNo : null,
            drilldownPath: JSON.stringify(path),
            createdBy: operatorId,
          })
          .returning(),
    });

    return {
      drilldownNo: record.drilldownNo,
      level,
      breadcrumb: path,
      rows,
      detailRows,
      columns,
      dimensions,
      metrics,
      rangeStart,
      rangeEnd,
    };
  }

  async findAll(
    params: DrilldownListParams,
  ): Promise<DrilldownListResponse> {
    const page: number = Math.max(Number(params.page) || 1, 1);
    const pageSize: number = Math.min(
      Math.max(Number(params.pageSize) || 20, 1),
      100,
    );
    const conditions: SQL[] = [isNull(reportDrilldowns.deletedAt)];
    if (params.reportId) {
      const reportId: number = Number(params.reportId);
      if (Number.isInteger(reportId) && reportId > 0) {
        conditions.push(eq(reportDrilldowns.reportId, reportId));
      }
    }
    const where: SQL = and(...conditions);

    const totalRows: { count: number | string }[] = await this.db
      .select({ count: count() })
      .from(reportDrilldowns)
      .where(where);
    const rows: DrilldownRow[] = await this.db
      .select()
      .from(reportDrilldowns)
      .where(where)
      .orderBy(desc(reportDrilldowns.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    return {
      items: rows.map((row: DrilldownRow): DrilldownRecord =>
        mapDrilldownRow(row),
      ),
      total: Number(totalRows[0]?.count ?? 0),
    };
  }

  /** 明细表直查：白名单表 + 时间范围 + path 维度条件（复用引擎维度映射） */
  private async queryDetailRows(
    targetTable: string,
    path: DrilldownPathItem[],
    range: ReportDateRange,
  ): Promise<{ rows: DrilldownDetailRow[]; columns: string[] }> {
    const metric: string | undefined = findMetricByTable(targetTable);
    const source: MetricSourceInfo | undefined = metric
      ? getMetricSource(metric)
      : undefined;
    if (!source) {
      throw new BadRequestException('不支持下钻的明细表');
    }
    const fields: DetailFieldConfig[] = DETAIL_FIELDS[targetTable];
    const selectParts: string[] = fields.map(
      (field: DetailFieldConfig, index: number): string =>
        `${field.expr} AS f${String(index)}`,
    );
    selectParts.push('t.id::text AS rid');

    const conditions: SQL[] = [source.rangeWhere(range)];
    for (const item of path) {
      if (source.hasDimension(item.dimension)) {
        const condition: SQL | undefined = source.dimensionWhere(
          item.dimension,
          item.value,
        );
        if (condition) conditions.push(condition);
      }
    }
    const query: SQL = sql`${sql.raw(
      `SELECT ${selectParts.join(', ')} FROM ${source.fromClause}`,
    )} WHERE ${sql.join(conditions, sql` AND `)}${sql.raw(
      ` ORDER BY t.id DESC LIMIT ${String(DETAIL_ROW_LIMIT)}`,
    )}`;
    const rawRows: Record<string, unknown>[] = extractRows(
      await this.db.execute(query),
    );
    const rows: DrilldownDetailRow[] = rawRows.map(
      (rawRow: Record<string, unknown>): DrilldownDetailRow => {
        const recordFields: Record<string, string> = {};
        fields.forEach((field: DetailFieldConfig, index: number): void => {
          const rawValue: unknown = rawRow[`f${String(index)}`];
          recordFields[field.name] =
            rawValue === null || rawValue === undefined
              ? ''
              : String(rawValue);
        });
        const id: string = String(rawRow.rid ?? '');
        return {
          key: `${targetTable}-${id}`,
          targetTable,
          targetNo: recordFields[fields[0].name] ?? '',
          targetId: id,
          fields: recordFields,
        };
      },
    );
    return {
      rows,
      columns: fields.map((field: DetailFieldConfig): string => field.name),
    };
  }

  private async findReportRow(id: number): Promise<ReportRow> {
    const rows: ReportRow[] = await this.db
      .select()
      .from(customReports)
      .where(and(eq(customReports.id, id), isNull(customReports.deletedAt)));
    if (rows.length === 0) throw new NotFoundException('报表不存在');
    return rows[0];
  }
}
