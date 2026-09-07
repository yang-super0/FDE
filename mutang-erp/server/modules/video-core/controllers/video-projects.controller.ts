import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import type {
  CreateVideoCoreProjectRequest,
  UpdateVideoCoreProjectRequest,
  VideoCoreDeliverable,
  VideoCoreProject,
  VideoCoreProjectListResult,
  VideoCoreProjectNode,
  VideoCoreProjectStatus,
  VideoCoreProjectStatusRequest,
} from '@shared/api.interface';
import { VideoProjectsService } from '../services/video-projects.service';
import {
  parseIdParam,
  parsePage,
  type UserContextRequest,
} from '@server/modules/finance-core/query.util';

const DEFAULT_PAGE_SIZE: number = 10;
const MAX_PAGE_SIZE: number = 100;

const parsePageSize = (value?: string): number => {
  const parsed: number = value ? parseInt(value, 10) : DEFAULT_PAGE_SIZE;
  if (Number.isNaN(parsed) || parsed < 1) {
    return DEFAULT_PAGE_SIZE;
  }
  return Math.min(parsed, MAX_PAGE_SIZE);
};

interface UpdateNodesBody {
  nodes: VideoCoreProjectNode[];
}

interface UpdateDeliverablesBody {
  deliverables: VideoCoreDeliverable[];
}

@Controller('api/video-core/projects')
export class VideoProjectsController {
  constructor(private readonly videoProjectsService: VideoProjectsService) {}

  @Get()
  async findAll(
    @Query('projectNo') projectNo?: string,
    @Query('projectName') projectName?: string,
    @Query('customerName') customerName?: string,
    @Query('status') status?: string,
    @Query('projectManager') projectManager?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<VideoCoreProjectListResult> {
    return this.videoProjectsService.findAll({
      projectNo,
      projectName,
      customerName,
      status,
      projectManager,
      startDate,
      endDate,
      page: parsePage(page),
      pageSize: parsePageSize(pageSize),
    });
  }

  @NeedLogin()
  @Post()
  async create(
    @Req() req: UserContextRequest,
    @Body() dto: CreateVideoCoreProjectRequest,
  ): Promise<{ id: number }> {
    const created: VideoCoreProject = await this.videoProjectsService.create(
      dto,
      req.userContext.userId,
    );
    return { id: created.id };
  }

  @Get(':id')
  async detail(@Param('id') id: string): Promise<VideoCoreProject> {
    return this.videoProjectsService.detail(parseIdParam(id));
  }

  @NeedLogin()
  @Patch(':id')
  async update(
    @Req() req: UserContextRequest,
    @Param('id') id: string,
    @Body() dto: UpdateVideoCoreProjectRequest,
  ): Promise<{ success: boolean }> {
    return this.videoProjectsService.update(
      parseIdParam(id),
      dto,
      req.userContext.userId,
    );
  }

  @NeedLogin()
  @Put(':id/nodes')
  async updateNodes(
    @Req() req: UserContextRequest,
    @Param('id') id: string,
    @Body() body: UpdateNodesBody,
  ): Promise<VideoCoreProject> {
    if (!Array.isArray(body?.nodes)) {
      throw new BadRequestException('请提供节点数组');
    }
    return this.videoProjectsService.updateNodes(
      parseIdParam(id),
      body.nodes,
      req.userContext.userId,
    );
  }

  @NeedLogin()
  @Put(':id/deliverables')
  async updateDeliverables(
    @Req() req: UserContextRequest,
    @Param('id') id: string,
    @Body() body: UpdateDeliverablesBody,
  ): Promise<VideoCoreProject> {
    if (!Array.isArray(body?.deliverables)) {
      throw new BadRequestException('请提供交付物数组');
    }
    return this.videoProjectsService.updateDeliverables(
      parseIdParam(id),
      body.deliverables,
      req.userContext.userId,
    );
  }

  @NeedLogin()
  @Post(':id/status')
  async updateStatus(
    @Req() req: UserContextRequest,
    @Param('id') id: string,
    @Body() body: VideoCoreProjectStatusRequest,
  ): Promise<{ success: boolean }> {
    const status: VideoCoreProjectStatus = body?.status;
    return this.videoProjectsService.updateStatus(
      parseIdParam(id),
      status,
      req.userContext.userId,
    );
  }

  @NeedLogin()
  @Delete(':id')
  async remove(
    @Req() req: UserContextRequest,
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    return this.videoProjectsService.remove(
      parseIdParam(id),
      req.userContext.userId,
    );
  }
}
