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
import { and, asc, eq, ilike, isNull, or, type SQL } from 'drizzle-orm';
import { systemSettings } from '@server/database/schema';
import type {
  SystemSetting,
  SystemSettingCreateDto,
  SystemSettingListParams,
  SystemSettingUpdateDto,
} from '@shared/api.interface';
import { isUniqueViolation } from '../finance-core/fin-seq.util';
import {
  assertSystemEnhanceEnum,
  assertSystemEnhanceRequired,
  toSystemEnhanceIsoOrNull,
} from './system-enhance-shared.util';

type SettingRow = typeof systemSettings.$inferSelect;
type SettingInsert = typeof systemSettings.$inferInsert;

const SETTING_VALUE_TYPES: string[] = ['字符串', '数字', '布尔', 'JSON'];

/** jsonb 出口统一：JSON 字符串 → 解析值，其余原样返回 */
function normalizeSettingValue(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value ?? null;
  }
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

/** 按 valueType 校验 settingValue 的运行时类型，不匹配 → 400 */
function assertSettingValueMatchesType(
  value: unknown,
  valueType: string,
): void {
  switch (valueType) {
    case '数字':
      if (typeof value !== 'number') {
        throw new BadRequestException('配置值类型必须为数字');
      }
      return;
    case '布尔':
      if (typeof value !== 'boolean') {
        throw new BadRequestException('配置值类型必须为布尔');
      }
      return;
    case 'JSON':
      if (typeof value !== 'object' || value === null) {
        throw new BadRequestException('配置值类型必须为 JSON 对象');
      }
      return;
    case '字符串':
      if (typeof value !== 'string') {
        throw new BadRequestException('配置值类型必须为字符串');
      }
      return;
    default:
      return;
  }
}

function mapSetting(row: SettingRow): SystemSetting {
  return {
    id: row.id,
    settingKey: row.settingKey,
    settingName: row.settingName,
    settingCategory: row.settingCategory,
    settingValue: normalizeSettingValue(row.settingValue),
    defaultValue: normalizeSettingValue(row.defaultValue),
    valueType: row.valueType,
    description: row.description,
    isSystem: row.isSystem,
    remark: row.remark,
    createdAt: toSystemEnhanceIsoOrNull(row.createdAt) ?? '',
    updatedAt: toSystemEnhanceIsoOrNull(row.updatedAt) ?? '',
  };
}

@Injectable()
export class SystemSettingsService {
  private readonly logger = new Logger(SystemSettingsService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
  ) {}

  async list(params: SystemSettingListParams): Promise<SystemSetting[]> {
    const conditions: SQL[] = [isNull(systemSettings.deletedAt)];
    if (params.category) {
      conditions.push(eq(systemSettings.settingCategory, params.category));
    }
    if (params.keyword) {
      const pattern: string = `%${params.keyword}%`;
      const keywordCondition: SQL | undefined = or(
        ilike(systemSettings.settingKey, pattern),
        ilike(systemSettings.settingName, pattern),
      );
      if (keywordCondition) conditions.push(keywordCondition);
    }
    const rows: SettingRow[] = await this.db
      .select()
      .from(systemSettings)
      .where(and(...conditions))
      .orderBy(asc(systemSettings.settingCategory), asc(systemSettings.id));
    return rows.map((row: SettingRow): SystemSetting => mapSetting(row));
  }

  async detail(id: number): Promise<SystemSetting> {
    const row: SettingRow = await this.findSettingOrThrow(id);
    return mapSetting(row);
  }

  async create(
    dto: SystemSettingCreateDto,
    userId: string,
  ): Promise<SystemSetting> {
    const settingKey: string = assertSystemEnhanceRequired(
      dto?.settingKey,
      '配置键',
    );
    const settingName: string = assertSystemEnhanceRequired(
      dto?.settingName,
      '配置名称',
    );
    const settingCategory: string = assertSystemEnhanceRequired(
      dto?.settingCategory,
      '配置分类',
    );
    const valueType: string = assertSystemEnhanceEnum(
      dto?.valueType,
      SETTING_VALUE_TYPES,
      '配置值类型',
    );
    if (dto?.settingValue === undefined || dto.settingValue === null) {
      throw new BadRequestException('配置值不能为空');
    }
    assertSettingValueMatchesType(dto.settingValue, valueType);
    const values: SettingInsert = {
      settingKey,
      settingName,
      settingCategory,
      settingValue: dto.settingValue,
      defaultValue: dto.settingValue,
      valueType,
      description: dto?.description ?? null,
      isSystem: false,
      remark: dto?.remark ?? null,
      createdBy: userId,
      updatedBy: userId,
    };
    try {
      const inserted: SettingRow[] = await this.db
        .insert(systemSettings)
        .values(values)
        .returning();
      if (inserted.length === 0) {
        throw new BadRequestException('创建失败');
      }
      this.logger.log(
        `系统设置创建成功 id=${String(inserted[0].id)} key=${inserted[0].settingKey}`,
      );
      return mapSetting(inserted[0]);
    } catch (error: unknown) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('配置键已存在');
      }
      throw error;
    }
  }

  async update(
    id: number,
    dto: SystemSettingUpdateDto,
    userId: string,
  ): Promise<SystemSetting> {
    const existing: SettingRow = await this.findSettingOrThrow(id);
    if (dto?.settingValue === undefined || dto.settingValue === null) {
      throw new BadRequestException('配置值不能为空');
    }
    assertSettingValueMatchesType(dto.settingValue, existing.valueType);
    const patch: Partial<SettingInsert> = {
      settingValue: dto.settingValue,
      updatedAt: new Date(),
      updatedBy: userId,
    };
    if (dto.remark !== undefined) patch.remark = dto.remark;
    const updated: SettingRow[] = await this.db
      .update(systemSettings)
      .set(patch)
      .where(and(eq(systemSettings.id, id), isNull(systemSettings.deletedAt)))
      .returning();
    if (updated.length === 0) {
      throw new NotFoundException('系统设置不存在');
    }
    return mapSetting(updated[0]);
  }

  async reset(id: number, userId: string): Promise<SystemSetting> {
    const existing: SettingRow = await this.findSettingOrThrow(id);
    const updated: SettingRow[] = await this.db
      .update(systemSettings)
      .set({
        settingValue: existing.defaultValue,
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(and(eq(systemSettings.id, id), isNull(systemSettings.deletedAt)))
      .returning();
    if (updated.length === 0) {
      throw new NotFoundException('系统设置不存在');
    }
    return mapSetting(updated[0]);
  }

  async remove(id: number, userId: string): Promise<{ success: boolean }> {
    const existing: SettingRow = await this.findSettingOrThrow(id);
    if (existing.isSystem) {
      throw new ConflictException('系统内置配置不可删除');
    }
    const updated: { id: number }[] = await this.db
      .update(systemSettings)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(and(eq(systemSettings.id, id), isNull(systemSettings.deletedAt)))
      .returning({ id: systemSettings.id });
    if (updated.length === 0) {
      throw new NotFoundException('系统设置不存在');
    }
    return { success: true };
  }

  private async findSettingOrThrow(id: number): Promise<SettingRow> {
    const rows: SettingRow[] = await this.db
      .select()
      .from(systemSettings)
      .where(and(eq(systemSettings.id, id), isNull(systemSettings.deletedAt)))
      .limit(1);
    if (rows.length === 0) {
      throw new NotFoundException('系统设置不存在');
    }
    return rows[0];
  }
}
