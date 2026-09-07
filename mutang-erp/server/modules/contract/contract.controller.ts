import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import type {
  Contract,
  ContractDetail,
  ContractSummary,
  PageResult,
} from '@shared/api.interface';
import { OperationLogService } from '../operation-log/operation-log.service';
import { FieldPermissionService } from '../field-permission/field-permission.service';
import type { ApproveContractDto, CreateContractDto } from './contract.dto';
import { ContractService } from './contract.service';

interface RequestWithUserContext {
  userContext: {
    userId: string;
  };
}

@Controller('api/contracts')
export class ContractController {
  constructor(
    private readonly contractService: ContractService,
    private readonly operationLogService: OperationLogService,
    private readonly fieldPermissionService: FieldPermissionService,
  ) {}

  @Get('summary')
  async getSummary(): Promise<ContractSummary> {
    return this.contractService.getSummary();
  }

  @Get()
  async list(
    @Req() req: RequestWithUserContext,
    @Query('status') status?: string,
    @Query('expireFrom') expireFrom?: string,
    @Query('expireTo') expireTo?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<PageResult<Contract>> {
    const pageNum: number = Math.max(Number(page) || 1, 1);
    const size: number = Math.min(Math.max(Number(pageSize) || 20, 1), 100);
    const result: PageResult<Contract> = await this.contractService.findAll({
      status,
      expireFrom,
      expireTo,
      page: pageNum,
      pageSize: size,
    });
    const { roleCode } = await this.fieldPermissionService.resolveUserRole(
      req.userContext.userId,
    );
    await this.fieldPermissionService.filterRows(result.items, roleCode, '合同', {
      amount: 'contract_amount',
    });
    return result;
  }

  @NeedLogin()
  @Post()
  async create(
    @Req() req: RequestWithUserContext,
    @Body() dto: CreateContractDto,
  ): Promise<{ id: string }> {
    const operatorId: string = req.userContext.userId;
    const { roleCode } = await this.fieldPermissionService.resolveUserRole(
      operatorId,
    );
    await this.fieldPermissionService.assertEditable(roleCode, '合同', [
      'contract_amount',
    ]);
    const result: { id: string } = await this.contractService.create(
      dto,
      operatorId,
    );
    await this.operationLogService.record({
      module: '合同管理',
      actionType: 'create',
      target: dto.code,
      operatorId,
    });
    return result;
  }

  @NeedLogin()
  @Post(':id/approval')
  async approve(
    @Req() req: RequestWithUserContext,
    @Param('id') id: string,
    @Body() dto: ApproveContractDto,
  ): Promise<{ success: boolean }> {
    const operatorId: string = req.userContext.userId;
    const { code }: { code: string } = await this.contractService.approve(
      id,
      dto,
      operatorId,
    );
    await this.operationLogService.record({
      module: '合同管理',
      actionType: 'approve',
      target: code,
      operatorId,
    });
    return { success: true };
  }

  @Get(':id')
  async detail(
    @Req() req: RequestWithUserContext,
    @Param('id') id: string,
  ): Promise<ContractDetail> {
    const detail: ContractDetail = await this.contractService.findDetail(id);
    const { roleCode } = await this.fieldPermissionService.resolveUserRole(
      req.userContext.userId,
    );
    await this.fieldPermissionService.filterRows([detail], roleCode, '合同', {
      amount: 'contract_amount',
    });
    return detail;
  }

  @NeedLogin()
  @Delete(':id')
  async remove(
    @Req() req: RequestWithUserContext,
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    const operatorId: string = req.userContext.userId;
    const { code }: { code: string } = await this.contractService.remove(
      id,
      operatorId,
    );
    await this.operationLogService.record({
      module: '合同管理',
      actionType: 'delete',
      target: code,
      operatorId,
    });
    return { success: true };
  }
}
