import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuthNPaasService,
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { and, count, desc, eq, inArray } from 'drizzle-orm';
import {
  customer,
  reviewComment,
  videoProject,
} from '@server/database/schema';
import type {
  PageResult,
  ReviewComment,
  VideoProject,
  VideoStage,
  VideoStageStat,
} from '@shared/api.interface';

export const VIDEO_STAGES: VideoStage[] = [
  'script',
  'shooting',
  'post',
  'review',
  'delivered',
];

type VideoProjectRow = typeof videoProject.$inferSelect;

export interface VideoProjectListParams {
  stage?: string;
  page: number;
  pageSize: number;
}

export interface CreateVideoProjectInput {
  name: string;
  customerId: string;
  videoType: string;
  durationRequirement: string;
  assigneeId?: string;
  deadline: string;
}

export interface UpdateStageInput {
  stage: VideoStage;
  remark: string;
}

@Injectable()
export class VideoProjectService {
  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
    private readonly authn: AuthNPaasService,
  ) {}

  private async resolveUserNames(
    userIds: string[],
  ): Promise<Map<string, string>> {
    const uniqueIds: string[] = Array.from(
      new Set(userIds.filter((id: string) => Boolean(id))),
    );
    const nameMap: Map<string, string> = new Map();
    if (uniqueIds.length === 0) {
      return nameMap;
    }
    const users = await this.authn.listUsersByIds(uniqueIds.slice(0, 100));
    users.forEach((user, index: number) => {
      if (user) {
        nameMap.set(uniqueIds[index], user?.name?.zh_cn ?? '');
      }
    });
    return nameMap;
  }

  private async resolveCustomerNames(
    customerIds: string[],
  ): Promise<Map<string, string>> {
    const uniqueIds: string[] = Array.from(
      new Set(customerIds.filter((id: string) => Boolean(id))),
    );
    const nameMap: Map<string, string> = new Map();
    if (uniqueIds.length === 0) {
      return nameMap;
    }
    const rows = await this.db
      .select({ id: customer.id, name: customer.name })
      .from(customer)
      .where(inArray(customer.id, uniqueIds));
    rows.forEach((row: { id: string; name: string }) => {
      nameMap.set(row.id, row.name);
    });
    return nameMap;
  }

  private async mapRows(rows: VideoProjectRow[]): Promise<VideoProject[]> {
    if (rows.length === 0) {
      return [];
    }
    const customerNameMap: Map<string, string> =
      await this.resolveCustomerNames(
        rows.map((row: VideoProjectRow) => row.customerId),
      );
    const assigneeNameMap: Map<string, string> = await this.resolveUserNames(
      rows
        .map((row: VideoProjectRow) => row.assignee ?? '')
        .filter((id: string) => Boolean(id)),
    );
    return rows.map((row: VideoProjectRow): VideoProject => {
      return {
        id: row.id,
        name: row.name,
        customerId: row.customerId,
        customerName: customerNameMap.get(row.customerId) ?? '',
        videoType: row.videoType,
        durationRequirement: row.durationRequirement,
        stage: row.stage as VideoStage,
        stageRemark: row.stageRemark,
        assigneeId: row.assignee ?? '',
        assigneeName: row.assignee
          ? assigneeNameMap.get(row.assignee) ?? ''
          : '',
        deadline: row.deadline ? row.deadline.toISOString() : '',
      };
    });
  }

  async list(
    params: VideoProjectListParams,
  ): Promise<PageResult<VideoProject>> {
    const page: number = Math.max(params.page || 1, 1);
    const pageSize: number = Math.min(Math.max(params.pageSize || 20, 1), 100);

    const conditions = [];
    if (
      params.stage &&
      VIDEO_STAGES.includes(params.stage as VideoStage)
    ) {
      conditions.push(eq(videoProject.stage, params.stage));
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const rows: VideoProjectRow[] = where
      ? await this.db
          .select()
          .from(videoProject)
          .where(where)
          .orderBy(desc(videoProject.createdAt))
          .limit(pageSize)
          .offset((page - 1) * pageSize)
      : await this.db
          .select()
          .from(videoProject)
          .orderBy(desc(videoProject.createdAt))
          .limit(pageSize)
          .offset((page - 1) * pageSize);

    const totalResult = where
      ? await this.db
          .select({ count: count() })
          .from(videoProject)
          .where(where)
      : await this.db.select({ count: count() }).from(videoProject);
    const total: number = Number(totalResult[0]?.count ?? 0);

    const items: VideoProject[] = await this.mapRows(rows);
    return { items, total };
  }

  async stageStats(): Promise<{ items: VideoStageStat[] }> {
    const rows = await this.db
      .select({ stage: videoProject.stage, count: count() })
      .from(videoProject)
      .groupBy(videoProject.stage);
    const countMap: Map<string, number> = new Map();
    rows.forEach((row: { stage: string; count: number }) => {
      countMap.set(row.stage, Number(row.count));
    });
    return {
      items: VIDEO_STAGES.map(
        (stage: VideoStage): VideoStageStat => ({
          stage,
          count: countMap.get(stage) ?? 0,
        }),
      ),
    };
  }

  async create(input: CreateVideoProjectInput): Promise<{ id: string }> {
    if (!input.name || !input.name.trim()) {
      throw new BadRequestException('项目名称不能为空');
    }
    if (!input.customerId) {
      throw new BadRequestException('请选择关联客户');
    }
    if (!input.videoType) {
      throw new BadRequestException('请选择视频类型');
    }
    const deadline: Date = new Date(input.deadline);
    if (!input.deadline || Number.isNaN(deadline.getTime())) {
      throw new BadRequestException('截止日期格式不正确');
    }

    const inserted = await this.db
      .insert(videoProject)
      .values({
        name: input.name.trim(),
        customerId: input.customerId,
        videoType: input.videoType,
        durationRequirement: input.durationRequirement ?? '',
        stage: 'script',
        stageRemark: '',
        assignee: input.assigneeId || null,
        deadline,
      })
      .returning({ id: videoProject.id });
    return { id: inserted[0].id };
  }

  async findOne(id: string): Promise<VideoProject> {
    const rows: VideoProjectRow[] = await this.db
      .select()
      .from(videoProject)
      .where(eq(videoProject.id, id))
      .limit(1);
    if (rows.length === 0) {
      throw new NotFoundException('视频项目不存在');
    }
    const items: VideoProject[] = await this.mapRows(rows);
    return items[0];
  }

  async updateStage(
    id: string,
    input: UpdateStageInput,
  ): Promise<{ name: string }> {
    if (!VIDEO_STAGES.includes(input.stage)) {
      throw new BadRequestException('无效的目标阶段');
    }
    const updated = await this.db
      .update(videoProject)
      .set({
        stage: input.stage,
        stageRemark: input.remark ?? '',
      })
      .where(eq(videoProject.id, id))
      .returning({ id: videoProject.id, name: videoProject.name });
    if (updated.length === 0) {
      throw new NotFoundException('视频项目不存在');
    }
    return { name: updated[0].name };
  }

  private async assertProjectExists(projectId: string): Promise<void> {
    const rows = await this.db
      .select({ id: videoProject.id })
      .from(videoProject)
      .where(eq(videoProject.id, projectId))
      .limit(1);
    if (rows.length === 0) {
      throw new NotFoundException('视频项目不存在');
    }
  }

  async listComments(projectId: string): Promise<{ items: ReviewComment[] }> {
    await this.assertProjectExists(projectId);
    const rows = await this.db
      .select()
      .from(reviewComment)
      .where(eq(reviewComment.videoProjectId, projectId))
      .orderBy(desc(reviewComment.createdAt));
    const creatorNameMap: Map<string, string> = await this.resolveUserNames(
      rows
        .map((row) => row.createdBy ?? '')
        .filter((id: string) => Boolean(id)),
    );
    return {
      items: rows.map(
        (row): ReviewComment => ({
          id: row.id,
          content: row.content,
          creatorName: row.createdBy
            ? creatorNameMap.get(row.createdBy) ?? ''
            : '',
          createdAt: row.createdAt.toISOString(),
        }),
      ),
    };
  }

  async addComment(
    projectId: string,
    content: string,
    operatorId: string,
  ): Promise<{ id: string }> {
    if (!content || !content.trim()) {
      throw new BadRequestException('审片意见内容不能为空');
    }
    await this.assertProjectExists(projectId);
    const inserted = await this.db
      .insert(reviewComment)
      .values({
        videoProjectId: projectId,
        content: content.trim(),
        createdBy: operatorId,
      })
      .returning({ id: reviewComment.id });
    return { id: inserted[0].id };
  }
}
