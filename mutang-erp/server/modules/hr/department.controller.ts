import { Controller, Get } from '@nestjs/common';
import type { DepartmentNode } from '@shared/api.interface';
import { DepartmentService } from './department.service';

@Controller('api/departments')
export class DepartmentController {
  constructor(private readonly departmentService: DepartmentService) {}

  @Get()
  async list(): Promise<{ items: DepartmentNode[] }> {
    return this.departmentService.listTree();
  }
}
