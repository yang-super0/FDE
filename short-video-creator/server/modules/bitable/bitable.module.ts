import { Module } from '@nestjs/common';
import { FeishuModule } from '../feishu/feishu.module';
import { BitableService } from './bitable.service';

@Module({
  imports: [FeishuModule],
  providers: [BitableService],
  exports: [BitableService],
})
export class BitableModule {}
