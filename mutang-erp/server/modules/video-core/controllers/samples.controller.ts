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
  BatchMailSamplesRequest,
  CreateSampleRequest,
  MailSampleRequest,
  ReturnSampleRequest,
  Sample,
  SampleListResult,
  SampleMarkRequest,
  UpdateSampleRequest,
} from '@shared/api.interface';
import {
  parseIdList,
  parseIdParam,
  parsePage,
  parsePageSize,
} from '@server/modules/finance-core/query.util';
import { VideoSamplesService } from '../services/samples.service';

@Controller('api/video-core/samples')
export class VideoSamplesController {
  constructor(private readonly samplesService: VideoSamplesService) {}

  @Get()
  async findAll(
    @Query('sampleNo') sampleNo?: string,
    @Query('productName') productName?: string,
    @Query('customerName') customerName?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<SampleListResult> {
    return this.samplesService.findAll({
      sampleNo,
      productName,
      customerName,
      status,
      startDate,
      endDate,
      page: parsePage(page),
      pageSize: parsePageSize(pageSize),
    });
  }

  /** 静态路由声明在 :id 动态路由之前 */
  @NeedLogin()
  @Post('batch-mail')
  async batchMail(
    @Body() dto: BatchMailSamplesRequest,
  ): Promise<{ updated: number; skipped: number }> {
    const ids: number[] = parseIdList(dto?.ids);
    return this.samplesService.batchMail({ ...dto, ids });
  }

  @NeedLogin()
  @Post()
  async create(
    @Body() dto: CreateSampleRequest,
  ): Promise<{ id: number }> {
    const created: Sample = await this.samplesService.create(dto);
    return { id: created.id };
  }

  @Get(':id')
  async detail(@Param('id') id: string): Promise<Sample> {
    return this.samplesService.detail(parseIdParam(id));
  }

  @NeedLogin()
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSampleRequest,
  ): Promise<{ success: boolean }> {
    return this.samplesService.update(parseIdParam(id), dto);
  }

  @NeedLogin()
  @Post(':id/mail')
  async mail(
    @Param('id') id: string,
    @Body() dto: MailSampleRequest,
  ): Promise<Sample> {
    return this.samplesService.mail(parseIdParam(id), dto);
  }

  @NeedLogin()
  @Post(':id/receive')
  async receive(@Param('id') id: string): Promise<Sample> {
    return this.samplesService.receive(parseIdParam(id));
  }

  @NeedLogin()
  @Post(':id/shooting')
  async shooting(@Param('id') id: string): Promise<Sample> {
    return this.samplesService.shooting(parseIdParam(id));
  }

  @NeedLogin()
  @Post(':id/return')
  async returnSample(
    @Param('id') id: string,
    @Body() dto: ReturnSampleRequest,
  ): Promise<Sample> {
    return this.samplesService.returnSample(parseIdParam(id), dto);
  }

  @NeedLogin()
  @Post(':id/mark')
  async mark(
    @Param('id') id: string,
    @Body() dto: SampleMarkRequest,
  ): Promise<Sample> {
    return this.samplesService.mark(parseIdParam(id), dto);
  }

  @NeedLogin()
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.samplesService.remove(parseIdParam(id));
  }
}
