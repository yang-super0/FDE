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
  CreateFinanceInvoiceRequest,
  FinanceInvoice,
  FinanceInvoiceListResult,
  SendFinanceInvoiceRequest,
  UpdateFinanceInvoiceRequest,
} from '@shared/api.interface';
import { InvoicesService } from '../services/invoices.service';
import {
  parseIdParam,
  parseIdList,
  parsePage,
  parsePageSize,
  type UserContextRequest,
} from '../query.util';

interface BatchIdsBody {
  ids: number[];
}

interface BatchSendBody {
  ids: number[];
  expressNo: string;
}

@Controller('api/finance-core')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get('invoices')
  async findAll(
    @Query('invoiceNo') invoiceNo?: string,
    @Query('title') title?: string,
    @Query('customerName') customerName?: string,
    @Query('invoiceType') invoiceType?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<FinanceInvoiceListResult> {
    return this.invoicesService.findAll({
      invoiceNo,
      title,
      customerName,
      invoiceType,
      status,
      startDate,
      endDate,
      page: parsePage(page),
      pageSize: parsePageSize(pageSize),
    });
  }

  /** 静态路由声明在 :id 动态路由之前 */
  @NeedLogin()
  @Post('invoices/batch-issue')
  async batchIssue(
    @Req() req: UserContextRequest,
    @Body() body: BatchIdsBody,
  ): Promise<{ issued: number }> {
    const ids: number[] = parseIdList(body?.ids);
    return this.invoicesService.batchIssue(ids, req.userContext.userId);
  }

  @NeedLogin()
  @Post('invoices/batch-send')
  async batchSend(
    @Body() body: BatchSendBody,
  ): Promise<{ sent: number }> {
    const ids: number[] = parseIdList(body?.ids);
    return this.invoicesService.batchSend(ids, body?.expressNo ?? '');
  }

  @NeedLogin()
  @Post('invoices')
  async create(
    @Body() dto: CreateFinanceInvoiceRequest,
  ): Promise<{ id: number }> {
    const created: FinanceInvoice = await this.invoicesService.create(dto);
    return { id: created.id };
  }

  @Get('invoices/:id')
  async detail(@Param('id') id: string): Promise<FinanceInvoice> {
    return this.invoicesService.detail(parseIdParam(id));
  }

  @NeedLogin()
  @Patch('invoices/:id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateFinanceInvoiceRequest,
  ): Promise<{ success: boolean }> {
    return this.invoicesService.update(parseIdParam(id), dto);
  }

  @NeedLogin()
  @Delete('invoices/:id')
  async remove(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.invoicesService.remove(parseIdParam(id));
  }

  @NeedLogin()
  @Post('invoices/:id/issue')
  async issue(
    @Req() req: UserContextRequest,
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    return this.invoicesService.issue(parseIdParam(id), req.userContext.userId);
  }

  @NeedLogin()
  @Post('invoices/:id/send')
  async send(
    @Param('id') id: string,
    @Body() dto: SendFinanceInvoiceRequest,
  ): Promise<{ success: boolean }> {
    return this.invoicesService.send(parseIdParam(id), dto);
  }

  @NeedLogin()
  @Post('invoices/:id/receive')
  async receive(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.invoicesService.receive(parseIdParam(id));
  }

  @NeedLogin()
  @Post('invoices/:id/void')
  async voidInvoice(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.invoicesService.void(parseIdParam(id));
  }
}
