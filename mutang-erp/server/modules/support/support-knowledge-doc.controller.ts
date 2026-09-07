import { Controller, Get, Param, Query } from '@nestjs/common';
import type {
  KnowledgeDoc,
  KnowledgeDocDetail,
} from '@shared/api.interface';
import { SupportService } from './support.service';

@Controller('api/knowledge-docs')
export class SupportKnowledgeDocController {
  constructor(private readonly supportService: SupportService) {}

  @Get()
  async list(
    @Query('category') category?: string,
    @Query('keyword') keyword?: string,
  ): Promise<{ items: KnowledgeDoc[] }> {
    return this.supportService.findKnowledgeDocs({ category, keyword });
  }

  @Get(':id')
  async detail(@Param('id') id: string): Promise<KnowledgeDocDetail> {
    return this.supportService.getKnowledgeDoc(id);
  }
}
