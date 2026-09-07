import { Module } from '@nestjs/common';
import { OperationLogModule } from '../operation-log/operation-log.module';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';

@Module({
  imports: [OperationLogModule],
  controllers: [FinanceController],
  providers: [FinanceService],
})
export class FinanceModule {}
