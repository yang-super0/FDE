import { Module } from '@nestjs/common';
import { OperationLogModule } from '../operation-log/operation-log.module';
import { CustomerController } from './customer.controller';
import { OpportunityController } from './opportunity.controller';
import { CustomerService } from './customer.service';
import { OpportunityService } from './opportunity.service';

@Module({
  imports: [OperationLogModule],
  controllers: [CustomerController, OpportunityController],
  providers: [CustomerService, OpportunityService],
})
export class CustomerModule {}
