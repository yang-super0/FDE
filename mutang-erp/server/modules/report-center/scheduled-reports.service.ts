import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { and, asc, count, desc, eq, isNull, like, type SQL } from 'drizzle-orm';
import type {
  ReportFilterCondition,
  ScheduledPreviewResponse,
  ScheduledReportCreateInput,
  ScheduledReportListParams,
  ScheduledReportListResponse,
  ScheduledReportRecord,
  ScheduledReportRunResponse,
  ScheduledReportUpdateInput,
  ScheduledRunLog,
} from '@shared/api.interface';
import {
  customReports,
  operationLog,
  reportTemplates,
  scheduledReports,
} from '@server/database/schema';
import { insertWithSeqNo } from '@server/modules/finance-core/fin-seq.util';
import { OperationLogService } from '@server/modules/operation-log/operation-log.service';
import { runReport } from './report-engine.util';
import {
  computeNextRunAt,
  mapScheduleRow,
  SCHEDULE_FREQUENCIES,
  toFilterArray,
  toStringArray,
  truncateText,
  type ScheduleRow,
} from './scheduled-reports.util';

type ScheduleInsert = typeof scheduledReports.$inferInsert;
type ReportRow = typeof customReports.$inferSelect;
type TemplateRow = typeof reportTemplates.$inferSelect;
type OperationLogRow = typeof operationLog.$inferSelect;

/** 报表/模板统一转换后的引擎运行参数 */
interface ScheduleRunParams {
  dimensions: string[];
  metrics: string[];
  chartType: string;
  timeRange: string;
  customStartDate: string | null;
  customEndDate: string | null;
  filters: ReportFilterCondition[];
}

export interface ScheduleStatusInput {
  status: string;
}

export interface ScheduledRunsResponse {
  items: ScheduledRunLog[];
}

/** 定时任务编号前缀 */
const SCHEDULE_NO_PREFIX: string = 'TS';
const OPERATION_MODULE: string = '报表中心';
/** 推送日志专用模块名（listRunLogs 按它过滤） */
const PUSH_MODULE: string = '定时推送';
const SCHEDULE_RUN_MAX_ATTEMPTS: number = 3;
const SCHEDULE_STATUS_ENABLED: string = '启用';
const SCHEDULE_STATUS_DISABLED: string = '停用';
const SCHEDULE_TIME_PATTERN: RegExp = /^([01]\d|2[0-3]):[0-5]\d$/u;

@Injectable()
export class ScheduledReportsService {
  private readonly logger = new Logger(ScheduledReportsService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly operationLog: OperationLogService,
  ) {}

  async findAll(
    params: ScheduledReportListParams,
  ): Promise<ScheduledReportListResponse> {
    const page: number = Math.max(Number(params.page) || 1, 1);
    const pageSize: number = Math.min(
      Math.max(Number(params.pageSize) || 10, 1),
      100,
    );
    const conditions: SQL[] = [isNull(scheduledReports.deletedAt)];
    if (params.frequency) {
      conditions.push(eq(scheduledReports.frequency, params.frequency));
    }
    if (params.status) {
      conditions.push(eq(scheduledReports.status, params.status));
    }
    if (params.keyword) {
      conditions.push(
        like(scheduledReports.scheduleName, `%${params.keyword}%`),
      );
    }
    const where: SQL = and(...conditions);

    const totalRows: { count: number | string }[] = await this.db
      .select({ count: count() })
      .from(scheduledReports)
      .where(where);
    const rows: ScheduleRow[] = await this.db
      .select()
      .from(scheduledReports)
      .where(where)
      .orderBy(asc(scheduledReports.scheduleNo))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    return {
      items: rows.map((row: ScheduleRow): ScheduledReportRecord =>
        mapScheduleRow(row),
      ),
      total: Number(totalRows[0]?.count ?? 0),
    };
  }

  async create(
    dto: ScheduledReportCreateInput,
    operatorId: string,
  ): Promise<ScheduledReportRecord> {
    if (!dto?.scheduleName || dto.scheduleName.trim().length === 0) {
      throw new BadRequestException('任务名称不能为空');
    }
    if (dto.reportId === undefined && dto.reportTemplateId === undefined) {
      throw new BadRequestException('必须关联报表或模板');
    }
    if (!SCHEDULE_FREQUENCIES.includes(dto.frequency)) {
      throw new BadRequestException('推送频率不合法');
    }
    if (dto.frequency === '每周') {
      if (
        typeof dto.dayOfWeek !== 'number' ||
        !Number.isInteger(dto.dayOfWeek) ||
        dto.dayOfWeek < 1 ||
        dto.dayOfWeek > 7
      ) {
        throw new BadRequestException('每周推送必须指定 1-7 的星期');
      }
    }
    if (dto.frequency === '每月') {
      if (
        typeof dto.dayOfMonth !== 'number' ||
        !Number.isInteger(dto.dayOfMonth) ||
        dto.dayOfMonth < 1 ||
        dto.dayOfMonth > 31
      ) {
        throw new BadRequestException('每月推送必须指定 1-31 的日期');
      }
    }
    const scheduleTime: string = dto.scheduleTime ?? '09:00';
    if (!SCHEDULE_TIME_PATTERN.test(scheduleTime)) {
      throw new BadRequestException('推送时间格式必须为 HH:mm');
    }
    if (dto.reportId !== undefined) {
      await this.ensureReportExists(dto.reportId);
    }
    if (dto.reportTemplateId !== undefined) {
      await this.ensureTemplateExists(dto.reportTemplateId);
    }
    const nextRunAt: Date = computeNextRunAt(
      new Date(),
      dto.frequency,
      scheduleTime,
      dto.dayOfWeek ?? null,
      dto.dayOfMonth ?? null,
    );
    const { row } = await insertWithSeqNo<ScheduleRow>({
      db: this.db,
      table: scheduledReports,
      noColumn: scheduledReports.scheduleNo,
      prefix: SCHEDULE_NO_PREFIX,
      insert: (no: string) =>
        this.db
          .insert(scheduledReports)
          .values({
            scheduleNo: no,
            scheduleName: dto.scheduleName,
            reportId: dto.reportId ?? null,
            reportTemplateId: dto.reportTemplateId ?? null,
            frequency: dto.frequency,
            scheduleTime,
            dayOfWeek: dto.dayOfWeek ?? null,
            dayOfMonth: dto.dayOfMonth ?? null,
            targetType: dto.targetType ?? '飞书群',
            targetId: dto.targetId ?? null,
            targetName: dto.targetName ?? null,
            fileFormat: dto.fileFormat ?? 'Excel',
            includeChart: dto.includeChart ?? true,
            status: SCHEDULE_STATUS_ENABLED,
            nextRunAt,
            remark: dto.remark ?? null,
            createdBy: operatorId,
          })
          .returning(),
    });
    await this.operationLog.record({
      module: OPERATION_MODULE,
      actionType: '创建定时任务',
      target: truncateText(`${row.scheduleNo} ${row.scheduleName}`, 255),
      operatorId,
    });
    return mapScheduleRow(row);
  }

  async findById(id: number): Promise<ScheduledReportRecord> {
    const row: ScheduleRow = await this.findRow(id);
    return mapScheduleRow(row);
  }

  async update(
    id: number,
    dto: ScheduledReportUpdateInput,
    operatorId: string,
  ): Promise<ScheduledReportRecord> {
    const existing: ScheduleRow = await this.findRow(id);
    this.validateUpdateFields(dto);
    const patch: Partial<ScheduleInsert> = {};
    if (dto.scheduleName !== undefined) patch.scheduleName = dto.scheduleName;
    if (dto.reportId !== undefined) patch.reportId = dto.reportId;
    if (dto.reportTemplateId !== undefined) {
      patch.reportTemplateId = dto.reportTemplateId;
    }
    if (dto.frequency !== undefined) patch.frequency = dto.frequency;
    if (dto.scheduleTime !== undefined) patch.scheduleTime = dto.scheduleTime;
    if (dto.dayOfWeek !== undefined) patch.dayOfWeek = dto.dayOfWeek;
    if (dto.dayOfMonth !== undefined) patch.dayOfMonth = dto.dayOfMonth;
    if (dto.targetType !== undefined) patch.targetType = dto.targetType;
    if (dto.targetId !== undefined) patch.targetId = dto.targetId;
    if (dto.targetName !== undefined) patch.targetName = dto.targetName;
    if (dto.fileFormat !== undefined) patch.fileFormat = dto.fileFormat;
    if (dto.includeChart !== undefined) patch.includeChart = dto.includeChart;
    if (dto.remark !== undefined) patch.remark = dto.remark;
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }
    const timingChanged: boolean =
      dto.frequency !== undefined ||
      dto.scheduleTime !== undefined ||
      dto.dayOfWeek !== undefined ||
      dto.dayOfMonth !== undefined;
    if (timingChanged && existing.status === SCHEDULE_STATUS_ENABLED) {
      patch.nextRunAt = computeNextRunAt(
        new Date(),
        dto.frequency ?? existing.frequency,
        dto.scheduleTime ?? existing.scheduleTime,
        dto.dayOfWeek !== undefined ? dto.dayOfWeek : existing.dayOfWeek,
        dto.dayOfMonth !== undefined ? dto.dayOfMonth : existing.dayOfMonth,
      );
    }
    patch.updatedAt = new Date();
    patch.updatedBy = operatorId;
    const updated: ScheduleRow[] = await this.db
      .update(scheduledReports)
      .set(patch)
      .where(
        and(eq(scheduledReports.id, id), isNull(scheduledReports.deletedAt)),
      )
      .returning();
    if (updated.length === 0) throw new NotFoundException('任务不存在');
    await this.operationLog.record({
      module: OPERATION_MODULE,
      actionType: '更新定时任务',
      target: truncateText(
        `${existing.scheduleNo} ${updated[0].scheduleName}`,
        255,
      ),
      operatorId,
    });
    return mapScheduleRow(updated[0]);
  }

  async remove(
    id: number,
    operatorId: string,
  ): Promise<{ deleted: boolean }> {
    const existing: ScheduleRow = await this.findRow(id);
    const deleted: { id: number }[] = await this.db
      .update(scheduledReports)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
        updatedBy: operatorId,
      })
      .where(
        and(eq(scheduledReports.id, id), isNull(scheduledReports.deletedAt)),
      )
      .returning({ id: scheduledReports.id });
    if (deleted.length === 0) throw new NotFoundException('任务不存在');
    await this.operationLog.record({
      module: OPERATION_MODULE,
      actionType: '删除定时任务',
      target: truncateText(
        `${existing.scheduleNo} ${existing.scheduleName}`,
        255,
      ),
      operatorId,
    });
    return { deleted: true };
  }

  async updateStatus(
    id: number,
    status: string,
    operatorId: string,
  ): Promise<ScheduledReportRecord> {
    if (status !== SCHEDULE_STATUS_ENABLED && status !== SCHEDULE_STATUS_DISABLED) {
      throw new BadRequestException('状态必须为 启用 或 停用');
    }
    const existing: ScheduleRow = await this.findRow(id);
    const patch: Partial<ScheduleInsert> = {
      status,
      updatedAt: new Date(),
      updatedBy: operatorId,
    };
    if (status === SCHEDULE_STATUS_DISABLED) {
      patch.nextRunAt = null;
    } else {
      patch.nextRunAt = computeNextRunAt(
        new Date(),
        existing.frequency,
        existing.scheduleTime,
        existing.dayOfWeek,
        existing.dayOfMonth,
      );
    }
    const updated: ScheduleRow[] = await this.db
      .update(scheduledReports)
      .set(patch)
      .where(
        and(eq(scheduledReports.id, id), isNull(scheduledReports.deletedAt)),
      )
      .returning();
    if (updated.length === 0) throw new NotFoundException('任务不存在');
    await this.operationLog.record({
      module: OPERATION_MODULE,
      actionType: `${status}定时任务`,
      target: truncateText(
        `${existing.scheduleNo} ${existing.scheduleName}`,
        255,
      ),
      operatorId,
    });
    return mapScheduleRow(updated[0]);
  }

  async runNow(
    id: number,
    operatorId: string,
  ): Promise<ScheduledReportRunResponse> {
    const row: ScheduleRow = await this.findRow(id);
    // 关联报表/模板被删（软删）时在引擎调用前抛 404
    const params: ScheduleRunParams = await this.resolveRunParams(row);
    let attempts: number = 0;
    let lastMessage: string = '';
    while (attempts < SCHEDULE_RUN_MAX_ATTEMPTS) {
      attempts += 1;
      try {
        await runReport(this.db, {
          dimensions: params.dimensions,
          metrics: params.metrics,
          chartType: params.chartType,
          timeRange: params.timeRange,
          customStartDate: params.customStartDate,
          customEndDate: params.customEndDate,
          filters: params.filters,
        });
        // 模拟飞书推送：写一条定时推送日志
        await this.operationLog.record({
          module: PUSH_MODULE,
          actionType: '推送',
          target: truncateText(
            `${row.scheduleNo} ${row.targetName ?? row.targetId ?? ''}`.trim(),
            255,
          ),
          operatorId,
        });
        const schedule: ScheduledReportRecord = await this.markRunResult(
          row,
          true,
          null,
        );
        return { success: true, attempts, message: '推送成功', schedule };
      } catch (error: unknown) {
        lastMessage = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `定时推送查询失败(第${String(attempts)}次): ${lastMessage}`,
        );
      }
    }
    const message: string =
      lastMessage.length > 0 ? lastMessage : '生成报表数据失败';
    const schedule: ScheduledReportRecord = await this.markRunResult(
      row,
      false,
      message,
    );
    return { success: false, attempts, message, schedule };
  }

  async preview(id: number): Promise<ScheduledPreviewResponse> {
    const row: ScheduleRow = await this.findRow(id);
    const params: ScheduleRunParams = await this.resolveRunParams(row);
    const result = await runReport(this.db, {
      dimensions: params.dimensions,
      metrics: params.metrics,
      chartType: params.chartType,
      timeRange: params.timeRange,
      customStartDate: params.customStartDate,
      customEndDate: params.customEndDate,
      filters: params.filters,
    });
    return { schedule: mapScheduleRow(row), result };
  }

  async listRunLogs(): Promise<ScheduledRunsResponse> {
    const rows: OperationLogRow[] = await this.db
      .select()
      .from(operationLog)
      .where(eq(operationLog.module, PUSH_MODULE))
      .orderBy(desc(operationLog.createdAt))
      .limit(100);
    const items: ScheduledRunLog[] = rows.map(
      (logRow: OperationLogRow): ScheduledRunLog => {
        const segments: string[] = logRow.target.split(/\s+/);
        const first: string = segments[0] ?? '';
        const scheduleNo: string = first.startsWith(SCHEDULE_NO_PREFIX)
          ? first
          : '';
        const scheduleName: string = scheduleNo
          ? segments.slice(1).join(' ')
          : logRow.target;
        return {
          id: logRow.createdAt.getTime(),
          scheduleNo,
          scheduleName,
          status: '成功',
          detail: logRow.target,
          runAt: logRow.createdAt.toISOString(),
        };
      },
    );
    return { items };
  }

  /** 由 reportId / reportTemplateId 解析引擎运行参数 */
  private async resolveRunParams(
    row: ScheduleRow,
  ): Promise<ScheduleRunParams> {
    if (row.reportId !== null) {
      const reports: ReportRow[] = await this.db
        .select()
        .from(customReports)
        .where(
          and(
            eq(customReports.id, row.reportId),
            isNull(customReports.deletedAt),
          ),
        );
      if (reports.length === 0) {
        throw new NotFoundException('关联报表不存在');
      }
      const report: ReportRow = reports[0];
      return {
        dimensions: toStringArray(report.dimensions),
        metrics: toStringArray(report.metrics),
        chartType: report.chartType,
        timeRange: report.timeRange,
        customStartDate: report.customStartDate,
        customEndDate: report.customEndDate,
        filters: toFilterArray(report.filters),
      };
    }
    if (row.reportTemplateId !== null) {
      const templates: TemplateRow[] = await this.db
        .select()
        .from(reportTemplates)
        .where(
          and(
            eq(reportTemplates.id, row.reportTemplateId),
            isNull(reportTemplates.deletedAt),
          ),
        );
      if (templates.length === 0) {
        throw new NotFoundException('关联报表模板不存在');
      }
      const template: TemplateRow = templates[0];
      return {
        dimensions: toStringArray(template.dimensions),
        metrics: toStringArray(template.metrics),
        chartType: template.chartType,
        timeRange: '本月',
        customStartDate: null,
        customEndDate: null,
        filters: toFilterArray(template.defaultFilters),
      };
    }
    throw new BadRequestException('任务未关联报表或报表模板');
  }

  private async markRunResult(
    row: ScheduleRow,
    success: boolean,
    errorMessage: string | null,
  ): Promise<ScheduledReportRecord> {
    const patch: Partial<ScheduleInsert> = {
      lastRunAt: new Date(),
      lastRunStatus: success ? '成功' : '失败',
      lastRunError: errorMessage
        ? truncateText(errorMessage, 500)
        : null,
      updatedAt: new Date(),
    };
    if (row.status === SCHEDULE_STATUS_ENABLED) {
      patch.nextRunAt = computeNextRunAt(
        new Date(),
        row.frequency,
        row.scheduleTime,
        row.dayOfWeek,
        row.dayOfMonth,
      );
    }
    const updated: ScheduleRow[] = await this.db
      .update(scheduledReports)
      .set(patch)
      .where(
        and(
          eq(scheduledReports.id, row.id),
          isNull(scheduledReports.deletedAt),
        ),
      )
      .returning();
    if (updated.length === 0) throw new NotFoundException('任务不存在');
    return mapScheduleRow(updated[0]);
  }

  private validateUpdateFields(dto: ScheduledReportUpdateInput): void {
    if (dto.frequency !== undefined) {
      if (!SCHEDULE_FREQUENCIES.includes(dto.frequency)) {
        throw new BadRequestException('推送频率不合法');
      }
    }
    if (
      dto.scheduleTime !== undefined &&
      !SCHEDULE_TIME_PATTERN.test(dto.scheduleTime)
    ) {
      throw new BadRequestException('推送时间格式必须为 HH:mm');
    }
    if (dto.dayOfWeek !== undefined && dto.dayOfWeek !== null) {
      if (
        !Number.isInteger(dto.dayOfWeek) ||
        dto.dayOfWeek < 1 ||
        dto.dayOfWeek > 7
      ) {
        throw new BadRequestException('每周推送必须指定 1-7 的星期');
      }
    }
    if (dto.dayOfMonth !== undefined && dto.dayOfMonth !== null) {
      if (
        !Number.isInteger(dto.dayOfMonth) ||
        dto.dayOfMonth < 1 ||
        dto.dayOfMonth > 31
      ) {
        throw new BadRequestException('每月推送必须指定 1-31 的日期');
      }
    }
  }

  private async ensureReportExists(reportId: number): Promise<void> {
    const reports: { id: number }[] = await this.db
      .select({ id: customReports.id })
      .from(customReports)
      .where(
        and(eq(customReports.id, reportId), isNull(customReports.deletedAt)),
      );
    if (reports.length === 0) {
      throw new NotFoundException('关联报表不存在');
    }
  }

  private async ensureTemplateExists(templateId: number): Promise<void> {
    const templates: { id: number }[] = await this.db
      .select({ id: reportTemplates.id })
      .from(reportTemplates)
      .where(
        and(
          eq(reportTemplates.id, templateId),
          isNull(reportTemplates.deletedAt),
        ),
      );
    if (templates.length === 0) {
      throw new NotFoundException('关联报表模板不存在');
    }
  }

  private async findRow(id: number): Promise<ScheduleRow> {
    const rows: ScheduleRow[] = await this.db
      .select()
      .from(scheduledReports)
      .where(
        and(eq(scheduledReports.id, id), isNull(scheduledReports.deletedAt)),
      );
    if (rows.length === 0) throw new NotFoundException('任务不存在');
    return rows[0];
  }
}
