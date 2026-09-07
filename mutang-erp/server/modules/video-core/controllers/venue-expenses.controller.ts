import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import type {
  CreateVenueExpenseRequest,
  UpdateVenueExpenseRequest,
  VenueExpense,
  VenueExpenseListResult,
  VenueExpenseStatusRequest,
  VideoApproveRequest,
} from '@shared/api.interface';
import {
  parseIdParam,
  parsePage,
  parsePageSize,
  type UserContextRequest,
} from '@server/modules/finance-core/query.util';
import { VideoVenueExpensesService } from '../services/venue-expenses.service';

@Controller('api/video-core/venue-expenses')
export class VideoVenueExpensesController {
  constructor(
    private readonly venueExpensesService: VideoVenueExpensesService,
  ) {}

  @Get()
  async findAll(
    @Query('venueNo') venueNo?: string,
    @Query('venueName') venueName?: string,
    @Query('venueType') venueType?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<VenueExpenseListResult> {
    return this.venueExpensesService.findAll({
      venueNo,
      venueName,
      venueType,
      status,
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
    @Body() dto: CreateVenueExpenseRequest,
  ): Promise<{ id: number }> {
    const created: VenueExpense = await this.venueExpensesService.create(
      dto,
      req.userContext.userId,
    );
    return { id: created.id };
  }

  @Get(':id')
  async detail(@Param('id') id: string): Promise<VenueExpense> {
    return this.venueExpensesService.detail(parseIdParam(id));
  }

  @NeedLogin()
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateVenueExpenseRequest,
  ): Promise<{ success: boolean }> {
    return this.venueExpensesService.update(parseIdParam(id), dto);
  }

  @NeedLogin()
  @Post(':id/approve')
  async approve(
    @Req() req: UserContextRequest,
    @Param('id') id: string,
    @Body() dto: VideoApproveRequest,
  ): Promise<VenueExpense> {
    return this.venueExpensesService.approve(
      parseIdParam(id),
      dto,
      req.userContext.userId,
    );
  }

  @NeedLogin()
  @Post(':id/status')
  async changeStatus(
    @Param('id') id: string,
    @Body() dto: VenueExpenseStatusRequest,
  ): Promise<VenueExpense> {
    return this.venueExpensesService.changeStatus(parseIdParam(id), dto);
  }

  @NeedLogin()
  @Post(':id/deposit-return')
  async returnDeposit(@Param('id') id: string): Promise<VenueExpense> {
    return this.venueExpensesService.returnDeposit(parseIdParam(id));
  }

  @NeedLogin()
  @Post(':id/deposit-deduct')
  async deductDeposit(@Param('id') id: string): Promise<VenueExpense> {
    return this.venueExpensesService.deductDeposit(parseIdParam(id));
  }

  @NeedLogin()
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.venueExpensesService.remove(parseIdParam(id));
  }
}
