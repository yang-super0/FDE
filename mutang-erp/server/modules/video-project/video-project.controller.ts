import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import { OperationLogService } from '@server/modules/operation-log/operation-log.service';
import type {
  PageResult,
  ReviewComment,
  VideoProject,
  VideoStage,
  VideoStageStat,
} from '@shared/api.interface';
import { VideoProjectService } from './video-project.service';

interface RequestContext {
  userContext: { userId: string };
}

interface CreateVideoProjectBody {
  name: string;
  customerId: string;
  videoType: string;
  durationRequirement: string;
  assigneeId?: string;
  deadline: string;
}

interface UpdateStageBody {
  stage: VideoStage;
  remark?: string;
}

interface AddCommentBody {
  content: string;
}

@Controller('api/video-projects')
export class VideoProjectController {
  constructor(
    private readonly videoProjectService: VideoProjectService,
    private readonly operationLogService: OperationLogService,
  ) {}

  @Get()
  async list(
    @Query('stage') stage?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<PageResult<VideoProject>> {
    return this.videoProjectService.list({
      stage,
      page: parseInt(page ?? '1', 10) || 1,
      pageSize: parseInt(pageSize ?? '20', 10) || 20,
    });
  }

  @Get('stage-stats')
  async stageStats(): Promise<{ items: VideoStageStat[] }> {
    return this.videoProjectService.stageStats();
  }

  @NeedLogin()
  @Post()
  async create(
    @Req() req: RequestContext,
    @Body() body: CreateVideoProjectBody,
  ): Promise<{ id: string }> {
    const result: { id: string } = await this.videoProjectService.create({
      name: body.name,
      customerId: body.customerId,
      videoType: body.videoType,
      durationRequirement: body.durationRequirement ?? '',
      assigneeId: body.assigneeId,
      deadline: body.deadline,
    });
    await this.operationLogService.record({
      module: '视频业务',
      actionType: 'create',
      target: `创建视频项目「${body.name}」`,
      operatorId: req.userContext.userId,
    });
    return result;
  }

  @Get(':id')
  async getDetail(@Param('id') id: string): Promise<VideoProject> {
    return this.videoProjectService.findOne(id);
  }

  @NeedLogin()
  @Patch(':id/stage')
  async updateStage(
    @Req() req: RequestContext,
    @Param('id') id: string,
    @Body() body: UpdateStageBody,
  ): Promise<{ success: boolean }> {
    const result: { name: string } = await this.videoProjectService.updateStage(
      id,
      {
        stage: body.stage,
        remark: body.remark ?? '',
      },
    );
    await this.operationLogService.record({
      module: '视频业务',
      actionType: 'status_change',
      target: `更新视频项目「${result.name}」阶段为 ${body.stage}`,
      operatorId: req.userContext.userId,
    });
    return { success: true };
  }

  @Get(':id/review-comments')
  async listReviewComments(
    @Param('id') id: string,
  ): Promise<{ items: ReviewComment[] }> {
    return this.videoProjectService.listComments(id);
  }

  @NeedLogin()
  @Post(':id/review-comments')
  async addReviewComment(
    @Req() req: RequestContext,
    @Param('id') id: string,
    @Body() body: AddCommentBody,
  ): Promise<{ id: string }> {
    const result: { id: string } = await this.videoProjectService.addComment(
      id,
      body.content,
      req.userContext.userId,
    );
    await this.operationLogService.record({
      module: '视频业务',
      actionType: 'create',
      target: '添加审片意见',
      operatorId: req.userContext.userId,
    });
    return result;
  }
}
