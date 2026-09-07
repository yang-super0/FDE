import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
  AuthNPaasService,
} from '@lark-apaas/fullstack-nestjs-core';
import { and, desc, eq, gte, lte, count } from 'drizzle-orm';
import { operationLog } from '@server/database/schema';
import type {
  OperationLogListParams,
  OperationLogListResponse,
  OperationLogRecord,
} from '@shared/api.interface';

export interface RecordLogInput {
  module: string;
  actionType: string;
  target: string;
  operatorId: string;
}

@Injectable()
export class OperationLogService {
  private readonly logger = new Logger(OperationLogService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
    private readonly authn: AuthNPaasService,
  ) {}

  async record(input: RecordLogInput): Promise<void> {
    try {
      await this.db.insert(operationLog).values({
        module: input.module,
        actionType: input.actionType,
        target: input.target,
        createdBy: input.operatorId,
      });
    } catch (error) {
      this.logger.error(
        `记录操作日志失败: ${JSON.stringify(input)}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async findAll(
    params: OperationLogListParams,
  ): Promise<OperationLogListResponse> {
    const { actionType, from, to } = params;
    const page: number = Math.max(params.page, 1);
    const pageSize: number = Math.min(Math.max(params.pageSize, 1), 100);

    const conditions = [];
    if (actionType) conditions.push(eq(operationLog.actionType, actionType));
    if (from) conditions.push(gte(operationLog.createdAt, new Date(from)));
    if (to) conditions.push(lte(operationLog.createdAt, new Date(to)));
    const where =
      conditions.length > 0 ? and(...conditions) : undefined;

    const rows = where
      ? await this.db
          .select()
          .from(operationLog)
          .where(where)
          .orderBy(desc(operationLog.createdAt))
          .limit(pageSize)
          .offset((page - 1) * pageSize)
      : await this.db
          .select()
          .from(operationLog)
          .orderBy(desc(operationLog.createdAt))
          .limit(pageSize)
          .offset((page - 1) * pageSize);

    const totalResult = where
      ? await this.db
          .select({ count: count() })
          .from(operationLog)
          .where(where)
      : await this.db.select({ count: count() }).from(operationLog);
    const total: number = Number(totalResult[0]?.count ?? 0);

    const operatorIds: string[] = Array.from(
      new Set(
        rows
          .map((row) => row.createdBy)
          .filter((id): id is string => Boolean(id)),
      ),
    );
    const nameMap = new Map<string, string>();
    if (operatorIds.length > 0) {
      const users = await this.authn.listUsersByIds(operatorIds.slice(0, 100));
      users.forEach((user, index: number) => {
        if (user) {
          nameMap.set(
            operatorIds[index],
            user.name?.zh_cn ?? user.name?.en_us ?? '',
          );
        }
      });
    }

    const items: OperationLogRecord[] = rows.map((row) => ({
      id: row.id,
      module: row.module,
      actionType: row.actionType,
      target: row.target,
      operatorId: row.createdBy ?? '',
      operatorName: row.createdBy
        ? nameMap.get(row.createdBy) ?? ''
        : '',
      createdAt: row.createdAt.toISOString(),
    }));

    return { items, total };
  }
}
