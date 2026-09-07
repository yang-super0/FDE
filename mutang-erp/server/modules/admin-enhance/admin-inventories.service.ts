import {
  BadRequestException, ConflictException, Inject, Injectable, Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  DRIZZLE_DATABASE, type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import {
  and, asc, count, desc, eq, gte, ilike, inArray, isNull, lte, or, type SQL,
} from 'drizzle-orm';
import { adminInventories, inventoryCheckDetails } from '@server/database/schema';
import type {
  AdminEnhanceCheckDetailInput, AdminEnhanceCheckSubmitDto,
  AdminEnhanceListResponse, AdminInventoryCheck, CreateAdminInventoryCheckDto,
  InventoryCheckDetail, InventoryCheckDetailListResponse, UpdateAdminInventoryCheckDto,
} from '@shared/api.interface';
import { insertWithSeqNo } from '../finance-core/fin-seq.util';
import { parseIdList } from '../finance-core/query.util';
import {
  assertAdminNonNegativeInt, assertAdminRequired, decreaseInventoryStock,
  formatAdminDateTime, increaseInventoryStock, resolveAdminPagination,
} from './admin-enhance-shared.util';

type CheckRow = typeof adminInventories.$inferSelect;
type CheckInsert = typeof adminInventories.$inferInsert;
type DetailRow = typeof inventoryCheckDetails.$inferSelect;

interface ParsedCheckDetail {
  itemName: string; specification: string; bookQuantity: number;
  actualQuantity: number | null; difference: number | null; status: string;
  remark: string;
}

const CHECK_NO_PREFIX: string = 'PD';
const DETAIL_NO_PREFIX: string = 'PDMX';
const STATUS_CHECKING: string = '盘点中';
const STATUS_DIFF: string = '有差异';
const STATUS_DONE: string = '已完成';

function mapCheck(row: CheckRow): AdminInventoryCheck {
  return {
    id: row.id, inventoryCheckNo: row.inventoryCheckNo, checkDate: row.checkDate,
    checker: row.checker, department: row.department, location: row.location,
    status: row.status, totalItems: row.totalItems, matchedItems: row.matchedItems,
    differenceItems: row.differenceItems, differenceSummary: row.differenceSummary,
    remark: row.remark, createdAt: formatAdminDateTime(row.createdAt) ?? '',
    updatedAt: formatAdminDateTime(row.updatedAt) ?? '',
  };
}

function mapDetail(row: DetailRow): InventoryCheckDetail {
  return {
    id: row.id, detailNo: row.detailNo, checkId: row.checkId,
    itemName: row.itemName, specification: row.specification,
    bookQuantity: row.bookQuantity, actualQuantity: row.actualQuantity ?? null,
    difference: row.difference ?? null, status: row.status, remark: row.remark,
    createdAt: formatAdminDateTime(row.createdAt) ?? '', updatedAt: formatAdminDateTime(row.updatedAt) ?? '',
  };
}

@Injectable()
export class AdminInventoryChecksService {
  private readonly logger = new Logger(AdminInventoryChecksService.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  async list(params: {
    department?: string; status?: string; dateFrom?: string;
    dateTo?: string; keyword?: string; page?: string; pageSize?: string;
  }): Promise<AdminEnhanceListResponse<AdminInventoryCheck>> {
    const { page, pageSize, offset } = resolveAdminPagination(params.page, params.pageSize);
    const conditions: SQL[] = [isNull(adminInventories.deletedAt)];
    if (params.department)
      conditions.push(eq(adminInventories.department, params.department));
    if (params.status) conditions.push(eq(adminInventories.status, params.status));
    if (params.dateFrom)
      conditions.push(gte(adminInventories.checkDate, params.dateFrom));
    if (params.dateTo)
      conditions.push(lte(adminInventories.checkDate, params.dateTo));
    if (params.keyword) {
      const kw: string = `%${params.keyword}%`;
      const keywordCond = or(
        ilike(adminInventories.inventoryCheckNo, kw),
        ilike(adminInventories.checker, kw),
      );
      if (keywordCond) conditions.push(keywordCond);
    }
    const where = and(...conditions);
    const totalRows: { count: number | string }[] = await this.db
      .select({ count: count() }).from(adminInventories).where(where);
    const rows: CheckRow[] = await this.db.select().from(adminInventories)
      .where(where).orderBy(desc(adminInventories.id))
      .limit(pageSize).offset(offset);
    return {
      items: rows.map((row: CheckRow) => mapCheck(row)),
      total: Number(totalRows[0]?.count ?? 0), page, pageSize,
    };
  }

  async create(dto: CreateAdminInventoryCheckDto): Promise<AdminInventoryCheck> {
    assertAdminRequired(dto?.checkDate, '盘点日期');
    assertAdminRequired(dto?.checker, '盘点人');
    const { row } = await insertWithSeqNo<CheckRow>({
      db: this.db, table: adminInventories,
      noColumn: adminInventories.inventoryCheckNo, prefix: CHECK_NO_PREFIX,
      insert: (no: string) =>
        this.db.insert(adminInventories).values({
          inventoryCheckNo: no, checkDate: String(dto.checkDate).trim(),
          checker: String(dto.checker).trim(), department: dto?.department ?? '',
          location: dto?.location ?? '', status: STATUS_CHECKING, totalItems: 0,
          matchedItems: 0, differenceItems: 0, differenceSummary: '',
          remark: dto?.remark ?? '',
        } satisfies CheckInsert).returning(),
    });
    this.logger.log(`盘点单创建成功 id=${String(row.id)} no=${row.inventoryCheckNo}`);
    return mapCheck(row);
  }

  async update(id: number, dto: UpdateAdminInventoryCheckDto): Promise<AdminInventoryCheck> {
    const existing: CheckRow = await this.findCheckOrThrow(id);
    if (existing.status !== STATUS_CHECKING)
      throw new ConflictException('只有盘点中的盘点单可以修改');
    const patch: Partial<CheckInsert> = {};
    if (dto?.checkDate !== undefined) {
      assertAdminRequired(dto.checkDate, '盘点日期');
      patch.checkDate = dto.checkDate;
    }
    if (dto?.checker !== undefined) {
      assertAdminRequired(dto.checker, '盘点人');
      patch.checker = dto.checker;
    }
    if (dto?.department !== undefined) patch.department = dto.department;
    if (dto?.location !== undefined) patch.location = dto.location;
    if (dto?.remark !== undefined) patch.remark = dto.remark;
    if (Object.keys(patch).length === 0)
      throw new BadRequestException('未提供可更新字段');
    patch.updatedAt = new Date();
    const updated: CheckRow[] = await this.db.update(adminInventories)
      .set(patch)
      .where(and(eq(adminInventories.id, id), isNull(adminInventories.deletedAt)))
      .returning();
    if (updated.length === 0) throw new NotFoundException('盘点单不存在');
    return mapCheck(updated[0]);
  }

  async getDetails(id: number): Promise<InventoryCheckDetailListResponse> {
    await this.findCheckOrThrow(id);
    const rows: DetailRow[] = await this.db.select().from(inventoryCheckDetails)
      .where(and(
        eq(inventoryCheckDetails.checkId, id), isNull(inventoryCheckDetails.deletedAt),
      ))
      .orderBy(asc(inventoryCheckDetails.id));
    return { items: rows.map((row: DetailRow) => mapDetail(row)) };
  }

  /** 提交盘点明细：软删旧明细后整批重插，回填主表统计 */
  async submitDetails(id: number, dto: AdminEnhanceCheckSubmitDto):
    Promise<InventoryCheckDetailListResponse> {
    const existing: CheckRow = await this.findCheckOrThrow(id);
    if (existing.status !== STATUS_CHECKING)
      throw new ConflictException('只有盘点中的盘点单可以提交明细');
    const inputs: AdminEnhanceCheckDetailInput[] = dto?.details ?? [];
    if (!Array.isArray(inputs) || inputs.length === 0)
      throw new BadRequestException('盘点明细不能为空');
    const rows: ParsedCheckDetail[] = inputs.map((input: AdminEnhanceCheckDetailInput): ParsedCheckDetail => {
      assertAdminRequired(input?.itemName, '物品名称');
      const bookQuantity: number = assertAdminNonNegativeInt(input?.bookQuantity, '账面数量');
      const rawActual: number | null | undefined = input?.actualQuantity;
      const actualQuantity: number | null = rawActual === null || rawActual === undefined
        ? null : assertAdminNonNegativeInt(rawActual, '实际数量');
      const difference: number | null = actualQuantity === null ? null : actualQuantity - bookQuantity;
      const status: string = difference === null || difference === 0 ? '正常' : difference > 0 ? '盘盈' : '盘亏';
      return {
        itemName: String(input.itemName).trim(), specification: String(input?.specification ?? '').trim(),
        bookQuantity, actualQuantity, difference, status, remark: String(input?.remark ?? ''),
      };
    });
    const matched: number = rows.filter((row: ParsedCheckDetail) => row.status === '正常').length;
    const diffCount: number = rows.length - matched;
    await this.db.transaction(async (tx) => {
      await tx.update(inventoryCheckDetails).set({ deletedAt: new Date() })
        .where(and(
          eq(inventoryCheckDetails.checkId, id), isNull(inventoryCheckDetails.deletedAt),
        ));
      for (const row of rows) {
        await insertWithSeqNo<DetailRow>({
          db: tx, table: inventoryCheckDetails,
          noColumn: inventoryCheckDetails.detailNo, prefix: DETAIL_NO_PREFIX,
          insert: (no: string) =>
            tx.insert(inventoryCheckDetails).values({
              detailNo: no, checkId: id, itemName: row.itemName, specification: row.specification,
              bookQuantity: row.bookQuantity, actualQuantity: row.actualQuantity,
              difference: row.difference, status: row.status, remark: row.remark,
            }).returning(),
        });
      }
      await tx.update(adminInventories).set({
        totalItems: rows.length, matchedItems: matched,
        differenceItems: diffCount, updatedAt: new Date(),
      }).where(eq(adminInventories.id, id));
    });
    this.logger.log(`盘点明细提交成功 id=${String(id)} total=${String(rows.length)}`);
    return this.getDetails(id);
  }

  /** 完成盘点：盘盈入库、盘亏出库（不足回滚 409），生成差异摘要 */
  async complete(id: number): Promise<AdminInventoryCheck> {
    const existing: CheckRow = await this.findCheckOrThrow(id);
    if (existing.status !== STATUS_CHECKING)
      throw new ConflictException('只有盘点中的盘点单可以完成');
    const details: DetailRow[] = await this.db.select().from(inventoryCheckDetails)
      .where(and(
        eq(inventoryCheckDetails.checkId, id), isNull(inventoryCheckDetails.deletedAt),
      ));
    if (details.length === 0)
      throw new BadRequestException('请先提交盘点明细');
    const surplus: DetailRow[] = details.filter((row: DetailRow) => (row.difference ?? 0) > 0);
    const deficit: DetailRow[] = details.filter((row: DetailRow) => (row.difference ?? 0) < 0);
    const differenceItems: number = surplus.length + deficit.length;
    const newStatus: string = differenceItems > 0 ? STATUS_DIFF : STATUS_DONE;
    const parts: string[] = [];
    if (surplus.length > 0) parts.push(`盘盈${String(surplus.length)}项`);
    if (deficit.length > 0) parts.push(`盘亏${String(deficit.length)}项`);
    const summary: string = parts.length > 0 ? parts.join('，') : '无差异';
    return this.db.transaction(async (tx) => {
      for (const row of surplus) {
        await increaseInventoryStock(tx, {
          itemName: row.itemName, specification: row.specification || '',
          itemType: '其他', unit: '件', quantity: row.difference ?? 0 });
      }
      for (const row of deficit) {
        await decreaseInventoryStock(tx, {
          itemName: row.itemName, specification: row.specification || '',
          quantity: -(row.difference ?? 0) });
      }
      const updated: CheckRow[] = await tx.update(adminInventories)
        .set({ status: newStatus, differenceSummary: summary, updatedAt: new Date() })
        .where(and(
          eq(adminInventories.id, id),
          eq(adminInventories.status, STATUS_CHECKING),
          isNull(adminInventories.deletedAt),
        ))
        .returning();
      if (updated.length === 0) {
        throw new ConflictException('盘点单状态已变更，请刷新后重试');
      }
      this.logger.log(
        `盘点单完成 id=${String(id)} no=${existing.inventoryCheckNo} summary=${summary}`,
      );
      return mapCheck(updated[0]);
    });
  }

  async remove(id: number): Promise<{ success: boolean }> {
    const existing: CheckRow = await this.findCheckOrThrow(id);
    if (existing.status !== STATUS_CHECKING)
      throw new ConflictException('只有盘点中的盘点单可以删除');
    await this.db.transaction(async (tx) => {
      await tx.update(inventoryCheckDetails).set({ deletedAt: new Date() })
        .where(and(
          eq(inventoryCheckDetails.checkId, id), isNull(inventoryCheckDetails.deletedAt),
        ));
      const deleted: { id: number }[] = await tx.update(adminInventories)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(adminInventories.id, id), isNull(adminInventories.deletedAt)))
        .returning({ id: adminInventories.id });
      if (deleted.length === 0) throw new NotFoundException('盘点单不存在');
    });
    return { success: true };
  }

  async batchDelete(ids: unknown): Promise<number> {
    const idList: number[] = parseIdList(ids);
    return this.db.transaction(async (tx) => {
      const deleted: { id: number }[] = await tx.update(adminInventories)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(and(
          inArray(adminInventories.id, idList),
          eq(adminInventories.status, STATUS_CHECKING),
          isNull(adminInventories.deletedAt),
        ))
        .returning({ id: adminInventories.id });
      if (deleted.length > 0) {
        await tx.update(inventoryCheckDetails).set({ deletedAt: new Date() })
          .where(and(
            inArray(inventoryCheckDetails.checkId, deleted.map((row: { id: number }) => row.id)),
            isNull(inventoryCheckDetails.deletedAt),
          ));
      }
      return deleted.length;
    });
  }

  private async findCheckOrThrow(id: number): Promise<CheckRow> {
    const rows: CheckRow[] = await this.db.select().from(adminInventories)
      .where(and(eq(adminInventories.id, id), isNull(adminInventories.deletedAt)));
    if (rows.length === 0) throw new NotFoundException('盘点单不存在');
    return rows[0];
  }
}
