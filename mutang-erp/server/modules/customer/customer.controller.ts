import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import type {
  Customer,
  FollowRecord,
  PageResult,
} from '@shared/api.interface';
import { CustomerService } from './customer.service';
import {
  requireUuid,
  validateCustomerPayload,
  validateCustomerPatch,
  validateFollowRecordPayload,
  type UserContextRequest,
} from './customer.dto';

@Controller('api/customers')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Get()
  async list(
    @Query('keyword') keyword?: string,
    @Query('industry') industry?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<PageResult<Customer>> {
    return this.customerService.list({
      keyword,
      industry,
      status,
      page: page ? parseInt(page, 10) || 1 : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) || 20 : 20,
    });
  }

  @NeedLogin()
  @Post()
  async create(
    @Req() req: UserContextRequest,
    @Body() body: Record<string, unknown>,
  ): Promise<{ id: string }> {
    const payload = validateCustomerPayload(body);
    return this.customerService.create(payload, req.userContext.userId);
  }

  @NeedLogin()
  @Put(':id')
  async update(
    @Req() req: UserContextRequest,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ): Promise<{ success: true }> {
    const customerId: string = requireUuid(id, '客户ID');
    const patch = validateCustomerPatch(body);
    return this.customerService.update(
      customerId,
      patch,
      req.userContext.userId,
    );
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Customer> {
    return this.customerService.findOne(requireUuid(id, '客户ID'));
  }

  @Get(':id/follow-records')
  async listFollowRecords(
    @Param('id') id: string,
  ): Promise<{ items: FollowRecord[] }> {
    return this.customerService.listFollowRecords(requireUuid(id, '客户ID'));
  }

  @NeedLogin()
  @Post(':id/follow-records')
  async addFollowRecord(
    @Req() req: UserContextRequest,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ): Promise<{ id: string }> {
    const customerId: string = requireUuid(id, '客户ID');
    const payload = validateFollowRecordPayload(body);
    return this.customerService.addFollowRecord(
      customerId,
      payload,
      req.userContext.userId,
    );
  }
}
