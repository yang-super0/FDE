import { Controller, Get } from '@nestjs/common';
import { SystemService, type RoleListResponse } from './system.service';

@Controller('api/roles')
export class RoleController {
  constructor(private readonly systemService: SystemService) {}

  @Get()
  async list(): Promise<RoleListResponse> {
    return this.systemService.listRoles();
  }
}
