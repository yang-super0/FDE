import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import type { Request } from 'express';
import type {
  ApplyContractTemplateResult,
  BatchToggleTemplateStatusRequest,
  ContractTemplate,
  ContractTemplateListResult,
  CreateContractTemplateRequest,
  UpdateContractTemplateRequest,
} from '@shared/api.interface';
import { ContractTemplatesService } from './contract-templates.service';

@Controller('api/contract-templates')
export class ContractTemplatesController {
  constructor(
    private readonly templatesService: ContractTemplatesService,
  ) {}

  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
    @Query('industry') industry?: string,
    @Query('keyword') keyword?: string,
  ): Promise<ContractTemplateListResult> {
    return this.templatesService.findAll({
      page: Number(page ?? 1) || 1,
      pageSize: Number(pageSize ?? 20) || 20,
      category: category || undefined,
      status: status || undefined,
      industry: industry || undefined,
      keyword: keyword || undefined,
    });
  }

  /** 静态路由声明在 :id 动态路由之前 */
  @NeedLogin()
  @Post('batch-toggle-status')
  async batchToggleStatus(
    @Body() dto: BatchToggleTemplateStatusRequest,
  ): Promise<{ updated: number }> {
    const ids: number[] = Array.isArray(dto?.ids)
      ? dto.ids.map((id: number): number => Number(id))
      : [];
    return this.templatesService.batchToggleStatus({
      ids,
      status: dto?.status,
    });
  }

  @NeedLogin()
  @Post()
  async create(
    @Req() req: Request,
    @Body() dto: CreateContractTemplateRequest,
  ): Promise<ContractTemplate> {
    const { userId } = req.userContext;
    return this.templatesService.create(dto, userId);
  }

  @Get(':id')
  async detail(@Param('id') id: string): Promise<ContractTemplate> {
    return this.templatesService.detail(this.parseId(id));
  }

  @NeedLogin()
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateContractTemplateRequest,
  ): Promise<ContractTemplate> {
    return this.templatesService.update(this.parseId(id), dto);
  }

  @NeedLogin()
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    await this.templatesService.remove(this.parseId(id));
  }

  @NeedLogin()
  @Post(':id/apply')
  async apply(@Param('id') id: string): Promise<ApplyContractTemplateResult> {
    return this.templatesService.apply(this.parseId(id));
  }

  private parseId(id: string): number {
    const parsed: number = Number(id);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new BadRequestException('无效的模板 ID');
    }
    return parsed;
  }
}
