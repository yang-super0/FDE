import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import type { Announcement, PageResult } from '@shared/api.interface';
import { AdminAffairService } from './admin-affair.service';
import { CreateAnnouncementDto } from './dto/admin-affair.dto';

interface UserContextRequest {
  userContext: { userId: string };
}

@Controller('api/announcements')
export class AnnouncementController {
  constructor(private readonly adminAffairService: AdminAffairService) {}

  @Get()
  async list(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<PageResult<Announcement>> {
    const pageParam: number = Math.max(parseInt(page ?? '1', 10) || 1, 1);
    const pageSizeParam: number = Math.min(
      Math.max(parseInt(pageSize ?? '20', 10) || 20, 1),
      100,
    );
    return this.adminAffairService.listAnnouncements({
      page: pageParam,
      pageSize: pageSizeParam,
    });
  }

  @NeedLogin()
  @Post()
  async create(
    @Req() req: UserContextRequest,
    @Body() dto: CreateAnnouncementDto,
  ): Promise<{ id: string }> {
    if (!dto.title?.trim() || !dto.content?.trim()) {
      throw new BadRequestException('公告标题和正文不能为空');
    }
    return this.adminAffairService.createAnnouncement({
      title: dto.title.trim(),
      content: dto.content.trim(),
      operatorId: req.userContext.userId,
    });
  }
}
