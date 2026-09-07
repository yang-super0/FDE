import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  AuthNPaasService,
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { and, desc, eq } from 'drizzle-orm';
import { leaveRequest } from '@server/database/schema';
import type { LeaveRequest, LeaveStatus } from '@shared/api.interface';
import { OperationLogService } from '../operation-log/operation-log.service';
import type { CreateLeaveInput, LeaveApprovalAction } from './hr.dto';

const LEAVE_STATUSES: LeaveStatus[] = ['pending', 'approved', 'rejected'];

@Injectable()
export class LeaveService {
  private readonly logger = new Logger(LeaveService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
    private readonly authn: AuthNPaasService,
    private readonly operationLog: OperationLogService,
  ) {}

  async list(status?: string): Promise<{ items: LeaveRequest[] }> {
    const rows = status
      ? await this.db
          .select()
          .from(leaveRequest)
          .where(eq(leaveRequest.status, status))
          .orderBy(desc(leaveRequest.createdAt))
      : await this.db
          .select()
          .from(leaveRequest)
          .orderBy(desc(leaveRequest.createdAt));

    const userIds: string[] = Array.from(
      new Set(
        rows
          .flatMap((row) => [row.applicant, row.approver])
          .filter((id): id is string => Boolean(id)),
      ),
    );

    const nameMap: Map<string, string> = new Map();
    for (let i = 0; i < userIds.length; i += 100) {
      const chunk: string[] = userIds.slice(i, i + 100);
      const users = await this.authn.listUsersByIds(chunk);
      users.forEach((user, index: number) => {
        if (user) {
          nameMap.set(
            chunk[index],
            user.name?.zh_cn ?? user.name?.en_us ?? '',
          );
        }
      });
    }

    const items: LeaveRequest[] = rows.map((row) => ({
      id: row.id,
      applicantId: row.applicant ?? '',
      applicantName: row.applicant
        ? nameMap.get(row.applicant) ?? ''
        : '',
      leaveType: row.leaveType,
      startTime: row.startTime.toISOString(),
      endTime: row.endTime.toISOString(),
      reason: row.reason,
      status: LEAVE_STATUSES.includes(row.status as LeaveStatus)
        ? (row.status as LeaveStatus)
        : 'pending',
      approverName: row.approver ? nameMap.get(row.approver) ?? '' : '',
    }));

    return { items };
  }

  async create(
    input: CreateLeaveInput,
    applicantId: string,
  ): Promise<{ id: string }> {
    if (!input.leaveType || !input.reason) {
      throw new BadRequestException('请假类型与事由不能为空');
    }
    const startTime: Date = new Date(input.startTime);
    const endTime: Date = new Date(input.endTime);
    if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
      throw new BadRequestException('时间格式不正确');
    }
    if (endTime.getTime() <= startTime.getTime()) {
      throw new BadRequestException('结束时间必须晚于开始时间');
    }

    const inserted = await this.db
      .insert(leaveRequest)
      .values({
        applicant: applicantId,
        leaveType: input.leaveType,
        startTime,
        endTime,
        reason: input.reason,
      })
      .returning({ id: leaveRequest.id });

    this.logger.log(`新增请假申请: ${input.leaveType} (${applicantId})`);
    await this.operationLog.record({
      module: '人资管理',
      actionType: 'create',
      target: `请假申请 ${input.leaveType}`,
      operatorId: applicantId,
    });
    return { id: inserted[0].id };
  }

  async approve(
    id: string,
    action: LeaveApprovalAction,
    approverId: string,
  ): Promise<{ success: boolean }> {
    if (action !== 'approved' && action !== 'rejected') {
      throw new BadRequestException('审批动作不合法');
    }
    const existing = await this.db
      .select({
        id: leaveRequest.id,
        status: leaveRequest.status,
        leaveType: leaveRequest.leaveType,
      })
      .from(leaveRequest)
      .where(eq(leaveRequest.id, id));
    if (existing.length === 0) {
      throw new NotFoundException('请假申请不存在');
    }
    if (existing[0].status !== 'pending') {
      throw new BadRequestException('仅待审批状态的请假申请可以审批');
    }

    const updated = await this.db
      .update(leaveRequest)
      .set({ status: action, approver: approverId })
      .where(and(eq(leaveRequest.id, id), eq(leaveRequest.status, 'pending')))
      .returning({ id: leaveRequest.id });
    if (updated.length === 0) {
      throw new BadRequestException('该请假申请状态已变更，请刷新后重试');
    }

    await this.operationLog.record({
      module: '人资管理',
      actionType: 'approve',
      target: `请假申请 ${existing[0].leaveType} ${
        action === 'approved' ? '批准' : '拒绝'
      }`,
      operatorId: approverId,
    });
    return { success: true };
  }
}
