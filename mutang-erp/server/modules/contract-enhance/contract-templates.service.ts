import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { and, count, desc, eq, ilike, inArray, isNull, like, or } from 'drizzle-orm';
import { contractTemplates } from '@server/database/schema';
import type {
  ApplyContractTemplateResult,
  BatchToggleTemplateStatusRequest,
  ContractTemplate,
  ContractTemplateListParams,
  ContractTemplateListResult,
  ContractTemplateStatus,
  CreateContractTemplateRequest,
  UpdateContractTemplateRequest,
} from '@shared/api.interface';
import { insertWithSeqNo } from '@server/modules/finance-core/fin-seq.util';

type TemplateRow = typeof contractTemplates.$inferSelect;

const TEMPLATE_NO_PREFIX: string = 'HTMB';

const ENABLED_STATUS: string = '启用';
const DISABLED_STATUS: string = '停用';

const TEMPLATE_STATUSES: string[] = [ENABLED_STATUS, DISABLED_STATUS];

const DEFAULT_CATEGORY: string = '其他';
const DEFAULT_VERSION: string = 'v1.0';

@Injectable()
export class ContractTemplatesService {
  private readonly logger: Logger = new Logger(ContractTemplatesService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
  ) {}

  private mapTemplate(row: TemplateRow): ContractTemplate {
    let industries: string[] = [];
    try {
      const parsed: unknown = JSON.parse(row.applicableIndustry ?? '[]');
      if (Array.isArray(parsed)) {
        industries = parsed.map((item: unknown): string => String(item));
      }
    } catch {
      industries = [];
    }
    return {
      id: row.id,
      templateNo: row.templateNo,
      templateName: row.templateName,
      category: row.category,
      content: row.content,
      applicableIndustry: industries,
      status: row.status as ContractTemplateStatus,
      version: row.version,
      createdBy: row.createdBy ?? '',
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async loadRow(id: number): Promise<TemplateRow> {
    const rows: TemplateRow[] = await this.db
      .select()
      .from(contractTemplates)
      .where(and(eq(contractTemplates.id, id), isNull(contractTemplates.deletedAt)));
    if (rows.length === 0) {
      throw new NotFoundException('模板不存在');
    }
    return rows[0];
  }

  async findAll(
    params: ContractTemplateListParams,
  ): Promise<ContractTemplateListResult> {
    const page: number = Math.max(params.page ?? 1, 1);
    const pageSize: number = Math.min(Math.max(params.pageSize ?? 20, 1), 50);

    const conditions = [isNull(contractTemplates.deletedAt)];
    if (params.category) {
      conditions.push(eq(contractTemplates.category, params.category));
    }
    if (params.status) {
      conditions.push(eq(contractTemplates.status, params.status));
    }
    if (params.industry) {
      conditions.push(
        like(contractTemplates.applicableIndustry, `%"${params.industry}"%`),
      );
    }
    if (params.keyword) {
      conditions.push(
        or(
          ilike(contractTemplates.templateName, `%${params.keyword}%`),
          ilike(contractTemplates.templateNo, `%${params.keyword}%`),
        ),
      );
    }
    const where = and(...conditions);

    const rows: TemplateRow[] = await this.db
      .select()
      .from(contractTemplates)
      .where(where)
      .orderBy(desc(contractTemplates.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const totalResult: { count: number | string }[] = await this.db
      .select({ count: count() })
      .from(contractTemplates)
      .where(where);
    const total: number = Number(totalResult[0]?.count ?? 0);

    return {
      items: rows.map((row: TemplateRow): ContractTemplate => this.mapTemplate(row)),
      total,
    };
  }

  async detail(id: number): Promise<ContractTemplate> {
    return this.mapTemplate(await this.loadRow(id));
  }

  async create(
    dto: CreateContractTemplateRequest,
    userId: string,
  ): Promise<ContractTemplate> {
    if (!dto.templateName || dto.templateName.trim().length === 0) {
      throw new BadRequestException('请填写模板名称');
    }
    if (!dto.category || dto.category.trim().length === 0) {
      throw new BadRequestException('请填写模板分类');
    }
    if (!dto.content || dto.content.trim().length === 0) {
      throw new BadRequestException('请填写模板内容');
    }
    const status: string = dto.status ?? ENABLED_STATUS;
    if (!TEMPLATE_STATUSES.includes(status)) {
      throw new BadRequestException('status 仅支持「启用」或「停用」');
    }

    const industries: string[] = dto.applicableIndustry ?? [];

    const result = await insertWithSeqNo<TemplateRow>({
      db: this.db,
      table: contractTemplates,
      noColumn: contractTemplates.templateNo,
      prefix: TEMPLATE_NO_PREFIX,
      insert: (templateNo: string): Promise<TemplateRow[]> =>
        this.db
          .insert(contractTemplates)
          .values({
            templateNo,
            templateName: dto.templateName.trim(),
            category: dto.category.trim(),
            content: dto.content,
            applicableIndustry: JSON.stringify(industries),
            status,
            version: dto.version ?? DEFAULT_VERSION,
            createdBy: userId,
          })
          .returning(),
    });
    this.logger.log(`合同模板创建成功: ${result.no}`);
    return this.mapTemplate(result.row);
  }

  async update(
    id: number,
    dto: UpdateContractTemplateRequest,
  ): Promise<ContractTemplate> {
    await this.loadRow(id);

    const patch: Partial<typeof contractTemplates.$inferInsert> = {};
    if (dto.templateName !== undefined) {
      if (!dto.templateName || dto.templateName.trim().length === 0) {
        throw new BadRequestException('请填写模板名称');
      }
      patch.templateName = dto.templateName.trim();
    }
    if (dto.category !== undefined) {
      if (!dto.category || dto.category.trim().length === 0) {
        throw new BadRequestException('请填写模板分类');
      }
      patch.category = dto.category.trim();
    }
    if (dto.content !== undefined) {
      if (!dto.content || dto.content.trim().length === 0) {
        throw new BadRequestException('请填写模板内容');
      }
      patch.content = dto.content;
    }
    if (dto.applicableIndustry !== undefined) {
      patch.applicableIndustry = JSON.stringify(dto.applicableIndustry);
    }
    if (dto.status !== undefined) {
      if (!TEMPLATE_STATUSES.includes(dto.status)) {
        throw new BadRequestException('status 仅支持「启用」或「停用」');
      }
      patch.status = dto.status;
    }
    if (dto.version !== undefined) {
      patch.version = dto.version;
    }
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }
    patch.updatedAt = new Date();

    const updated: TemplateRow[] = await this.db
      .update(contractTemplates)
      .set(patch)
      .where(and(eq(contractTemplates.id, id), isNull(contractTemplates.deletedAt)))
      .returning();
    if (updated.length === 0) {
      throw new NotFoundException('模板不存在');
    }
    return this.mapTemplate(updated[0]);
  }

  async remove(id: number): Promise<void> {
    const updated: { id: number }[] = await this.db
      .update(contractTemplates)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(contractTemplates.id, id), isNull(contractTemplates.deletedAt)))
      .returning({ id: contractTemplates.id });
    if (updated.length === 0) {
      throw new NotFoundException('模板不存在');
    }
  }

  async apply(id: number): Promise<ApplyContractTemplateResult> {
    const row: TemplateRow = await this.loadRow(id);
    if (row.status !== ENABLED_STATUS) {
      throw new ConflictException('模板已停用，不可套用');
    }
    return {
      templateNo: row.templateNo,
      templateName: row.templateName,
      category: row.category,
      content: row.content,
    };
  }

  async batchToggleStatus(
    dto: BatchToggleTemplateStatusRequest,
  ): Promise<{ updated: number }> {
    if (!Array.isArray(dto.ids) || dto.ids.length === 0) {
      throw new BadRequestException('请选择要操作的模板');
    }
    if (!dto.status || !TEMPLATE_STATUSES.includes(dto.status)) {
      throw new BadRequestException('status 仅支持「启用」或「停用」');
    }

    const updated: { id: number }[] = await this.db
      .update(contractTemplates)
      .set({ status: dto.status, updatedAt: new Date() })
      .where(and(inArray(contractTemplates.id, dto.ids), isNull(contractTemplates.deletedAt)))
      .returning({ id: contractTemplates.id });
    this.logger.log(`合同模板批量状态更新: ${updated.length} 条`);
    return { updated: updated.length };
  }
}
