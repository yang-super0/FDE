import { Controller, Get, Query } from '@nestjs/common';
import { OperationLogService } from './operation-log.service';
import type {
  OperationLogListParams,
  OperationLogListResponse,
} from '@shared/api.interface';

@Controller('api/operation-logs')
export class OperationLogController {
  constructor(private readonly operationLogService: OperationLogService) {}

  @Get()
  async list(
    @Query('actionType') actionType?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<OperationLogListResponse> {
    const params: OperationLogListParams = {
      actionType,
      from,
      to,
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 20,
    };
    return this.operationLogService.findAll(params);
  }
}
