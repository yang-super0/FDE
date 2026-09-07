import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { and, count, desc, eq, ilike, isNull } from 'drizzle-orm';
import { outsourcingVendors } from '@server/database/schema';
import type {
  CreateOutsourcingVendorRequest,
  OutsourcingVendor,
  OutsourcingVendorListParams,
  OutsourcingVendorListResult,
  UpdateOutsourcingVendorRequest,
} from '@shared/api.interface';
import { publishSyncEvent } from '@server/modules/feishu-sync/sync-event.publisher';

type VendorRow = typeof outsourcingVendors.$inferSelect;
type VendorInsert = typeof outsourcingVendors.$inferInsert;

@Injectable()
export class VideoVendorsService {
  private readonly logger: Logger = new Logger(VideoVendorsService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
  ) {}

  private mapVendor(row: VendorRow): OutsourcingVendor {
    return {
      id: row.id,
      vendorName: row.vendorName,
      vendorType: row.vendorType ?? '',
      contactPerson: row.contactPerson ?? '',
      phone: row.phone ?? '',
      wechat: row.wechat ?? '',
      email: row.email ?? '',
      address: row.address ?? '',
      cooperationLevel: row.cooperationLevel ?? '',
      settlementMethod: row.settlementMethod ?? '',
      taxRate: Number(row.taxRate ?? 0),
      bankAccount: row.bankAccount ?? '',
      bankName: row.bankName ?? '',
      status: row.status,
      remark: row.remark ?? '',
      createdAt: row.createdAt.toISOString(),
    };
  }

  async findAll(
    params: OutsourcingVendorListParams,
  ): Promise<OutsourcingVendorListResult> {
    const page: number = Math.max(params.page ?? 1, 1);
    const pageSize: number = Math.min(Math.max(params.pageSize ?? 20, 1), 50);

    const conditions = [isNull(outsourcingVendors.deletedAt)];
    if (params.vendorName) {
      conditions.push(
        ilike(outsourcingVendors.vendorName, `%${params.vendorName}%`),
      );
    }
    if (params.vendorType) {
      conditions.push(eq(outsourcingVendors.vendorType, params.vendorType));
    }
    if (params.status) {
      conditions.push(eq(outsourcingVendors.status, params.status));
    }
    const where = and(...conditions);

    const rows: VendorRow[] = await this.db
      .select()
      .from(outsourcingVendors)
      .where(where)
      .orderBy(desc(outsourcingVendors.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const totalResult: { count: number | string }[] = await this.db
      .select({ count: count() })
      .from(outsourcingVendors)
      .where(where);
    const total: number = Number(totalResult[0]?.count ?? 0);

    return {
      items: rows.map((row: VendorRow): OutsourcingVendor =>
        this.mapVendor(row),
      ),
      total,
    };
  }

  async detail(id: number): Promise<OutsourcingVendor> {
    const rows: VendorRow[] = await this.db
      .select()
      .from(outsourcingVendors)
      .where(
        and(
          eq(outsourcingVendors.id, id),
          isNull(outsourcingVendors.deletedAt),
        ),
      );
    if (rows.length === 0) {
      throw new NotFoundException('供应商不存在');
    }
    return this.mapVendor(rows[0]);
  }

  async create(dto: CreateOutsourcingVendorRequest): Promise<OutsourcingVendor> {
    if (!dto.vendorName || dto.vendorName.trim().length === 0) {
      throw new BadRequestException('请填写供应商名称');
    }

    const values: VendorInsert = {
      vendorName: dto.vendorName.trim(),
      vendorType: dto.vendorType ?? '其他',
      contactPerson: dto.contactPerson ?? '',
      phone: dto.phone ?? '',
      wechat: dto.wechat ?? '',
      email: dto.email ?? '',
      address: dto.address ?? '',
      cooperationLevel: dto.cooperationLevel ?? '普通',
      settlementMethod: dto.settlementMethod ?? '月结',
      taxRate: String(dto.taxRate ?? 0),
      bankAccount: dto.bankAccount ?? '',
      bankName: dto.bankName ?? '',
      status: dto.status ?? '合作中',
      remark: dto.remark ?? '',
    };

    const inserted: VendorRow = await this.db.transaction(
      async (tx): Promise<VendorRow> => {
        const rows: VendorRow[] = await tx
          .insert(outsourcingVendors)
          .values(values)
          .returning();
        if (rows.length === 0) {
          throw new BadRequestException('创建失败');
        }
        return rows[0];
      },
    );
    this.logger.log(`供应商创建成功: ${inserted.vendorName}`);
    publishSyncEvent('outsourcing_vendors', inserted.id, 'create');
    return this.mapVendor(inserted);
  }

  async update(
    id: number,
    dto: UpdateOutsourcingVendorRequest,
  ): Promise<OutsourcingVendor> {
    const rows: VendorRow[] = await this.db
      .select()
      .from(outsourcingVendors)
      .where(
        and(
          eq(outsourcingVendors.id, id),
          isNull(outsourcingVendors.deletedAt),
        ),
      );
    if (rows.length === 0) {
      throw new NotFoundException('供应商不存在');
    }

    const patch: Partial<VendorInsert> = {};
    if (dto.vendorName !== undefined) {
      if (dto.vendorName.trim().length === 0) {
        throw new BadRequestException('供应商名称不能为空');
      }
      patch.vendorName = dto.vendorName.trim();
    }
    if (dto.vendorType !== undefined) {
      patch.vendorType = dto.vendorType;
    }
    if (dto.contactPerson !== undefined) {
      patch.contactPerson = dto.contactPerson;
    }
    if (dto.phone !== undefined) {
      patch.phone = dto.phone;
    }
    if (dto.wechat !== undefined) {
      patch.wechat = dto.wechat;
    }
    if (dto.email !== undefined) {
      patch.email = dto.email;
    }
    if (dto.address !== undefined) {
      patch.address = dto.address;
    }
    if (dto.cooperationLevel !== undefined) {
      patch.cooperationLevel = dto.cooperationLevel;
    }
    if (dto.settlementMethod !== undefined) {
      patch.settlementMethod = dto.settlementMethod;
    }
    if (dto.taxRate !== undefined) {
      patch.taxRate = String(dto.taxRate);
    }
    if (dto.bankAccount !== undefined) {
      patch.bankAccount = dto.bankAccount;
    }
    if (dto.bankName !== undefined) {
      patch.bankName = dto.bankName;
    }
    if (dto.status !== undefined) {
      patch.status = dto.status;
    }
    if (dto.remark !== undefined) {
      patch.remark = dto.remark;
    }
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }
    patch.updatedAt = new Date();

    const updated: VendorRow = await this.db.transaction(
      async (tx): Promise<VendorRow> => {
        const result: VendorRow[] = await tx
          .update(outsourcingVendors)
          .set(patch)
          .where(
            and(
              eq(outsourcingVendors.id, id),
              isNull(outsourcingVendors.deletedAt),
            ),
          )
          .returning();
        if (result.length === 0) {
          throw new NotFoundException('供应商不存在');
        }
        return result[0];
      },
    );
    this.logger.log(`供应商更新成功: ${String(id)}`);
    publishSyncEvent('outsourcing_vendors', id, 'update');
    return this.mapVendor(updated);
  }

  async remove(id: number): Promise<{ success: boolean }> {
    const rows: VendorRow[] = await this.db
      .select()
      .from(outsourcingVendors)
      .where(
        and(
          eq(outsourcingVendors.id, id),
          isNull(outsourcingVendors.deletedAt),
        ),
      );
    if (rows.length === 0) {
      throw new NotFoundException('供应商不存在');
    }

    const now: Date = new Date();
    const updated: { id: number }[] = await this.db
      .update(outsourcingVendors)
      .set({ deletedAt: now, updatedAt: now })
      .where(
        and(
          eq(outsourcingVendors.id, id),
          isNull(outsourcingVendors.deletedAt),
        ),
      )
      .returning({ id: outsourcingVendors.id });
    if (updated.length === 0) {
      throw new NotFoundException('供应商不存在');
    }
    publishSyncEvent('outsourcing_vendors', id, 'delete');
    return { success: true };
  }
}
