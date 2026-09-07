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
  CreateHrSalaryBody,
  HrSalary,
  HrSalaryBatchCalculateBody,
  HrSalaryPage,
  HrSalaryPayslip,
  UpdateHrSalaryBody,
} from '@shared/api.interface';
import {
  parseIdParam,
  type UserContextRequest,
} from '../finance-core/query.util';
import { FieldPermissionService } from '../field-permission/field-permission.service';
import { HrSalariesService } from './hr-salaries.service';

/** 人资模块：工资对象属性名 → field_permissions.field_name */
const HR_SALARY_FIELD_MAP: Record<string, string> = {
  baseSalary: 'base_salary',
  performanceSalary: 'performance_salary',
  allowance: 'allowance',
  deduction: 'deduction',
  tax: 'tax',
  socialInsurance: 'social_insurance',
  actualSalary: 'actual_salary',
};

const HR_SALARY_FIELD_NAMES: string[] = Object.values(HR_SALARY_FIELD_MAP);

/** 工资条 breakdown 标签 → 工资对象属性名（用于联动脱敏） */
const HR_SALARY_BREAKDOWN_PROP_MAP: Record<string, string> = {
  基本工资: 'baseSalary',
  绩效工资: 'performanceSalary',
  补贴: 'allowance',
  扣款: 'deduction',
  个税: 'tax',
  社保: 'socialInsurance',
  实发工资: 'actualSalary',
};

const MASKED_VALUE: string = '****';

@Controller('api/hr-enhance/salaries')
export class HrSalariesController {
  constructor(
    private readonly salariesService: HrSalariesService,
    private readonly fieldPermissionService: FieldPermissionService,
  ) {}

  private async resolveRoleCode(req: UserContextRequest): Promise<string> {
    const { roleCode } = await this.fieldPermissionService.resolveUserRole(
      req?.userContext?.userId ?? '',
    );
    return roleCode;
  }

  @Get()
  async list(
    @Req() req: UserContextRequest,
    @Query('salaryMonth') salaryMonth?: string,
    @Query('department') department?: string,
    @Query('employeeName') employeeName?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<HrSalaryPage> {
    const roleCode: string = await this.resolveRoleCode(req);
    const result: HrSalaryPage = await this.salariesService.list({
      salaryMonth,
      department,
      employeeName,
      status,
      page,
      pageSize,
    });
    await this.fieldPermissionService.filterRows(
      result.items,
      roleCode,
      '人资',
      HR_SALARY_FIELD_MAP,
    );
    return result;
  }

  @NeedLogin()
  @Post()
  async create(
    @Req() req: UserContextRequest,
    @Body() dto: CreateHrSalaryBody,
  ): Promise<HrSalary> {
    const roleCode: string = await this.resolveRoleCode(req);
    await this.fieldPermissionService.assertEditable(
      roleCode,
      '人资',
      HR_SALARY_FIELD_NAMES,
    );
    const created: HrSalary = await this.salariesService.create(dto);
    await this.fieldPermissionService.filterRows(
      [created],
      roleCode,
      '人资',
      HR_SALARY_FIELD_MAP,
    );
    return created;
  }

  @NeedLogin()
  @Post('batch-calculate')
  async batchCalculate(
    @Body() body: HrSalaryBatchCalculateBody,
  ): Promise<{ updated: number }> {
    return {
      updated: await this.salariesService.batchCalculate(body?.salaryMonth),
    };
  }

  @NeedLogin()
  @Post('batch-pay')
  async batchPay(
    @Body() body: HrSalaryBatchCalculateBody,
  ): Promise<{ updated: number }> {
    return { updated: await this.salariesService.batchPay(body?.salaryMonth) };
  }

  @NeedLogin()
  @Patch(':id')
  async update(
    @Req() req: UserContextRequest,
    @Param('id') id: string,
    @Body() dto: UpdateHrSalaryBody,
  ): Promise<HrSalary> {
    const roleCode: string = await this.resolveRoleCode(req);
    await this.fieldPermissionService.assertEditable(
      roleCode,
      '人资',
      HR_SALARY_FIELD_NAMES,
    );
    const updated: HrSalary = await this.salariesService.update(
      parseIdParam(id),
      dto,
    );
    await this.fieldPermissionService.filterRows(
      [updated],
      roleCode,
      '人资',
      HR_SALARY_FIELD_MAP,
    );
    return updated;
  }

  @NeedLogin()
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.salariesService.remove(parseIdParam(id));
  }

  @NeedLogin()
  @Post(':id/calculate')
  async calculate(@Param('id') id: string): Promise<HrSalary> {
    return this.salariesService.calculate(parseIdParam(id));
  }

  @NeedLogin()
  @Post(':id/pay')
  async pay(@Param('id') id: string): Promise<HrSalary> {
    return this.salariesService.pay(parseIdParam(id));
  }

  @NeedLogin()
  @Post(':id/confirm')
  async confirm(@Param('id') id: string): Promise<HrSalary> {
    return this.salariesService.confirm(parseIdParam(id));
  }

  @Get(':id/payslip')
  async payslip(
    @Req() req: UserContextRequest,
    @Param('id') id: string,
  ): Promise<HrSalaryPayslip> {
    const roleCode: string = await this.resolveRoleCode(req);
    const result: HrSalaryPayslip = await this.salariesService.payslip(
      parseIdParam(id),
    );
    await this.fieldPermissionService.filterRows(
      [result.salary],
      roleCode,
      '人资',
      HR_SALARY_FIELD_MAP,
    );
    // breakdown 与过滤后的 salary 字段联动，避免明细泄露
    for (const item of result.breakdown) {
      const prop: string | undefined =
        HR_SALARY_BREAKDOWN_PROP_MAP[item.label];
      if (!prop) {
        continue;
      }
      const value: string | null = result.salary[
        prop as keyof HrSalary
      ] as string | null;
      if (value === null) {
        item.amount = '—';
      } else if (value === MASKED_VALUE) {
        item.amount = MASKED_VALUE;
      }
    }
    return result;
  }
}
