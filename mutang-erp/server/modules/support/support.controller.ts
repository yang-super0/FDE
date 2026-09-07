import {
  BadRequestException,
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
import type { PageResult, Ticket, TicketSummary } from '@shared/api.interface';
import {
  SupportService,
  type TicketListParams,
} from './support.service';

interface RequestWithUserContext {
  userContext: { userId: string };
}

interface CreateTicketBody {
  category: string;
  title: string;
  description: string;
}

interface UpdateTicketBody {
  status: 'processing' | 'resolved';
  resolution?: string;
}

@Controller('api/tickets')
export class SupportTicketController {
  constructor(private readonly supportService: SupportService) {}

  @Get('summary')
  async summary(): Promise<TicketSummary> {
    return this.supportService.getTicketSummary();
  }

  @Get()
  async list(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<PageResult<Ticket>> {
    const params: TicketListParams = {
      status,
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 20,
    };
    return this.supportService.findTickets(params);
  }

  @NeedLogin()
  @Post()
  async create(
    @Req() req: RequestWithUserContext,
    @Body() body: CreateTicketBody,
  ): Promise<{ id: string }> {
    const { userId } = req.userContext;
    return this.supportService.createTicket({
      category: body.category,
      title: body.title,
      description: body.description,
      operatorId: userId,
    });
  }

  @NeedLogin()
  @Patch(':id')
  async updateStatus(
    @Req() req: RequestWithUserContext,
    @Param('id') id: string,
    @Body() body: UpdateTicketBody,
  ): Promise<{ success: boolean }> {
    if (body.status !== 'processing' && body.status !== 'resolved') {
      throw new BadRequestException('status 仅支持 processing 或 resolved');
    }
    const { userId } = req.userContext;
    return this.supportService.updateTicketStatus({
      id,
      status: body.status,
      resolution: body.resolution,
      operatorId: userId,
    });
  }
}
