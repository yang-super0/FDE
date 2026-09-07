import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import type { LeaveRequest } from '@shared/api.interface';
import { LeaveService } from './leave.service';
import type { ApprovalInput, CreateLeaveInput } from './hr.dto';

@Controller('api/leaves')
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  @Get()
  async list(@Query('status') status?: string): Promise<{
    items: LeaveRequest[];
  }> {
    return this.leaveService.list(status);
  }

  @NeedLogin()
  @Post()
  async create(
    @Req() req: Request,
    @Body() body: CreateLeaveInput,
  ): Promise<{ id: string }> {
    const { userId } = req.userContext;
    return this.leaveService.create(body, userId);
  }

  @NeedLogin()
  @Post(':id/approval')
  async approve(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: ApprovalInput,
  ): Promise<{ success: boolean }> {
    const { userId } = req.userContext;
    return this.leaveService.approve(id, body.action, userId);
  }
}
