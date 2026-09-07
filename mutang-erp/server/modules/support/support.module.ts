import { Module } from '@nestjs/common';
import { OperationLogModule } from '../operation-log/operation-log.module';
import { SupportService } from './support.service';
import { SupportTicketController } from './support.controller';
import { SupportKnowledgeDocController } from './support-knowledge-doc.controller';

@Module({
  imports: [OperationLogModule],
  controllers: [SupportTicketController, SupportKnowledgeDocController],
  providers: [SupportService],
})
export class SupportModule {}
