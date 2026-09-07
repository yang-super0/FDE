import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import type {
  Actor,
  ActorListResult,
  CreateActorRequest,
  UpdateActorRequest,
} from '@shared/api.interface';
import { VideoActorsService } from '../services/actors.service';
import {
  parseIdParam,
  parsePage,
  parsePageSize,
} from '@server/modules/finance-core/query.util';

@Controller('api/video-core/actors')
export class VideoActorsController {
  constructor(private readonly actorsService: VideoActorsService) {}

  @Get()
  async findAll(
    @Query('actorName') actorName?: string,
    @Query('actorType') actorType?: string,
    @Query('gender') gender?: string,
    @Query('status') status?: string,
    @Query('tag') tag?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<ActorListResult> {
    return this.actorsService.findAll({
      actorName,
      actorType,
      gender,
      status,
      tag,
      page: parsePage(page),
      pageSize: parsePageSize(pageSize),
    });
  }

  @NeedLogin()
  @Post()
  async create(@Body() dto: CreateActorRequest): Promise<{ id: number }> {
    const created: Actor = await this.actorsService.create(dto);
    return { id: created.id };
  }

  @Get(':id')
  async detail(@Param('id') id: string): Promise<Actor> {
    return this.actorsService.detail(parseIdParam(id));
  }

  @NeedLogin()
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateActorRequest,
  ): Promise<Actor> {
    return this.actorsService.update(parseIdParam(id), dto);
  }

  @NeedLogin()
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.actorsService.remove(parseIdParam(id));
  }
}
