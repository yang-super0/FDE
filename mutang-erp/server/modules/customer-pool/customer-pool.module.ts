import { Module } from '@nestjs/common';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';
import { PoolController } from './pool.controller';
import { PoolService } from './pool.service';

@Module({
  controllers: [PoolController, LeadsController],
  providers: [PoolService, LeadsService],
})
export class CustomerPoolModule {}
