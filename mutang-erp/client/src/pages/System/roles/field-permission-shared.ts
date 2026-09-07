/* 字段权限面板与预览区共享的常量与工具 */

export const FIELD_PERM_MODULE_LABELS: Record<string, string> = {
  hr: '人资',
  finance: '财务',
  contract: '合同',
  ads: '广告',
};

export interface FieldPermState {
  visible: boolean;
  editable: boolean;
  masked: boolean;
}

/** 数据库无记录的字段默认：可见 / 可编辑 / 不脱敏 */
export const FIELD_PERM_DEFAULT: FieldPermState = {
  visible: true,
  editable: true,
  masked: false,
};

export const fieldPermKey = (module: string, fieldName: string): string =>
  `${module}.${fieldName}`;

export const fieldPermModuleLabel = (module: string): string =>
  FIELD_PERM_MODULE_LABELS[module] ?? module;
