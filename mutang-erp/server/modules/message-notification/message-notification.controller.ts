import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import type {
  MessageNotificationCreateDto,
  MessageNotificationItem,
  MessageNotificationListParams,
  MessageNotificationListResponse,
  MessageNotificationPushStatsResponse,
} from '@shared/api.interface';
import { MessageNotificationService } from './message-notification.service';

interface RequestWithUserContext {
  userContext: {
    userId: string;
  };
}

const parseId = (value: string): number => {
  const parsed: number = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new BadRequestException('无效的消息ID');
  }
  return parsed;
};

@Controller('api/message-notifications')
export class MessageNotificationController {
  constructor(
    private readonly messageNotificationService: MessageNotificationService,
  ) {}

  @NeedLogin()
  @Get()
  async listMy(
    @Req() req: RequestWithUserContext,
    @Query() query: MessageNotificationListParams,
  ): Promise<MessageNotificationListResponse> {
    return this.messageNotificationService.listMyMessages(
      req.userContext.userId,
      query,
    );
  }

  @NeedLogin()
  @Get('unread-count')
  async unreadCount(@Req() req: RequestWithUserContext): Promise<{
    unreadCount: number;
  }> {
    const unreadCount: number =
      await this.messageNotificationService.getUnreadCount(
        req.userContext.userId,
      );
    return { unreadCount };
  }

  @NeedLogin()
  @Get('push-logs')
  async pushLogs(
    @Query('msgType') msgType?: string,
    @Query('pushStatus') pushStatus?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<{
    items: MessageNotificationItem[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    return this.messageNotificationService.listPushLogs({
      msgType,
      pushStatus,
      page,
      pageSize,
    });
  }

  @NeedLogin()
  @Get('push-stats')
  async pushStats(): Promise<MessageNotificationPushStatsResponse> {
    return this.messageNotificationService.getPushStats();
  }

  @NeedLogin()
  @Post()
  async create(
    @Req() req: RequestWithUserContext,
    @Body() dto: MessageNotificationCreateDto,
  ): Promise<MessageNotificationItem> {
    return this.messageNotificationService.create(
      dto,
      req.userContext.userId,
    );
  }

  @NeedLogin()
  @Post('read-all')
  async readAll(@Req() req: RequestWithUserContext): Promise<{
    updated: number;
  }> {
    return this.messageNotificationService.markAllRead(
      req.userContext.userId,
    );
  }

  @NeedLogin()
  @Post('warnings/run')
  async runWarnings(): Promise<{ created: number }> {
    return this.messageNotificationService.runWarnings();
  }

  @NeedLogin()
  @Post(':id/read')
  async markRead(
    @Req() req: RequestWithUserContext,
    @Param('id') id: string,
  ): Promise<MessageNotificationItem> {
    return this.messageNotificationService.markRead(
      parseId(id),
      req.userContext.userId,
    );
  }

  @NeedLogin()
  @Post(':id/retry-push')
  async retryPush(
    @Param('id') id: string,
  ): Promise<MessageNotificationItem> {
    return this.messageNotificationService.retryPush(parseId(id));
  }
}
